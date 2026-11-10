import { chromium } from "playwright-core";
// End-to-end walkthrough. Needs a FRESH database and the app running at BASE_URL.
//   CHROME_PATH=/usr/bin/chromium npm run e2e
import fs from "node:fs";
const BASE = process.env.BASE_URL ?? "http://localhost:3100", OUT = "e2e-output";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("ok -", m); };
const page = async () => { const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); return ctx.newPage(); };
// Admin-created accounts get a temporary password and must choose their own on first sign-in.
const TEMP_PW = "password123", OWN_PW = "my-own-password";
const passwords = {}; // email -> current password, once changed
const changePassword = async (p, current, next, confirm = next) => {
  await p.fill("input[name=current_password]", current);
  await p.fill("input[name=new_password]", next); await p.fill("input[name=confirm_password]", confirm);
  await p.click("button:has-text('Change password')");
};
const signIn = async (email, pw) => {
  const p = await page(); await p.goto(BASE + "/login");
  await p.fill("input[name=email]", email); await p.fill("input[name=password]", pw);
  await Promise.all([p.waitForURL((u) => u.pathname === "/" || u.pathname === "/account" || u.searchParams.has("error")), p.click("button:has-text('Sign in')")]);
  return p;
};
const login = async (email) => {
  const p = await signIn(email, passwords[email] ?? TEMP_PW);
  if (new URL(p.url()).pathname === "/account") { // forced change: pick a new password and keep using it
    await Promise.all([p.waitForURL(BASE + "/?password=changed"), changePassword(p, passwords[email] ?? TEMP_PW, OWN_PW)]);
    passwords[email] = OWN_PW;
  }
  if (new URL(p.url()).pathname !== "/") throw new Error(`FAIL: could not sign in as ${email} (${p.url()})`);
  return p;
};

// 1. first-time setup
let p = await page();
await p.goto(BASE + "/"); ok(p.url().endsWith("/setup"), "fresh DB redirects to /setup");
await p.fill("input[name=name]", "Commodore"); await p.fill("input[name=email]", "someone@else.com"); await p.fill("input[name=password]", "password123");
await p.click("button"); await p.waitForURL(/error=/); ok((await p.textContent(".flash.error")).includes("designated"), "non-admin email rejected");
await p.fill("input[name=name]", "Commodore"); await p.fill("input[name=email]", "commodore@torontosailing.com"); await p.fill("input[name=password]", "password123");
await Promise.all([p.waitForURL(BASE + "/"), p.click("button")]); ok(true, "admin created and signed in");
await p.goto(BASE + "/setup"); ok(p.url().includes("/login") || p.url() === BASE + "/", "setup page closed after first user");

// 2. admin creates users
await p.goto(BASE + "/admin/users");
for (const [name, email, role, rank] of [["Cora Committee","c@x.com","committee","sr_helms"],["Sam Skipper","s@x.com","member","skipper"],["Nina Novice","n@x.com","member","novice"],["Hal Helms","h@x.com","member","helms"]]) {
  const f = p.locator("form").filter({ has: p.locator("button:has-text('Add')") });
  await f.locator("input[name=name]").fill(name); await f.locator("input[name=email]").fill(email);
  await f.locator("input[name=password]").fill("password123");
  await f.locator("select[name=role]").selectOption(role); await f.locator("select[name=rank]").selectOption(rank);
  await f.locator("button").click(); await p.waitForSelector(`input[value="${name}"]`);
}
ok((await p.locator("input[name=name][value]").count()) === 5, "4 users created");
await p.goto(BASE + "/account"); ok(new URL(p.url()).pathname === "/account" && !(await p.textContent("main")).includes("set by an administrator"),
  "first admin (from /setup) is not forced to change password");

// 2b. forced password change for admin-created accounts
const h1 = await signIn("h@x.com", TEMP_PW);
ok(h1.url().startsWith(BASE + "/account?forced=1") && (await h1.textContent("main")).includes("set by an administrator"),
  "admin-created user is forced to /account on first sign-in");
await h1.goto(BASE + "/members/1"); ok(new URL(h1.url()).pathname === "/account", "other pages redirect to /account until changed");
const h2 = await signIn("h@x.com", TEMP_PW); // a second session for the same user
await changePassword(h1, "wrong-password", OWN_PW); await h1.waitForURL(/error=/);
ok((await h1.textContent("main .flash[role=alert]")).includes("Current password is incorrect"), "wrong current password rejected");
await changePassword(h1, TEMP_PW, OWN_PW, OWN_PW + "x"); await h1.waitForURL(/error=.*match/);
ok(true, "mismatched confirmation rejected");
await Promise.all([h1.waitForURL(BASE + "/?password=changed"), changePassword(h1, TEMP_PW, OWN_PW)]);
ok((await h1.textContent("main")).includes("Password changed"), "password changed; user lands on My progress");
passwords["h@x.com"] = OWN_PW;
await h1.goto(BASE + "/account"); ok(!(await h1.textContent("main")).includes("set by an administrator"), "no longer forced after changing");
await h2.goto(BASE + "/"); ok(h2.url().startsWith(BASE + "/login"), "other session signed out by password change");
const hOld = await signIn("h@x.com", TEMP_PW); ok(hOld.url().includes("error="), "old temporary password no longer works");
await h1.context().close(); await h2.context().close(); await hOld.context().close();

// 3. novice view
const n = await login("n@x.com");
const nb = await n.textContent("main");
ok(nb.includes("Helms") && nb.includes("Laser-Only Helms") && !nb.includes("Senior Helms"), "novice sees Helms + Laser-Only only");
const nid = n.url(); const nHelmsLink = await n.getAttribute("a[href$='/helms']", "href");
await n.goto(BASE + "/members"); ok(n.url() === BASE + "/", "novice cannot browse members");
await n.goto(BASE + nHelmsLink); ok((await n.locator("form button:has-text('Sign off')").count()) === 0, "novice cannot sign own sheet");
const hid = Number(nHelmsLink.split("/")[2]) + 1; // Hal was created right after Nina
await n.goto(`${BASE}/members/${hid}`); ok(n.url() === BASE + "/", "novice cannot view another member");

// 4. skipper
const s = await login("s@x.com");
await s.goto(BASE + nHelmsLink);
ok((await s.locator("button:has-text('Sign off')").count()) === 20, "skipper sees 20 sign-off buttons on Helms sheet");
ok((await s.locator("input[name=credit]").count()) === 0, "skipper can't record credits");
await s.locator("input[name=note]").first().fill("Good dock approach");
await s.locator("button:has-text('Sign off')").first().click();
await s.waitForSelector("text=Good dock approach"); ok(true, "skipper signed an item with note");
await s.goto(`${BASE}/members/${hid}/sr_helms`);
ok((await s.locator("button:has-text('Sign off')").count()) === 0, "skipper cannot administer Senior Helms");

// 5. committee finishes and completes
const c = await login("c@x.com");
await c.goto(BASE + nHelmsLink);
ok(await c.locator("button:has-text('Complete test')").isDisabled(), "complete disabled until all signed");
await c.locator("input[name=credit]").first().check();
await c.locator("button:has-text('Sign off')").first().click(); await c.waitForSelector("text=Cansail 2 credit");
ok(true, "committee recorded a Cansail credit");
// Sign everything left. Recount each time; React swaps the DOM after every server action.
const signBtn = c.locator("button:has-text('Sign off')");
for (let guard = 0; (await signBtn.count()) > 0 && guard < 40; guard++) {
  const before = await c.locator(".signed").count();
  await signBtn.first().click({ timeout: 10000 }).catch(() => {});
  await c.waitForFunction((n) => document.querySelectorAll(".signed").length > n, before, { timeout: 10000 }).catch(() => {});
  await c.waitForLoadState("networkidle");
}
ok((await signBtn.count()) === 0, "committee signed all remaining items");
await c.screenshot({ path: OUT + "/helms-sheet-signed.png", fullPage: true });
await Promise.all([c.waitForURL(/completed=1/), c.click("button:has-text('Complete test')")]);
ok((await c.textContent(".sheet")).includes("Cora Committee"), "test completed with final tester signature");

// 6. novice is now helms
await n.goto(BASE + "/"); const nb2 = await n.textContent("main");
ok(nb2.includes("Helms") && nb2.includes("Senior Helms") && nb2.includes("Hobie Wave Helms") && nb2.includes("Completed tests"), "promoted to Helms; Sr Helms/Hobie/Laser now available");
ok(!nb2.includes("Laser-Only"), "laser-only no longer offered");

// 7. committee edits hobie sheet
await c.goto(BASE + "/sheets/hobie");
await c.locator(".ed-item input[aria-label='Item title']").nth(1).fill("UNDERSTANDS TISC SAILING REGULATIONS (HOBIE)");
await c.locator(".ed-section").nth(1).locator("button:has-text('+ Add item')").click();
await c.locator(".ed-item input[aria-label='Item title']").nth(2).fill("NEW HOBIE CHECK");
await Promise.all([c.waitForURL(/saved=1/), c.click("button:has-text('Save as revision 1')")]);
await c.waitForSelector("text=Sheet saved.");
const hist = await c.textContent("main");
if (!hist.includes("Rev 1")) console.log("DEBUG main text:", hist.slice(-600));
ok(hist.includes("Rev 1"), "sheet saved as rev 1 with history");
await c.goto(`${BASE}${nHelmsLink.replace("helms", "hobie")}`);
const hs = await c.textContent(".sheet");
ok(hs.includes("(HOBIE)") && hs.includes("NEW HOBIE CHECK") && hs.includes("rev 1"), "edited sheet used for candidates");
await c.screenshot({ path: OUT + "/hobie-sheet-rev1.png", fullPage: true });

// 8. helms cannot edit sheets; committee can't sign own sheet
const h = await login("h@x.com"); await h.goto(BASE + "/sheets/hobie"); ok(h.url() === BASE + "/", "helms cannot edit sheets");
await c.goto(BASE + "/"); await c.click("a[href$='/skipper']");
ok((await c.locator("button:has-text('Sign off')").count()) === 0, "committee cannot sign their own sheet");

// 9. admin sets a new password for someone: their sessions end and they must change it again
await p.goto(BASE + "/admin/users");
const hRow = p.locator("form").filter({ has: p.locator('input[value="Hal Helms"]') });
await hRow.locator("input[name=password]").fill("reset-by-admin"); await hRow.locator("button:has-text('Save')").click();
await p.waitForLoadState("networkidle");
await h.goto(BASE + "/"); ok(h.url().startsWith(BASE + "/login"), "admin password reset signs the user out");
const hReset = await signIn("h@x.com", "reset-by-admin"); ok(hReset.url().startsWith(BASE + "/account?forced=1"), "admin-set password must be changed again");
await p.goto(BASE + "/admin/users"); ok(new URL(p.url()).pathname === "/admin/users", "admin still signed in");
await b.close(); console.log("ALL PASSED");
