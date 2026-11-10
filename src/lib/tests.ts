// The 2026 TISC testing sheets, transcribed verbatim from "2026 TISC Handbook - FORMS" (v1.3, 03 May 2026).
// These are the DEFAULT sheet contents. The testing committee can edit a sheet's content in the app
// (stored in the test_sheets table); eligibility and what a sheet grants stay here in code.
//
// Detail-line conventions (used by the sheet renderer and editor):
//   "text"     → bullet ("- text" on the paper sheet)
//   "> text"   → plain line, no bullet
//   "## TEXT"  → bold sub-heading inside the same sign-off box

export type Rank = "novice" | "helms" | "sr_helms" | "skipper";
export type Endorsement = "hobie" | "laser";
export const RANKS: Rank[] = ["novice", "helms", "sr_helms", "skipper"];
export const RANK_LABEL: Record<Rank, string> = { novice: "Novice", helms: "Helms", sr_helms: "Sr. Helms", skipper: "Skipper" };
export const ENDORSEMENTS: Endorsement[] = ["hobie", "laser"];
export const ENDORSEMENT_LABEL: Record<Endorsement, string> = { hobie: "Hobie Wave", laser: "Laser" };

/** Skippers automatically hold every endorsement (Laser and Hobie rights), whether or not it's stored. */
export function effectiveEndorsements(rank: Rank, stored: readonly Endorsement[]): Endorsement[] {
  return rank === "skipper" ? [...ENDORSEMENTS] : ENDORSEMENTS.filter((e) => stored.includes(e));
}

export type CreditKind = "cansail2" | "cansail3" | "fasttrack";
export const CREDIT_KINDS: CreditKind[] = ["cansail2", "cansail3", "fasttrack"];
export const CREDIT_MARK: Record<CreditKind, string> = { cansail2: "②", cansail3: "③", fasttrack: "🅕" };
export const CREDIT_LABEL: Record<CreditKind, string> = {
  cansail2: "Cansail 2 credit (Education Exec to confirm)",
  cansail3: "Cansail 3 credit (Education Exec to confirm)",
  fasttrack: "Fast Track credit (Testing Committee to confirm)",
};

export interface Item { key: string; title: string; details: string[]; credit?: CreditKind }
export interface Section { key: string; title: string; note?: string; items: Item[] }

/** The part of a sheet the testing committee may edit. */
export interface SheetContent {
  title: string;
  minBaseWind?: number;
  notes: string[];
  sections: Section[];
}
/** Fixed progression rules for a sheet (not editable in the app). */
export interface TestRules {
  key: string;
  sheetVersion: string;
  eligibleRanks: Rank[];
  grants: { rank?: Rank; endorsement?: Endorsement };
}
export interface TestDef extends TestRules, SheetContent {
  revision: number; // 0 = handbook default, >0 = committee edits
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
const item = (title: string, details: string[] = [], credit?: CreditKind): Item => ({ key: slug(title), title, details, credit });
const section = (title: string, items: Item[], note?: string): Section => ({ key: slug(title), title, note, items });
const prerequisite = (text: string) => section("PREREQUISITE", [item(text)]);

const STAR_COACHING = "✭ Coaching must be kept separate from testing";
const STAR_REEF = "✭ This test must not be conducted using reefed sails";
const FAST_TRACK = "🅕 Automatic credit for Fast Track eligible candidates (see Handbook); any Testing Committee member to confirm.";
const STAR_FEEDBACK = "✭ Coaching must be kept separate from testing. Feedback during a testing session is acceptable, but demonstrating a skill while also testing that skill in the same session is not acceptable";
const POB_NOTE = "NOTE: Coaching and testing must be separated by at least 1 day";
const REPAIR_NOTE = "If sailing membership is maintained, repairs sign-offs can carry across seasons with any testing committee member confirming";

const ROW = () => item("KNOWS BASIC RIGHT-OF-WAY RULES", [
  "When sailboats meet on same tack; opposite tacks",
  "Meeting powerboats; commercial vessels",
  "While Tacking, Gybing, Overtaking",
]);
const SAFETY = () => item("GENERAL SAFETY", [
  "Knows how to contact police and emergency services",
  "Knows how to obtain weather information & demonstrates awareness of its relation to sailing",
]);
const HYPO = () => item("HYPOTHERMIA AND CONCUSSIONS", [
  "Understands hypothermia, its symptoms and treatment",
  "Understands concussion protocol",
]);
const repairs = (): Item[] => [
  item("MINOR REPAIR", ["e.g. replacing the gasket on the transom bailers, replacing the hiking straps, replacing a cleat, ..."], "fasttrack"),
  item("MAJOR REPAIR", ["e.g. Repairing fiberglass, resealing a tank, installing new equipment, ..."], "fasttrack"),
];
const SAFETY_EQUIP = () => item("REQUIRED SAFETY EQUIPMENT", ["List all required safety equipment and demonstrate appropriate stowage of equipment"]);
const KNOTS = () => item("KNOTS", [
  "Tie a bowline, reef knot, round turn and two half hitches, sheet bend, and figure eight knot",
  "Explain when each knot should be used",
]);
const THROW = () => item("PROPER THROWING OF A LINE");
const CLOSE_QUARTERS = () => item("DEMONSTRATES SAILING IN CLOSE QUARTERS", ["Full controlled sailing around a tight figure-8 course involving 2 buoys"]);
const IRONS = (credit?: CreditKind) => item("MANEUVERS BOAT OUT OF IRONS", ["Demonstrates how to get out of irons both by using the jib and by sculling"], credit);
const HEAVE_TO = () => item("DEMONSTRATES THE HEAVE-TO MANEUVER");
const DOCK = (credit?: CreditKind) => item("LEAVES FROM AND RETURNS TO DOCK", [
  "Explain when to launch from either side of dock",
  "Demonstrate raising of sails and on-water rigging of boat",
  "Safely leave the dock taking into account traffic",
  "Explain and demonstrate appropriate place to lower main sail on returning to dock",
  "Return to the dock, stopping the boat without colliding into the dock or other boats",
], credit);
const POINTS = (credit?: CreditKind) => item("KNOWS POINTS OF SAIL", [
  "Demonstrate the following points of sail: close-haul, close reach, broad reach, beam reach, run",
  "Demonstrate appropriate sail trim for each point of sail",
  "Maintain close-hauled, beam reach, and running courses for two minutes, demonstrating appropriate boat handling (deviation for traffic is allowed)",
  "Demonstrate wing-on-wing running",
  "Demonstrates ability to navigate to different locations using appropriate points of sail",
], credit);
const TACKS = (deg: string, credit?: CreditKind) => item("TACKS, GYBES AND BEATS TO WINDWARD", [
  `Tack without oversteering ${deg} 20°, return to close-hauled course within 20 seconds of completing tack`,
  `Gybe while maintaining a flat or leeward heel without oversteering ${deg} 20°, and return to a run within 20 seconds of completing the gybe`,
  "Demonstrates telltale reading and is able to maintain a close-hauled course through wind shifts",
], credit);
const POB_6_OF_8 = () => item("PERFORMS PERSON-OVERBOARD (POB) MANEUVER", [
  "Performs the maneuver starting on close-haul, beam reach, and run",
  "Return to person overboard within 2 minutes & completely stop the boat",
  "Must pass at least 6 out of 8 attempts",
  POB_NOTE,
]);
const CAPSIZE = (credit?: CreditKind) => item("LEAD THE RECOVERY FROM A CAPSIZE OF A FULLY TURTLED BOAT", [
  "Ensure that crew is safe after capsize",
  "Right the boat in a timely manner for the prevailing conditions without re-capsizing",
  "Bail the boat using auto-bailers",
], credit);
const CARE_OF_FLEET = () => item("TISC CARE-OF-FLEET REGULATIONS", [
  "How to proceed if boat damage occurs",
  "Demonstrate care for TISC equipment throughout the test",
]);

type Default = TestRules & SheetContent;

const helms: Default = {
  key: "helms", sheetVersion: "2026", eligibleRanks: ["novice"], grants: { rank: "helms" },
  title: "Helms", minBaseWind: 7,
  notes: [
    STAR_COACHING, STAR_REEF,
    "②  Automatic credit for candidates who pass Cansail 2 in the current season; Education Exec to confirm",
    FAST_TRACK,
  ],
  sections: [
    section("SECTION A: SAILING SKILLS", [
      DOCK("cansail2"), POINTS("cansail2"), TACKS("more than", "cansail2"), IRONS("cansail2"),
      HEAVE_TO(), POB_6_OF_8(), CLOSE_QUARTERS(), CAPSIZE("cansail2"),
    ], "Check with the candidates social sailing skipper before signing off items in this section"),
    section("SECTION B: BOAT MAINTENANCE  🅕", repairs(), REPAIR_NOTE),
    section("SECTION C: CLUB KNOWLEDGE & SAFETY", [
      item("UNDERSTANDS TISC SAILING REGULATIONS", ["Explain the who can sail with whom rules as it relates to helms"]),
      ROW(), SAFETY(), HYPO(),
    ]),
    section("SECTION D: BOAT KNOWLEDGE", [
      CARE_OF_FLEET(),
      item("RIGGING AND DERIGGING", ["Rig and derig a boat for sailing, unassisted; note: no wind limit for this test"], "cansail2"),
      SAFETY_EQUIP(),
      item("BOAT TERMINOLOGY", ["Name the three sides and three corners of the sail", "Name at least 12 majors boat parts, at the discretion of the examiner"]),
      KNOTS(), THROW(),
    ]),
  ],
};

const srHelms: Default = {
  key: "sr_helms", sheetVersion: "2026", eligibleRanks: ["helms"], grants: { rank: "sr_helms" },
  title: "Senior Helms", minBaseWind: 10,
  notes: [
    STAR_COACHING, STAR_REEF,
    "③ Automatic credit for candidates who passed Cansail 3 in the current or previous season; Education exec to confirm",
  ],
  sections: [
    prerequisite("Candidate is currently a Helms"),
    section("SECTION A: SAILING SKILLS", [
      DOCK("cansail3"), POINTS("cansail3"), TACKS("over", "cansail3"), IRONS(),
      HEAVE_TO(), POB_6_OF_8(), CLOSE_QUARTERS(), CAPSIZE(),
    ]),
  ],
};

const skipper: Default = {
  key: "skipper", sheetVersion: "2026", eligibleRanks: ["helms", "sr_helms"], grants: { rank: "skipper" }, // Helms may go straight to Skipper
  title: "Skipper", minBaseWind: 10,
  notes: [STAR_COACHING, STAR_REEF, FAST_TRACK],
  sections: [
    section("SECTION A: SAILING SKILLS", [
      item("LEAVES FROM AND RETURNS TO DOCK", [
        "Explain when to launch from either side of dock",
        "Demonstrate raising of sails and on-water rigging of boat",
        "Safely leave the dock taking into account traffic",
        "Explain and demonstrate appropriate place to lower main sail on returning to dock",
        "Return to the dock, stopping the boat without colliding into the dock or other boats",
        "Use of paddles to return to the dock is not permitted",
      ]),
      item("KNOWS POINTS OF SAIL", [
        "Demonstrate the following points of sail: close-haul, close reach, broad reach, beam reach, run",
        "Demonstrate appropriate sail trim for each point of sail",
        "Maintain close-hauled, beam reach, and running courses for four minutes, demonstrating appropriate boat handling (deviation for traffic is allowed)",
        "Demonstrate wing-on-wing running using the jib stick",
        "Adjust centerboard position for each point of sail",
        "Explain and demonstrate control settings for each point of sail",
        "Demonstrate ability to navigate to different locations using appropriate points of sail",
        "Demonstrate course changes heading and down between all points of sail with properly trimmed sails throughout the turn",
      ]),
      IRONS(),
      item("TACKS, GYBES AND BEATS TO WINDWARD", [
        "Tack without oversteering more than 10°, return to close-hauled course within 10 seconds of completing tack",
        "Gybe while maintaining a flat or leeward heel without oversteering more than 10°, and return to a run within 10 seconds of completing the gybe, including using the jib stick",
        "Demonstrates telltale reading and is able to maintain a close-hauled course through wind shifts",
        "Explain and demonstrate depowering for close-hauled sailing",
        "No rocking during tacks or gybes",
      ]),
      HEAVE_TO(),
      item("PERFORMS PERSON-OVERBOARD (POB) MANEUVER", [
        "Performs the maneuver starting on close-haul, beam reach, and run",
        "Return to person overboard & completely stop the boat",
        "Complete a minimum of 8 out of 10 POB attempts",
        POB_NOTE,
      ]),
      item("CONCISELY INSTRUCTS NOVICE CREW IN THEIR DUTIES", [
        "Examiner shall act as a first time sailor throughout the test",
        "Maintain a safe and supportive environment for crew",
      ]),
      item("LEAVES FROM AND RETURNS TO BEACH", [
        "Explains appropriate beach launch and return for different wind directions",
        "Leaves from and returns to the beach, demonstrating proper technique for existing conditions",
        "Explains differences in technique for different possible wind directions",
        "Avoids any contact with the ground",
      ]),
      item("DEMONSTRATES PROPER WEIGHT PLACEMENT IN THE BOAT", [
        "Candidate stays in hiking straps while sailing close-haul or reaching",
        "Maintain a near flat boat through the entire test by instructing examiner on weight placement",
      ]),
      item("LOWERS AND RAISES THE MAINSAIL ON THE WATER", [
        "Demonstrates appropriate technique and orientation relative to the wind",
        "Examiner may assist but only if given instruction",
      ]),
      item("CONTROLS THE BOAT WITHOUT A RUDDER, MAINSAIL, OR A JIB", [
        "Sail competently on all points of sail with the rudder raised out of the water",
        "Demonstrate clean tacks and gybes with the rudder raised out of the water",
        "Sail a reach and run with the main lowered.",
        "Sail on all points of sail, tack, and gybe with the jib furled and no assistance from the instructor (simulating no crew on board)",
        POB_NOTE,
      ]),
      CLOSE_QUARTERS(),
    ]),
    section("SECTION B: CAPSIZE RECOVERY", [
      item("LEAD THE RECOVERY FROM A CAPSIZE OF A FULLY TURTLED BOAT", [
        "Ensure that crew is safe after capsize",
        "Right the boat in a timely manner for the prevailing conditions",
        "Right the boat without re-capsizing",
        "Bail the boat using auto-bailers",
        "> Note: a conditional pass may be awarded early in the season subject to the capsize recovery being completed when the water is at a safe temperature.",
      ]),
    ]),
    section("SECTION C: BOAT MAINTENANCE  🅕", repairs(), REPAIR_NOTE),
    section("SECTION D: CLUB KNOWLEDGE AND SAFETY", [
      item("UNDERSTANDS TISC SAILING REGULATIONS", ["Explain the who can sail with whom rules as it relates to at least 2 levels of sailing"]),
      ROW(), SAFETY(), HYPO(),
      item("UNDERSTANDS THE SKIPPER’S DUTIES AND RESPONSIBILITIES", [
        "Understands Skippers are expected to be paired with Novices for social sailing",
        "Sets a good example for all members by respecting, following and upholding the club rules on and off the water",
        "Consistently demonstrates good judgement & mature decision making that considers the care and safety of both crew members and club equipment",
      ]),
    ]),
    section("SECTION E: BOAT KNOWLEDGE", [
      item("TISC CARE-OF-FLEET REGULATIONS", [
        "Answer at least 3 questions from TISC care-of-fleet regulations from the TISC Handbook",
        "Demonstrate care for TISC equipment throughout the test",
      ]),
      item("RIGGING AND DERIGGING", ["Rig and derig a boat for sailing, unassisted"]),
      SAFETY_EQUIP(),
      item("BOAT TERMINOLOGY", ["Name the three sides and three corners of the sail", "Name at least 20 majors boat parts, at the discretion of the examiner"]),
      KNOTS(), THROW(),
    ]),
  ],
};

const laser: Default = {
  key: "laser", sheetVersion: "2026", eligibleRanks: ["helms", "sr_helms"], grants: { endorsement: "laser" }, // skippers already hold Laser rights
  title: "Laser Helms",
  notes: [STAR_FEEDBACK],
  sections: [
    prerequisite("Candidate is currently a Helms or Senior Helms"),
    section("SECTION A: CLUB KNOWLEDGE AND SAFETY", [item("UNDERSTANDS TISC SAILING REGULATIONS", ["Explain the regulations associated with sailing Lasers"])]),
    section("SECTION B: BOAT KNOWLEDGE", [item("RIGGING AND DERIGGING", ["Rig and derig a laser for sailing, unassisted"])]),
  ],
};

// Note: the handbook also has a "Laser-Only Helms" sheet for non-Helms. TISC's progression requires Helms
// status for Laser rights, so that sheet is intentionally not offered in the app.

const hobie: Default = {
  key: "hobie", sheetVersion: "2026", eligibleRanks: ["helms", "sr_helms"], grants: { endorsement: "hobie" }, // skippers already hold Hobie rights
  title: "Hobie Wave Helms",
  notes: [STAR_FEEDBACK, "✭ This test is specifically for the hobie wave; only skippers can access the hobie getaway"],
  sections: [
    prerequisite("Candidate is currently a Helms or Senior Helms"),
    section("SECTION A: CLUB KNOWLEDGE AND SAFETY", [item("UNDERSTANDS TISC SAILING REGULATIONS", ["Explain the regulations associated with sailing Hobies"])]),
    section("SECTION B: BOAT KNOWLEDGE", [
      item("RIGGING AND DERIGGING", [
        "Rig and derig a Hobie for sailing, unassisted",
        "> Tips:",
        "Ensure rudder cams are in “up” position, ready to be engaged,  before leaving beach",
        "lock halyard in place at top of mast",
        "Do not let halyard run up the mast when de-rigging!",
      ]),
    ]),
    // On the paper sheet these two headings share a single signature box.
    section("SECTION C: SAILING SKILLS", [
      item("LEAVES FROM AND RETURNS TO BEACH", [
        "Safely leave the beach taking into account traffic",
        "Return to the beach, stopping the boat without colliding with  other boats or running aground",
        "## UNDERSTANDS/CAN EXPLAIN SPECIFICS OF HOBIE SAILING",
        "Boat does not point high when traveling close-hauled upwind (35-50 degrees max)",
        "Tacks must be smooth and attempted at max acceleration in order to avoid being stuck in irons",
        "Backwind the jib to assist in tacking through the wind",
        "Paddling on the windward side may be needed to get pontoons through the wind when tacking",
        "Always keep the helm and crew weight towards the back of the boat to keep the pontoon bows from nose diving (to avoid a pitchpole). Especially in waves!",
      ]),
    ]),
    section("SECTION D: CAPSIZE RECOVERY", [
      item("RECOVER FROM A CAPSIZE OF A FULLY TURTLED HOBIE", [
        "Turn the boat into the wind",
        "Right the boat in a timely manner for the prevailing conditions without re-capsizing",
        "Be sure to maneuver body under the trampoline (NOT a pontoon) when righted boat is landing back on water",
        "Get back on boat without re-capsizing  (From front of pontoons or trampoline)",
      ]),
    ]),
  ],
};

export const DEFAULT_TESTS: Default[] = [helms, srHelms, skipper, laser, hobie];
export const TEST_KEYS = DEFAULT_TESTS.map((t) => t.key);
export const RULES_BY_KEY: Record<string, TestRules> = Object.fromEntries(
  DEFAULT_TESTS.map(({ key, sheetVersion, eligibleRanks, grants }) => [key, { key, sheetVersion, eligibleRanks, grants }]));
export const DEFAULT_BY_KEY: Record<string, TestDef> = Object.fromEntries(DEFAULT_TESTS.map((t) => [t.key, { ...t, revision: 0 }]));

export const contentOf = (t: SheetContent): SheetContent => ({ title: t.title, minBaseWind: t.minBaseWind, notes: t.notes, sections: t.sections });
export const allItems = (t: Pick<SheetContent, "sections">): Item[] => t.sections.flatMap((s) => s.items);
export const itemCount = (t: Pick<SheetContent, "sections">) => allItems(t).length;
export const sheetHeading = (t: TestDef) => `${t.sheetVersion} ${t.title.toUpperCase()} TESTING SHEET`;
const CIRCLED = ["⓪","①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮","⑯","⑰","⑱","⑲","⑳"];
export const circled = (n: number) => CIRCLED[n] ?? String(n);
