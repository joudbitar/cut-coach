"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/today", label: "Today", icon: "🍽️" },
  { href: "/nutrition", label: "Log", icon: "📒" },
  { href: "/progress", label: "Progress", icon: "📉" },
  { href: "/training", label: "Train", icon: "🏋️" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 480,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        background: "color-mix(in srgb, var(--bg-elev) 92%, transparent)",
        borderTop: "1px solid var(--border)",
        backdropFilter: "blur(10px)",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 50,
      }}
    >
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "10px 0 12px",
              fontSize: 11,
              color: active ? "var(--accent)" : "var(--muted)",
              fontWeight: active ? 700 : 500,
            }}
          >
            <span style={{ fontSize: 20, filter: active ? "none" : "grayscale(0.4)" }}>{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
