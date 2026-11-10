import { RANKS, type Rank, type Endorsement, type TestRules } from "./tests";

export type Role = "admin" | "committee" | "member";
export interface Actor {
  id: number;
  role: Role;
  rank: Rank;
}
export interface Candidate {
  id: number;
  rank: Rank;
  endorsements: Endorsement[];
  /** Tests the testing committee has allowed by exception (see EXCEPTION_TESTS). */
  exceptions?: string[];
}

/** Tests the testing committee may open by exception to a member below the usual rating (e.g. a Novice). */
export const EXCEPTION_TESTS = ["sr_helms", "skipper"];
export const canGrantExceptions = (a: Actor) => a.role === "admin" || a.role === "committee";

/**
 * Which tests a skipper may administer. Committee members and admins may administer all tests.
 * Change this list to let skippers run more tests.
 */
export const SKIPPER_CAN_ADMINISTER = ["helms"];

export function canAdminister(actor: Actor, testKey: string): boolean {
  if (actor.role === "admin" || actor.role === "committee") return true;
  return actor.rank === "skipper" && SKIPPER_CAN_ADMINISTER.includes(testKey);
}

/** Anyone who can administer at least one test may browse members. */
export function isExaminer(actor: Actor): boolean {
  return actor.role !== "member" || actor.rank === "skipper";
}

/** Members see only themselves; examiners see everyone. */
export function canViewMember(actor: Actor, memberId: number): boolean {
  return actor.id === memberId || isExaminer(actor);
}

export const isAdmin = (a: Actor) => a.role === "admin";

/** Skippers, the testing committee and admins can add new members (with a temporary password). */
export const canAddMembers = (a: Actor) => isExaminer(a);

/** Starting ratings a person may give a new member: committee/admin any (e.g. passed on paper); skippers Novice only. */
export function allowedStartingRanks(a: Actor): Rank[] {
  if (a.role === "admin" || a.role === "committee") return [...RANKS];
  return canAddMembers(a) ? ["novice"] : [];
}

/** Testing committee (and admins) may edit the content of the testing sheets. */
export const canEditSheets = (a: Actor) => a.role === "admin" || a.role === "committee";

/** Can this candidate currently take (or continue) this test? */
export function isEligible(test: TestRules, c: Candidate): boolean {
  const { rank, endorsement } = test.grants;
  const byException = EXCEPTION_TESTS.includes(test.key) && !!c.exceptions?.includes(test.key);
  if (!test.eligibleRanks.includes(c.rank) && !byException) return false;
  if (endorsement && c.endorsements.includes(endorsement)) return false;
  if (rank && RANKS.indexOf(c.rank) >= RANKS.indexOf(rank)) return false;
  return true;
}
