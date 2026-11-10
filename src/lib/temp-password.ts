import { randomInt } from "node:crypto";

const CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/O or 1/l/I, easy to read aloud

/** Server-side readable random password like "k7mp-x3qa-9rvt", used to pre-fill new-account forms. */
export function tempPassword() {
  const part = () => Array.from({ length: 4 }, () => CHARS[randomInt(CHARS.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}
