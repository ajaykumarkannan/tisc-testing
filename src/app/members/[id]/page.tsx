import { notFound, redirect } from "next/navigation";
import { loadUser, requireUser } from "@/lib/auth";
import { canViewMember } from "@/lib/permissions";
import { MemberOverview } from "@/components/MemberOverview";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  if (!canViewMember(user, id)) redirect("/");
  const member = await loadUser(id);
  if (!member) notFound();
  return (
    <>
      <h1>{member.name}</h1>
      <MemberOverview member={member} />
    </>
  );
}
