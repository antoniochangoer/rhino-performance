"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPendingShareRequests } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#e63946" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function Header() {
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
        .channel("pending-shares-header-badge")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "program_shares",
            filter: `shared_with=eq.${user.id}`,
          },
          () => loadCount(),
        )
        .subscribe();
    }

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (pathname.startsWith("/train/") || pathname.startsWith("/auth")) return null;

  const isProfileActive = pathname.startsWith("/profile");

  return (
    <header style={{
      position: "fixed",
      top: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      background: "#0a0a0a",
      borderBottom: "1px solid #1e1e1e",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      zIndex: 100,
      boxSizing: "border-box",
    }}>
      {/* Brand — logo + title on one line */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/logo.png" alt="Rhino" style={{ height: 34, width: 34, objectFit: "contain", flexShrink: 0 }} />
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1,
            color: "#f0f0f0",
          }}>
            <span style={{ color: "#e63946" }}>Rhino</span>{" "}Performance
          </div>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>
            Kracht · RPE · Progressie
          </div>
        </div>
      </Link>

      {/* Profile icon with badge */}
      <Link href="/profile" style={{ position: "relative", display: "flex", alignItems: "center", padding: "4px 8px" }}>
        <ProfileIcon active={isProfileActive} />
        {pendingCount > 0 && (
          <span style={{
            position: "absolute",
            top: 0,
            right: 2,
            background: "#e63946",
            color: "#fff",
            borderRadius: "50%",
            width: 15,
            height: 15,
            fontSize: 9,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1.5px solid #0a0a0a",
          }}>
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </Link>
    </header>
  );
}
