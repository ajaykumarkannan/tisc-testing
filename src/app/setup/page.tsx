import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { one } from "@/lib/db";
import { setupAdmin } from "../actions";
import { Flash } from "@/components/Flash";
import { AuthCard, Field } from "@/components/AuthCard";
import { SubmitButton } from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (await one("SELECT 1 FROM users WHERE role='admin' LIMIT 1")) redirect("/login");
  const sp = await searchParams;
  return (
    <AuthCard title="First-time setup"
      sub={<>Create the first administrator. It must use the club’s designated admin email (<code>ADMIN_EMAIL</code>, default commodore@torontosailing.com).
        This page disappears once an account exists.</>}>
      <Flash sp={sp} />
      <form action={setupAdmin}>
        <Field label="Full name"><input className="input" name="name" required autoComplete="name" /></Field>
        <Field label="Email"><input className="input" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Setup code"
          hint={<>Paste the value of the <code>SESSION_SECRET</code> environment variable you created in Vercel (Settings → Environment Variables).</>}>
          <input className="input" name="code" type="password" required autoComplete="off" />
        </Field>
        <Field label="Password" hint="8 or more characters."><input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
        <SubmitButton className="btn btn--primary btn--lg btn--block" pendingText="Creating…" icon={<ShieldCheck size={20} aria-hidden="true" />}>Create admin</SubmitButton>
      </form>
    </AuthCard>
  );
}
