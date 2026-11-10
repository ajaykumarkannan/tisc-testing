import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { setupAdmin } from "../actions";
import { Flash } from "@/components/Flash";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (await one("SELECT 1 FROM users LIMIT 1")) redirect("/login");
  const sp = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>First-time setup</h1>
      <p className="muted">Create the first administrator. It must use the club’s designated admin email (<code>ADMIN_EMAIL</code>, default commodore@torontosailing.com).
        This page disappears once an account exists.</p>
      <Flash sp={sp} />
      <form action={setupAdmin}>
        <label><span>Full name</span><input name="name" required style={{ width: "100%" }} /></label>
        <label><span>Email</span><input name="email" type="email" required style={{ width: "100%" }} /></label>
        <label><span>Password (8+ characters)</span><input name="password" type="password" minLength={8} required style={{ width: "100%" }} /></label>
        <button>Create admin</button>
      </form>
    </div>
  );
}
