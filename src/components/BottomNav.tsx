"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Stroked line glyphs (currentColor, 1.75px) — quiet and precise, no emoji.
function Icon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "today": // plate / utensils
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      );
    case "log": // clipboard list
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4h6v2.5H9z" />
          <path d="M8.5 11h7M8.5 15h7" />
        </svg>
      );
    case "progress": // trending down
      return (
        <svg {...common}>
          <path d="M3 6l6 7 4-3 8 8" />
          <path d="M21 18v-5h-5" />
        </svg>
      );
    case "train": // dumbbell
      return (
        <svg {...common}>
          <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
        </svg>
      );
    default:
      return null;
  }
}

const TABS = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/nutrition", label: "Log", icon: "log" },
  { href: "/progress", label: "Progress", icon: "progress" },
  { href: "/training", label: "Train", icon: "train" },
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
              gap: 4,
              padding: "10px 0 12px",
              fontSize: 11,
              color: active ? "var(--accent)" : "var(--muted)",
              fontWeight: active ? 700 : 500,
            }}
          >
            <Icon name={t.icon} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
