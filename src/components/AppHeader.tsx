"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClipboardList, Compass, ListChecks, LogOut, Menu, Sailboat, UserCog, UserRound, Users, X } from "lucide-react";
import { logout } from "@/app/actions";
import { Avatar } from "./ui";

export type NavKey = "home" | "mytests" | "members" | "sheets" | "users" | "account";
const NAV: Record<NavKey, { href: string; label: string; Icon: typeof Compass }> = {
  home: { href: "/", label: "My progress", Icon: Compass },
  mytests: { href: "/my-tests", label: "My tests", Icon: ListChecks },
  members: { href: "/members", label: "Members", Icon: Users },
  sheets: { href: "/sheets", label: "Testing sheets", Icon: ClipboardList },
  users: { href: "/admin/users", label: "Users", Icon: UserCog },
  account: { href: "/account", label: "Account", Icon: UserRound },
};

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="TISC Testing home">
      <span className="brand__mark"><Sailboat size={22} strokeWidth={2.2} aria-hidden="true" /></span>
      <span className="brand__text">
        <span className="brand__name">TISC Testing</span>
        <span className="brand__sub">Toronto Island Sailing Club</span>
      </span>
    </Link>
  );
}

export function AppHeader({ user, links }: { user: { name: string; detail: string } | null; links: NavKey[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.parentElement?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("click", onClick); };
  }, [open]);

  const navLinks = (iconSize: number) => links.map((k) => {
    const { href, label, Icon } = NAV[k];
    return (
      <Link key={k} href={href} aria-current={isActive(path, href) ? "page" : undefined}>
        <Icon size={iconSize} aria-hidden="true" />{label}
      </Link>
    );
  });

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Brand />
        {user && (
          <>
            <nav className="nav" aria-label="Main">{navLinks(16)}</nav>
            <div className="userbox">
              <span className="userbox__who">
                <span className="userbox__name">{user.name}</span>
                <span className="userbox__role">{user.detail}</span>
              </span>
              <Avatar name={user.name} size="sm" />
              <form action={logout} className="signout">
                <button className="header-btn" aria-label="Sign out" title="Sign out"><LogOut size={16} aria-hidden="true" /></button>
              </form>
            </div>
            <button type="button" className="header-btn menu-btn" aria-expanded={open} aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
              {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
            <div id="mobile-menu" ref={panelRef} className="mobile-panel" data-open={open} hidden={!open}>
              <div className="mobile-panel__user">
                <Avatar name={user.name} />
                <div className="grow"><div className="strong">{user.name}</div><div className="small muted">{user.detail}</div></div>
              </div>
              <nav aria-label="Main (mobile)">{navLinks(20)}</nav>
              <form action={logout} className="signout">
                <button className="btn btn--ghost-muted"><LogOut size={18} aria-hidden="true" />Sign out</button>
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
