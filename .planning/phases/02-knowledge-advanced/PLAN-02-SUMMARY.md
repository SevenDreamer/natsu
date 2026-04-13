---
phase: 02-knowledge-advanced
plan: 02
subsystem: knowledge
tags: [relations, co-citation, co-reference, proximity, scoring]

requires: []
provides:
  - Relationship scoring algorithm based on D-03 factors
  - Co-citation and co-reference SQL queries
  - Directory proximity detection
  - get_related_notes Tauri command
affects: [PLAN-03, PLAN-05]

tech-stack:
  added: []
  patterns: [Real-time computation without caching, Multi-factor scoring]

key-files:
  created:
    - termsuite/src-tauri/src/commands/relations.rs
  modified:
    - termsuite/src-tauri/src/db/schema.rs
    - termsuite/src-tauri/src/lib.rs

key-decisions:
  - "D-01: Link analysis as primary relationship discovery"
  - "D-02: Real-time computation + backlinks (like Obsidian)"
  - "D-03: Four factors: direct link (0.5), co-citation (0.15 max 0.2), co-reference (0.15 max 0.2), proximity (0.1)"

patterns-established:
  - "Scoring: calculate_relatedness() with factor weights and caps"
  - "Query pattern: JOIN backlinks on target_id/source_id for relationship discovery"

requirements-completed: [KNOW-05]

duration: 10min
completed: 2026-04-14
---

# Phase 2 Plan 02: Related Notes Discovery Summary

**Co-citation, co-reference, and proximity-based relationship scoring for note discovery using SQL queries**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-14T00:15:00Z
- **Completed:** 2026-04-14T00:25:00Z
- **Tasks:** 9
- **Files modified:** 4

## Accomplishments
- RelationshipType enum with DirectLink, CoCitation, CoReference, Proximity
- calculate_relatedness scoring function per D-03 formula
- Co-citation query: notes that link to the same target
- Co-reference query: notes linked from the same source
- Directory proximity query: notes in the same folder
- get_related_notes Tauri command with real-time computation
- get_relationship_analysis Tauri command
- Unit tests for scoring function

## Task Commits

Each task was committed atomically:

1. **All Tasks (1-9)** - `dca0445` (feat) - Complete Related Notes implementation

## Files Created/Modified
- `termsuite/src-tauri/src/db/schema.rs` - Added related_notes and note_directories tables
- `termsuite/src-tauri/src/commands/relations.rs` - Relationship types, scoring, queries, commands
- `termsuite/src-tauri/src/commands/mod.rs` - Added relations module
- `termsuite/src-tauri/src/lib.rs` - Registered relations commands

## Decisions Made
- Real-time computation without caching (simpler, follows Obsidian)
- Score capped at 1.0 to prevent overflow
- Co-citation and co-reference factors capped at 0.2 each

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test expectations for scoring function**
- **Found during:** Test execution
- **Issue:** Tests expected exact values but floating point caps changed behavior
- **Fix:** Updated tests to use assert with epsilon tolerance
- **Verification:** All 4 tests pass

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** Test fix only, no scope creep.

## Issues Encountered
None - implementation straightforward.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Relations data ready for PLAN-03 (Knowledge Graph visualization)
- get_related_notes ready for PLAN-04 (Related Notes UI panel)

---
*Phase: 02-knowledge-advanced*
*Completed: 2026-04-14*
