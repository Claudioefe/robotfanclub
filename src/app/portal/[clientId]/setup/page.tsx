import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader, Section } from "@/components/ui";
import { getClient } from "@/lib/portal/data";
import { WEB_VITALS_VERSION, buildSnippet } from "@/lib/snippet";

export default async function Setup({ params }: PageProps<"/portal/[clientId]/setup">) {
  const { clientId } = await params;
  const client = await getClient(clientId);
  if (!client) notFound();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const snippet = buildSnippet({ clientId: client.id, endpoint: `${site}/api/ingest/vitals` });

  return (
    <>
      <PageHeader title="Setup" sub="Connect this portal to real-visitor speed data." />
      <Section
        title="Real-visitor speed snippet"
        note={`Goes in the client’s site. Sends INP, LCP and CLS with attribution to the portal. It uses web-vitals ${WEB_VITALS_VERSION}, pinned on purpose.`}
      >
        <p className="mb-3 max-w-[70ch] rounded-lg border border-line bg-cite-soft px-3.5 py-2.5 text-sm">
          The receiving endpoint is not live yet. Installing the snippet now will not record anything until it ships.
        </p>
        <CopyButton text={snippet} label="Copy snippet" />
        <pre className="mt-2.5 overflow-x-auto rounded-lg border border-line bg-code p-4 font-mono text-[13px] leading-relaxed">{snippet}</pre>
      </Section>
    </>
  );
}
