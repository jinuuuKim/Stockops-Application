# StockOps Admin Web Work History

This document records implementation and stabilization work performed in the separated `stockops-admin-web` project.

`stockops-legacy` is used only as a reference source.

## 2026-05-18

### UX Feedback and Functional Fixes

- Reviewed legacy docs and current frontend intent.
- Kept `센터 관리` as an independent menu and retained UI terminology as `센터`.
- Removed global center/warehouse selectors from the sidebar.
- Added center filtering to warehouse management while keeping center as a warehouse grouping concept.
- Fixed admin role handling for `ADMIN`, `ROLE_ADMIN`, and `SYSTEM_ADMIN`.
- Normalized admin notice API paths to `/v1/notices`.
- Fixed stock adjustment list refresh after adjustment creation.
- Changed dashboard quick actions to open in-place create flows for inbound, outbound, and products.
- Linked dashboard stat cards to the relevant operational pages.
- Removed the redundant dashboard environment-card-only refresh button.

### Feature Consolidation

- Deleted unused duplicate `PurchaseOrdersPage.tsx`.
- Consolidated standalone demand forecast into `AI 발주 추천`.
- Redirected old `/demand-forecast` route to `/ai`.
- Moved dashboard inbound/outbound quick-action modals to shared feature components:
  - `src/components/inbound/CreateInboundModal.tsx`
  - `src/components/outbound/CreateOutboundModal.tsx`

### Data and CRUD Improvements

- Added location create/update/delete hooks and request types.
- Reworked location management so add/edit/delete flows are functional.
- Added API-backed cycle-count list loading and query invalidation after start/complete.
- Added defensive API response normalization for inventory, location, inbound, dashboard, and environment data.

### Quality and Performance

- Cleaned the full ESLint baseline.
- Added route-level code splitting with `React.lazy`.
- Kept the app shell stable during lazy route transitions with route-local `Suspense` boundaries.
- Removed the Vite 500 kB chunk warning without raising the warning threshold.
- Improved login form mobile touch targets and browser autocomplete.

### Stabilization Round

- Replaced browser-level `window.location.reload()` retry actions with React Query `refetch()` on:
  - Inventory
  - Inbound
  - Notifications
  - Purchase orders
  - Inventory transfers
  - Stock adjustments
  - Cycle counts
  - Locations
- Localized remaining `Actions` table headers to `작업`.
- Localized offline inbound queue accessibility labels.
- Improved settings page responsiveness:
  - Mobile-friendly tab layout
  - 44px-class touch targets on primary controls
  - Korean center terminology in general settings examples
  - Lucide icons instead of emoji-based action visuals
- Improved alert traceability by showing active escalation alert messages in the active-alert table.
- Added accessible form names for settings modals.
- Fixed report/settings/offline queue test drift so the current UI behavior is covered by the test suite.
- Removed noisy jsdom/Recharts test warnings by:
  - Providing stable initial dimensions to report `ResponsiveContainer` charts.
  - Mocking browser layout dimensions and `ResizeObserver` in `src/setupTests.ts`.
  - Mocking anchor click behavior in tests for CSV export flows.

### Validation

- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:run` passed with 17 test files and 129 tests.
- `git diff --check` passed during stabilization checkpoints.
