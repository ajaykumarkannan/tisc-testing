import Link from "next/link";
import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { signup } from "../actions";
import { Flash } from "@/components/Flash";
import { AuthCard, Field } from "@/components/AuthCard";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (process.env.ALLOW_SIGNUP !== "true") notFound();
  const sp = await searchParams;
  return (
    <AuthCard title="Create account" sub="New accounts start as Novice. An administrator can update your rating."
      foot={<>Already have an account? <Link href="/login">Sign in</Link></>}>
      <Flash sp={sp} />
      <form action={signup}>
        <Field label="Full name"><input className="input" name="name" required autoComplete="name" /></Field>
        <Field label="Email"><input className="input" name="email" type="email" required autoComplete="email" /></Field>
        <Field label="Password" hint="8 or more characters."><input className="input" name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
        <SubmitButton className="btn btn--primary btn--lg btn--block" pendingText="Creating…" icon={<UserPlus size={20} aria-hidden="true" />}>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
