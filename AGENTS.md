# AGENTS.md

Guidance for anyone (human or agent) changing this repo. It mirrors how the
real Outro codebase is organised, at a much smaller scale.

## Commands

- `npm run dev` starts the API (:3000) and web app (:3001). The DB migrates and
  seeds itself on boot.
- `npm run test:run` runs all tests once. `npm test` watches.
- `npm run typecheck`, `npm run lint`, `npm run lint:fix`.
- `npm run db:generate` after changing `src/server/db/schema.ts`. Migrations
  apply on next boot. `npm run db:reset` wipes local data.

## Server architecture

Each domain lives in `src/server/features/<domain>/` and is split in layers:

1. **Repository** (`repository.ts`): Drizzle queries and nothing else. No
   business rules, no integrations. Imports `db` from `db/client` directly.
   All Drizzle code stays here.
2. **Service** (`service.ts`): business logic. Orchestrates repositories,
   integrations and events. Never imports from `drizzle-orm`. Returns
   `AppResultAsync<T>` (neverthrow), never throws for expected failures.
3. **Router** (`router.ts`): thin tRPC procedures. Validate input with zod,
   call a service, pass the result through `unwrap()`. No logic here.

Cross-domain calls go service → service or service → other repository, never
router → repository of another domain.

### Result pattern

- Services return `ok(value)` / `err(appError(code, message))`. Codes are in
  `lib/result.ts`; `unwrap()` in `trpc.ts` maps them to tRPC errors.
- The error channel is for things going wrong (missing rows, invalid state,
  an integration failing). A business rule answering "no" is not an error:
  return a discriminated union in the Ok channel with a `reason`.
- Prefer `await` + early return over long `.andThen` chains when it reads
  better. Never drop the error arm silently.

### Care model

- A patient's stage lives on their active enrollment. Change it only through
  `transitionStage` / `correctStage` in `features/careModel/service.ts`, which
  check the stage machine in `stages.ts`, append a transition, and enqueue an
  event. Never update `care_model_enrollments.stage` directly.

### Events, the outbox, and tasks

- Anything that other parts of the system might react to is enqueued with
  `enqueueEvent()` (`outbox/enqueue.ts`) in the same request as the change.
  Event types are the union in `outbox/eventTypes.ts`.
- The worker (`outbox/worker.ts`) delivers events to the handlers registered
  in `outbox/handlers.ts` and retries failures. The Events page can
  redeliver any event.
- Tasks are created only by rules in `features/tasks/rules.ts`. Rules are pure
  functions `(event, patient, now) → TaskSpec[]` and are unit tested. The
  service that persists them is an outbox handler.
- Task types are registered in `features/tasks/taskTypes.ts` (type key, label,
  payload shape). The DB stores the key as text, so adding a type needs no
  migration. Each type gets its primary action in
  `client/components/tasks/TaskActions.tsx`.

### Webhooks

- Inbound webhooks live in `src/server/webhooks/`. They are retried by the
  sender and can arrive out of order, so handlers key on the external id and
  treat repeats as no-ops.

### Integrations and AI

- External systems live in `src/server/integrations/` behind small interfaces
  (`EhrClient`, `MailClient`). Each has an HTTP implementation, used when
  `INTEGRATIONS_API_KEY` is set, and a local fake with the same behaviour,
  used otherwise and in tests. Vendor docs are in `docs/integrations/`.
  Services depend on the interface, never on `fetch`.
- `lib/ai.ts` wraps the LLM. Patient data sent to a model leaves our systems:
  send the minimum the task needs, and never let generated text reach a
  patient without a clinician seeing it first.

## Client

- Pure React SPA, Tailwind, Radix primitives wrapped in `components/ui/`.
  Use the semantic tokens (`text-muted-foreground`, `bg-card`, `border-hairline`),
  not raw palette colours.
- Data access is `api.<router>.<procedure>.useQuery/useMutation` from
  `lib/api.ts`. After a mutation, invalidate the routers it affected.
- Modals: keep local form state, re-seed it when the modal opens, don't let
  background refetches overwrite in-progress edits.
- Types flow from the server: import `RouterOutputs` from `lib/api.ts` or
  types from `@server/db/schema`. Don't redeclare server shapes.

## Tests

- `*.test.ts` are unit tests: pure functions or services with mocked
  repositories.
- `*.integration.test.ts` run against an in-memory PGlite database, fresh per
  file and truncated between tests (`db/testSetup.ts`). Use the factories in
  `test/fixtures.ts`. Drive the outbox with `processOnce()` rather than
  waiting for the worker.
- A test that only proves the happy path is half a test. Prefer tests that
  would fail if the guarantee they describe were broken.
- Colocate tests with the code they test.

## Style

- Biome for lint and format. No semicolons, double quotes, 80 columns.
- Small files with one purpose. Extract components and helpers rather than
  growing a file past ~200 lines.
- Comments explain why, not what.
