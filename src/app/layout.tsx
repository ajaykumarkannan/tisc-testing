import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { endViewAs, logout } from "./actions";
import { canEditSheets, isAdmin, isExaminer } from "@/lib/permissions";
import { RANK_LABEL } from "@/lib/tests";

export const metadata: Metadata = { title: "TISC Testing", description: "Toronto Island Sailing Club rating tests" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">TISC Testing</Link>
          {user && (
            <>
              <nav>
                <Link href="/">My progress</Link>
                {isExaminer(user) && <Link href="/my-tests">My tests</Link>}
                {isExaminer(user) && <Link href="/members">Members</Link>}
                {canEditSheets(user) && <Link href="/sheets">Testing sheets</Link>}
                {isAdmin(user) && <Link href="/admin/users">Users</Link>}
                <Link href="/account">Account</Link>
              </nav>
              <span className="muted who">{user.name} · {RANK_LABEL[user.rank]}{user.role !== "member" ? ` · ${user.role === "admin" ? "Admin" : "Testing committee"}` : ""}</span>
              <form action={logout} className="signout"><button className="link">Sign out</button></form>
            </>
          )}
        </header>
        {user?.viewedBy && (
          <div className="view-as-banner" role="status">
            <span>Viewing as <strong>{user.name}</strong> ({RANK_LABEL[user.rank]}). Read-only.</span>
            <form action={endViewAs}><button className="secondary">Stop viewing</button></form>
          </div>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
