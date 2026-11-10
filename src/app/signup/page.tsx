import { notFound } from "next/navigation";
import { signup } from "../actions";
import { Flash } from "@/components/Flash";

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (process.env.ALLOW_SIGNUP !== "true") notFound();
  const sp = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 380, margin: "40px auto" }}>
      <h1>Create account</h1>
      <p className="muted">New accounts start as Novice. An administrator can update your rating.</p>
      <Flash sp={sp} />
      <form action={signup}>
        <label><span>Full name</span><input name="name" required style={{ width: "100%" }} /></label>
        <label><span>Email</span><input name="email" type="email" required style={{ width: "100%" }} /></label>
        <label><span>Password (8+ characters)</span><input name="password" type="password" minLength={8} required style={{ width: "100%" }} /></label>
        <button>Create account</button>
      </form>
    </div>
  );
}
