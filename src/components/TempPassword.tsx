"use client";

import { useState } from "react";

const CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/O or 1/l/I, easy to read aloud

/** A readable random password like "k7mp-x3qa-9rvt" (crypto-random, ~60 bits). */
export function generateTempPassword() {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const c = Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

/**
 * Temporary-password input with a "Generate" button.
 * `initial` pre-fills it (new accounts); leave it empty for resets so saving doesn't change the password.
 */
export function TempPassword({ name = "password", initial = "", required = false, placeholder, label }: {
  name?: string; initial?: string; required?: boolean; placeholder?: string; label?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <span className="temp-password row">
      <input name={name} type="text" value={value} onChange={(e) => setValue(e.target.value)} required={required}
        minLength={8} placeholder={placeholder} autoComplete="off" aria-label={label ?? "Temporary password"} className="grow" />
      <button type="button" className="secondary" onClick={() => setValue(generateTempPassword())}>Generate</button>
    </span>
  );
}
