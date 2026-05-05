# ClockGPT Modernization + User Chat Spec

## Metadata
- **Status:** In progress (Phase 1 complete)
- **Owner:** Engineering
- **Last updated:** 2026-05-05
- **Related project:** ClockGPT hardening and feature expansion

## Context
The current app is a useful demo, but it still has shortcut patterns that make it feel non-production:
- Single-file backend (`server.js`) with routing, storage, and business logic mixed together
- Hardcoded configuration and weak security defaults (session secret in code, permissive session creation)
- Limited validation and error handling consistency
- Basic file upload safety controls
- No chat capability for user-to-user communication

We want to evolve this into a realistic multi-user application while keeping the current timezone/profile user flows.

## Problem Statement
Transform the app from a demo into a maintainable Node application with realistic production patterns, while adding a reliable real-time chat feature between authenticated users. The intention is still for the app to be used for security testing, but it needs a more realistic structure. 

## Goals
- Refactor backend into clear layers with maintainable structure and testable modules.
- Replace placeholder/shortcut security patterns with production-appropriate defaults.
- Add authenticated 1:1 user chat with real-time messaging and persisted history.
- Improve reliability, observability, and CI quality gates.
- Keep migration cost manageable by shipping in phases with minimal user disruption.

## Non-goals
- Building group chat or channels in the first release.
- Building end-to-end encryption.
- Migrating frontend to a full SPA framework in this phase.
- Supporting federated auth providers (Google/GitHub) in this phase.

## User Experience Outcomes
- Users can register/sign in and manage profiles with robust validation and safer uploads.
- Logged-in users can discover other users and open a direct chat thread.
- Messages appear in real time and persist across refresh/re-login.
- Users receive clear errors for invalid actions and degraded service states.

## Proposed Technical Direction

### 1) Backend refactor (Node best practices)
- Move code into `src/` with layered design:
  - `src/app.js` (Express app wiring)
  - `src/server.js` (http server bootstrap)
  - `src/config/` (env parsing/validation)
  - `src/routes/` (HTTP routes)
  - `src/controllers/` (request/response handling)
  - `src/services/` (business logic)
  - `src/repositories/` (database access)
  - `src/middleware/` (auth, validation, errors, rate limit)
  - `src/lib/` (logger, crypto helpers, websocket setup)
- Keep route handlers thin; move database calls and business rules into services/repositories.
- Introduce centralized async error handling and normalized error response shape.

### 2) Security + realism hardening
- Environment-driven config (`.env` + schema validation):
  - session secret, cookie flags, port, upload limits
- Improve session config:
  - secure cookie in production, `httpOnly`, `sameSite`, explicit session ttl
  - `saveUninitialized: false`
- Input validation/sanitization using request schemas (e.g., `zod` or `joi`).
- Add auth protections:
  - login/register rate limiting
  - CSRF protection for state-changing endpoints
  - stricter file upload checks (mime/type whitelist + size + extension checks)
- Store passwords with bcrypt cost tuned via config; preserve constant-time compare behavior.
- Add security middleware (`helmet`) and tighten static asset handling.

### 3) Data and persistence improvements
- Introduce database migration strategy (e.g., `knex` migrations or equivalent).
- Keep SQLite for local/dev; define adapter path to allow PostgreSQL in production later.
- Add/expand tables:
  - `users` (existing, normalized constraints)
  - `conversations` (`id`, `created_at`, unique user pair for 1:1)
  - `conversation_members` (`conversation_id`, `user_id`)
  - `messages` (`id`, `conversation_id`, `sender_id`, `content`, `created_at`, `edited_at`, `deleted_at`)
  - optional `user_presence` or `last_seen` fields for UX improvements
- Add indexes for message retrieval performance (`conversation_id`, `created_at`).

### 4) Chat feature (MVP)
- Real-time transport: WebSocket via `socket.io` on existing Node server.
- Auth model:
  - handshake/session auth using existing logged-in session
  - reject unauthenticated socket connections
- HTTP endpoints:
  - `GET /api/chat/conversations`
  - `POST /api/chat/conversations` (create/find 1:1 by target user)
  - `GET /api/chat/conversations/:id/messages?cursor=...`
  - `POST /api/chat/conversations/:id/messages` (fallback for non-socket clients)
- Socket events:
  - `chat:join_conversation`
  - `chat:message_send`
  - `chat:message_new`
  - `chat:typing` (optional)
  - `chat:message_ack` / `chat:error`
- Frontend updates:
  - add chat UI panel/page in `views` + `public/js`
  - conversation list, message list, composer, optimistic send state
  - basic unread indicator and auto-scroll behavior

### 5) Observability + operations
- Structured logging (`pino` or `winston`) with request IDs.
- Health endpoint (`GET /health`) and readiness checks.
- Standardized npm scripts for lint/test/start/dev/migrate.
- Add graceful shutdown for HTTP + socket server.

## Implementation Plan (Phased)

### Phase 1: Security and API hardening (2-3 days)
- [x] Add request validation schemas for auth/profile endpoints _(Linear: [SNY-37](https://linear.app/snyk-mlteam/issue/SNY-37/phase-1-add-request-validation-schemas-for-authprofile-endpoints))_
- [x] Fix session defaults and cookie security options _(Linear: [SNY-42](https://linear.app/snyk-mlteam/issue/SNY-42/phase-1-fix-session-defaults-and-cookie-security-options))_
- [x] Add rate limiting and CSRF coverage _(Linear: [SNY-43](https://linear.app/snyk-mlteam/issue/SNY-43/phase-1-add-rate-limiting-and-csrf-coverage))_
- [x] Improve upload safety checks and error handling _(Linear: [SNY-44](https://linear.app/snyk-mlteam/issue/SNY-44/phase-1-improve-upload-safety-checks-and-error-handling))_
- [x] Expand integration tests for auth/profile negative cases _(Linear: [SNY-46](https://linear.app/snyk-mlteam/issue/SNY-46/phase-1-expand-integration-tests-for-authprofile-negative-cases))_

### Phase 2: Data model + migrations (1-2 days)
- [ ] Add migration tooling and baseline migration from current schema _(Linear: [SNY-45](https://linear.app/snyk-mlteam/issue/SNY-45/phase-2-add-migration-tooling-and-baseline-migration-from-current))_
- [ ] Add conversation/message tables and indexes _(Linear: [SNY-47](https://linear.app/snyk-mlteam/issue/SNY-47/phase-2-add-conversationmessage-tables-and-indexes))_
- [ ] Create repository methods for chat queries and writes _(Linear: [SNY-48](https://linear.app/snyk-mlteam/issue/SNY-48/phase-2-create-repository-methods-for-chat-queries-and-writes))_
- [ ] Add seed/dev helper scripts for local testing _(Linear: [SNY-51](https://linear.app/snyk-mlteam/issue/SNY-51/phase-2-add-seeddev-helper-scripts-for-local-testing))_

### Phase 3: Chat MVP backend (2-3 days)
- [ ] Add chat REST endpoints with pagination/cursor strategy _(Linear: [SNY-50](https://linear.app/snyk-mlteam/issue/SNY-50/phase-3-add-chat-rest-endpoints-with-paginationcursor-strategy))_
- [ ] Add socket server and authenticated connection middleware _(Linear: [SNY-49](https://linear.app/snyk-mlteam/issue/SNY-49/phase-3-add-socket-server-and-authenticated-connection-middleware))_
- [ ] Implement message persistence and real-time fanout _(Linear: [SNY-54](https://linear.app/snyk-mlteam/issue/SNY-54/phase-3-implement-message-persistence-and-real-time-fanout))_
- [ ] Add tests for permission boundaries (only members can read/send) _(Linear: [SNY-53](https://linear.app/snyk-mlteam/issue/SNY-53/phase-3-add-tests-for-permission-boundaries-only-members-can-readsend))_

### Phase 4: Chat MVP frontend (2-3 days)
- [ ] Add chat navigation and user discovery list _(Linear: [SNY-55](https://linear.app/snyk-mlteam/issue/SNY-55/phase-4-add-chat-navigation-and-user-discovery-list))_
- [ ] Build conversation + message UI with loading/empty/error states _(Linear: [SNY-56](https://linear.app/snyk-mlteam/issue/SNY-56/phase-4-build-conversation-message-ui-with-loadingemptyerror-states))_
- [ ] Wire real-time events and optimistic updates _(Linear: [SNY-52](https://linear.app/snyk-mlteam/issue/SNY-52/phase-4-wire-real-time-events-and-optimistic-updates))_
- [ ] Add basic accessibility checks (focus order, labels, keyboard send) _(Linear: [SNY-57](https://linear.app/snyk-mlteam/issue/SNY-57/phase-4-add-basic-accessibility-checks-focus-order-labels-keyboard))_

### Phase 5: Stabilization and release (1-2 days)
- [ ] Add end-to-end integration path tests (auth -> chat send/receive) _(Linear: [SNY-60](https://linear.app/snyk-mlteam/issue/SNY-60/phase-5-add-end-to-end-integration-path-tests-auth-chat-sendreceive))_
- [ ] Run security scan and resolve findings _(Linear: [SNY-59](https://linear.app/snyk-mlteam/issue/SNY-59/phase-5-run-security-scan-and-resolve-findings))_
- [ ] Update docs (`README`, `TESTING`, architecture notes) _(Linear: [SNY-58](https://linear.app/snyk-mlteam/issue/SNY-58/phase-5-update-docs-readme-testing-architecture-notes))_
- [ ] Execute staged rollout and monitor logs/errors _(Linear: [SNY-61](https://linear.app/snyk-mlteam/issue/SNY-61/phase-5-execute-staged-rollout-and-monitor-logserrors))_

## Testing Strategy
- **Unit tests:** services, validators, repository logic, chat permission guards.
- **Integration tests:** auth/session flow, profile updates, file upload constraints, chat endpoints.
- **Realtime tests:** socket auth and event propagation.
- **Security checks:** dependency audit + static scan + regression tests for auth bypass.
- **Coverage target:** >= 80% statements on backend modules touched by refactor.

## Rollout Plan
- Ship behind feature flag: `CHAT_ENABLED`.
- Enable chat in local/dev first, then staging soak test.
- Production release with low-risk subset of users first (if user segmentation available), then full enablement.
- Keep rollback path by disabling flag while preserving schema compatibility.

## Risks and Mitigations
- **Risk:** Refactor introduces regressions in existing auth/profile behavior.  
  **Mitigation:** lock baseline integration tests before heavy refactor; migrate incrementally.
- **Risk:** Socket auth/session mismatch creates unauthorized access edge cases.  
  **Mitigation:** centralize auth check for both HTTP and WebSocket layers.
- **Risk:** SQLite write contention under chat load.  
  **Mitigation:** keep MVP constraints, add indexes, and define migration path to PostgreSQL.
- **Risk:** Upload handling remains a security hotspot.  
  **Mitigation:** strict validation, content-type checks, and safer file lifecycle handling.

## Success Metrics
- Chat delivery reliability: >99% successful send-to-receive in staging tests.
- API error-rate reduction for auth/profile endpoints after hardening.
- No critical/high findings from security scan for newly introduced code.
- Mean time to diagnose incidents reduced via structured logs and request IDs.

## Open Questions
- Should unread counts be persisted server-side in MVP or deferred?
- Do we need message edit/delete in MVP, or send-only is sufficient?
- Should production target remain SQLite initially, or move directly to PostgreSQL?
- Is presence/typing required at launch, or post-MVP enhancement?

## Definition of Done
- Refactored backend structure merged with passing tests.
- Security baseline upgrades in place and documented.
- Authenticated 1:1 chat shipped with persisted history and real-time updates.
- Docs updated for setup, architecture, and feature usage.
