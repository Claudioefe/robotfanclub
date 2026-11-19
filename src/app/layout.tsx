import type { Metadata } from "next";
import { grotesk, inter, jbmono } from "@/components/landing/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robot Fan Club",
  description: "Make the robots your biggest fans.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} ${inter.variable} ${jbmono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
