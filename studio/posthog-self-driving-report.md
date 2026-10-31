# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured for this browser-based studio: Session Replay, Error Tracking, and Support were enabled; native health, error, and support signal sources are active; and a focused scout troop plus two Replay Vision monitors were created. Findings will start appearing in the [Self-driving inbox](https://us.posthog.com/project/700825/inbox) within about 30 minutes after new eligible data arrives.

## AI data processing

Approved.

## GitHub

Connected before this setup began through the PostHog GitHub App.

## Products enabled

| Product | Status | Client check |
|---|---|---|
| Session Replay | enabled | Browser `posthog-js` initialization has no `disable_session_recording: true` override. |
| Error Tracking | enabled | Browser initialization explicitly keeps exception capture enabled. |
| Support / Conversations | enabled | Tickets will begin arriving only after an inbound email, inbox, or Slack channel is connected in PostHog. |

## Signal sources

| Source product / type | Action | Notes |
|---|---|---|
| `health_checks` / `health_issue` | enabled | Captures actionable instrumentation and setup-health findings. |
| `error_tracking` / `issue_created` | enabled | New error issues. |
| `error_tracking` / `issue_reopened` | enabled | Reopened error issues. |
| `error_tracking` / `issue_spiking` | enabled | Error-volume regressions. |
| `conversations` / `ticket` | enabled | Armed now; remains quiet until a Support channel is connected. |
| `signals_scout` / `cross_source_issue` | on by default | No opt-out row existed, so no row was created. |
| `session_replay` / `session_analysis_cluster` | skipped | Retired route; Replay Vision scanners provide replay coverage. |
| `logs` / `alert_state_change` | skipped | No Logs usage evidence was available. |
| `endpoints` / both endpoint types | skipped | Endpoint usage could not be checked with the available MCP permission. |

## Connected tools

No connected-tool sources were selected. GitHub Issues, Linear, Jira, Sentry, Zendesk, and all additional catalog tools are **not used** by this setup, so no external responder was enabled.

## Scout troop

**Enabled troop (3):**

- `signals-scout-general` — cross-product patterns outside specialist coverage.
- `signals-scout-product-analytics` — the studio’s instrumented product flows.
- `signals-scout-anomaly-detection` — unexpected changes in saved insights and dashboards.

**Operational scout (1):** `signals-scout-inbox-validation` remains active. It runs report follow-up checks and sits outside the selective troop ceiling.

**Disabled specialists (25):** `ai-observability`, `apm`, `conversations`, `csp-violations`, `customer-analytics`, `data-pipelines`, `data-warehouse`, `error-tracking`, `experiments`, `feature-flags`, `insight-alerts`, `logs`, `mcp-tool-calls`, `observability-gaps`, `pr-follow-up`, `replay-vision`, `revenue-analytics`, `session-replay`, `skills-store`, `surveys`, `tasks`, `unused-features`, `web-analytics`, `web-vitals`, and `workflows`. They are disabled because their corresponding product surface was not evidenced as actively used here; Error Tracking and session replay are deliberately covered by their native source and Replay Vision routes, respectively.

| Enforced limit | Value |
|---|---:|
| Scout runs per day | 100 |
| Runs used today | 0 |
| Runs remaining today | 100 |
| Enabled-scout cap | 250 |
| Free non-operational/custom slots counted in step 6 | 249 |

> Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.

## Custom scouts

| Scout | Status | Coverage and discriminator |
|---|---|---|
| `signals-scout-editor-publishing-health` | created and enabled | Watches the studio’s publishing workflow. It compares publishing, discard, delete, and unpublish rates against editor-load activity and a trailing baseline, reporting only sustained broad-reach changes. This covers editor-specific workflow health that generic product analytics and anomaly scouts do not interpret semantically. |

The custom scout was proposed and approved. Error spikes and replay friction were ruled out as custom-scout candidates because native Error Tracking and Replay Vision already own those routes. Payments, surveys, AI/LLM activity, CSP reporting, and data-pipeline surfaces were ruled out because no project evidence supported them.

If the custom scout becomes noisy, set `emit: false` on its configuration in PostHog to keep it running in dry-run mode without sending inbox findings.

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes high-confidence observations into the inbox. These are the only items in this setup that spend Replay Vision quota; findings arrive at half weight and need independent corroboration before promotion into a report.

| Scanner | Status | Query scope | Sampling | Estimate |
|---|---|---|---|---|
| Studio editor breakage monitor | created | Recorded pages with a visited page; focuses on visible editor and publishing breakage across the studio’s primary editing surface. | focused, 100% | 0 observations / 0 credits per month from the current seven-day sample. |
| Studio editor frustration monitor | created | Sessions containing `$rageclick`; focuses on visible interaction friction while editing or publishing. | focused, 100% | 0 observations / 0 credits per month from the current seven-day sample. |

Both scanners are enabled, emit Self-driving findings, and use free credits only. There are no recordings yet, so they are armed and will start working when recording traffic arrives. The organization has 2,500 Replay Vision credits remaining for the current period.

## Files modified or created

| File | Change |
|---|---|
| `posthog-self-driving-report.md` | Created this setup report. |

No application source files were modified.

## Follow-ups

- [ ] Configure `SANITY_STUDIO_POSTHOG_KEY` and `SANITY_STUDIO_POSTHOG_HOST` in the studio’s actual deployment environment. The repository initializes PostHog from these values, but no local environment file currently sets them; without deployment configuration, editor events and recordings will not arrive.
- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog so the enabled Support ticket responder has tickets to process.
- [ ] Grant endpoint-read and schema-read MCP scopes if you want a future run to verify endpoint usage and the custom scout’s captured event schema directly.
- [ ] The project profile was not yet built when checked; it is expected to become available after the initial background build.
- [ ] Once recordings arrive, review and rate the two scanner observations in Replay Vision so their prompts can be tuned with real examples.

## What happens next

The scout coordinator picks up fresh configurations within about 30 minutes. Scout runs draw from the daily project budget, findings cluster into reports in the Self-driving inbox, and immediately actionable findings can start coding tasks.
