# Robot Fan Club

**"Make the robots your biggest fans."**

## What it is for
Robot Fan Club is a per-client portal that proves an agency's work through two measurable services:

1. **AIO Pro:** measures whether Google AI Overviews and AI Mode cite the client's pages, against a query list frozen for 60 days (floor 12, target 18, bonus 25 citations).
2. **INP Sprint:** measures real interaction speed (INP p75 mobile) using real-visitor data and CrUX.

Clients see their citations, the evidence (raw JSON of every check) and their speed without asking for reports. It serves any agency or business (D-004). Measurements are US, English, mobile (D-006).

**Start with the guide:** [`guide.md`](guide.md) — Guide: what it is and how it is used.

## How it works (summary)
- A daily job queries DataForSEO for every frozen query and stores the result in Supabase and the raw JSON in Storage.
- A snippet on the client's site sends INP, LCP and CLS to the ingest endpoint; a nightly job adds CrUX data.
- The portal (Next.js) shows everything under RLS: clients see only their workspace, staff see all.

Full detail: [`../spec.md`](../spec.md) (Spanish). Decisions: [`DECISIONS.md`](DECISIONS.md). How to run it: [`runbook.md`](runbook.md). Spanish version: [`../es/README.md`](../es/README.md).

## Status
Phase 0 (foundation) complete. See [`CHANGELOG.md`](CHANGELOG.md).
