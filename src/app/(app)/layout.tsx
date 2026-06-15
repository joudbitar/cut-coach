import BottomNav from "@/components/BottomNav";
import { logoutAction } from "@/app/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-bottom" style={{ padding: "14px 16px 0" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/icons/icon-192.png" alt="" width={30} height={30} style={{ borderRadius: 8 }} />
          <strong style={{ fontSize: 17 }}>Cut Coach</strong>
        </div>
        <form action={logoutAction}>
          <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}>Lock</button>
        </form>
      </header>
      {children}
      <BottomNav />
    </div>
  );
}
