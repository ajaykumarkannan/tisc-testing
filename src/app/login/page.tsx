import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { login } from "../actions";
import { Flash } from "@/components/Flash";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (await getUser()) redirect("/");
  if (!(await one("SELECT 1 FROM users LIMIT 1"))) redirect("/setup");
  const sp = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 380, margin: "40px auto" }}>
      <h1>Sign in</h1>
      <Flash sp={sp} />
      <form action={login}>
        <label><span>Email</span><input name="email" type="email" required autoComplete="email" style={{ width: "100%" }} /></label>
        <label><span>Password</span><input name="password" type="password" required autoComplete="current-password" style={{ width: "100%" }} /></label>
        <button>Sign in</button>
      </form>
      {process.env.ALLOW_SIGNUP === "true" && <p className="muted">New member? <Link href="/signup">Create an account</Link></p>}
    </div>
  );
}
