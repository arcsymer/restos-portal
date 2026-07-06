# PRODUCT.md — restos-portal loyalty

A product view of the loyalty portal: who it's for, what it should move, and how we'd learn
whether it works. This is a portfolio artifact — the metrics/experiments describe how I'd run it,
not results from real users (there are none).

## Problem & audience

Bar Mleczny Nowa is a cash-heavy neighbourhood milk bar with loyal regulars but no way to
recognise or reward them. Paper punch-cards get lost and reveal nothing. **Goal:** a lightweight
digital loyalty program that (a) gives regulars a reason to come back and (b) gives the owner a
first, honest signal of who their repeat customers are.

Two users:

- **Customer** — wants effortless points and rewards worth having.
- **Staff/owner** — wants to credit points at the till in seconds and not babysit a system.

## User stories

- As a customer, I can **register and log in** so my points are tied to me, not a card I can lose.
- As a customer, I can **see my balance, tier, and history** so the program feels transparent.
- As a customer, I can **redeem a reward** when I have enough points, and be told clearly when I
  don't.
- As a customer, I **move up a tier** as I keep coming back, so there's a reason to keep going.
- As staff, I can **credit a customer's points** for a purchase in one call, with a reason
  attached for the record.
- As staff, I am **prevented from being impersonated** — only staff accounts can credit points.

Each of these maps to a tested endpoint (`/auth/*`, `/me/account`, `/me/ledger`, `/me/redeem`,
`/loyalty/earn`) — see the e2e suite.

## Success metrics

North-star: **repeat-visit rate of enrolled customers** (visits/month vs. pre-enrolment).

Supporting funnel:

| Stage | Metric | Why |
|---|---|---|
| Acquisition | % of till transactions that enrol / attach a customer | Is staff actually using it? |
| Activation | % of enrolled who reach their first redemption | Did they get to the "aha"? |
| Engagement | median points earned / active customer / month | Are visits translating to points? |
| Retention | 30/60-day repeat-visit rate, enrolled vs. not | The whole point of the program |
| Progression | % of customers who reach `staly`, `klub` | Is the tier ladder motivating? |
| Health | redemption rate = redeemed / earned points | Too low = rewards feel unreachable; too high = margin risk |

Guardrail: **average discount cost per visit** stays within the owner's target margin.

## Experiment plan (first test)

**Hypothesis:** customers who can see how close they are to their *next affordable reward*
redeem sooner and return more often than customers who only see a raw balance.

- **Change:** on the dashboard, show "You're 30 points from a free soup" (nearest reward the
  balance doesn't yet cover) instead of just the number.
- **Design:** A/B by user id hash, 50/50, 4 weeks. A = balance only, B = balance + next-reward nudge.
- **Primary metric:** first-redemption rate within 4 weeks (activation).
- **Secondary:** 30-day repeat-visit rate; redemption rate (watch the margin guardrail).
- **Decision rule:** ship B if first-redemption lifts ≥ 5 percentage points with no worse than
  neutral margin guardrail; otherwise keep A and try a different lever (e.g. a small welcome bonus,
  which the seed already models at 150 pts).
- **Instrumentation:** the append-only `PointsEntry` ledger already timestamps every earn/redeem,
  so activation and redemption timing are derivable without new tracking; visit data would come
  from the till/enrolment event.

## What this intentionally does *not* do yet

- No automatic order→points link (points are credited by staff/system today); a webhook from
  restos-core is the obvious next integration.
- No churn model or cohort dashboard — the ledger makes them possible, but they're out of MVP.
- No margin/finance reporting; the guardrail above would need cost-of-reward data the demo lacks.
