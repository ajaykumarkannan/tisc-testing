import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { loadUser, requireUser } from "@/lib/auth";
import { canViewMember } from "@/lib/permissions";
import { MemberOverview } from "@/components/MemberOverview";
import { Flash } from "@/components/Flash";

export default async function MemberPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  if (!canViewMember(user, id)) redirect("/");
  const member = await loadUser(id);
  if (!member) notFound();
  const self = member.id === user.id;
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        {self ? <Link href="/">My progress</Link> : <Link href="/members">Members</Link>}
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{member.name}</span>
      </nav>
      <Flash sp={await searchParams} />
      <MemberOverview member={member} eyebrow={self ? "My progress" : "Member"} self={self} />
    </>
  );
}
