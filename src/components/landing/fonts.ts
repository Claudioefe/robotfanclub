import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

// Self-hosted by next/font; the landing styles refer to them through these CSS variables.
export const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-grotesk", display: "swap" });
export const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
export const jbmono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jbmono", display: "swap" });
