// SLA math for the portal. Pure functions, ported from prototype/portal-mvp.html.
// Business rules live in CLAUDE.md and docs/es/how-it-works.md; change them only with the owner's approval.

export const SLA = {
  windowDays: 60,
  floor: 12,
  target: 18,
  bonus: 25,
  offTop10Share: 0.3,
  clawbackShare: 0.2,
  inpGoalMs: 200,
} as const;

// Below this many interactions in 28 days, a p75 is not reliable and the portal says so (UI heuristic, not an SLA rule).
export const MIN_INP_SAMPLE = 50;

const MS_PER_DAY = 864e5;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export const addDays = (iso: string, days: number) =>
  new Date(utc(iso) + days * MS_PER_DAY).toISOString().slice(0, 10);

export const todayUtc = (now: Date = new Date()) => now.toISOString().slice(0, 10);

/** Day number inside the 60-day window, starting at 1 and capped at the window length. */
export function windowDay(frozenFrom: string, today: string = todayUtc()): number {
  const day = Math.round((utc(today) - utc(frozenFrom)) / MS_PER_DAY) + 1;
  return Math.min(Math.max(day, 1), SLA.windowDays);
}

export const windowEnd = (frozenFrom: string) => addDays(frozenFrom, SLA.windowDays - 1);

/** Straight-line projection of the citation count to the end of the window. */
export function projectCitations(cited: number, day: number): number {
  return Math.round((cited / day) * SLA.windowDays);
}

export const share = (part: number, whole: number) => (whole ? part / whole : 0);

export type Tone = "good" | "neutral" | "bad";

export function slaStatus(args: { cited: number; day: number; feeUsd?: number | null }): { tone: Tone; text: string } {
  const { cited, day, feeUsd } = args;
  const { floor, target, bonus, clawbackShare, windowDays } = SLA;
  const projected = projectCitations(cited, day);
  const daysLeft = windowDays - day;

  if (projected >= bonus) return { tone: "good", text: `On pace for the bonus at ${bonus}.` };
  if (projected >= target) {
    return {
      tone: "good",
      text: `On pace for the target of ${target}. The bonus needs ${bonus - cited} more in ${daysLeft} days.`,
    };
  }
  if (cited >= floor) {
    return {
      tone: "neutral",
      text: `SLA floor of ${floor} already met. The target of ${target} needs ${target - cited} more in ${daysLeft} days.`,
    };
  }
  if (projected >= floor) {
    return {
      tone: "neutral",
      text: `On pace to clear the SLA floor of ${floor}, not the target of ${target}. ${floor - cited} more needed for the floor in ${daysLeft} days.`,
    };
  }
  const credit = feeUsd
    ? ` A ${clawbackShare * 100}% credit ($${Math.round(feeUsd * clawbackShare).toLocaleString("en-US")}) would apply.`
    : ` A ${clawbackShare * 100}% fee credit would apply.`;
  return { tone: "bad", text: `Clawback risk: projected below ${floor}.${credit}` };
}

/** Position on the citation ruler (0 to 30 citations) as a percentage. */
export const rulerPct = (value: number, max = 30) => (Math.min(value, max) / max) * 100;

/** Citation rate: share of checks with an AI answer in which the client was cited. */
export const citationRate = (checksCited: number, checksWithAi: number) => share(checksCited, checksWithAi);

/**
 * The INP SLA is judged on two full 28-day CrUX windows, counted from the day after the sprint deploy.
 * daysCollected is how many days of each window have already happened.
 */
export function cruxWindows(deployedOn: string, today: string = todayUtc()) {
  return [0, 1].map((i) => {
    const start = addDays(deployedOn, 1 + i * 28);
    const end = addDays(start, 27);
    const daysCollected = Math.min(Math.max(Math.round((utc(today) - utc(start)) / MS_PER_DAY) + 1, 0), 28);
    const state = daysCollected === 0 ? "not_started" : daysCollected < 28 ? "collecting" : "closed";
    return { index: i + 1, start, end, daysCollected, state } as const;
  });
}

// Tag Bouncer ----------------------------------------------------------------

export const TAG_ACTIONS = {
  keep: { label: "Keep as is", factor: 0 },
  load_on_first_interaction: { label: "Load on first interaction", factor: 0.8 },
  move_server_side: { label: "Move server-side", factor: 0.7 },
  remove: { label: "Remove", factor: 1 },
} as const;
export type TagAction = keyof typeof TAG_ACTIONS;

/** Rough INP estimate: assumes half of the blocking time overlaps other work. Always shown as an estimate. */
export function tagEstimate(currentInpMs: number, scripts: { blockingMs: number; action: TagAction }[]) {
  const raw = scripts.reduce((sum, s) => sum + s.blockingMs * TAG_ACTIONS[s.action].factor, 0);
  const saving = Math.round(raw * 0.5);
  return { saving, projected: currentInpMs - saving };
}
