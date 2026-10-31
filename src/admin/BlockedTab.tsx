import { useState } from "react";
import { Ban, Phone, ShieldCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/primitives";
import { unblockUser, type BlockedUser } from "./api";
import { BlockDialog, Empty } from "./ui";

export function BlockedTab({ blocked, loading }: { blocked: BlockedUser[]; loading: boolean }) {
  const [adding, setAdding] = useState(false);

  const unblock = async (user: BlockedUser) => {
    if (!window.confirm(`Unblock ${user.mobile}${user.name ? ` (${user.name})` : ""}?`)) return;
    try {
      await unblockUser(user.mobile);
      toast.success(`${user.mobile} can order again`);
    } catch (e) {
      toast.error("Couldn't unblock", { description: (e as Error).message });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-edge/10 bg-ink-900 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-accent" />
          <p className="max-w-xl text-sm text-cream/60">
            Blocked numbers can browse the menu but can never place an order. The database itself rejects their orders, so this can't be bypassed from the website.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} className="bg-chili text-coal hover:bg-chili/90">
          <Ban className="size-4" /> Block a number
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-20 rounded-3xl" />
            ))}
          </div>
        ) : blocked.length === 0 ? (
          <Empty icon={UserX} title="No blocked users">
            Use “Block” on any order, or add a number above.
          </Empty>
        ) : (
          <ul className="divide-y divide-edge/10 overflow-hidden rounded-3xl border border-edge/10 bg-ink-900">
            {blocked.map((u) => (
              <li key={u.mobile} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-chili/15 text-chili">
                  <Ban className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tabular-nums">
                    {u.mobile}
                    {u.name && <span className="font-normal text-cream/60"> · {u.name}</span>}
                  </p>
                  <p className="truncate text-sm text-cream/50">
                    {u.reason || "No reason given"}
                    {u.date && ` · ${u.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:+91${u.mobile}`} aria-label={`Call ${u.mobile}`} className="grid size-10 place-items-center rounded-full border border-edge/15 hover:border-edge/35">
                    <Phone className="size-4" />
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => unblock(u)}>
                    Unblock
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BlockDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
