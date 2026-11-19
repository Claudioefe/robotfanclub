import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { grotesk, inter, jbmono } from "@/components/landing/fonts";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: `${BRAND.name} · ${BRAND.tagline}`,
  description: "See whether Google’s AI answers cite your site, and how fast your site responds to real people. Proof you can check, every day.",
};

export default function Home() {
  return (
    <div className={`landing ${grotesk.variable} ${inter.variable} ${jbmono.variable}`} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <Landing />
    </div>
  );
}
