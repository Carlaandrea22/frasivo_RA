# Clinical Cases Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build coherent three-turn clinical interviews with contextual translation hints, draggable ordering exercises, visible multiple-choice selection, and performance-aware results.

**Architecture:** Replace flat interview prompt pools with validated graph nodes and pure engine helpers. Keep each case view responsible for interaction state while shared score and hint helpers produce persisted session results. Implement ordering with pointer and keyboard controls using React and browser APIs already in the project.

**Tech Stack:** React 19, TypeScript 5.9, CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-21-clinical-cases-refinement-design.md`

## Global Constraints

- All learner-facing clinical dialogue and answers remain in English; translation hints reveal only the current round in Spanish.
- Each interview has exactly three options per turn for three turns and 27 valid paths.
- No AI service and no new runtime dependency.
- Ordering cases contain at least two actions and allow at most `min(3, actionCount - 1)` placement hints.
- Translation hints do not reduce score; assisted ordering positions do not count as independent correct positions.
- Respect reduced-motion preferences and keyboard interaction.

## Review Focus

- Shared graph nodes reached from different parents must still expose three valid continuations at the correct depth; Task 1 validates every route.
- Rapid repeated clicks while the patient is typing must create only one exchange; Task 2 adds a browser assertion.
- A placement hint after manual reordering must preserve every action exactly once; Task 3 tests the pure helper and browser behavior.
- Two-action ordering cases must allow one hint at most and keep one action for the learner; Task 3 tests the boundary.
- A multiple-choice hint must never remove the correct or already selected option; Task 4 tests both conditions.

---

### Task 1: Interview graph model and clinical engine

**Files:**
- Modify: `src/content/casos/sessionTypes.ts`
- Modify: `src/content/casos/session.ts`
- Modify: `src/features/casos/clinicalEngine.ts`
- Modify: `tests/clinical-cases.test.ts`

**Interfaces:**
- Produces: `InterviewNode`, graph-based `InterviewCase`, `getInterviewChoices(case, path)`, `createInterviewExchange(node, random)`, `validateInterviewGraph(case)`, `performanceLevel(score)`.
- Consumes: existing `buildCaseSession`, ordering and multiple-choice scoring.

- [ ] **Step 1: Write failing tests for 27 graph paths, valid transitions, deterministic contextual responses, translated recall data, and score levels.**
- [ ] **Step 2: Run `npm test -- tests/clinical-cases.test.ts` and verify failures are caused by missing graph interfaces.**
- [ ] **Step 3: Add the graph types and pure traversal/validation helpers.**
- [ ] **Step 4: Replace both flat interview pools with English graph content and Spanish translations.**
- [ ] **Step 5: Run `npm test -- tests/clinical-cases.test.ts` and verify all clinical engine tests pass.**
- [ ] **Step 6: Commit the graph and engine changes.**

### Task 2: Coherent interview UI and translation hints

**Files:**
- Modify: `src/features/casos/ClinicalSession.tsx`
- Modify: `src/features/casos/casos.css`
- Modify: `tests/browser/clinical-cases.spec.ts`

**Interfaces:**
- Consumes: Task 1 graph traversal, exchanges, translations and performance levels.
- Produces: three-turn chat, 500 ms typing state, per-round hints, current-round recall translations, performance-colored result.

- [ ] **Step 1: Add failing browser tests for contextual next choices, one exchange during typing, current-round translations and colored recall results.**
- [ ] **Step 2: Run the targeted Playwright file and verify the new assertions fail for missing behavior.**
- [ ] **Step 3: Implement graph traversal and disable input during the 500 ms typing state.**
- [ ] **Step 4: Implement one translation hint per conversation and recall round with separate 0/3 counters.**
- [ ] **Step 5: Add chat avatars, animated typing dots, current-message scroll and reduced-motion CSS.**
- [ ] **Step 6: Run the targeted Playwright file and unit suite, then commit the interview UI.**

### Task 3: Reorderable cards, placement hints and assisted scoring

**Files:**
- Modify: `src/features/casos/clinicalEngine.ts`
- Modify: `src/features/casos/ClinicalSession.tsx`
- Modify: `src/features/casos/casos.css`
- Modify: `tests/clinical-cases.test.ts`
- Modify: `tests/browser/clinical-cases.spec.ts`

**Interfaces:**
- Produces: `moveItem(ids, from, to)`, `applyOrderingHint(ids, expected, lockedIds)`, score fields `assisted` and `hints`.
- Consumes: existing ordering case actions and Task 1 performance levels.

- [ ] **Step 1: Write failing unit tests for move behavior, unique items after hints, maximum hints, two-item limits and assisted scoring.**
- [ ] **Step 2: Run the clinical unit file and verify the expected failures.**
- [ ] **Step 3: Implement the pure ordering helpers and variable-length action types.**
- [ ] **Step 4: Add failing browser coverage for move buttons, pointer drag affordance, locked hint cards and score colors.**
- [ ] **Step 5: Replace click-to-append ordering with shuffled vertical cards, pointer reordering, keyboard buttons, reset and placement hints.**
- [ ] **Step 6: Run targeted browser and unit tests, then commit the ordering experience.**

### Task 4: Multiple-choice hint, visible selection and session summary

**Files:**
- Modify: `src/features/casos/clinicalEngine.ts`
- Modify: `src/features/casos/ClinicalSession.tsx`
- Modify: `src/features/casos/casos.css`
- Modify: `tests/clinical-cases.test.ts`
- Modify: `tests/browser/clinical-cases.spec.ts`

**Interfaces:**
- Produces: `discardIncorrectChoice(options, correctId, selectedId, random)`, visible selected/discarded option states, persisted hint totals and performance summary.
- Consumes: result and session score structures from Tasks 1–3.

- [ ] **Step 1: Write failing unit tests that discard exactly one eligible wrong option and never discard the correct or selected option.**
- [ ] **Step 2: Run the clinical unit file and verify the helper is missing.**
- [ ] **Step 3: Implement the discard helper and hint-aware session score shape.**
- [ ] **Step 4: Add failing browser assertions for visible selection, discarded choice, one-use hint and non-green incorrect result.**
- [ ] **Step 5: Implement the multiple-choice UI, result variants and five-case hint summary.**
- [ ] **Step 6: Run `npm test`, the targeted clinical Playwright tests and `npm run build`; fix only failures caused by this change.**
- [ ] **Step 7: Commit the completed clinical session refinement.**
