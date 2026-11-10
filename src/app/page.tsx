import { requireUser } from "@/lib/auth";
import { MemberOverview } from "@/components/MemberOverview";
import { Flash } from "@/components/Flash";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  return (
    <>
      <h1>My progress</h1>
      <Flash sp={await searchParams} />
      <MemberOverview member={user} />
    </>
  );
}
