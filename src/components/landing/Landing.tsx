"use client";

// Landing page, ported from the design mockup (Landing page-html). Markup and inline styles come from the design; the
// interactive bits (secret disco button, pokeable hanging robots, count-up meters, the CTA fan club and the robots that
// push the button) are the design's own logic rewritten with React hooks. Generated JSX below: edit with care.
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { contactHref } from "@/lib/brand";
import "./landing.css";

type Side = "L" | "R" | null;
type Push = { x: number; y: number; ang: number; dist: number } | null;
type State = { tick: number; cites: number; inp: number; disco: boolean; busted: boolean; ctaHover: boolean; hoverTick: number; h1: Side; h2: Side; push: Push };

/** "a: b; c: d" -> React style object (the design builds some styles as strings). */
function css(text: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of text.split(";")) {
    const at = decl.indexOf(":");
    if (at < 1) continue;
    const key = decl.slice(0, at).trim();
    out[key.startsWith("--") ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = decl.slice(at + 1).trim();
  }
  return out as CSSProperties;
}

const LINES = [
  "checking 60 frozen queries...",
  "AI Overview: cited. noting that.",
  "saving the raw JSON. evidence!",
  "is this URL in the top 10? checking...",
  "INP p75: 184 ms. writing it down.",
  "same hour tomorrow. very professional.",
];
const DISCO_LINES = ["WAIT. IS THAT A HUMAN?", "beep boop, this is my song", "shake your servos!!", "cited AND fast? we dance.", "my antenna is VIBING"];
const ROLES = ["notes", "lens", "book", "laptop", "chart", "lens", "notes"];
const DANCES = ["danceA", "danceB", "spinjump", "danceB", "danceA", "spinjump", "danceB"];
// What the three fan robots say while someone hovers the button. Each one cycles through its own lines.
const FAN_SAY = [
  ["CLICK IT!!", "let's dance!!", "...sorry, I meant: work.", "we never sleep. literally.", "evidence saved. again!"],
  ["pick us pick us", "omg a new fan?!", "I knew you'd come back", "do I look cited?", "beep boop (that means hi)"],
  ["welcome to the club!", "a REAL human?? omg", "I've been indexing all day", "nobody told me humans click", "no robots were harmed"],
];
const PALETTE = [
  { color: "#3A56F0", eye: "#D7FF3A", finger: "#D7FF3A", bulb: "#FF5FA2", w: 120 },
  { color: "#FF5FA2", eye: "#D7FF3A", finger: "#F2F0EA", bulb: "#D7FF3A", w: 140 },
  { color: "#D7FF3A", eye: "#FF5FA2", finger: "#FF5FA2", bulb: "#3A56F0", w: 160 },
  { color: "#F2F0EA", eye: "#3A56F0", finger: "#D7FF3A", bulb: "#FF5FA2", w: 190 },
  { color: "#8FA2FF", eye: "#D7FF3A", finger: "#FF5FA2", bulb: "#D7FF3A", w: 160 },
  { color: "#FF5FA2", eye: "#F2F0EA", finger: "#D7FF3A", bulb: "#3A56F0", w: 140 },
  { color: "#3A56F0", eye: "#FF5FA2", finger: "#F2F0EA", bulb: "#D7FF3A", w: 120 },
];

function useLanding() {
  const [state, setLocal] = useState<State>({ tick: 0, cites: 0, inp: 460, disco: false, busted: false, ctaHover: false, hoverTick: 0, h1: null, h2: null, push: null });
  const live = useRef(state); // latest state for timers and handlers
  useEffect(() => {
    live.current = state;
  });
  const setState = (patch: Partial<State>) => setLocal((s) => ({ ...s, ...patch }));
  const raf = useRef<number | null>(null);
  const pending = useRef<Push>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const skip = setTimeout(() => setLocal((s) => ({ ...s, cites: 19, inp: 184 })), 0); // reduced motion: show the final numbers
      return () => clearTimeout(skip);
    }
    const chatter = setInterval(() => setLocal((s) => ({ ...s, tick: s.tick + 1 })), 2800);
    const timer = setInterval(() => {
      const { cites, inp } = live.current;
      if (cites >= 19 && inp <= 184) { clearInterval(timer); return; }
      setLocal((s) => ({ ...s, cites: Math.min(19, s.cites + 1), inp: Math.max(184, s.inp - 15) }));
    }, 120);
    return () => {
      clearInterval(chatter);
      clearInterval(timer);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const hovering = state.ctaHover;
  useEffect(() => {
    if (!hovering) return;
    const id = setInterval(() => setLocal((s) => ({ ...s, hoverTick: s.hoverTick + 1 })), 1800);
    return () => clearInterval(id);
  }, [hovering]);

  const hanger = (key: "h1" | "h2") => {
    const off = state[key];
    const poke = (side: "L" | "R") => () => setLocal((s) => ({ ...s, [key]: s[key] ? null : side }));
    return {
      body: off === "L" ? "hangL" : off === "R" ? "hangR" : "dangle",
      leftArm: off === "L" ? "ouchL" : "",
      rightArm: off === "R" ? "ouchR" : "",
      calm: off ? "display: none" : "",
      hurt: off ? "" : "display: none",
      ouchL: off === "L" ? "" : "display: none",
      ouchR: off === "R" ? "" : "display: none",
      pokeL: poke("L"),
      pokeR: poke("R"),
    };
  };

  const { tick, disco, cites: c, inp, push, ctaHover } = state;
  const p = push;
  const pushStyle = () => {
    if (!p) return "display: none";
    const flip = Math.abs(p.ang) > 90;
    return `position: absolute; z-index: 4; pointer-events: none; width: 120px; height: 100px; transform-origin: 108px 56px; transition: left .1s linear, top .1s linear; left: ${(p.x - 108).toFixed(1)}px; top: ${(p.y - 56).toFixed(1)}px; transform: rotate(${p.ang.toFixed(1)}deg)${flip ? " scaleY(-1)" : ""}`;
  };

  const bots = PALETTE.map((b, idx) => ({
    color: b.color, eye: b.eye, finger: b.finger, bulb: b.bulb,
    jump: "",
    moveClass: disco ? DANCES[idx] : "bob",
    armClass: disco ? "waveFast" : "wave",
    bulbClass: disco ? "strobe" : "pulse",
    bobStyle: `animation-delay: ${(disco ? idx * 0.09 : idx * 0.23).toFixed(2)}s; margin: 0 -6px`,
    jumpStyle: `animation-delay: ${(Math.abs(idx - 3) * 0.06).toFixed(2)}s`,
    svgStyle: `display: block; overflow: visible; width: ${b.w}px; max-width: 13vw; height: auto`,
    armStyle: disco ? `transform-origin: 136px 140px; animation-delay: ${(idx * 0.17).toFixed(2)}s` : "display: none",
    sNotes: !disco && ROLES[idx] === "notes" ? `animation-delay: ${(idx * 0.3).toFixed(1)}s` : "display: none",
    sLens: !disco && ROLES[idx] === "lens" ? "" : "display: none",
    sLaptop: !disco && ROLES[idx] === "laptop" ? "" : "display: none",
    sBook: !disco && ROLES[idx] === "book" ? "" : "display: none",
    sChart: !disco && ROLES[idx] === "chart" ? "" : "display: none",
  }));

  const hover = ctaHover;
  return {
    contactHref,
    bots,
    bubble: disco ? DISCO_LINES[tick % DISCO_LINES.length] : state.busted && tick < 2 ? "we were just... indexing." : LINES[tick % LINES.length],
    bubbleKey: (disco ? "d" : "b") + tick,
    disco,
    miniMove: disco ? "danceA" : "",
    h1: hanger("h1"),
    h2: hanger("h2"),
    pushOn: !!push,
    pushStyle: pushStyle(),
    pushClass: push && push.dist < 90 ? "pushHop" : "",
    pushLabel: !push ? "" : push.dist < 90 ? "CLICK IT!!" : push.dist < 260 ? "almost... hnngh" : "this way!! push!!",
    pushLabelStyle: push
      ? `position: absolute; z-index: 5; pointer-events: none; transform: translateX(-50%); background: #0E0F13; color: #D7FF3A; font-family: var(--font-jbmono), monospace; font-weight: 700; font-size: 13px; padding: 6px 11px; border-radius: 999px; white-space: nowrap; transition: left .1s linear, top .1s linear; left: ${push.x}px; top: ${push.y - 92}px`
      : "display: none",
    pushMove: (e: MouseEvent<HTMLElement>) => {
      const card = e.currentTarget;
      const r = card.getBoundingClientRect();
      const scale = card.offsetWidth ? r.width / card.offsetWidth : 1;
      const x = (e.clientX - r.left) / scale, y = (e.clientY - r.top) / scale;
      const btn = card.querySelector("[data-cta]");
      if (!btn) return;
      const br = btn.getBoundingClientRect();
      const dx = (br.left + br.width / 2 - r.left) / scale - x, dy = (br.top + br.height / 2 - r.top) / scale - y;
      pending.current = { x, y, ang: (Math.atan2(dy, dx) * 180) / Math.PI, dist: Math.sqrt(dx * dx + dy * dy) };
      if (!raf.current) {
        raf.current = requestAnimationFrame(() => {
          raf.current = null;
          setState({ push: pending.current });
        });
      }
    },
    pushLeave: () => {
      if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; }
      setState({ push: null });
    },
    ctaHover: hover,
    ctaOn: () => { if (!live.current.ctaHover) setState({ ctaHover: true, hoverTick: 0 }); },
    ctaOff: () => { if (live.current.ctaHover) setState({ ctaHover: false }); },
    fanSay: FAN_SAY.map((lines, n) => lines[(state.hoverTick + n) % lines.length]),
    fanClass: hover ? "excited" : "popup",
    fan0: `animation-delay: ${hover ? "0s, .28s" : "0s"}`,
    fan1: `animation-delay: ${hover ? ".08s, .36s" : ".5s"}`,
    fan2: `animation-delay: ${hover ? ".16s, .44s" : "1s"}`,
    fanBulb: hover ? "strobe" : "pulse",
    fanEyes: hover ? "display: none" : "",
    fanHearts: hover ? "" : "display: none",
    fanHands: hover ? "display: none" : "",
    fanArms: hover ? "" : "display: none",
    ballWrap: "position: absolute; left: 4%; top: -300px; z-index: 5; pointer-events: none",
    stringStyle: "width: 2px; height: 290px; background: #6B7083",
    signText: disco ? "Secret robot party detected" : "Robots only beyond this point",
    btnLabel: disco ? "Act natural" : "Do not press",
    subText: disco
      ? "Okay, now you know what we do when humans aren’t looking. Please don’t tell Google."
      : state.busted
        ? "Nothing happened. We were indexing. Very serious robot business."
        : "If you’re a human, please don’t. You’ll discover our secret.",
    toggleDisco: () => setLocal((s) => ({ ...s, disco: !s.disco, busted: s.disco, tick: 0 })),
    cites: c,
    citeStatus: c < 12 ? "warming up" : c < 18 ? "floor cleared" : c < 25 ? "target hit" : "bonus!",
    citeBar: `position: absolute; left: 0; top: 0; bottom: 0; border-radius: 9px; background: #D7FF3A; transition: width .12s linear; width: ${((c / 25) * 100).toFixed(1)}%`,
    inp,
    inpStatus: inp <= 200 ? "passing" : "too slow",
    needle: `position: absolute; top: -8px; width: 6px; height: 34px; border-radius: 3px; background: #FF5FA2; box-shadow: 0 0 0 3px #0E0F13; transform: translateX(-50%); transition: left .12s linear; left: ${Math.min(100, (inp / 500) * 100).toFixed(1)}%`,
  };
}

export function Landing() {
  const v = useLanding();
  return (
    <>
<div className="arena" style={{ backgroundColor: "#0E0F13", color: "#F2F0EA", fontFamily: "var(--font-inter), system-ui, sans-serif", overflow: "hidden" }}>
<header style={{ maxWidth: "1240px", margin: "0 auto", padding: "24px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
<a href="#top" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "#F2F0EA" }}>
<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
<line x1="20" y1="2" x2="20" y2="9" stroke="#D7FF3A" strokeWidth="3" strokeLinecap="round">
</line>
<circle className="pulse" cx="20" cy="3" r="3" fill="#FF5FA2">
</circle>
<rect x="4" y="9" width="32" height="27" rx="9" fill="#3A56F0">
</rect>
<rect x="9" y="15" width="22" height="14" rx="5" fill="#0E0F13">
</rect>
<g className="blink">
<circle cx="15" cy="22" r="2.6" fill="#D7FF3A">
</circle>
<circle cx="25" cy="22" r="2.6" fill="#D7FF3A">
</circle>
</g>
</svg>
<span style={{ fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "20px", letterSpacing: "-0.01em" }}>
Robot Fan Club
</span>
</a>
<nav aria-label="Main" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "28px", fontSize: "15px", fontWeight: "500" }}>
<a className="navlink" href="#how">
How it works
</a>
<a className="navlink" href="#offers">
Offers
</a>
<a className="navlink" href="#receipts">
Receipts
</a>
<Link className="navlink" href="/login">
Sign in
</Link>
<a className="cta" href="#join" style={{ background: "#D7FF3A", color: "#0E0F13", textDecoration: "none", padding: "12px 20px", borderRadius: "999px", fontWeight: "600", minHeight: "20px" }}>
Start a fan club
</a>
</nav>
</header>
<div style={{ position: "relative" }}>
{v.disco && (<>
<div aria-hidden="true" className="fadeIn" style={{ position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: "0", background: "rgba(8,9,12,0.45)" }}>
<div className="sweep" style={{ position: "absolute", left: "-50%", top: "-50%", width: "200%", height: "200%", backgroundImage: "radial-gradient(circle, rgba(215,255,58,0.6) 0 3px, transparent 4px), radial-gradient(circle, rgba(255,95,162,0.55) 0 3px, transparent 4px), radial-gradient(circle, rgba(143,162,255,0.6) 0 2px, transparent 3px)", backgroundSize: "120px 120px, 170px 170px, 90px 90px", backgroundPosition: "0 0, 40px 70px, 20px 30px" }}>
</div>
</div>
</>)}
<section id="top" style={{ position: "relative", zIndex: "1", maxWidth: "1240px", margin: "0 auto", padding: "56px 32px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "28px" }}>
<div className="rise" style={{ display: "flex", alignItems: "center", gap: "10px", border: "1px solid #2A2D3A", background: "#171922", padding: "8px 16px", borderRadius: "999px", fontFamily: "var(--font-jbmono), monospace", fontSize: "13px", color: "#A5A9B8" }}>
<span className="pulse" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D7FF3A", display: "block" }}>
</span>
{" AI citation tracking + real-world speed "}
</div>
<h1 className="rise" style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "clamp(48px, 8.4vw, 124px)", lineHeight: "0.92", letterSpacing: "-0.045em", maxWidth: "1100px", textWrap: "balance", animationDelay: ".1s" }}>
{"Make the robots your "}
<span style={{ color: "#D7FF3A", fontStyle: "italic" }}>
biggest
</span>
{" fans."}
</h1>
<p className="rise" style={{ margin: "0", maxWidth: "640px", fontSize: "20px", lineHeight: "1.5", color: "#C9CCD6", textWrap: "pretty", animationDelay: ".2s" }}>
{"Google's AI Overviews and AI Mode are answering your customers now. Robot Fan Club checks every day whether they cite your pages, and keeps your site fast enough that they stay obsessed."}
</p>
<div className="rise" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px", animationDelay: ".3s" }}>
<a className="cta" href="#join" style={{ background: "#D7FF3A", color: "#0E0F13", textDecoration: "none", padding: "18px 30px", borderRadius: "999px", fontWeight: "600", fontSize: "17px" }}>
Start a fan club
</a>
<a href="#how" style={{ color: "#F2F0EA", textDecoration: "none", padding: "17px 28px", borderRadius: "999px", fontWeight: "600", fontSize: "17px", border: "1px solid #3A3E4E" }}>
See how it works
</a>
</div>
</section>
<section aria-label="The robot crowd" style={{ position: "relative", zIndex: "1", maxWidth: "1240px", margin: "40px auto 0", padding: "0 32px" }}>
{v.disco && (<>
<div aria-hidden="true" style={css(v.ballWrap)}>
<div className="swing" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
<div style={css(v.stringStyle)}>
</div>
<div className="ballIn">
<svg viewBox="0 0 120 128" width="120" height="128" style={{ display: "block", filter: "drop-shadow(0 0 28px rgba(215,255,58,0.35))" }}>
<defs>
<clipPath id="rfcBallClip">
<circle cx="60" cy="68" r="56">
</circle>
</clipPath>
<pattern id="rfcTiles" width="14" height="14" patternUnits="userSpaceOnUse">
<rect width="14" height="14" fill="#4A4F60">
</rect>
<rect x="1" y="1" width="12" height="12" rx="1.5" fill="#B9BDC9">
</rect>
<rect x="1" y="1" width="6" height="5" fill="#F2F0EA" opacity="0.75">
</rect>
</pattern>
<radialGradient id="rfcShade" cx="35%" cy="30%" r="75%">
<stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6">
</stop>
<stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0">
</stop>
<stop offset="1" stopColor="#0E0F13" stopOpacity="0.8">
</stop>
</radialGradient>
</defs>
<rect x="52" y="0" width="16" height="14" rx="3" fill="#3A3E4E">
</rect>
<g clipPath="url(#rfcBallClip)">
<g className="tiles">
<rect x="0" y="12" width="152" height="116" fill="url(#rfcTiles)">
</rect>
<rect className="twinkle" x="29" y="41" width="12" height="12" fill="#D7FF3A">
</rect>
<rect className="twinkle" x="71" y="27" width="12" height="12" fill="#FF5FA2" style={{ animationDelay: ".4s" }}>
</rect>
<rect className="twinkle" x="85" y="83" width="12" height="12" fill="#8FA2FF" style={{ animationDelay: ".8s" }}>
</rect>
<rect className="twinkle" x="43" y="97" width="12" height="12" fill="#FF5FA2" style={{ animationDelay: ".2s" }}>
</rect>
<rect className="twinkle" x="113" y="55" width="12" height="12" fill="#D7FF3A" style={{ animationDelay: ".6s" }}>
</rect>
<rect className="twinkle" x="15" y="69" width="12" height="12" fill="#8FA2FF" style={{ animationDelay: "1s" }}>
</rect>
</g>
<circle cx="60" cy="68" r="56" fill="url(#rfcShade)">
</circle>
</g>
<circle cx="60" cy="68" r="56" fill="none" stroke="#0E0F13" strokeWidth="2">
</circle>
<path className="twinkle" d="M36 34 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 z" fill="#FFFFFF">
</path>
<path className="twinkle" d="M96 96 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 z" fill="#FFFFFF" style={{ animationDelay: ".6s" }}>
</path>
</svg>
</div>
</div>
</div>
</>)}
<div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
<div key={v.bubbleKey} className="pop" style={{ position: "relative", background: "#F2F0EA", color: "#0E0F13", fontFamily: "var(--font-jbmono), monospace", fontWeight: "700", fontSize: "18px", padding: "14px 22px", borderRadius: "18px", boxShadow: "5px 5px 0 #FF5FA2" }}>
{" "}
{v.bubble}
{" "}
<span aria-hidden="true" style={{ position: "absolute", left: "50%", bottom: "-10px", width: "20px", height: "20px", background: "#F2F0EA", transform: "translateX(-50%) rotate(45deg)" }}>
</span>
</div>
</div>
<div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", flexWrap: "nowrap", gap: "0", position: "relative", zIndex: "1" }}>
{v.bots.map((bot, __i) => (<Fragment key={__i}>
<div className={bot.moveClass} style={css(bot.bobStyle)}>
<div className={bot.jump} style={css(bot.jumpStyle)}>
<svg viewBox="0 0 160 230" style={css(bot.svgStyle)} aria-hidden="true">
<line x1="80" y1="14" x2="80" y2="36" stroke="#3A3E4E" strokeWidth="5" strokeLinecap="round">
</line>
<circle className={bot.bulbClass} cx="80" cy="12" r="8" fill={bot.bulb}>
</circle>
<rect x="28" y="34" width="104" height="80" rx="24" fill={bot.color}>
</rect>
<rect x="40" y="48" width="80" height="50" rx="15" fill="#0E0F13">
</rect>
<g className="blink">
<circle cx="63" cy="70" r="8" fill={bot.eye}>
</circle>
<circle cx="97" cy="70" r="8" fill={bot.eye}>
</circle>
</g>
<path d="M68 86 Q80 95 92 86" stroke={bot.eye} strokeWidth="4" fill="none" strokeLinecap="round">
</path>
<rect x="68" y="114" width="24" height="10" fill="#3A3E4E">
</rect>
<rect x="36" y="122" width="88" height="72" rx="20" fill={bot.color}>
</rect>
<rect x="56" y="138" width="48" height="30" rx="8" fill="#0E0F13">
</rect>
<path d="M80 162 l-10 -10 a6 6 0 0 1 10 -7 a6 6 0 0 1 10 7 z" fill="#FF5FA2">
</path>
<rect x="16" y="130" width="16" height="50" rx="8" fill={bot.color}>
</rect>
<g style={css(bot.sNotes)}>
<rect x="48" y="132" width="62" height="58" rx="6" fill="#F2F0EA">
</rect>
<rect x="69" y="127" width="20" height="9" rx="2" fill="#6B7083">
</rect>
<rect x="56" y="146" width="44" height="3" rx="1.5" fill="#A5A9B8">
</rect>
<rect x="56" y="156" width="38" height="3" rx="1.5" fill="#A5A9B8">
</rect>
<rect className="write" x="56" y="166" width="42" height="3" rx="1.5" fill="#3A56F0">
</rect>
<path d="M58 178 l4 4 l8 -8" stroke="#0B7A66" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
</path>
<g className="scribble">
<rect x="112" y="150" width="16" height="36" rx="8" fill={bot.color}>
</rect>
<rect x="100" y="150" width="6" height="26" rx="2" fill="#D7FF3A" transform="rotate(35 103 163)">
</rect>
</g>
</g>
<g style={css(bot.sLens)}>
<g className="scan">
<rect x="126" y="100" width="16" height="44" rx="8" fill={bot.color}>
</rect>
<line x1="136" y1="102" x2="142" y2="88" stroke="#6B7083" strokeWidth="6" strokeLinecap="round">
</line>
<circle cx="148" cy="72" r="17" fill="rgba(143,162,255,0.3)" stroke="#F2F0EA" strokeWidth="5">
</circle>
<path d="M140 66 q4 -6 10 -6" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round">
</path>
</g>
</g>
<g style={css(bot.sLaptop)}>
<rect x="40" y="134" width="80" height="48" rx="6" fill="#2A2D3A">
</rect>
<rect x="45" y="139" width="70" height="38" rx="3" fill="#0E0F13">
</rect>
<rect x="51" y="146" width="30" height="3" rx="1.5" fill="#D7FF3A">
</rect>
<rect x="51" y="154" width="44" height="3" rx="1.5" fill="#8FA2FF">
</rect>
<rect x="51" y="162" width="22" height="3" rx="1.5" fill="#FF5FA2">
</rect>
<rect className="pulse" x="76" y="160" width="6" height="7" fill="#F2F0EA">
</rect>
<rect x="32" y="182" width="96" height="8" rx="3" fill="#6B7083">
</rect>
<rect className="tap" x="112" y="150" width="16" height="34" rx="8" fill={bot.color}>
</rect>
</g>
<g style={css(bot.sBook)}>
<path d="M80 150 L44 144 L44 186 L80 192 Z" fill="#F2F0EA">
</path>
<path className="flip" d="M80 150 L116 144 L116 186 L80 192 Z" fill="#DCD9D0">
</path>
<line x1="80" y1="150" x2="80" y2="192" stroke="#6B7083" strokeWidth="2">
</line>
<rect x="50" y="156" width="22" height="2.5" fill="#A5A9B8">
</rect>
<rect x="50" y="164" width="18" height="2.5" fill="#A5A9B8">
</rect>
<rect x="50" y="172" width="22" height="2.5" fill="#A5A9B8">
</rect>
<rect x="122" y="140" width="16" height="44" rx="8" fill={bot.color}>
</rect>
</g>
<g style={css(bot.sChart)}>
<rect x="128" y="88" width="16" height="50" rx="8" fill={bot.color}>
</rect>
<rect x="104" y="36" width="58" height="52" rx="7" fill="#F2F0EA">
</rect>
<rect className="grow" x="112" y="64" width="9" height="16" fill="#8FA2FF">
</rect>
<rect className="grow" x="126" y="56" width="9" height="24" fill="#3A56F0" style={{ animationDelay: ".2s" }}>
</rect>
<rect className="grow" x="140" y="44" width="9" height="36" fill="#0E0F13" style={{ animationDelay: ".4s" }}>
</rect>
</g>
<g className={bot.armClass} style={css(bot.armStyle)}>
<rect x="128" y="92" width="16" height="50" rx="8" fill={bot.color}>
</rect>
<rect x="118" y="44" width="36" height="54" rx="12" fill={bot.finger}>
</rect>
<text x="136" y="80" textAnchor="middle" fontWeight="700" fontSize="20" fill="#0E0F13" style={{ fontFamily: "var(--font-grotesk), sans-serif" }}>
#1
</text>
</g>
<rect x="52" y="194" width="18" height="30" rx="7" fill="#3A3E4E">
</rect>
<rect x="90" y="194" width="18" height="30" rx="7" fill="#3A3E4E">
</rect>
</svg>
</div>
</div>
</Fragment>))}
</div>
<div aria-hidden="true" style={{ height: "26px", background: "#171922", borderTop: "3px solid #2A2D3A", borderRadius: "6px", marginTop: "-6px" }}>
</div>
<div aria-hidden="true" style={{ height: "26px", background: "#13151C", borderTop: "3px solid #2A2D3A", margin: "0 24px", borderRadius: "0 0 6px 6px" }}>
</div>
<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", marginTop: "36px", textAlign: "center" }}>
<p style={{ margin: "0", display: "flex", alignItems: "center", gap: "10px", fontFamily: "var(--font-jbmono), monospace", fontWeight: "700", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#D7FF3A" }}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D7FF3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d="M12 3l10 18H2z">
</path>
<path d="M12 10v5">
</path>
<path d="M12 18h.01">
</path>
</svg>
{" "}
{v.signText}
{" "}
</p>
<button type="button" onClick={v.toggleDisco} className="secretBtn" style={{ background: "transparent", border: "0", padding: "0", borderRadius: "999px", cursor: "pointer" }}>
<span style={{ display: "block", padding: "7px", borderRadius: "999px", background: "repeating-linear-gradient(-45deg, #D7FF3A 0 12px, #0E0F13 12px 24px)", boxShadow: "0 10px 0 #0A0B0E" }}>
<span style={{ display: "block", minWidth: "220px", background: "#FF5FA2", color: "#0E0F13", borderRadius: "999px", padding: "20px 36px", fontFamily: "var(--font-jbmono), monospace", fontWeight: "700", fontSize: "18px", letterSpacing: "0.04em", textTransform: "uppercase", boxShadow: "inset 0 -6px 0 rgba(14,15,19,0.25)" }}>
{v.btnLabel}
</span>
</span>
</button>
<p style={{ margin: "6px 0 0", maxWidth: "440px", fontSize: "15px", lineHeight: "1.5", color: "#A5A9B8" }}>
{v.subText}
</p>
</div>
</section>
</div>
<div style={{ marginTop: "72px", background: "#D7FF3A", color: "#0E0F13", transform: "rotate(-2deg)", borderTop: "3px solid #0E0F13", borderBottom: "3px solid #0E0F13", overflow: "hidden", width: "104%", marginLeft: "-2%" }}>
<div className="marquee" style={{ display: "flex", width: "max-content", gap: "40px", padding: "16px 0", fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "30px", letterSpacing: "-0.01em", whiteSpace: "nowrap", textTransform: "uppercase" }}>
<span>
Cite! Cite! Cite!
</span>
<span aria-hidden="true">
●
</span>
<span>
AI Overview saw you
</span>
<span aria-hidden="true">
●
</span>
<span>
AI Mode saw you too
</span>
<span aria-hidden="true">
●
</span>
<span>
200 ms or bust
</span>
<span aria-hidden="true">
●
</span>
<span>
60 days. Frozen. No take-backs.
</span>
<span aria-hidden="true">
●
</span>
<span>
Receipts over reports
</span>
<span aria-hidden="true">
●
</span>
<span aria-hidden="true">
Cite! Cite! Cite!
</span>
<span aria-hidden="true">
●
</span>
<span aria-hidden="true">
AI Overview saw you
</span>
<span aria-hidden="true">
●
</span>
<span aria-hidden="true">
AI Mode saw you too
</span>
<span aria-hidden="true">
●
</span>
<span aria-hidden="true">
200 ms or bust
</span>
<span aria-hidden="true">
●
</span>
<span aria-hidden="true">
60 days. Frozen. No take-backs.
</span>
<span aria-hidden="true">
●
</span>
<span aria-hidden="true">
Receipts over reports
</span>
<span aria-hidden="true">
●
</span>
</div>
</div>
<section style={{ maxWidth: "1240px", margin: "0 auto", padding: "140px 32px 40px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "64px" }}>
<div style={{ flex: "1 1 440px", display: "flex", flexDirection: "column", gap: "22px" }}>
<p style={{ margin: "0", fontFamily: "var(--font-jbmono), monospace", fontSize: "14px", color: "#D7FF3A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
The plot twist
</p>
<h2 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "clamp(36px, 4.6vw, 64px)", lineHeight: "1", letterSpacing: "-0.035em", textWrap: "balance" }}>
{"The robots are talking about your industry. Are they talking about "}
<span style={{ color: "#FF5FA2" }}>
you
</span>
?
</h2>
<p style={{ margin: "0", fontSize: "19px", lineHeight: "1.55", color: "#C9CCD6", maxWidth: "520px", textWrap: "pretty" }}>
{"A ranking report won't tell you whether the AI answer sitting above the blue links cited your page. We check, every day, and keep the proof."}
</p>
</div>
<div style={{ flex: "1 1 480px", position: "relative" }}>
<div style={{ background: "#171922", border: "1px solid #2A2D3A", borderRadius: "24px", padding: "28px", display: "flex", flexDirection: "column", gap: "18px", boxShadow: "14px 14px 0 #3A56F0" }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", fontSize: "15px" }}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8FA2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z">
</path>
<path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z">
</path>
</svg>
{" AI Overview "}
</div>
<span style={{ fontFamily: "var(--font-jbmono), monospace", fontSize: "12px", color: "#A5A9B8" }}>
illustration
</span>
</div>
<div style={{ background: "#0E0F13", borderRadius: "14px", padding: "14px 18px", fontSize: "16px", color: "#C9CCD6" }}>
best emergency plumber near me
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
<div className="shimmer" style={{ height: "14px", borderRadius: "7px", width: "100%" }}>
</div>
<div className="shimmer" style={{ height: "14px", borderRadius: "7px", width: "92%" }}>
</div>
<div className="shimmer" style={{ height: "14px", borderRadius: "7px", width: "96%" }}>
</div>
<div className="shimmer" style={{ height: "14px", borderRadius: "7px", width: "64%" }}>
</div>
</div>
<p style={{ margin: "6px 0 0", fontFamily: "var(--font-jbmono), monospace", fontSize: "12px", color: "#A5A9B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
Sources
</p>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<span style={{ padding: "9px 14px", borderRadius: "999px", background: "#232633", fontSize: "14px", color: "#C9CCD6" }}>
someone-else.com
</span>
<span style={{ padding: "9px 14px", borderRadius: "999px", background: "#D7FF3A", color: "#0E0F13", fontSize: "14px", fontWeight: "600", outline: "3px solid #D7FF3A", outlineOffset: "3px" }}>
yoursite.com/emergency
</span>
<span style={{ padding: "9px 14px", borderRadius: "999px", background: "#232633", fontSize: "14px", color: "#C9CCD6" }}>
another-guy.net
</span>
</div>
</div>
<div aria-hidden="true" style={{ position: "absolute", zIndex: "2", pointerEvents: "none", top: "-66px", left: "44px" }}>
<div className={v.miniMove}>
<svg className="peek" viewBox="0 0 100 80" width="100" height="80" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<line x1="50" y1="2" x2="50" y2="14" stroke="#6B7083" strokeWidth="4" strokeLinecap="round">
</line>
<circle className="pulse" cx="50" cy="4" r="5" fill="#FF5FA2">
</circle>
<rect x="18" y="14" width="64" height="52" rx="16" fill="#8FA2FF">
</rect>
<rect x="26" y="24" width="48" height="30" rx="10" fill="#0E0F13">
</rect>
<g className="look">
<g className="blink">
<circle cx="40" cy="39" r="5" fill="#D7FF3A">
</circle>
<circle cx="60" cy="39" r="5" fill="#D7FF3A">
</circle>
</g>
</g>
<rect x="6" y="62" width="22" height="14" rx="7" fill="#8FA2FF">
</rect>
<rect x="72" y="62" width="22" height="14" rx="7" fill="#8FA2FF">
</rect>
</svg>
</div>
</div>
<div className="stamp" style={{ position: "absolute", right: "-14px", top: "-30px", background: "#FF5FA2", color: "#0E0F13", fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "28px", padding: "12px 22px", border: "3px solid #0E0F13", borderRadius: "10px", textTransform: "uppercase", letterSpacing: "0.02em" }}>
Cited!
</div>
</div>
</section>
<section id="how" style={{ maxWidth: "1240px", margin: "0 auto", padding: "120px 32px 40px", display: "flex", flexDirection: "column", gap: "48px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "760px" }}>
<p style={{ margin: "0", fontFamily: "var(--font-jbmono), monospace", fontSize: "14px", color: "#D7FF3A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
How it works
</p>
<h2 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "clamp(36px, 4.6vw, 64px)", lineHeight: "1", letterSpacing: "-0.035em" }}>
Three steps to a robot fandom.
</h2>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: "24px" }}>
<div style={{ background: "#171922", border: "1px solid #2A2D3A", borderRadius: "24px", position: "relative", padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
<div style={{ position: "absolute", zIndex: "2", pointerEvents: "none", bottom: "-144px", left: "36px" }}>
<div className={v.miniMove} style={{ position: "relative" }}>
<svg viewBox="0 0 80 150" width="80" height="150" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<g className={v.h1.body}>
<g className={v.h1.leftArm}>
<rect x="18" y="8" width="8" height="30" rx="4" fill="#3A56F0">
</rect>
<rect x="14" y="0" width="16" height="12" rx="6" fill="#3A56F0">
</rect>
</g>
<g className={v.h1.rightArm}>
<rect x="54" y="8" width="8" height="30" rx="4" fill="#3A56F0">
</rect>
<rect x="50" y="0" width="16" height="12" rx="6" fill="#3A56F0">
</rect>
</g>
<rect x="12" y="34" width="56" height="44" rx="14" fill="#3A56F0">
</rect>
<rect x="19" y="42" width="42" height="26" rx="8" fill="#0E0F13">
</rect>
<g style={css(v.h1.calm)}>
<g className="blink">
<circle cx="32" cy="53" r="4.5" fill="#D7FF3A">
</circle>
<circle cx="48" cy="53" r="4.5" fill="#D7FF3A">
</circle>
</g>
</g>
<g style={css(v.h1.hurt)}>
<path d="M28 50 l6 3 l-6 3" stroke="#D7FF3A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
</path>
<path d="M52 50 l-6 3 l6 3" stroke="#D7FF3A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
</path>
</g>
<circle cx="40" cy="63" r="2.6" fill="#D7FF3A">
</circle>
<rect x="20" y="80" width="40" height="34" rx="10" fill="#3A56F0">
</rect>
<rect className="kickL2" x="24" y="110" width="10" height="28" rx="5" fill="#3A3E4E">
</rect>
<rect className="kickR2" x="46" y="110" width="10" height="28" rx="5" fill="#3A3E4E">
</rect>
</g>
<text x="-34" y="44" fontWeight="700" fontSize="14" fill="#F2F0EA" style={{ ...css(v.h1.ouchL), fontFamily: "var(--font-jbmono), monospace" }}>
ouch!
</text>
<text x="80" y="44" fontWeight="700" fontSize="14" fill="#F2F0EA" style={{ ...css(v.h1.ouchR), fontFamily: "var(--font-jbmono), monospace" }}>
ouch!
</text>
</svg>
<button type="button" className="handBtn" onClick={v.h1.pokeL} aria-label="Poke the robot's left hand" style={{ position: "absolute", left: "0", top: "-16px", width: "44px", height: "44px", pointerEvents: "auto", background: "transparent", border: "0", borderRadius: "50%", cursor: "pointer", padding: "0" }}>
</button>
<button type="button" className="handBtn" onClick={v.h1.pokeR} aria-label="Poke the robot's right hand" style={{ position: "absolute", left: "36px", top: "-16px", width: "44px", height: "44px", pointerEvents: "auto", background: "transparent", border: "0", borderRadius: "50%", cursor: "pointer", padding: "0" }}>
</button>
</div>
</div>
<span style={{ fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "64px", lineHeight: "1", color: "#3A56F0" }}>
01
</span>
<h3 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontSize: "26px", letterSpacing: "-0.02em" }}>
Freeze the list
</h3>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.55", color: "#C9CCD6" }}>
Up to 60 queries, locked for 60 days. No moving goalposts. Not even ours.
</p>
</div>
<div style={{ background: "#171922", border: "1px solid #2A2D3A", borderRadius: "24px", position: "relative", padding: "32px", display: "flex", flexDirection: "column", gap: "16px", transform: "translateY(24px)" }}>
<div aria-hidden="true" style={{ position: "absolute", zIndex: "2", pointerEvents: "none", top: "-66px", right: "56px" }}>
<div className={v.miniMove}>
<svg className="peek" viewBox="0 0 100 80" width="100" height="80" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<line x1="50" y1="2" x2="50" y2="14" stroke="#6B7083" strokeWidth="4" strokeLinecap="round">
</line>
<circle className="pulse" cx="50" cy="4" r="5" fill="#D7FF3A">
</circle>
<rect x="18" y="14" width="64" height="52" rx="16" fill="#FF5FA2">
</rect>
<rect x="26" y="24" width="48" height="30" rx="10" fill="#0E0F13">
</rect>
<g className="look">
<g className="blink">
<circle cx="40" cy="39" r="5" fill="#F2F0EA">
</circle>
<circle cx="60" cy="39" r="5" fill="#F2F0EA">
</circle>
</g>
</g>
<g className="ring">
<circle cx="104" cy="50" r="15" fill="#F2F0EA" stroke="#0E0F13" strokeWidth="3">
</circle>
<path d="M104 42 v8 l6 4" stroke="#0E0F13" strokeWidth="3" fill="none" strokeLinecap="round">
</path>
<circle cx="93" cy="36" r="5" fill="#FF5FA2">
</circle>
<circle cx="115" cy="36" r="5" fill="#FF5FA2">
</circle>
</g>
<rect x="6" y="62" width="22" height="14" rx="7" fill="#FF5FA2">
</rect>
<rect x="72" y="62" width="22" height="14" rx="7" fill="#FF5FA2">
</rect>
</svg>
</div>
</div>
<span style={{ fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "64px", lineHeight: "1", color: "#FF5FA2" }}>
02
</span>
<h3 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontSize: "26px", letterSpacing: "-0.02em" }}>
The watcher shows up daily
</h3>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.55", color: "#C9CCD6" }}>
Same hour, US, English, mobile. AI Overview and AI Mode, every query. The raw response of every check gets saved.
</p>
</div>
<div style={{ background: "#171922", border: "1px solid #2A2D3A", borderRadius: "24px", position: "relative", padding: "32px", display: "flex", flexDirection: "column", gap: "16px", transform: "translateY(48px)" }}>
<div aria-hidden="true" style={{ position: "absolute", zIndex: "2", pointerEvents: "none", top: "-92px", right: "40px" }}>
<div className={v.miniMove}>
<svg viewBox="0 0 110 130" width="110" height="130" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<line x1="50" y1="0" x2="50" y2="10" stroke="#6B7083" strokeWidth="4" strokeLinecap="round">
</line>
<circle className="pulse" cx="50" cy="2" r="4.5" fill="#3A56F0">
</circle>
<rect x="22" y="10" width="56" height="44" rx="14" fill="#D7FF3A">
</rect>
<rect x="29" y="18" width="42" height="26" rx="8" fill="#0E0F13">
</rect>
<g className="blink">
<circle cx="42" cy="31" r="4.5" fill="#FF5FA2">
</circle>
<circle cx="58" cy="31" r="4.5" fill="#FF5FA2">
</circle>
</g>
<path d="M43 38 Q50 43 57 38" stroke="#FF5FA2" strokeWidth="2.5" fill="none" strokeLinecap="round">
</path>
<rect x="28" y="54" width="44" height="40" rx="12" fill="#D7FF3A">
</rect>
<rect x="18" y="60" width="10" height="28" rx="5" fill="#D7FF3A">
</rect>
<g className="wave" style={{ transformOrigin: "76px 64px" }}>
<rect x="72" y="34" width="10" height="32" rx="5" fill="#D7FF3A">
</rect>
<rect x="62" y="6" width="42" height="30" rx="7" fill="#3A56F0">
</rect>
<text x="83" y="27" textAnchor="middle" fontWeight="700" fontSize="17" fill="#FFFFFF" style={{ fontFamily: "var(--font-grotesk), sans-serif" }}>
+1
</text>
</g>
<rect className="kickL" x="34" y="88" width="11" height="34" rx="5" fill="#3A3E4E">
</rect>
<rect className="kickR" x="55" y="88" width="11" height="34" rx="5" fill="#3A3E4E">
</rect>
</svg>
</div>
</div>
<span style={{ fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "64px", lineHeight: "1", color: "#D7FF3A" }}>
03
</span>
<h3 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontSize: "26px", letterSpacing: "-0.02em" }}>
Count your fans
</h3>
<p style={{ margin: "0", fontSize: "17px", lineHeight: "1.55", color: "#C9CCD6" }}>
A query counts once when an AI answer cites any URL on your domain. Your portal shows every one, with evidence attached.
</p>
</div>
</div>
</section>
<section id="offers" style={{ maxWidth: "1240px", margin: "0 auto", padding: "160px 32px 40px", display: "flex", flexDirection: "column", gap: "48px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "760px" }}>
<p style={{ margin: "0", fontFamily: "var(--font-jbmono), monospace", fontSize: "14px", color: "#D7FF3A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
Two ways to win them over
</p>
<h2 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "clamp(36px, 4.6vw, 64px)", lineHeight: "1", letterSpacing: "-0.035em" }}>
Get cited. Get fast. Get it in writing.
</h2>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(480px, 100%), 1fr))", gap: "28px" }}>
<div style={{ background: "#F2F0EA", color: "#0E0F13", position: "relative", borderRadius: "28px", padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
<div style={{ position: "absolute", zIndex: "2", pointerEvents: "none", bottom: "-144px", right: "64px" }}>
<div className={v.miniMove} style={{ position: "relative" }}>
<svg viewBox="0 0 80 150" width="80" height="150" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<g className={v.h2.body}>
<g className={v.h2.leftArm}>
<rect x="18" y="8" width="8" height="30" rx="4" fill="#FF5FA2">
</rect>
<rect x="14" y="0" width="16" height="12" rx="6" fill="#FF5FA2">
</rect>
</g>
<g className={v.h2.rightArm}>
<rect x="54" y="8" width="8" height="30" rx="4" fill="#FF5FA2">
</rect>
<rect x="50" y="0" width="16" height="12" rx="6" fill="#FF5FA2">
</rect>
</g>
<rect x="12" y="34" width="56" height="44" rx="14" fill="#FF5FA2">
</rect>
<rect x="19" y="42" width="42" height="26" rx="8" fill="#0E0F13">
</rect>
<g style={css(v.h2.calm)}>
<g className="blink">
<circle cx="32" cy="53" r="4.5" fill="#F2F0EA">
</circle>
<circle cx="48" cy="53" r="4.5" fill="#F2F0EA">
</circle>
</g>
</g>
<g style={css(v.h2.hurt)}>
<path d="M28 50 l6 3 l-6 3" stroke="#F2F0EA" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
</path>
<path d="M52 50 l-6 3 l6 3" stroke="#F2F0EA" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
</path>
</g>
<circle cx="40" cy="63" r="2.6" fill="#F2F0EA">
</circle>
<rect x="20" y="80" width="40" height="34" rx="10" fill="#FF5FA2">
</rect>
<rect className="kickL2" x="24" y="110" width="10" height="28" rx="5" fill="#3A3E4E">
</rect>
<rect className="kickR2" x="46" y="110" width="10" height="28" rx="5" fill="#3A3E4E">
</rect>
</g>
<text x="-34" y="44" fontWeight="700" fontSize="14" fill="#F2F0EA" style={{ ...css(v.h2.ouchL), fontFamily: "var(--font-jbmono), monospace" }}>
ouch!
</text>
<text x="80" y="44" fontWeight="700" fontSize="14" fill="#F2F0EA" style={{ ...css(v.h2.ouchR), fontFamily: "var(--font-jbmono), monospace" }}>
ouch!
</text>
</svg>
<button type="button" className="handBtn" onClick={v.h2.pokeL} aria-label="Poke the robot's left hand" style={{ position: "absolute", left: "0", top: "-16px", width: "44px", height: "44px", pointerEvents: "auto", background: "transparent", border: "0", borderRadius: "50%", cursor: "pointer", padding: "0" }}>
</button>
<button type="button" className="handBtn" onClick={v.h2.pokeR} aria-label="Poke the robot's right hand" style={{ position: "absolute", left: "36px", top: "-16px", width: "44px", height: "44px", pointerEvents: "auto", background: "transparent", border: "0", borderRadius: "50%", cursor: "pointer", padding: "0" }}>
</button>
</div>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
<h3 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontSize: "40px", letterSpacing: "-0.03em" }}>
AIO Pro
</h3>
<span style={{ background: "#0E0F13", color: "#D7FF3A", fontFamily: "var(--font-jbmono), monospace", fontSize: "13px", padding: "7px 12px", borderRadius: "999px" }}>
AI citations
</span>
</div>
<div style={{ background: "#0E0F13", color: "#F2F0EA", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
<span style={{ fontFamily: "var(--font-jbmono), monospace", fontSize: "12px", color: "#A5A9B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
Example window
</span>
<span style={{ fontFamily: "var(--font-jbmono), monospace", fontSize: "13px", color: "#D7FF3A" }}>
{v.citeStatus}
</span>
</div>
<div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
<span style={{ fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "72px", lineHeight: "1", letterSpacing: "-0.04em" }}>
{v.cites}
</span>
<span style={{ fontSize: "17px", color: "#C9CCD6" }}>
citations
</span>
</div>
<div style={{ position: "relative", height: "18px", background: "#232633", borderRadius: "9px" }}>
<div style={css(v.citeBar)}>
</div>
<span aria-hidden="true" style={{ position: "absolute", left: "48%", top: "-6px", bottom: "-6px", width: "2px", background: "#F2F0EA" }}>
</span>
<span aria-hidden="true" style={{ position: "absolute", left: "72%", top: "-6px", bottom: "-6px", width: "2px", background: "#F2F0EA" }}>
</span>
</div>
<div style={{ position: "relative", height: "18px", fontFamily: "var(--font-jbmono), monospace", fontSize: "12px", color: "#A5A9B8" }}>
<span style={{ position: "absolute", left: "48%", transform: "translateX(-50%)" }}>
floor 12
</span>
<span style={{ position: "absolute", left: "72%", transform: "translateX(-50%)" }}>
target 18
</span>
<span style={{ position: "absolute", right: "0" }}>
bonus 25
</span>
</div>
</div>
<ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "14px", fontSize: "17px", lineHeight: "1.5" }}>
<li style={{ display: "flex", gap: "12px" }}>
<span aria-hidden="true" style={{ flex: "none", width: "10px", height: "10px", marginTop: "8px", background: "#3A56F0", borderRadius: "3px" }}>
</span>
Floor 12, target 18, bonus 25 citations per 60-day window.
</li>
<li style={{ display: "flex", gap: "12px" }}>
<span aria-hidden="true" style={{ flex: "none", width: "10px", height: "10px", marginTop: "8px", background: "#3A56F0", borderRadius: "3px" }}>
</span>
{"At least 30% must come from pages outside that day's organic top 10. Proof it's not just your rankings doing the work."}
</li>
<li style={{ display: "flex", gap: "12px" }}>
<span aria-hidden="true" style={{ flex: "none", width: "10px", height: "10px", marginTop: "8px", background: "#3A56F0", borderRadius: "3px" }}>
</span>
Under 12 on day 60? 20% of the fee comes back as credit.
</li>
<li style={{ display: "flex", gap: "12px" }}>
<span aria-hidden="true" style={{ flex: "none", width: "10px", height: "10px", marginTop: "8px", background: "#3A56F0", borderRadius: "3px" }}>
</span>
Citation rate always on screen: how often the robots answered and picked you.
</li>
</ul>
</div>
<div style={{ background: "#3A56F0", color: "#FFFFFF", position: "relative", borderRadius: "28px", padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
<div aria-hidden="true" style={{ position: "absolute", zIndex: "2", pointerEvents: "none", top: "-66px", right: "72px" }}>
<div className={v.miniMove}>
<svg className="peek" viewBox="0 0 100 80" width="100" height="80" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<line x1="50" y1="2" x2="50" y2="14" stroke="#6B7083" strokeWidth="4" strokeLinecap="round">
</line>
<circle className="pulse" cx="50" cy="4" r="5" fill="#FF5FA2">
</circle>
<rect x="18" y="14" width="64" height="52" rx="16" fill="#D7FF3A">
</rect>
<rect x="26" y="24" width="48" height="30" rx="10" fill="#0E0F13">
</rect>
<g className="look">
<g className="blink">
<circle cx="40" cy="39" r="5" fill="#3A56F0">
</circle>
<circle cx="60" cy="39" r="5" fill="#3A56F0">
</circle>
</g>
</g>
<g className="ring">
<circle cx="-6" cy="48" r="15" fill="#F2F0EA" stroke="#0E0F13" strokeWidth="3">
</circle>
<rect x="-10" y="27" width="8" height="7" rx="2" fill="#0E0F13">
</rect>
<path d="M-6 40 v8" stroke="#FF5FA2" strokeWidth="3" strokeLinecap="round">
</path>
</g>
<rect x="6" y="62" width="22" height="14" rx="7" fill="#D7FF3A">
</rect>
<rect x="72" y="62" width="22" height="14" rx="7" fill="#D7FF3A">
</rect>
</svg>
</div>
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
<h3 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontSize: "40px", letterSpacing: "-0.03em" }}>
INP Sprint
</h3>
<span style={{ background: "#0E0F13", color: "#D7FF3A", fontFamily: "var(--font-jbmono), monospace", fontSize: "13px", padding: "7px 12px", borderRadius: "999px" }}>
Real speed
</span>
</div>
<div style={{ background: "#0E0F13", color: "#F2F0EA", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
<span style={{ fontFamily: "var(--font-jbmono), monospace", fontSize: "12px", color: "#A5A9B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
INP p75 · mobile · example
</span>
<span style={{ fontFamily: "var(--font-jbmono), monospace", fontSize: "13px", color: "#D7FF3A" }}>
{v.inpStatus}
</span>
</div>
<div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
<span style={{ fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "72px", lineHeight: "1", letterSpacing: "-0.04em" }}>
{v.inp}
</span>
<span style={{ fontSize: "17px", color: "#C9CCD6" }}>
ms
</span>
</div>
<div style={{ position: "relative", height: "18px", borderRadius: "9px", display: "flex", overflow: "visible" }}>
<div style={{ width: "40%", background: "#D7FF3A", borderRadius: "9px 0 0 9px" }}>
</div>
<div style={{ width: "60%", background: "#3A3E4E", borderRadius: "0 9px 9px 0" }}>
</div>
<span style={css(v.needle)}>
</span>
</div>
<div style={{ position: "relative", height: "18px", fontFamily: "var(--font-jbmono), monospace", fontSize: "12px", color: "#A5A9B8" }}>
<span style={{ position: "absolute", left: "0" }}>
0
</span>
<span style={{ position: "absolute", left: "40%", transform: "translateX(-50%)" }}>
200 ms
</span>
<span style={{ position: "absolute", right: "0" }}>
500 ms
</span>
</div>
</div>
<ul style={{ margin: "0", padding: "0", listStyle: "none", display: "flex", flexDirection: "column", gap: "14px", fontSize: "17px", lineHeight: "1.5" }}>
<li style={{ display: "flex", gap: "12px" }}>
<span aria-hidden="true" style={{ flex: "none", width: "10px", height: "10px", marginTop: "8px", background: "#D7FF3A", borderRadius: "3px" }}>
</span>
INP p75 on mobile at or under 200 ms.
</li>
<li style={{ display: "flex", gap: "12px" }}>
<span aria-hidden="true" style={{ flex: "none", width: "10px", height: "10px", marginTop: "8px", background: "#D7FF3A", borderRadius: "3px" }}>
</span>
Held for two full 28-day CrUX windows after the sprint ships.
</li>
<li style={{ display: "flex", gap: "12px" }}>
<span aria-hidden="true" style={{ flex: "none", width: "10px", height: "10px", marginTop: "8px", background: "#D7FF3A", borderRadius: "3px" }}>
</span>
Measured on your real visitors, then checked against CrUX.
</li>
<li style={{ display: "flex", gap: "12px" }}>
<span aria-hidden="true" style={{ flex: "none", width: "10px", height: "10px", marginTop: "8px", background: "#D7FF3A", borderRadius: "3px" }}>
</span>
Tag Bouncer: you decide which third-party scripts get in. The ones you keep sit outside the guarantee.
</li>
</ul>
</div>
</div>
</section>
<section id="receipts" style={{ maxWidth: "1240px", margin: "0 auto", padding: "140px 32px 40px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "64px" }}>
<div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "22px" }}>
<p style={{ margin: "0", fontFamily: "var(--font-jbmono), monospace", fontSize: "14px", color: "#D7FF3A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
Receipts, not vibes
</p>
<h2 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "clamp(36px, 4.6vw, 64px)", lineHeight: "1", letterSpacing: "-0.035em", textWrap: "balance" }}>
If a robot cited you, you can open the file.
</h2>
<p style={{ margin: "0", fontSize: "19px", lineHeight: "1.55", color: "#C9CCD6", maxWidth: "500px", textWrap: "pretty" }}>
{"Every check stores the raw response as evidence. Your clients get their own read-only portal with a magic-link sign-in. No month-end PDF, no \"trust us\"."}
</p>
</div>
<div style={{ flex: "1 1 520px", position: "relative", transform: "rotate(1.5deg)" }}>
<div aria-hidden="true" style={{ position: "absolute", zIndex: "2", pointerEvents: "none", top: "-66px", left: "56px" }}>
<div className={v.miniMove}>
<svg className="peek" viewBox="0 0 100 80" width="100" height="80" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<line x1="50" y1="2" x2="50" y2="14" stroke="#6B7083" strokeWidth="4" strokeLinecap="round">
</line>
<circle className="pulse" cx="50" cy="4" r="5" fill="#D7FF3A">
</circle>
<rect x="18" y="14" width="64" height="52" rx="16" fill="#F2F0EA">
</rect>
<rect x="26" y="24" width="48" height="30" rx="10" fill="#0E0F13">
</rect>
<g className="look">
<g className="blink">
<circle cx="40" cy="39" r="5" fill="#3A56F0">
</circle>
<circle cx="60" cy="39" r="5" fill="#3A56F0">
</circle>
</g>
</g>
<g className="scan" style={{ transformOrigin: "90px 70px" }}>
<line x1="88" y1="66" x2="98" y2="50" stroke="#6B7083" strokeWidth="5" strokeLinecap="round">
</line>
<circle cx="106" cy="38" r="14" fill="rgba(143,162,255,0.3)" stroke="#F2F0EA" strokeWidth="4">
</circle>
</g>
<rect x="6" y="62" width="22" height="14" rx="7" fill="#F2F0EA">
</rect>
<rect x="72" y="62" width="22" height="14" rx="7" fill="#F2F0EA">
</rect>
</svg>
</div>
</div>
<div style={{ background: "#0A0B0E", border: "1px solid #2A2D3A", borderRadius: "22px", overflow: "hidden" }}>
<div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 18px", borderBottom: "1px solid #2A2D3A" }}>
<span aria-hidden="true" style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#FF5FA2" }}>
</span>
<span aria-hidden="true" style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#D7FF3A" }}>
</span>
<span aria-hidden="true" style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#3A56F0" }}>
</span>
<span style={{ marginLeft: "10px", fontFamily: "var(--font-jbmono), monospace", fontSize: "13px", color: "#A5A9B8" }}>
snapshots/yoursite/2026-11-18.json
</span>
</div>
<pre style={{ margin: "0", padding: "24px", fontFamily: "var(--font-jbmono), monospace", fontSize: "15px", lineHeight: "1.75", color: "#C9CCD6", whiteSpace: "pre-wrap" }}>
{"{\n  "}
<span style={{ color: "#8FA2FF" }}>
{"\"query\""}
</span>
{": "}
<span style={{ color: "#D7FF3A" }}>
{"\"best emergency plumber near me\""}
</span>
{",\n  "}
<span style={{ color: "#8FA2FF" }}>
{"\"surface\""}
</span>
{": "}
<span style={{ color: "#D7FF3A" }}>
{"\"ai_overview\""}
</span>
{",\n  "}
<span style={{ color: "#8FA2FF" }}>
{"\"cited\""}
</span>
{": "}
<span style={{ color: "#FF5FA2" }}>
{"true"}
</span>
{",\n  "}
<span style={{ color: "#8FA2FF" }}>
{"\"url\""}
</span>
{": "}
<span style={{ color: "#D7FF3A" }}>
{"\"yoursite.com/emergency\""}
</span>
{",\n  "}
<span style={{ color: "#8FA2FF" }}>
{"\"in_organic_top10\""}
</span>
{": "}
<span style={{ color: "#FF5FA2" }}>
{"false"}
</span>
{"\n}\n"}
<span style={{ color: "#8C91A3" }}>
{"// off-top10. the robots picked you anyway."}
</span>
</pre>
</div>
</div>
</section>
<section id="join" style={{ maxWidth: "1480px", margin: "0 auto", padding: "120px 24px 64px" }}>
<div onMouseMove={v.pushMove} onMouseLeave={v.pushLeave} style={{ background: "#D7FF3A", color: "#0E0F13", borderRadius: "36px", padding: "52px 48px 140px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "20px", position: "relative", overflow: "hidden" }}>
<svg className="wave" viewBox="0 0 60 90" width="70" height="105" aria-hidden="true" style={{ position: "absolute", left: "6%", top: "40px", transformOrigin: "30px 88px" }}>
<rect x="10" y="0" width="40" height="64" rx="14" fill="#FF5FA2">
</rect>
<text x="30" y="40" textAnchor="middle" fontWeight="700" fontSize="20" fill="#0E0F13" style={{ fontFamily: "var(--font-grotesk), sans-serif" }}>
#1
</text>
<rect x="22" y="60" width="16" height="30" rx="8" fill="#3A56F0">
</rect>
</svg>
<svg className="wave" viewBox="0 0 60 90" width="70" height="105" aria-hidden="true" style={{ position: "absolute", right: "6%", bottom: "40px", transformOrigin: "30px 88px", animationDelay: ".5s" }}>
<rect x="10" y="0" width="40" height="64" rx="14" fill="#3A56F0">
</rect>
<text x="30" y="40" textAnchor="middle" fontWeight="700" fontSize="20" fill="#FFFFFF" style={{ fontFamily: "var(--font-grotesk), sans-serif" }}>
#1
</text>
<rect x="22" y="60" width="16" height="30" rx="8" fill="#FF5FA2">
</rect>
</svg>
<h2 style={{ margin: "0", fontFamily: "var(--font-grotesk), sans-serif", fontWeight: "700", fontSize: "clamp(40px, 6vw, 88px)", lineHeight: "0.95", letterSpacing: "-0.045em", maxWidth: "1100px", textWrap: "balance" }}>
Your robots are waiting to become fans.
</h2>
<p style={{ margin: "0", fontSize: "19px", lineHeight: "1.5", maxWidth: "560px" }}>
For agencies and businesses that want proof the AI answers are picking them, not just a nicer-looking report.
</p>
<a className="cta" data-cta="main" href={v.contactHref} onMouseEnter={v.ctaOn} onMouseLeave={v.ctaOff} onFocus={v.ctaOn} onBlur={v.ctaOff} style={{ background: "#0E0F13", color: "#D7FF3A", textDecoration: "none", padding: "20px 34px", borderRadius: "999px", fontWeight: "600", fontSize: "18px" }}>
Start a fan club
</a>
<p style={{ margin: "0", fontFamily: "var(--font-jbmono), monospace", fontSize: "14px" }}>
Mini-scan coming soon: your citation gap across 25 queries.
</p>
<div aria-hidden="true" style={{ position: "absolute", bottom: "-4px", left: "28%", transform: "translateX(-50%)", pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
{v.ctaHover && (<>
<span className="pop" style={{ marginBottom: "10px", background: "#0E0F13", color: "#D7FF3A", fontFamily: "var(--font-jbmono), monospace", fontWeight: "700", fontSize: "14px", padding: "7px 12px", borderRadius: "999px", whiteSpace: "nowrap", animationDelay: "0s" }} key={v.fanSay[0]}>
{v.fanSay[0]}
</span>
</>)}
<div className={v.fanClass} style={css(v.fan0)}>
<div className={v.miniMove}>
<svg className="peek" viewBox="0 0 100 80" width="90" height="72" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<line x1="50" y1="2" x2="50" y2="14" stroke="#6B7083" strokeWidth="4" strokeLinecap="round">
</line>
<circle className={v.fanBulb} cx="50" cy="4" r="5" fill="#FF5FA2">
</circle>
<rect x="18" y="14" width="64" height="52" rx="16" fill="#3A56F0">
</rect>
<rect x="26" y="24" width="48" height="30" rx="10" fill="#0E0F13">
</rect>
<g style={css(v.fanEyes)}>
<g className="look">
<g className="blink">
<circle cx="40" cy="39" r="5" fill="#D7FF3A">
</circle>
<circle cx="60" cy="39" r="5" fill="#D7FF3A">
</circle>
</g>
</g>
</g>
<g style={css(v.fanHearts)}>
<g className="heartbeat">
<path d="M40 45 l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5 z" fill="#FF5FA2">
</path>
<path d="M60 45 l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5 z" fill="#FF5FA2">
</path>
</g>
</g>
<g style={css(v.fanHands)}>
<rect x="6" y="62" width="22" height="14" rx="7" fill="#3A56F0">
</rect>
<rect x="72" y="62" width="22" height="14" rx="7" fill="#3A56F0">
</rect>
</g>
<g style={css(v.fanArms)}>
<g className="waveFast" style={{ transformOrigin: "14px 60px" }}>
<rect x="6" y="26" width="14" height="38" rx="7" fill="#3A56F0">
</rect>
</g>
<g className="waveFast" style={{ transformOrigin: "86px 60px", animationDelay: ".16s" }}>
<rect x="80" y="26" width="14" height="38" rx="7" fill="#3A56F0">
</rect>
</g>
</g>
</svg>
</div>
</div>
</div>
<div aria-hidden="true" style={{ position: "absolute", bottom: "-4px", left: "50%", transform: "translateX(-50%)", pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
{v.ctaHover && (<>
<span className="pop" style={{ marginBottom: "10px", background: "#0E0F13", color: "#D7FF3A", fontFamily: "var(--font-jbmono), monospace", fontWeight: "700", fontSize: "14px", padding: "7px 12px", borderRadius: "999px", whiteSpace: "nowrap", animationDelay: ".08s" }} key={v.fanSay[1]}>
{v.fanSay[1]}
</span>
</>)}
<div className={v.fanClass} style={css(v.fan1)}>
<div className={v.miniMove}>
<svg className="peek" viewBox="0 0 100 80" width="90" height="72" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<line x1="50" y1="2" x2="50" y2="14" stroke="#6B7083" strokeWidth="4" strokeLinecap="round">
</line>
<circle className={v.fanBulb} cx="50" cy="4" r="5" fill="#3A56F0">
</circle>
<rect x="18" y="14" width="64" height="52" rx="16" fill="#0E0F13">
</rect>
<rect x="26" y="24" width="48" height="30" rx="10" fill="#0E0F13">
</rect>
<g style={css(v.fanEyes)}>
<g className="look">
<g className="blink">
<circle cx="40" cy="39" r="5" fill="#FF5FA2">
</circle>
<circle cx="60" cy="39" r="5" fill="#FF5FA2">
</circle>
</g>
</g>
</g>
<g style={css(v.fanHearts)}>
<g className="heartbeat">
<path d="M40 45 l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5 z" fill="#FF5FA2">
</path>
<path d="M60 45 l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5 z" fill="#FF5FA2">
</path>
</g>
</g>
<g style={css(v.fanHands)}>
<rect x="6" y="62" width="22" height="14" rx="7" fill="#0E0F13">
</rect>
<rect x="72" y="62" width="22" height="14" rx="7" fill="#0E0F13">
</rect>
</g>
<g style={css(v.fanArms)}>
<g className="waveFast" style={{ transformOrigin: "14px 60px" }}>
<rect x="6" y="26" width="14" height="38" rx="7" fill="#0E0F13">
</rect>
</g>
<g className="waveFast" style={{ transformOrigin: "86px 60px", animationDelay: ".16s" }}>
<rect x="80" y="26" width="14" height="38" rx="7" fill="#0E0F13">
</rect>
</g>
</g>
</svg>
</div>
</div>
</div>
<div aria-hidden="true" style={{ position: "absolute", bottom: "-4px", left: "72%", transform: "translateX(-50%)", pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
{v.ctaHover && (<>
<span className="pop" style={{ marginBottom: "10px", background: "#0E0F13", color: "#D7FF3A", fontFamily: "var(--font-jbmono), monospace", fontWeight: "700", fontSize: "14px", padding: "7px 12px", borderRadius: "999px", whiteSpace: "nowrap", animationDelay: ".16s" }} key={v.fanSay[2]}>
{v.fanSay[2]}
</span>
</>)}
<div className={v.fanClass} style={css(v.fan2)}>
<div className={v.miniMove}>
<svg className="peek" viewBox="0 0 100 80" width="90" height="72" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
<line x1="50" y1="2" x2="50" y2="14" stroke="#6B7083" strokeWidth="4" strokeLinecap="round">
</line>
<circle className={v.fanBulb} cx="50" cy="4" r="5" fill="#3A56F0">
</circle>
<rect x="18" y="14" width="64" height="52" rx="16" fill="#FF5FA2">
</rect>
<rect x="26" y="24" width="48" height="30" rx="10" fill="#0E0F13">
</rect>
<g style={css(v.fanEyes)}>
<g className="look">
<g className="blink">
<circle cx="40" cy="39" r="5" fill="#F2F0EA">
</circle>
<circle cx="60" cy="39" r="5" fill="#F2F0EA">
</circle>
</g>
</g>
</g>
<g style={css(v.fanHearts)}>
<g className="heartbeat">
<path d="M40 45 l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5 z" fill="#FF5FA2">
</path>
<path d="M60 45 l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5 z" fill="#FF5FA2">
</path>
</g>
</g>
<g style={css(v.fanHands)}>
<rect x="6" y="62" width="22" height="14" rx="7" fill="#FF5FA2">
</rect>
<rect x="72" y="62" width="22" height="14" rx="7" fill="#FF5FA2">
</rect>
</g>
<g style={css(v.fanArms)}>
<g className="waveFast" style={{ transformOrigin: "14px 60px" }}>
<rect x="6" y="26" width="14" height="38" rx="7" fill="#FF5FA2">
</rect>
</g>
<g className="waveFast" style={{ transformOrigin: "86px 60px", animationDelay: ".16s" }}>
<rect x="80" y="26" width="14" height="38" rx="7" fill="#FF5FA2">
</rect>
</g>
</g>
</svg>
</div>
</div>
</div>
{v.pushOn && (<>
<div aria-hidden="true" style={css(v.pushStyle)}>
<div className={v.pushClass}>
<svg viewBox="0 0 120 100" width="120" height="100" style={{ display: "block", overflow: "visible" }}>
<g transform="rotate(16 60 70)">
<line x1="50" y1="12" x2="44" y2="0" stroke="#3A3E4E" strokeWidth="4" strokeLinecap="round">
</line>
<circle className="strobe" cx="44" cy="0" r="4.5" fill="#FF5FA2">
</circle>
<g className="runA">
<rect x="38" y="72" width="11" height="28" rx="5" fill="#3A3E4E">
</rect>
</g>
<g className="runB">
<rect x="58" y="72" width="11" height="28" rx="5" fill="#3A3E4E">
</rect>
</g>
<rect x="30" y="44" width="44" height="34" rx="10" fill="#3A56F0">
</rect>
<rect x="34" y="10" width="48" height="36" rx="12" fill="#3A56F0">
</rect>
<rect x="58" y="17" width="22" height="20" rx="6" fill="#0E0F13">
</rect>
<circle cx="71" cy="28" r="4" fill="#D7FF3A">
</circle>
<path d="M64 21 l12 3" stroke="#D7FF3A" strokeWidth="2.5" strokeLinecap="round">
</path>
<rect x="62" y="47" width="46" height="9" rx="4.5" fill="#3A56F0">
</rect>
<rect x="60" y="58" width="46" height="9" rx="4.5" fill="#2E46C8">
</rect>
<circle cx="110" cy="51" r="7" fill="#3A56F0">
</circle>
<circle cx="108" cy="62" r="7" fill="#2E46C8">
</circle>
<path className="sweat" d="M28 16 q-4 6 0 9 q4 -3 0 -9 z" fill="#8FA2FF">
</path>
<path className="sweat" d="M24 30 q-3 5 0 7 q3 -2 0 -7 z" fill="#8FA2FF" style={{ animationDelay: ".35s" }}>
</path>
</g>
</svg>
</div>
</div>
<span aria-hidden="true" style={css(v.pushLabelStyle)}>
{v.pushLabel}
</span>
</>)}
</div>
</section>
<footer style={{ maxWidth: "1240px", margin: "0 auto", padding: "24px 32px 48px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "16px", fontSize: "14px", color: "#A5A9B8", borderTop: "1px solid #2A2D3A" }}>
<span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
<svg viewBox="0 0 60 50" width="42" height="35" aria-hidden="true" style={{ overflow: "visible" }}>
<rect x="6" y="12" width="48" height="36" rx="12" fill="#3A3E4E">
</rect>
<rect x="12" y="18" width="36" height="22" rx="7" fill="#0E0F13">
</rect>
<path d="M18 29 q4 3 8 0" stroke="#8FA2FF" strokeWidth="2.5" fill="none" strokeLinecap="round">
</path>
<path d="M34 29 q4 3 8 0" stroke="#8FA2FF" strokeWidth="2.5" fill="none" strokeLinecap="round">
</path>
<text className="zzz" x="54" y="10" fontWeight="700" fontSize="11" fill="#A5A9B8" style={{ fontFamily: "var(--font-jbmono), monospace" }}>
z
</text>
<text className="zzz" x="54" y="10" fontWeight="700" fontSize="9" fill="#A5A9B8" style={{ animationDelay: "1.3s", fontFamily: "var(--font-jbmono), monospace" }}>
z
</text>
</svg>
{" © Robot Fan Club "}
</span>
<span style={{ fontFamily: "var(--font-jbmono), monospace" }}>
Measured in the US · English · mobile · same hour daily
</span>
</footer>
</div>
    </>
  );
}
