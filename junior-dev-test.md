# Junior Developer Take-Home Test

You're free to use AI tools (Copilot, ChatGPT, Claude, whatever) for any part of this test. We're not testing whether you can produce code — we're testing whether you can make and defend design decisions. Copy-pasting this document into an AI and submitting whatever comes out will produce a shallow, generic answer that we can spot immediately, and you'll have nothing to say in the follow-up call.

Time budget: aim for 60-90 minutes total across all three parts. Don't over-polish — a rough but well-reasoned answer beats a polished generic one.

---

## Background (read this first)

This is a condensed version of the real architecture — enough to reason about the task, not the whole system.

The app runs two independent parliamentary "chambers" (Representative and Senate). At any moment, **at most one session per chamber is "live"** — this is called `theOne`. It controls what's shown on public broadcast screens.

Rules that the real codebase enforces strictly:

1. **Setting `theOne` is always: clear all flags → set the new one → update in-memory cache → emit socket event.** Never set a new `theOne` without clearing the old one first — for a moment, two sessions would both claim to be live, and broadcast screens would race on which one to show.
2. **`theOne` state is stored twice**: in an in-memory object (fast reads) and as a flag on the database record (durable). On server restart, the in-memory state is rebuilt by reading the DB flag.
3. **Timers write their elapsed time to the DB on every tick (every second), fire-and-forget (no `await`).** This is deliberate: an earlier version wrote less often, and a production crash lost significant elapsed time mid-debate. Max acceptable data loss is one second.
4. Each chamber's live session is tracked completely independently — nothing about Representative's `theOne` should ever touch Senate's, and vice versa.

---

## Part A — Design Doc (no code)

**Feature request:** Parliament occasionally holds a "joint sitting" where both chambers meet together and are shown on the same broadcast screen with one shared timer, driven by whichever chamber's officer is currently presiding. When the joint sitting ends, each chamber must resume exactly where its own independent session left off — as if the joint sitting had paused it, not replaced it.

Constraints:
- No new database collections.
- Existing single-chamber behavior must keep working unchanged when there's no joint sitting.
- Must survive a server restart *during* a joint sitting without losing which chamber's session was suspended or how much time either had used.

Write half a page, bullet points are fine, covering:

1. What state you add and where it lives (memory vs DB) — one or two sentences.
2. Start/end sequence for a joint sitting — just enough to show what's cleared, set, restored.
3. One race condition or restart-timing edge case you considered, and how your design avoids it.
4. One thing you explicitly decided *not* to build, and why.

We care far more about #3 and #4 than #1-2. Anyone can describe the happy path.

---

## Part B — Review This PR

A teammate opened the PR below against the sandbox code in `joint-sitting/theOneStore.js`. See `joint-sitting/flawed-pr.diff`.

The PR description says: *"Cleans up theOneStore — batches the per-tick DB write to reduce load, and simplifies setTheOne to one less branch."*

Write a short review (bullet points are fine):

- Would you approve this PR? If not, why not — be specific about what breaks and under what circumstances (don't just say "this violates rule 3").
- Is there anything in the PR that's a genuine improvement worth keeping, separate from the problems?

---

## Part C — Small POC

In `joint-sitting/` there's a minimal, standalone version of the real `theOneStore` pattern for two independent chambers (`representative` and `senate`) — no database, no sockets, just in-memory state and a fake persistence layer so it's runnable and testable without setting up the full app.

Implement `startJointSitting(presidingChamber)` and `endJointSitting()` per your Part A design, against the interface already in `theOneStore.js`. Add one test for the edge case from Part A #3.

Run `node joint-sitting/theOneStore.test.js` — it should exit 0.

We're not grading code polish here. We're checking whether the POC actually matches the design you wrote in Part A, or whether the two diverged once you had to make it real.

---

## Submission

Send back: Part A doc, Part B review, and your modified `theOneStore.js` + `theOneStore.test.js`. Note anywhere you used AI assistance and for what — that's not a negative, we just want to know which parts are yours.

We'll follow up with a 20-30 min call to walk through your decisions.
