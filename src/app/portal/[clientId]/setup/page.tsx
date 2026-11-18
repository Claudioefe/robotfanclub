import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader, Section } from "@/components/ui";
import { getClient } from "@/lib/portal/data";
import { WEB_VITALS_VERSION, buildSnippet } from "@/lib/snippet";

export default async function Setup({ params }: PageProps<"/portal/[clientId]/setup">) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();

  // Where the snippet sends events. Separate from NEXT_PUBLIC_SITE_URL (the portal's own address, used by the
  // login link) so a tunnel for testing does not change how login works.
  const site = process.env.NEXT_PUBLIC_INGEST_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const sampleRate = Number(process.env.NEXT_PUBLIC_SNIPPET_SAMPLE_RATE ?? 1);
  const snippet = buildSnippet({ clientId: client.id, endpoint: `${site}/api/ingest/vitals`, sampleRate: Number.isFinite(sampleRate) ? sampleRate : 1 });
  const isLocal = /localhost|127\.0\.0\.1/.test(site);

  return (
    <>
      <PageHeader title="Setup" sub="Connect this portal to real-visitor speed data." />
      <Section
        title="Real-visitor speed snippet"
        note={`Goes in the client’s site. Sends INP, LCP and CLS with attribution to the portal for a share of visits (SAMPLE_RATE). It uses web-vitals ${WEB_VITALS_VERSION}, pinned on purpose.`}
      >
        {isLocal && (
          <p className="mb-3 max-w-[70ch] rounded-lg border border-line bg-cite-soft px-3.5 py-2.5 text-sm">
            This snippet points to a local address, so it only works from this computer. Deploy the portal, or open a tunnel, and set
            NEXT_PUBLIC_INGEST_URL before installing it on a live site.
          </p>
        )}
        <CopyButton text={snippet} label="Copy snippet" />
        <pre className="mt-2.5 overflow-x-auto rounded-lg border border-line bg-code p-4 font-mono text-[13px] leading-relaxed">{snippet}</pre>
      </Section>
    </>
  );
}
