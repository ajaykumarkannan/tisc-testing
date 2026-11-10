"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ChevronRight, Search, UsersRound } from "lucide-react";
import { RANKS, RANK_LABEL, type Endorsement, type Rank } from "@/lib/tests";
import { Avatar, EndorsementChip, ProgressBar, RankChip } from "@/components/ui";

export interface MemberVM {
  id: number; name: string; email: string; rank: Rank; endorsements: Endorsement[]; archived?: boolean;
  tests: { key: string; title: string; done: number; total: number }[];
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function MembersList({ members, initialQ, initialRank }: { members: MemberVM[]; initialQ: string; initialRank: Rank | "" }) {
  const [q, setQ] = useState(initialQ);
  const [rank, setRank] = useState<Rank | "">(initialRank);
  const dq = useDeferredValue(q);
  const shown = useMemo(() => {
    const needle = norm(dq.trim());
    return members.filter((m) => (!rank || m.rank === rank) && (!needle || norm(m.name).includes(needle) || norm(m.email).includes(needle)));
  }, [members, dq, rank]);

  return (
    <>
      <form className="toolbar" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="input-icon">
          <Search size={18} aria-hidden="true" />
          <label htmlFor="member-q" className="sr-only">Search name or email</label>
          <input id="member-q" className="input" type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email" autoComplete="off" enterKeyHint="search" />
        </div>
        <input type="hidden" name="rank" value={rank} />
        <div className="seg" role="group" aria-label="Filter by rating">
          <button type="button" aria-pressed={rank === ""} onClick={() => setRank("")}>All</button>
          {RANKS.map((r) => <button key={r} type="button" aria-pressed={rank === r} onClick={() => setRank(r)}>{RANK_LABEL[r]}</button>)}
        </div>
      </form>
      <p className="small muted" aria-live="polite" style={{ marginBottom: "var(--s-3)" }}>
        {shown.length} {shown.length === 1 ? "member" : "members"}{dq || rank ? " found" : ""}
      </p>

      {shown.length === 0 ? (
        <div className="empty"><UsersRound size={32} aria-hidden="true" /><strong>No members found.</strong><span>Try a different name or rating.</span></div>
      ) : (
        <ul className="members">
          {shown.map((m) => (
            <li key={m.id} className="member">
              <div className="member__top">
                <Avatar name={m.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link className="member__name" href={`/members/${m.id}`}>{m.name}</Link>
                  <div className="member__email">{m.email}</div>
                </div>
                <ChevronRight size={18} className="member__chev" aria-hidden="true" />
              </div>
              <div className="chips">
                <RankChip rank={m.rank} />{m.archived && <span className="chip chip--warn">Archived</span>}
                {m.endorsements.map((e) => <EndorsementChip key={e} e={e} />)}
              </div>
              {m.tests.length > 0 && (
                <div className="member__tests">
                  <span className="member__tests-label">In progress</span>
                  {m.tests.map((t) => (
                    <Link key={t.key} className="quick" href={`/members/${m.id}/${t.key}`}>
                      <span>{t.title}</span>
                      <ProgressBar done={t.done} total={t.total} thin label={false} />
                      <span className="quick__count">{t.done}/{t.total}</span>
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
