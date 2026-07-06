# Demo transcript

Real request/response session against `pnpm start` on a freshly seeded SQLite DB
(2026-07-07, unedited). Tokens truncated for readability.

```text
$ # customer logs in
$ curl -X POST /auth/login -d {anna@example.com / password123}
{ accessToken: "<access-jwt>", refreshToken: "<refresh-jwt>" }

$ curl /me/account          # seeded welcome bonus: 150 pts
{"balance":150,"lifetimePoints":150,"tier":"nowicjusz"}

$ # staff logs in and credits Anna 120 points for an order
$ curl -X POST /loyalty/earn (staff) -d {anna, 120, "order BMN-0042"}
{"balance":270,"lifetimePoints":270,"tier":"staly"}     # crossed the 200 threshold

$ # Anna redeems a free soup (120 pts)
$ curl -X POST /me/redeem (customer) -d {FREE_SOUP}
{"balance":150,"lifetimePoints":270,"tier":"staly"}     # balance drops, lifetime/tier unchanged

$ # a customer CANNOT credit points (staff-only) -> 403
$ curl -X POST /loyalty/earn (customer token)
HTTP 403

$ # brute-forcing login is throttled -> 429 (limit 5/min on /auth/login)
  attempt 1 -> HTTP 401
  attempt 2 -> HTTP 401
  attempt 3 -> HTTP 401
  attempt 4 -> HTTP 429
  attempt 5 -> HTTP 429
```

Notes:

- Redeeming leaves `lifetimePoints` (and therefore the tier) unchanged — tiers reward loyalty
  over time, not current balance.
- The 429 arrives at attempt 4 here because earlier logins in the same minute already consumed
  part of the 5-per-minute login budget.
- The e2e suite (`pnpm run test:e2e`) asserts every one of these paths, including 401/409/400.
