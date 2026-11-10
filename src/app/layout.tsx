import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Eye, LogOut } from "lucide-react";
import { getUser } from "@/lib/auth";
import { endViewAs } from "./actions";
import { canEditSheets, isAdmin, isExaminer } from "@/lib/permissions";
import { RANK_LABEL } from "@/lib/tests";
import { AppHeader, type NavKey } from "@/components/AppHeader";

export const metadata: Metadata = { title: "TISC Testing", description: "Toronto Island Sailing Club rating tests" };
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#0a2540" }, { media: "(prefers-color-scheme: dark)", color: "#050d18" }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const links: NavKey[] = user
    ? ["home", ...(isExaminer(user) ? ["mytests" as const, "members" as const] : []), ...(canEditSheets(user) ? ["sheets" as const] : []),
       ...(isAdmin(user) ? ["users" as const] : []), "account"]
    : [];
  const detail = user
    ? `${RANK_LABEL[user.rank]}${user.role !== "member" ? ` · ${user.role === "admin" ? "Admin" : "Testing committee"}` : ""}`
    : "";
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        {user?.viewedBy && (
          <div className="view-as-banner" role="status">
            <div className="view-as-banner__inner">
              <Eye size={18} aria-hidden="true" />
              <span>Viewing as <strong>{user.name}</strong> ({RANK_LABEL[user.rank]}). Read-only.</span>
              <form action={endViewAs}>
                <button className="btn btn--sm view-as-banner__btn"><LogOut size={15} aria-hidden="true" />Stop viewing</button>
              </form>
            </div>
          </div>
        )}
        <AppHeader user={user ? { name: user.name, detail } : null} links={links} />
        <main id="main" className="container">{children}</main>
      </body>
    </html>
  );
}
