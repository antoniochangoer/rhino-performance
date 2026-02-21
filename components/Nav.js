"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPendingShareRequests } from "@/lib/storage";
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

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#e63946" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (pathname.startsWith("/auth")) return;

    const supabase = getSupabase();
    let channel;

    async function loadCount() {
      const reqs = await getPendingShareRequests().catch(() => []);
      setPendingCount(reqs.length);
    }

    async function setupRealtime() {
      await loadCount();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("pending-shares-badge")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "program_shares",
            filter: `shared_with=eq.${user.id}`,
          },
          () => loadCount()
        )
        .subscribe();
    }

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (pathname.startsWith("/train/") || pathname.startsWith("/auth")) return null;

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

      {/* Profiel met badge */}
      <Link href="/profile" style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4, padding: "4px 12px", position: "relative",
      }}>
        <div style={{ position: "relative" }}>
          <ProfileIcon active={pathname.startsWith("/profile")} />
          {pendingCount > 0 && (
            <span style={{
              position: "absolute", top: -3, right: -4,
              background: "#e63946", color: "#fff",
              borderRadius: "50%", width: 14, height: 14,
              fontSize: 9, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1.5px solid #0a0a0a",
            }}>
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 10,
          color: pathname.startsWith("/profile") ? "#e63946" : "#555",
          fontWeight: pathname.startsWith("/profile") ? 700 : 400,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
        }}>
          Profiel
        </span>
      </Link>
    </nav>
  );
}
