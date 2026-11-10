import { requireUser } from "@/lib/auth";
import { MemberOverview } from "@/components/MemberOverview";

export default async function Home() {
  const user = await requireUser();
  return (
    <>
      <h1>My progress</h1>
      <MemberOverview member={user} />
    </>
  );
}
