import { BadgeCheck } from "lucide-react";
import type { Endorsement, Rank } from "@/lib/tests";
import { ENDORSEMENT_LABEL, RANK_LABEL } from "@/lib/tests";

export const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

const hue = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 6;
};

export function Avatar({ name, size }: { name: string; size?: "sm" | "lg" | "xl" }) {
  return (
    <span className={`avatar${size ? ` avatar--${size}` : ""}`} data-hue={hue(name)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function RankChip({ rank, large }: { rank: Rank; large?: boolean }) {
  return <span className={`chip chip--rank${large ? " chip--lg" : ""}`}>{RANK_LABEL[rank]}</span>;
}

export function EndorsementChip({ e, large }: { e: Endorsement; large?: boolean }) {
  return (
    <span className={`chip chip--end${large ? " chip--lg" : ""}`}>
      <BadgeCheck size={large ? 15 : 13} aria-hidden="true" />{ENDORSEMENT_LABEL[e]}
    </span>
  );
}

export function ProgressBar({ done, total, thin, label = true }: { done: number; total: number; thin?: boolean; label?: boolean }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress">
      <div className={`pbar${thin ? " pbar--thin" : ""}`} data-complete={total > 0 && done === total}
        role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label={`${done} of ${total} signed`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {label && <span className="progress__label">{done}/{total} signed</span>}
    </div>
  );
}

export function ProgressRing({ done, total, size = 60, stroke = 6 }: { done: number; total: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="ring" data-complete={total > 0 && done === total} style={{ width: size, height: size }}
      role="img" aria-label={`${done} of ${total} items signed`}>
      <svg width={size} height={size} aria-hidden="true">
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle className="ring__value" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className="ring__label" style={{ fontSize: Math.round(size * 0.24) }}>{Math.round(pct * 100)}%</span>
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, actions }: {
  eyebrow?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="page-head__text">
        {eyebrow && <div className="page-head__eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions}
    </div>
  );
}
