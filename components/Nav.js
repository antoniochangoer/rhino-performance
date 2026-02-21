"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

const links = [
  {
    href: "/",
    label: "Dashboard",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#e63946" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/programs",
    label: "Schema's",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#e63946" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
        <line x1="8" y1="9" x2="10" y2="9" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progressie",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#e63946" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "Historie",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#e63946" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/train/") || pathname.startsWith("/auth")) return null;

  async function handleLogout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      background: "#0a0a0a",
      borderTop: "1px solid #1e1e1e",
      display: "flex",
      justifyContent: "space-around",
      padding: "10px 0 20px",
      zIndex: 100,
    }}>
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
        return (
          <Link key={link.href} href={link.href} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "4px 12px",
          }}>
            {link.icon(active)}
            <span style={{
              fontSize: 10,
              color: active ? "#e63946" : "#555",
              fontWeight: active ? 700 : 400,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontFamily: "'Inter', sans-serif",
            }}>
              {link.label}
            </span>
          </Link>
        );
      })}

      {/* Logout button */}
      <button
        onClick={handleLogout}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 4, padding: "4px 12px", background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span style={{ fontSize: 10, color: "#555", fontWeight: 400, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Uit
        </span>
      </button>
    </nav>
  );
}
