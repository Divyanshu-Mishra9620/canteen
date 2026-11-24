import { MongoClient, type Db } from "mongodb";
import { readEnv } from "./env.js";
import { ApiError } from "./http.js";

/**
 * One MongoDB connection per server instance (serverless functions reuse warm instances).
 * Cached on `globalThis` so Vite's dev reloads don't leak connections.
 */
const g = globalThis as unknown as { __ttMongo?: { client: Promise<MongoClient>; uri: string }; __ttIndexed?: boolean };

export const dbName = () => readEnv("MONGODB_DB") || "techies_taste";

export async function getDb(): Promise<Db> {
  const uri = readEnv("MONGODB_URI");
  if (!uri) {
    throw new ApiError(
      503,
      "setup",
      "The database isn't configured yet. Set MONGODB_URI (see SETUP.md), then restart the server.",
    );
  }
  if (!g.__ttMongo || g.__ttMongo.uri !== uri) {
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
    const connecting = client.connect().catch((err) => {
      g.__ttMongo = undefined; // allow a retry on the next request
      throw err;
    });
    g.__ttMongo = { client: connecting, uri };
  }
  let client: MongoClient;
  try {
    client = await g.__ttMongo.client;
  } catch (err) {
    console.error("MongoDB connection failed:", (err as Error).message);
    throw new ApiError(503, "db_unavailable", "Couldn't reach the database right now. Please try again in a moment.");
  }
  const db = client.db(dbName());
  if (!g.__ttIndexed) {
    g.__ttIndexed = true;
    await ensureIndexes(db).catch((err) => {
      g.__ttIndexed = false;
      console.error("Creating indexes failed:", (err as Error).message);
    });
  }
  return db;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("orders").createIndex({ createdAt: -1 }),
    db.collection("orders").createIndex({ "customer.mobile": 1, createdAt: -1 }),
    db.collection("menu").createIndex({ category: 1 }),
  ]);
}
