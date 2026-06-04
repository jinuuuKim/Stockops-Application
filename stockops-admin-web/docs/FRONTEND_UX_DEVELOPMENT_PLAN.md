# StockOps Admin Web UI/UX and Feature Development Plan

## 1. Purpose

This document defines the product intent, current frontend state, UX gaps, and follow-up development plan for `stockops-admin-web`.

The plan is based on:

- Current frontend implementation in `stockops-admin-web`
- Legacy product documents in `stockops-legacy/docs`
- Recent UI/UX verification and fixes applied to the separated frontend project

`stockops-legacy` remains a reference source only. All implementation work should happen in the separated frontend project.

## 2. Product Intent

StockOps Admin Web is not a generic admin dashboard. It is an operations console for smart inventory and warehouse workflows.

The intended product supports:

- Center -> Warehouse -> Location hierarchy
- Product, category, barcode, LOT, and expiry-date management
- Inbound inspection, storage, and confirmation
- FEFO-based outbound picking and confirmation
- Inventory adjustment, transfer, and cycle count workflows
- Purchase order request -> ERP response -> shipment -> inbound workflow
- Environment monitoring with alerts and escalation
- Reports and AI-assisted operational recommendations

The UI should therefore optimize for operational accuracy, fast repeated work, clear next actions, and recovery from API or network failures.

## 3. Primary Users

| User | Goal | Frontend UX Need |
| --- | --- | --- |
| System admin | Configure centers, warehouses, locations, users, settings | Clear setup flow, validation, safe destructive actions |
| Center manager | See integrated inventory, manage purchase orders, review reports | Aggregated views, workflow status, decision support |
| Warehouse manager | Control inbound, outbound, movement, adjustment, cycle count | Queue-based work screens, clear approvals, exception handling |
| Field operator | Scan, inspect, pick, pack, count | Mobile-friendly layouts, large controls, barcode-first flow |
| Auditor/read-only user | Review inventory and history | Traceability, immutable logs, consistent filtering |

## 4. Current Frontend Shape

The application already includes routes for most target domains:

- Dashboard: `/dashboard`
- Master data: `/centers`, `/warehouses`, `/locations`, `/products`
- Core inventory: `/inventory`, `/inbound`, `/outbound`, `/stock-adjustments`, `/inventory-transfers`, `/cycle-counts`
- Purchase orders: `/purchase-orders`
- Expiry: `/expiry`
- Environment: `/environment`
- Notifications and settings: `/notifications`, `/settings`, `/settings/escalation`, `/settings/notification-channels`
- Reports and AI: `/reports`, `/ai` (`/demand-forecast` redirects to `/ai` for old links)
- Admin: `/admin`, `/admin/notices`, `/admin/audit-logs`

Recent improvements already applied:

- Korean localization cleanup in major inventory workflow screens
- Desktop sidebar visibility fix
- Dev service-worker registration guard
- Defensive API response normalization for several pages
- Data-aware AI banner copy
- Build-blocking test type issues resolved

## 5. Main UX and Feature Gaps

### 5.1 Inconsistent Page Quality

Some pages now use clearer Korean labels, empty states, and defensive data handling. Other pages still use older patterns such as:

- Inline loading text instead of shared states
- Raw status values
- Mixed button sizes and badge styles
- Empty catch blocks or weak form error display
- Non-mobile-optimized table-first layouts

Affected areas include center, warehouse, product, purchase order, transfer, and cycle count screens.

### 5.2 Duplicate or Confusing Feature Surfaces

Previously duplicated purchase-order and demand-forecast surfaces have been consolidated.

Remaining watch areas:

- Keep AI ordering, reports, purchase orders, and dashboard alerts linked by clear intent so users do not see competing "recommendation" surfaces.
- Preserve old redirected routes only for compatibility, not as visible navigation entries.
- Continue extracting shared workflow components when dashboard quick actions and full pages need the same modal behavior.

### 5.3 Workflow Gaps

Several screens expose actions but do not yet guide the user through the full operational flow.

Examples:

- Location empty state has an inactive "add location" action.
- Cycle count starts from local page state rather than a real list/query flow.
- Purchase order actions exist, but the ERP/center responsibilities and status timeline need clearer UI.
- Inventory transfer needs stronger validation around available quantity, source/destination locations, and cancellation reasons.

### 5.4 Field-Operator UX Is Not Yet Strong Enough

StockOps depends on fast warehouse work. The current UI still leans toward desktop admin tables.

Needed improvements:

- Barcode-first actions
- Larger mobile controls
- Card-based mobile workflows
- Clear scan success/failure states
- Offline queue visibility
- Fewer ambiguous icon-only controls

### 5.5 Trust and Traceability Gaps

For expiry, AI, environment, and reports, users need to know why the system recommends or alerts something.

Needed improvements:

- AI recommendation evidence
- FEFO allocation rationale
- Sensor source and freshness indicators
- Alert acknowledgment history
- Report-to-action links

## 6. Development Principles

1. Optimize for real warehouse workflows, not decorative dashboard polish.
2. Make every page answer: "What is happening now?" and "What should I do next?"
3. Prefer shared UI patterns for states, badges, forms, tables, drawers, and modals.
4. Treat API shape variance and offline behavior as normal, not exceptional.
5. Keep Korean terminology consistent across pages.
6. Preserve build stability with `npm run build` on every implementation slice.
7. Add E2E coverage around workflows, not only individual pages.

## 7. Proposed Implementation Roadmap

### Phase 0: Baseline Stabilization

Goal: Keep the current frontend buildable and reduce accidental regressions.

Tasks:

- Keep `npm run build` passing.
- Run focused lint on changed files.
- Add a lightweight UI audit script for key routes with mocked APIs.
- Document active routes and remove uncertainty around duplicate pages.
- Standardize status label maps for shared domains.

Acceptance criteria:

- `npm run build` passes.
- Main routes render with mocked empty data.
- No runtime crashes from array/page response mismatches.

### Phase 1: UI Consistency Pass

Goal: Make the app feel like one product.

Tasks:

- Standardize page headers, primary actions, and touch target heights.
- Convert remaining raw table action labels such as `Actions` to Korean.
- Replace inline loading/error text with shared `EmptyState` patterns.
- Standardize status badges using semantic colors.
- Normalize date/time formatting with `ko-KR`.
- Remove or replace empty `catch` blocks with visible error feedback.
- Ensure empty-state actions actually perform the advertised action.

Priority files:

- `src/pages/CentersPage.tsx`
- `src/pages/WarehousesPage.tsx`
- `src/pages/ProductsPage.tsx`
- `src/pages/InventoryTransferPage.tsx`
- `src/pages/CycleCountPage.tsx`
- `src/pages/PurchaseOrderPage.tsx`
- `src/pages/EnvironmentPage.tsx`

Acceptance criteria:

- Major pages have consistent loading, error, empty, and action states.
- No visible English labels remain in core workflow pages unless they are domain codes.
- Primary actions are usable on mobile-sized viewports.

### Phase 2: Master Data Setup Flow

Goal: Make the first setup journey clear: center -> warehouse -> location -> product.

Tasks:

- Improve center creation/edit validation and error display.
- Improve warehouse creation/edit validation and close/deactivate flow.
- Implement or wire location creation/edit flow.
- Add hierarchy context: selected center, selected warehouse, available locations.
- Make product creation clearly support barcode, category, expiry policy, storage condition, and safety stock fields.
- Add guided empty states when prerequisite data is missing.

Acceptance criteria:

- A system admin can create the minimum structure for warehouse operations from the UI.
- Missing prerequisites are explained with direct next actions.
- Errors from save/delete actions are visible and recoverable.

### Phase 3: Core Warehouse Workflow Completion

Goal: Strengthen the daily operator workflows.

Tasks:

- Inbound:
  - Clarify inspection -> add item -> storage location -> confirm flow.
  - Improve barcode scan feedback and offline queue handoff.
  - Connect purchase-order-derived inbound where backend supports it.

- Outbound:
  - Show FEFO allocation rationale.
  - Add clearer picking/packing/confirmation steps.
  - Support partial allocation and insufficient stock messaging.

- Inventory:
  - Improve LOT and expiry visibility.
  - Add location drilldown and transaction history drawer.
  - Make adjustment action context-aware.

- Inventory transfer:
  - Validate source/destination location and quantity.
  - Require cancellation reason.
  - Show requested/completed/cancelled timeline.

- Cycle count:
  - Replace local-only list state with API-backed query flow.
  - Add count execution UI with variance reason selection.
  - Connect variance to adjustment approval workflow.

Acceptance criteria:

- Operators can complete daily inbound, outbound, transfer, and cycle count flows without hidden assumptions.
- Critical actions show confirmation or validation before irreversible changes.
- Mobile layouts support field use.

### Phase 4: Purchase Order Workflow Consolidation

Goal: Make purchase order the center manager's operational control surface.

Tasks:

- Consolidate `PurchaseOrderPage.tsx` and `PurchaseOrdersPage.tsx`.
- Keep one route-backed implementation.
- Add status timeline:
  - Draft
  - Requested
  - Accepted / Partially Accepted / Rejected
  - Shipment Created
  - Inbound Pending
  - Completed
- Separate center-manager actions from ERP-side actions in the UI.
- Improve partial acceptance and shipment forms.
- Connect shipment receipt to inbound workflow.
- Add clear failure messages for transition errors.

Acceptance criteria:

- There is one source of truth for purchase order UI.
- Users can understand current status and valid next actions at a glance.
- Purchase order detail exposes history, items, shipments, and inbound linkage.

### Phase 5: Environment Monitoring and Alert Response

Goal: Turn monitoring into an actionable incident workflow.

Tasks:

- Improve WebSocket fallback UX:
  - Connecting
  - Live
  - Fallback/API polling
  - Disconnected
- Show sensor data freshness and source channel.
- Improve sensor/controller form validation.
- Add alert response flow:
  - Acknowledge
  - Assign or record action
  - Resolve
  - Escalation level
- Link environment alerts to affected warehouse/location.
- Make controller commands safer with confirmation and visible command history.

Acceptance criteria:

- Local backend/WebSocket absence does not create alarming console noise for normal dev verification.
- Operators can see what alert needs action and record what was done.
- Managers can verify alert history and escalation status.

### Phase 6: AI and Reports Trust Layer

Goal: Make recommendations explainable and operationally useful.

Tasks:

- AI purchase recommendation:
  - Show demand basis, safety stock, lead time, recent outbound, current stock, and expiry risk.
  - Add actions: create purchase-order draft, dismiss, defer, view evidence.
  - Avoid confident recommendation copy when data is insufficient.

- Reports:
  - Connect reports to operational actions.
  - Add clearer filters and empty states.
  - Koreanize remaining CSV/table headers.
  - Add export result feedback.

Acceptance criteria:

- AI recommendations include evidence.
- Users can turn insights into concrete actions.
- Reports are not just download surfaces; they support decisions.

### Phase 7: E2E Workflow Coverage

Goal: Prevent core workflow regressions.

Priority E2E flows:

- Login -> dashboard -> product creation
- Center -> warehouse -> location setup
- Product -> inbound -> inventory update
- Inventory -> outbound FEFO -> inventory decrease
- Purchase order -> accept -> shipment -> inbound pending
- Environment alert -> acknowledge
- Cycle count -> variance -> adjustment approval

Acceptance criteria:

- Workflow tests run in CI or locally with mocked APIs.
- Screenshots or traces are captured for failed critical flows.
- Build remains green after each phase.

## 8. Backlog by Priority

| Priority | Item | Area | Reason |
| --- | --- | --- | --- |
| P0 | Keep `npm run build` passing | Quality | Prevent deployment blockers |
| P0 | Normalize API array/page responses | Stability | Prevent blank screens and runtime crashes |
| P0 | Consolidate purchase-order pages | Architecture | Remove duplicate workflow risk |
| P1 | Implement location create/edit flow | Master data | Required for real warehouse setup |
| P1 | Convert cycle count to API-backed list | Core workflow | Current page is not durable across reloads |
| P1 | Improve transfer validation and cancellation | Core workflow | Prevent inventory movement mistakes |
| P1 | Standardize page states and status badges | UX | Product consistency and operator confidence |
| P2 | Add FEFO explanation in outbound | Differentiator | Core StockOps value |
| P2 | Add alert response workflow | Environment | Turns monitoring into action |
| P2 | Add AI recommendation evidence | AI | Builds user trust |
| P3 | Add richer mobile scanning UX | Field work | Improves warehouse productivity |
| P3 | Add report-to-action shortcuts | Analytics | Makes reports operational |

## 9. Suggested First Implementation Sprint

Sprint goal: make the app feel coherent and remove the most risky workflow ambiguity.

Scope:

1. Purchase order page consolidation plan and implementation.
2. Location create/edit modal wired to backend API.
3. Cycle count list changed from local state to API query.
4. Shared status badge helper or local normalized badge maps for core pages.
5. Empty-state actions audited and fixed.
6. Add Playwright smoke route audit for:
   - dashboard
   - products
   - locations
   - inbound
   - outbound
   - purchase-orders
   - cycle-counts
   - environment

Validation:

- `npm run build`
- Focused ESLint on changed files
- Route smoke audit with mocked APIs
- Manual screenshot review for desktop and mobile widths

## 10. Open Questions

These should be clarified before deeper implementation:

1. Which purchase-order page should be the canonical base: current route-backed `PurchaseOrderPage.tsx` or the more workflow-oriented `PurchaseOrdersPage.tsx`?
2. Does the backend already expose full cycle-count list/detail APIs, or should frontend work wait for API confirmation?
3. Should ERP-side purchase-order actions be available in the same admin web UI, or should they be hidden behind role/permission checks?
4. What is the expected mobile device context for operators: phone camera scanning, rugged scanner browser, or desktop-attached scanner?
5. Which alert response lifecycle should be canonical: acknowledge-only, acknowledge plus action note, or full resolve workflow?

## 11. Definition of Done

For each implementation slice:

- Code is changed only in separated project repositories, not `stockops-legacy`.
- The change follows existing frontend patterns unless a shared abstraction is clearly useful.
- User-visible copy is Korean and domain-specific.
- Loading, empty, error, success, and disabled states are covered.
- Mobile layout is checked for core operator workflows.
- `npm run build` passes.
- Tests or smoke checks cover the changed behavior where feasible.

## 12. Implementation Progress

### 2026-05-18: First Sprint Start

Completed:

- Added this frontend UX and feature development plan.
- Kept `npm run build` passing after the first implementation slice.
- Added location create/update/delete hooks:
  - `useCreateLocation`
  - `useUpdateLocation`
  - `useDeleteLocation`
- Added location request/type definitions for warehouse-linked locations.
- Reworked `LocationsPage` so the advertised "위치 추가" action is functional.
- Added location create/edit modal with warehouse selection, type selection, validation, and save error display.
- Added location delete confirmation with destructive dialog and visible failure feedback.
- Added `useCycleCounts` and switched `CycleCountPage` from local-only list state to API-backed query state.
- Made cycle-count start/complete mutations invalidate the cycle-count list.
- Added defensive array/page response normalization for inventory queries used by cycle-count item selection.
- Removed the unused duplicate purchase-order page implementation, keeping the route-backed `PurchaseOrderPage` as the current canonical page.

Validation:

- `npm run build` passed.
- Focused ESLint passed for changed implementation files.
- `git diff --check` passed.

Known remaining quality item:

- Full `npm run lint` still reports existing repository-wide lint issues outside this slice, mostly `react-hooks/set-state-in-effect`, empty `catch` blocks, and unused caught error variables in older pages/components. These should be handled as a separate Phase 0 quality cleanup so feature work does not keep inheriting the noisy baseline.

Next recommended slice:

- Clean the full ESLint baseline or intentionally tune the React 19 lint rule set.
- Strengthen `PurchaseOrderPage` status timeline and action forms.
- Add API-backed route smoke checks for `locations`, `cycle-counts`, and `purchase-orders`.
- Continue consistency pass on center, warehouse, product, transfer, and purchase-order screens.

### 2026-05-18: May 7 Feedback Items

Completed:

- Dashboard quick action "상품 등록" already pointed to product management; retained and expanded it into an in-place product modal.
- Dashboard quick actions now open task modals for inbound, outbound, and product creation instead of only navigating away.
- Dashboard stat cards now navigate to related domains:
  - 전체 품목 -> 상품 관리
  - 유통기한 임박 -> 유통기한
  - 환경 상태 -> 환경 모니터링
  - 오늘 입출고 -> 입고 관리
- Removed the separate environment-card refresh button because the dashboard already has a global refresh action.
- Inventory adjustment creation now invalidates pending adjustment queries, so newly registered adjustment requests appear without manual browser refresh.
- Admin role checks now accept `ADMIN`, `ROLE_ADMIN`, and `SYSTEM_ADMIN` to avoid false redirects for admin accounts whose role is returned with a prefix.
- Admin notice APIs were normalized to `/v1/notices...` and now show recoverable errors instead of silently failing.
- Sidebar no longer shows global center/warehouse selectors. Center/branch remains a grouping concept instead of a global navigation context.
- Warehouse management now includes a center/branch filter so warehouses can be filtered by their grouping concept on that page only.

Follow-up candidates:

- Strengthen `PurchaseOrderPage` status timeline and action forms.
- Add API-backed route smoke checks for `locations`, `cycle-counts`, and `purchase-orders`.
- Consider route-level code splitting because the production bundle is now larger than Vite's default warning threshold.

### 2026-05-18: Menu/Terminology and Quality Baseline

Completed:

- Kept `센터 관리` as an independent menu and retained visible UI terminology as `센터`.
- Updated warehouse filtering copy from the temporary branch/store wording back to `센터`:
  - `센터 필터`
  - `전체 센터`
  - selected-center empty state copy
- Moved dashboard quick-action inbound/outbound creation modals out of page modules:
  - `src/components/inbound/CreateInboundModal.tsx`
  - `src/components/outbound/CreateOutboundModal.tsx`
- Updated `DashboardPage`, `InboundPage`, and `OutboundPage` to consume the shared feature modal components.
- Consolidated the standalone `DemandForecastPage` role into `AI 발주 추천`.
  - Removed the duplicate menu entry.
  - Preserved old `/demand-forecast` links by redirecting them to `/ai`.
- Cleaned the remaining repository-wide ESLint baseline.
  - Existing intentional mount/open/realtime synchronization effects now have narrow, documented lint exceptions.
  - Empty catch blocks and unused caught errors in center/product flows were replaced with visible error handling.

Validation:

- `npm run lint` passed with zero warnings.
- `npm run build` passed.
- Build still emits Vite's large chunk warning for the main bundle, which is a performance follow-up rather than a build failure.

### 2026-05-18: Route-Level Code Splitting and UX Review

Completed:

- Applied route-level code splitting with `React.lazy` for all page modules.
- Kept the app shell stable during lazy route transitions by wrapping each route element with its own `Suspense` boundary instead of blanking the whole app.
- Added a lightweight route loading state for lazy page transitions.
- Removed the Vite 500 kB chunk warning without raising `chunkSizeWarningLimit`.
- Improved login form usability with mobile-sized controls and browser autocomplete hints.

Validation:

- `npm run lint` passed.
- `npm run build` passed with no Vite large-chunk warning.
- Largest generated route chunks after splitting:
  - `ReportsPage`: about 421 kB
  - `BarcodeScanner`: about 382 kB
  - main `index`: about 306 kB

Additional UI/UX improvement candidates found:

- Barcode scanner code is now isolated, but it is still a heavy interaction chunk. Keep scanner entry points explicit and consider preloading only when users open scan workflows.
- Reports remain the largest page chunk because chart/reporting dependencies are heavy. The next performance pass should split report tabs or chart components by report type.
- Several operational screens still use table-first desktop layouts; inbound/outbound/cycle-count mobile flows should continue moving toward task cards and scanner-first controls.
- Modal implementations are now better separated, but a shared dialog shell would reduce inconsistent padding, close button placement, and mobile overflow behavior.
- Page loading, empty, and error states are more consistent than before, but older admin/settings pages should eventually use the same page-state components as inventory workflows.

### 2026-05-18: Repeated UX Stabilization Round

Completed:

- Replaced hard browser reload retry actions with React Query `refetch()` in core operational pages.
- Localized remaining English `Actions` table headers to `작업`.
- Localized offline queue accessibility labels.
- Improved settings page mobile behavior:
  - Responsive tab navigation
  - Larger touch targets
  - Center terminology in sample general settings
  - Lucide icons instead of emoji-style visuals
- Added a separate implementation history document:
  - `docs/WORK_HISTORY.md`

Validation:

- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:run` passed with 17 test files and 129 tests.
