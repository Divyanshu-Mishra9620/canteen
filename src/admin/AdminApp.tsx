import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MotionConfig, motion } from "motion/react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { Ban, BellRing, Eye, EyeOff, ExternalLink, History, LogOut, Settings2, UtensilsCrossed, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, SEED_CATEGORIES, type Category, type MenuItem, type Settings } from "../data/menu";
import { firebaseConfig, isFirebaseConfigured } from "../lib/firebase-config";
import { subscribePublicData } from "../lib/menu-api";
import { cn, rupee } from "../lib/utils";
import { ThemeProvider, ThemeToggle } from "../context/theme";
import { ThemedToaster } from "../components/ThemedToaster";
import { Logo } from "../components/Navbar";
import { Button } from "../components/ui/primitives";
import {
  auth,
  isAdmin,
  playChime,
  subscribeBlocked,
  subscribeRecentOrders,
  subscribeTodayOrders,
  unlockAudio,
  type AdminOrder,
  type BlockedUser,
} from "./api";
import { Field, Spinner, inputClass } from "./ui";
import { HistoryTab, LiveOrdersTab } from "./OrdersTab";
import { MenuTab } from "./MenuTab";
import { BlockedTab } from "./BlockedTab";
import { OpenToggle, SettingsTab } from "./SettingsTab";

export default function AdminApp() {
  useEffect(() => {
    document.title = "Admin · Techie's Taste";
  }, []);
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <AdminGate />
        <ThemedToaster />
      </MotionConfig>
    </ThemeProvider>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-10">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}

function AdminGate() {
  const [state, setState] = useState<"loading" | "signedOut" | "denied" | "admin">(auth ? "loading" : "signedOut");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) return setState("signedOut");
      try {
        setState((await isAdmin(u.uid)) ? "admin" : "denied");
      } catch {
        setState("denied");
      }
    });
  }, []);

  if (!isFirebaseConfigured || !auth) {
    return (
      <Centered>
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">Connect Firebase first</h1>
        <p className="mt-3 text-cream/60">
          The admin panel needs a Firebase project. Copy <code className="font-mono text-accent">.env.example</code> to <code className="font-mono text-accent">.env</code>, fill in your keys and restart the dev server. SETUP.md walks through every step.
        </p>
        <a href="/" className="mt-6 inline-block text-sm font-semibold text-accent">
          ← Back to website
        </a>
      </Centered>
    );
  }
  if (state === "loading") {
    return (
      <Centered>
        <div className="flex justify-center">
          <Spinner className="size-8 text-accent" />
        </div>
      </Centered>
    );
  }
  if (state === "signedOut") return <Login />;
  if (state === "denied" && user) {
    return (
      <Centered>
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">Not an admin account</h1>
        <p className="mt-3 text-sm text-cream/60">
          {user.email} is signed in but isn't on the owner list. In Firestore, create a document in the <code className="font-mono text-accent">admins</code> collection with this ID:
        </p>
        <code className="mt-3 block rounded-xl bg-edge/[0.06] p-3 font-mono text-xs break-all select-all">{user.uid}</code>
        <Button variant="ghost" className="mt-6 w-full" onClick={() => signOut(auth!)}>
          Sign out
        </Button>
      </Centered>
    );
  }
  return <Dashboard user={user!} />;
}

/** Human-readable sign-in errors, including the setup mistakes owners actually hit. */
function signInMessage(code: string) {
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return "Wrong email or password.";
  if (code.includes("too-many-requests")) return "Too many attempts. Try again in a few minutes.";
  if (code.includes("configuration-not-found"))
    return `Authentication isn't set up in Firebase project "${firebaseConfig.projectId}". Make sure .env has the config of the project where you added the user.`;
  if (code.includes("operation-not-allowed")) return "Email/Password sign-in is turned off. Enable it in Firebase → Authentication → Sign-in method.";
  if (code.includes("api-key")) return "The Firebase API key in .env isn't valid. Copy it again from Project settings.";
  if (code.includes("network-request-failed")) return "Couldn't reach Firebase. Check your internet connection.";
  return `Couldn't sign in (${code || "unknown error"}).`;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    unlockAudio();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth!, email.trim(), password);
    } catch (err) {
      setError(signInMessage((err as { code?: string }).code ?? ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Centered>
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-edge/10 bg-ink-900 p-7 shadow-2xl shadow-black/30 light:shadow-black/10">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">Owner login</h1>
        <p className="mt-1 text-sm text-cream/55">Manage orders, menu and settings.</p>
        {import.meta.env.DEV && (
          <p className="mt-3 font-mono text-[11px] text-cream/40">
            Firebase project: <span className="text-accent">{firebaseConfig.projectId}</span>
          </p>
        )}
        <div className="mt-6 space-y-4">
          <Field label="Email">
            <input className={inputClass} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input className={cn(inputClass, "pr-12")} type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-cream/50">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-chili light:text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy}>
          {busy && <Spinner />} Sign in
        </Button>
        <a href="/" className="mt-4 block text-center text-sm text-cream/50 hover:text-cream">
          ← Back to website
        </a>
      </motion.form>
    </Centered>
  );
}

type Tab = "orders" | "menu" | "blocked" | "settings" | "history";
const TABS: { id: Tab; label: string; short: string; icon: typeof BellRing }[] = [
  { id: "orders", label: "Live orders", short: "Orders", icon: BellRing },
  { id: "menu", label: "Menu management", short: "Menu", icon: UtensilsCrossed },
  { id: "blocked", label: "Blocked users", short: "Blocked", icon: Ban },
  { id: "settings", label: "Settings", short: "Settings", icon: Settings2 },
  { id: "history", label: "Order history", short: "History", icon: History },
];

function Dashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>(() => (TABS.some((t) => `#${t.id}` === window.location.hash) ? (window.location.hash.slice(1) as Tab) : "orders"));
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [liveMenu, setLiveMenu] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [recent, setRecent] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [today, setToday] = useState<AdminOrder[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    window.history.replaceState(null, "", `#${tab}`);
  }, [tab]);

  // Browsers need one user gesture before playing sound.
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, []);

  useEffect(() => {
    const onError = (e: Error) => toast.error("Live data error", { description: e.message });
    const unsubs = [
      subscribePublicData({
        onMenu: (items) => {
          setMenu(items);
          setLiveMenu(items.length > 0);
          setMenuLoading(false);
        },
        onCategories: (c) => setCategories(c.length ? c : SEED_CATEGORIES),
        onSettings: (s) => setSettings(s),
        onError,
      }),
      subscribeRecentOrders((list) => {
        // Alert only for orders that arrive after the first snapshot.
        if (seen.current) {
          const fresh = list.filter((o) => o.status === "New" && !seen.current!.has(o.orderId));
          if (fresh.length) {
            if (soundRef.current) playChime();
            navigator.vibrate?.([200, 100, 200]);
            fresh.forEach((o) =>
              toast(`New order ${o.orderId}`, {
                description: `${o.customer.name} · ${o.customer.hostel} ${o.customer.room} · ${rupee(o.grandTotal)}`,
                duration: 10_000,
                action: { label: "View", onClick: () => setTab("orders") },
              }),
            );
          }
        }
        seen.current = new Set(list.map((o) => o.orderId));
        setRecent(list);
        setOrdersLoading(false);
      }, onError),
      subscribeTodayOrders(setToday, onError),
      subscribeBlocked((list) => {
        setBlocked(list);
        setBlockedLoading(false);
      }, onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const newCount = recent.filter((o) => o.status === "New").length;
  const activeCount = recent.filter((o) => ["New", "Preparing", "Ready"].includes(o.status)).length;
  const blockedSet = useMemo(() => new Set(blocked.map((b) => b.mobile)), [blocked]);

  useEffect(() => {
    document.title = newCount ? `(${newCount}) New order${newCount > 1 ? "s" : ""} · Admin` : "Admin · Techie's Taste";
  }, [newCount]);

  const current = TABS.find((t) => t.id === tab)!;
  const badge = (id: Tab) => (id === "orders" ? activeCount : id === "blocked" ? blocked.length : 0);

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b border-edge/10 bg-ink-950/85 backdrop-blur-xl">
        <div className="container-x flex h-16 items-center gap-2">
          <a href="/" className="flex items-center gap-2" title="Open the website">
            <Logo compact className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
          </a>
          <span className="rounded-full bg-brand/15 px-2.5 py-1 font-mono text-[11px] font-bold text-accent uppercase">Admin</span>
          <div className="ml-auto flex items-center gap-1.5">
            <OpenToggle settings={settings} compact />
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                setSound((s) => !s);
              }}
              aria-label={sound ? "Mute new-order sound" : "Turn on new-order sound"}
              title={sound ? "Sound alerts on" : "Sound alerts off"}
              className="grid size-10 place-items-center rounded-full border border-edge/10 text-cream/70 hover:border-edge/25"
            >
              {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
            <ThemeToggle />
            <a href="/" target="_blank" rel="noreferrer" aria-label="View website" className="hidden size-10 place-items-center rounded-full border border-edge/10 text-cream/70 hover:border-edge/25 sm:grid">
              <ExternalLink className="size-4" />
            </a>
            <button type="button" onClick={() => signOut(auth!)} aria-label="Sign out" title={`Sign out ${user.email ?? ""}`} className="grid size-10 place-items-center rounded-full border border-edge/10 text-cream/70 hover:border-chili hover:text-chili">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        <nav className="container-x no-scrollbar hidden gap-1 overflow-x-auto pb-3 md:flex" aria-label="Dashboard sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn("relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors", tab === t.id ? "text-coal" : "text-cream/60 hover:text-cream")}
            >
              {tab === t.id && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-brand" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <t.icon className="relative size-4" />
              <span className="relative">{t.label}</span>
              {badge(t.id) > 0 && (
                <span className={cn("relative grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]", tab === t.id ? "bg-coal text-brand" : "bg-brand text-coal")}>{badge(t.id)}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="container-x py-6 pb-28 md:pb-12">
        <h1 className="mb-6 font-display text-3xl font-bold sm:text-4xl">{current.label}</h1>
        {tab === "orders" && <LiveOrdersTab orders={recent} loading={ordersLoading} blockedSet={blockedSet} />}
        {tab === "menu" &&
          (menuLoading ? <div className="skeleton h-64 rounded-3xl" /> : <MenuTab menu={menu} categories={categories} liveMenu={liveMenu} />)}
        {tab === "blocked" && <BlockedTab blocked={blocked} loading={blockedLoading} />}
        {tab === "settings" && <SettingsTab settings={settings} />}
        {tab === "history" && <HistoryTab recent={recent} today={today} blockedSet={blockedSet} />}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-edge/10 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", tab === t.id ? "text-accent" : "text-cream/50")}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <span className="relative">
              <t.icon className="size-5" />
              {badge(t.id) > 0 && (
                <span className="absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] text-coal">{badge(t.id)}</span>
              )}
            </span>
            {t.short}
            {tab === t.id && <motion.span layoutId="admin-bottom" className="absolute top-0 h-0.5 w-10 rounded-full bg-brand" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
