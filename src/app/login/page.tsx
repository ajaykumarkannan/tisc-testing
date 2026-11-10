import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { login } from "../actions";
import { Flash } from "@/components/Flash";
import { AuthCard, Field } from "@/components/AuthCard";
import { SubmitButton } from "@/components/SubmitButton";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (await getUser()) redirect("/");
  if (!(await one("SELECT 1 FROM users WHERE role='admin' LIMIT 1"))) redirect("/setup");
  const sp = await searchParams;
  return (
    <AuthCard title="Sign in" sub="Welcome aboard. Sign in to see your progress or sign off tests."
      foot={process.env.ALLOW_SIGNUP === "true"
        ? <>New member? <Link href="/signup">Create an account</Link></>
        : "Forgotten your password? Ask a club administrator to set a temporary one."}>
      <Flash sp={sp} />
      <form action={login}>
        <Field label="Email"><input className="input" name="email" type="email" required autoComplete="email" inputMode="email" /></Field>
        <Field label="Password"><input className="input" name="password" type="password" required autoComplete="current-password" /></Field>
        <SubmitButton className="btn btn--primary btn--lg btn--block" pendingText="Signing in…" icon={<LogIn size={20} aria-hidden="true" />}>Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}
