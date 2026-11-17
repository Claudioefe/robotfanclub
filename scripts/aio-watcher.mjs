// aio-watcher.mjs — chequeo diario de citas en Google AI Overviews y AI Mode.
//
// Requisitos: Node 18+, `npm i @supabase/supabase-js`
// Variables de entorno: DFS_LOGIN, DFS_PASSWORD (https://app.dataforseo.com/api-access),
//                       SUPABASE_URL, SUPABASE_SECRET_KEY
// Tablas: las del esquema del portal (clients, query_sets, aio_checks) + bucket de Storage "snapshots".
//
// Programarlo 1 vez por día, siempre a la misma hora. Ejemplo con GitHub Actions:
//   on: { schedule: [{ cron: "0 14 * * *" }] }
//   steps: checkout -> setup-node -> npm ci -> node aio-watcher.mjs (con los secrets como env)

import { createClient } from '@supabase/supabase-js';

const DFS = 'https://api.dataforseo.com/v3/serp/google';
// Condiciones fijas: si cambian entre días, la serie deja de ser comparable.
const BASE = { location_code: 2840, language_code: 'en', device: 'mobile' }; // EE. UU., inglés, mobile

/* ---------- Parser (puro, testeable) ---------- */

export const normHost = h => String(h || '').toLowerCase().replace(/^www\./, '');

export function normUrl(u) {
  try {
    const x = new URL(u);
    return normHost(x.hostname) + (x.pathname.replace(/\/+$/, '') || '/');
  } catch { return null; }
}

function hostOf(ref) {
  if (ref.domain) return normHost(ref.domain);
  try { return normHost(new URL(ref.url).hostname); } catch { return ''; }
}

const isClient = (host, clientDomain) => {
  const c = normHost(clientDomain);
  return host === c || host.endsWith('.' + c);
};

// Las referencias pueden venir anidadas (items, tablas, componentes expandidos): se recorren todas.
export function collectRefs(node, out = []) {
  if (Array.isArray(node)) { for (const n of node) collectRefs(n, out); return out; }
  if (node && typeof node === 'object') {
    if (node.type === 'ai_overview_reference' && node.url) out.push(node);
    for (const v of Object.values(node)) if (v && typeof v === 'object') collectRefs(v, out);
  }
  return out;
}

// result: un result[0] de DataForSEO (orgánico o AI Mode). top10: items orgánicos del mismo día.
export function parseCitation(result, clientDomain, top10 = []) {
  const aio = (result?.items || []).find(i => i.type === 'ai_overview');
  if (!aio) return { aio_present: false, cited: false };

  const unique = new Map();                       // dedupe por URL normalizada, respeta el orden
  for (const r of collectRefs(aio)) {
    const k = normUrl(r.url);
    if (k && !unique.has(k)) unique.set(k, r);
  }
  const refs = [...unique.values()];
  const idx = refs.findIndex(r => isClient(hostOf(r), clientDomain));
  const mine = idx >= 0 ? refs[idx] : null;

  // "off-top10" se mide por URL citada, no por dominio: ¿esa página exacta está en el top 10 orgánico?
  const organic = mine ? top10.find(o => normUrl(o.url) === normUrl(mine.url)) : null;

  return {
    aio_present: true,
    cited: !!mine,
    cited_url: mine?.url ?? null,
    source_position: mine ? idx + 1 : null,
    source_count: refs.length,
    organic_rank: organic ? organic.rank_group : null,   // null = la URL citada no está en el top 10
    other_domains: [...new Set(refs.filter(r => r !== mine).map(hostOf))].filter(Boolean).slice(0, 10),
  };
}

/* ---------- I/O ---------- */

async function dfs(path, task) {
  const auth = 'Basic ' + Buffer.from(`${process.env.DFS_LOGIN}:${process.env.DFS_PASSWORD}`).toString('base64');
  const res = await fetch(`${DFS}/${path}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify([task]),                   // 1 tarea por request en endpoints Live
  });
  if (!res.ok) throw new Error(`DataForSEO HTTP ${res.status}`);
  const t = (await res.json()).tasks?.[0];
  if (!t || t.status_code !== 20000) throw new Error(`DataForSEO ${t?.status_code}: ${t?.status_message}`);
  return t.result?.[0] ?? null;
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function main() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  const today = new Date().toISOString().slice(0, 10);

  const { data: sets, error } = await sb
    .from('query_sets')
    .select('client_id, query, clients(domain)')
    .lte('frozen_from', today)
    .gte('frozen_until', today);
  if (error) throw error;

  let ok = 0, failed = 0;
  for (const { client_id, query, clients } of sets) {
    const domain = clients.domain;
    try {
      // 1) SERP clásica: AI Overview + top 10 orgánico en la misma llamada.
      //    load_async_ai_overview es clave: muchos AIO cargan asincrónicos y sin esto no aparecen.
      const serp = await dfs('organic/live/advanced', { ...BASE, keyword: query, depth: 10, load_async_ai_overview: true });
      const top10 = (serp?.items || []).filter(i => i.type === 'organic' && i.rank_group <= 10);

      // 2) AI Mode (endpoint aparte). El "off-top10" se compara contra el orgánico del mismo día.
      const aiMode = await dfs('ai_mode/live/advanced', { ...BASE, keyword: query });

      for (const [surface, result] of [['ai_overview', serp], ['ai_mode', aiMode]]) {
        const c = parseCitation(result, domain, top10);
        // Evidencia: JSON crudo del día (incluye check_url). Es lo que respalda cada Citation Card.
        const path = `${client_id}/${today}/${surface}/${slug(query)}.json`;
        const up = await sb.storage.from('snapshots')
          .upload(path, JSON.stringify(result), { contentType: 'application/json', upsert: true });
        if (up.error) throw up.error;
        const ins = await sb.from('aio_checks').insert({ client_id, query, surface, ...c, snapshot_path: path });
        if (ins.error) throw ins.error;
      }
      ok++;
    } catch (err) {
      failed++;
      console.error(`[${domain}] "${query}": ${err.message}`);
    }
  }
  console.log(`Listo: ${ok} queries ok, ${failed} con error.`);
  if (failed && !ok) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
