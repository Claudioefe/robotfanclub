import type { Metadata } from "next";
import { COPY, parseLang } from "@/components/guide/copy";
import { GuideView } from "@/components/guide/GuideView";
import { grotesk, inter, jbmono } from "@/components/landing/fonts";

// The language is a query parameter (/guide?lang=es): a plain link, shareable, no client JS. Default is English.
export async function generateMetadata({ searchParams }: PageProps<"/guide">): Promise<Metadata> {
  const { title, description } = COPY[parseLang((await searchParams).lang)].meta;
  return { title, description };
}

export default async function GuidePage({ searchParams }: PageProps<"/guide">) {
  const lang = parseLang((await searchParams).lang);
  return <GuideView lang={lang} fontClass={`${grotesk.variable} ${inter.variable} ${jbmono.variable}`} />;
}
