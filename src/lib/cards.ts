// Citation Card text. Shared by the portal ("Copy for Slack") and, in Phase 6, the Slack webhook.
import { fmtDate } from "./format";

export interface CardText {
  clientName: string;
  query: string;
  url: string | null;
  position: number | null;
  total: number | null;
  organicRank: number | null;
  offTop10: boolean;
  firstSeen: string;
}

export const rankText = (organicRank: number | null) =>
  organicRank ? `Organic rank ${organicRank}` : "Not in the organic top 10";

export function slackText(c: CardText): string {
  const source = c.url ? `Source ${c.position ?? "?"} of ${c.total ?? "?"}: ${c.url.replace(/^https?:\/\//, "")}` : null;
  return [
    `:bookmark: ${c.clientName} was cited in Google’s AI answer`,
    `Query: “${c.query}”`,
    source,
    rankText(c.organicRank) + (c.offTop10 ? " (cited from outside the top 10)" : ""),
    `First seen: ${fmtDate(c.firstSeen)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
