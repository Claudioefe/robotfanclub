// "Oct 11, 2026" from an ISO date (YYYY-MM-DD) or timestamp. UTC, so server and browser agree.
export const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtPct = (ratio: number) => `${Math.round(ratio * 100)}%`;
