---
phase: 01
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | vitest.config.ts (Wave 0) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run test:coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | KNOW-04 | T-01-01 | Path validation within storage root | unit | `vitest run tests/security/path.test.ts` | W0 | pending |
| 01-01-02 | 01 | 1 | KNOW-01 | N/A | Create note with valid title | integration | `vitest run tests/notes/create.test.ts` | W0 | pending |
| 01-02-01 | 02 | 1 | KNOW-01 | N/A | Edit note content | integration | `vitest run tests/notes/edit.test.ts` | W0 | pending |
| 01-02-02 | 02 | 1 | KNOW-01 | N/A | Save note to disk | e2e | `vitest run tests/e2e/storage.test.ts` | W0 | pending |
| 01-03-01 | 03 | 2 | KNOW-02 | T-01-02 | Parse wiki-link syntax | unit | `vitest run tests/wiki-links/parser.test.ts` | W0 | pending |
| 01-03-02 | 03 | 2 | KNOW-02 | N/A | Display backlinks | integration | `vitest run tests/backlinks/display.test.ts` | W0 | pending |
| 01-04-01 | 04 | 2 | KNOW-03 | T-01-03 | FTS5 search with parameterized query | integration | `vitest run tests/search/fts.test.ts` | W0 | pending |
| 01-04-02 | 04 | 2 | KNOW-03 | N/A | Search returns ranked results | integration | `vitest run tests/search/ranking.test.ts` | W0 | pending |
| 01-05-01 | 05 | 3 | KNOW-04 | N/A | Directory structure creation | e2e | `vitest run tests/e2e/dirs.test.ts` | W0 | pending |
| 01-05-02 | 05 | 3 | KNOW-04 | N/A | Storage location persistence | integration | `vitest run tests/settings/storage.test.ts` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — test configuration
- [ ] `tests/setup.ts` — testing library setup
- [ ] `tests/notes/create.test.ts` — covers KNOW-01 create
- [ ] `tests/notes/edit.test.ts` — covers KNOW-01 edit
- [ ] `tests/wiki-links/parser.test.ts` — covers KNOW-02
- [ ] `tests/backlinks/display.test.ts` — covers KNOW-02 backlinks
- [ ] `tests/search/fts.test.ts` — covers KNOW-03
- [ ] `tests/search/ranking.test.ts` — covers KNOW-03 ranking
- [ ] `tests/e2e/storage.test.ts` — covers KNOW-01, KNOW-04
- [ ] `tests/e2e/dirs.test.ts` — covers KNOW-04
- [ ] `tests/security/path.test.ts` — covers T-01-01
- [ ] `tests/settings/storage.test.ts` — covers storage persistence
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/coverage-v8 jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile drawer animation | D-04 | Visual animation quality | Open app on mobile viewport, verify drawer slides smoothly |
| Touch target sizes | D-05 | Accessibility audit | Inspect all interactive elements are >= 44x44px |
| Real-time editor rendering | D-14 | Subjective UX quality | Type in editor, verify content renders immediately |
| Chinese wiki-link support | D-11 | Requires Chinese input | Create note with `[[中文链接]]`, verify recognition |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
