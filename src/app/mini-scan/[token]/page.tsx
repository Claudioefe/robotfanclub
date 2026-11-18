import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { AutoRefresh } from "@/components/miniscan/AutoRefresh";
import { Badge, Dim, TableWrap, Td, Th } from "@/components/ui";
import { gapRows, outreachText, topCompetitors } from "@/lib/miniscan/core";
import { getScanByToken } from "@/lib/miniscan/ops";
import { createAdminClient } from "@/lib/supabase/admin";

// A private result: reachable only with the unguessable link, and kept out of search engines.
export const metadata: Metadata = { title: "Your scan · Robot Fan Club", robots: { index: false, follow: false } };

export default async function ScanResultPage({ params }: PageProps<"/mini-scan/[token]">) {
  const { token } = await params;
  const scan = await getScanByToken(createAdminClient(), token);
  if (!scan) notFound();

  const waiting = scan.status === "pending" || scan.status === "running";
  const r = scan.result;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm">
        <Link href="/">← Robot Fan Club</Link>
      </p>
      <h1 className="mt-6 text-[clamp(24px,3.4vw,34px)] font-semibold leading-tight tracking-tight">Citation gap for {scan.domain}</h1>

      {scan.simulated && (
        <p className="mt-4 max-w-[64ch] rounded-lg border border-line bg-bad-soft px-3.5 py-2.5 text-sm font-medium text-bad">
          Simulated data. These results are made up for testing and say nothing about this domain.
        </p>
      )}

      {waiting && (
        <>
          <AutoRefresh />
          <p className="mt-8 text-xl font-medium">{scan.status === "pending" ? "Your scan is in the queue." : "Your scan is running."}</p>
          <p className="mt-2 max-w-[60ch] text-muted">
            We are checking {scan.queryCount} {scan.queryCount === 1 ? "query" : "queries"} in Google. This page updates by itself. Keep this link: it is the only way back to your result.
          </p>
        </>
      )}

      {scan.status === "failed" && (
        <p className="mt-8 max-w-[60ch] text-lg text-bad">
          The scan could not be completed. <Link href="/mini-scan">Try again</Link> in a little while.
        </p>
      )}

      {scan.status === "done" && r && (
        <>
          <p className="mb-2.5 mt-10 max-w-[20ch] text-[clamp(32px,5.4vw,56px)] font-semibold leading-[1.04] tracking-tighter">
            {gapRows(r).length} of {r.checked} queries.
          </p>
          <p className="max-w-[44ch] text-[clamp(18px,2.2vw,24px)] font-medium leading-snug text-muted">
            Google answers {r.withAi} of them with AI and cites {scan.domain} in {r.cited}. In the other {gapRows(r).length}, the AI answer cites someone else.
          </p>
          {r.failed > 0 && <p className="mt-3 text-sm text-muted">{r.failed} {r.failed === 1 ? "query" : "queries"} could not be checked and {r.failed === 1 ? "is" : "are"} left out.</p>}

          {topCompetitors(r).length > 0 && (
            <p className="mt-6 text-sm text-muted">
              Cited instead most often: {topCompetitors(r).map((t) => `${t.domain} (${t.count})`).join(", ")}.
            </p>
          )}

          <div className="mt-6">
            <CopyButton text={outreachText(scan.domain, r)} label="Copy summary" small={false} ghost={false} />
          </div>

          <div className="mt-6">
            <TableWrap minWidth={640}>
              <thead>
                <tr>
                  <Th>Query</Th>
                  <Th>AI answer</Th>
                  <Th>{scan.domain} cited</Th>
                  <Th>Cited instead</Th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((row) => (
                  <tr key={row.query}>
                    <Td className="min-w-[220px] font-medium">{row.query}</Td>
                    <Td>{row.error ? <Dim>Not checked</Dim> : row.aiAnswer ? "Yes" : <Dim>No</Dim>}</Td>
                    <Td>{row.error ? <Dim>—</Dim> : row.cited ? <Badge kind="off">Cited</Badge> : row.aiAnswer ? <Badge kind="bad">Gap</Badge> : <Dim>No AI answer</Dim>}</Td>
                    <Td>{row.others.length ? row.others.slice(0, 4).join(", ") : <Dim>—</Dim>}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
          <p className="mt-4 max-w-[70ch] text-[13.5px] text-muted">
            Checked in Google AI Overviews, US, English, on a phone. A page counts as cited when it appears among the AI answer’s sources.
          </p>
        </>
      )}
    </main>
  );
}
