import { requireUser } from "@/lib/auth";
import { MemberOverview } from "@/components/MemberOverview";
import { Flash } from "@/components/Flash";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  return (
    <>
      <Flash sp={await searchParams} />
      <MemberOverview member={user} eyebrow="My progress" self />
    </>
  );
}
