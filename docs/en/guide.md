# Guide: what Robot Fan Club is and how it is used

This guide explains the product in plain language. For technical detail see [`how-it-works.md`](how-it-works.md) and [`../spec.md`](../spec.md).

## 1. The problem
When someone searches Google, above the usual results there is more and more often an **AI-written answer** (AI Overview, or AI Mode if the person keeps the conversation going). That answer **cites sources**: links to the pages it took the information from.

If your page is one of those sources, the person sees you before anyone else. If not, they see your competitors. Classic ranking reports say nothing about this.

Robot Fan Club answers two questions, every day, with evidence you can open:
1. **Do Google's AI answers cite the client's pages?** (the **AIO Pro** service)
2. **Does the site respond fast when someone taps it?** (the **INP Sprint** service)

## 2. Who does what
| | What they do |
|---|---|
| **The platform** | Measures, keeps the evidence and shows it in a portal per client. |
| **The team (staff)** | Chooses what to measure, interprets the results, and improves the content and the site. |
| **The client** | Looks at their portal (read-only) and approves changes. |

The platform **measures; it improves nothing on its own**. Improving is the team's job. Today, **choosing what to measure is also done by a person**: see section 5.

## 3. AIO Pro: measuring citations

### How it works
1. Staff choose a list of up to **60 queries** (searches with buying or research intent) and **freeze** it for **60 days**. A frozen list cannot be edited: that keeps the measurement fair and comparable. To change it, a new list is frozen, starting when the previous one ends.
2. **Every day, at the same hour**, the system asks Google for each query, always under the same conditions: **US, English, mobile**. Changing them would break the comparison.
3. From each check it keeps the **raw result** (the full JSON). That is the **evidence**: if the portal says "cited", you can open the file and see it.

### What counts as a citation
A **citation** is a frozen query where **a page of the client's domain appears among the sources of the AI answer** at least once within the 60 days. Seeing it again adds nothing: each query counts once.

### Targets
- **Floor: 12 citations.** **Target: 18.** **Bonus: 25.**
- If on day 60 there are **fewer than 12**, the client gets a **20% fee credit** (as credit, not a refund).

### The 30% rule: outside the top 10
For each query, Google also shows the usual 10 organic results. A citation is **"off-top10"** when the page cited by the AI **was not among those 10 results that same day** (compared by the page's exact address, not by site).

**At least 30% of citations must be off-top10.** It proves the AI chose the client for its content and not just because it was already first on Google.

### The citation rate
Besides citations, the portal always shows the **citation rate**: of all the checks where Google answered with AI, **the percentage in which the client was cited**. It answers "how often am I picked when the AI answers?".

### A full example
Frozen query: *"best emergency plumber in Miami"*.
- Day 12: Google answers with AI and cites `yoursite.com/emergency`. From that day the query is **one citation**.
- That page was in position 34 of the organic results that day: the citation is **off-top10**.
- On the following days it keeps citing you: **it does not add another citation**, but the citation rate goes up.
- If on day 60 you have 14 citations and 5 are off-top10 (36%), you meet the floor and the 30% rule.

## 4. INP Sprint: measuring speed
**INP** (Interaction to Next Paint) measures how long the site takes to react when someone taps, clicks or types. Google uses it as an experience signal.
- It is measured **on mobile**, with real visitors (a small script on the site) and with Google's public data (CrUX).
- **Goal:** INP p75 ≤ **200 ms**, held across **two full 28-day windows** after the work ships.
- Third-party scripts the client decides to keep (for example a consent banner) are **outside the guarantee**. **Tag Bouncer** lets the client decide which scripts get in.

## 5. How queries are chosen (today)
This is the most important decision: the result depends on which queries are measured. **Today a person on the team chooses the list and loads it by hand** in Admin (`/admin`, the client's page, "Frozen query list").

What makes a good list:
- **Searches that bring customers**, not just the most popular ones: real buying or research intent.
- **Questions and long tail** ("how to choose…", "best X for Y"), which trigger AI answers most.
- **Queries where the client has a real chance**: a new site competing against giants will hardly reach 12 citations.
- Each one can be **improved with a specific page**.

Sources of ideas:
- **The client's Search Console** (queries with impressions and position 4 to 20; questions and long tail). Today it is exported and pasted by hand: **there is no automatic connection**.
- The Admin panel **"Query ideas from AI visibility"**: questions Google already cites for that domain, minus the ones already frozen. Read-only.
- What the client themself says they want to win.

## 6. What it takes for AI to cite you
The platform does not do this; the team does. According to Google, **there is no special markup for AI**: SEO fundamentals apply.
1. **The page must be indexed and eligible to show with a snippet.** If it is not indexed, it cannot be cited.
2. **One page per query that answers the question directly**: a clear answer up front, clean headings, concrete facts.
3. **Authority and trust signals** (structured data where it fits, mentions, reviews).
4. **A fast site.**

The portal helps decide where to work: the **gap** view shows the queries where the AI answers but **cites others**, and whom. If after improving a page that query starts citing you, the portal shows it.

## 7. What it is not (honest limits)
- **It does not promise positions or specific citations.** It measures and gives a defined guarantee (floor of 12, or credit).
- **It does not cover ChatGPT or other AIs.** The ChatGPT part is an **informational** module ("AI visibility"): data from a database, with its date, outside the SLA.
- **It does not index pages or fix the site.** It measures; the work is the team's.

## 8. What comes next: an AI advisor (not built yet)
Today, choosing queries and deciding what to improve depends on the team's experience. The recorded idea (D-014) is to add an **AI layer that advises**, always with human review:
1. **Propose what to measure:** a query list based on real data (Search Console, the questions already tied to the domain, what the AI cites on the topic), with the reason for each.
2. **Explain why you are not cited:** compare the AI answer, the cited pages and the client's page.
3. **Recommend content improvements** per page.
4. **Close the loop:** see whether the query started citing you after the change.

Provider, which data it sees, the cost cap and the phase are still to be decided. Until then, this section is an intention, not a feature.

## 9. Glossary
- **AI Overview / AI Mode:** Google's AI answers, with cited sources.
- **Query:** a specific search that is measured.
- **Frozen list / window:** the fixed queries for 60 days.
- **Citation:** a query where a client page appears among the sources, at least once in the window.
- **Off-top10:** a citation from a page that was not in that query's organic top 10 that day.
- **Citation rate:** % of AI answers in which the client was cited.
- **Snapshot:** the raw result of a check, kept as evidence.
- **INP / CrUX:** interaction speed / Google's public real-user data.
- **Credit (clawback):** 20% of the fee if on day 60 there are fewer than 12 citations.
