# Platform limits

Spec: `docs/deployment.md#hạn-mức-miễn-phí`. Read it before adding a query, a Cron Trigger, a subrequest, or anything CPU-heavy.

Must hold:

- **Quotas are per Cloudflare account, and this account runs other Workers.** 100,000 requests/day, D1 5M rows read / 100k rows written per day, **5 Cron Triggers total**. Since 2026-09-01 D1 fails queries once a daily limit is hit, until midnight UTC.
- **10 ms CPU per request** is the limit that actually bites. Waiting on D1 does not count — batch independent statements in one `db.batch()` instead of sequential `await`s.
- 50 subrequests per request, and each D1 call counts.
- Every query that filters or joins has an index to use. A full table scan spends the shared row-read quota.
- Use one Cron Trigger, not one per job. Before adding one, count the triggers already on the account.
- Cron runs in **UTC**. Anything period-related is computed in `Asia/Ho_Chi_Minh`.
- `ctx.waitUntil()` has a 30 s budget after the response; every promise is `await`ed or passed to it.
