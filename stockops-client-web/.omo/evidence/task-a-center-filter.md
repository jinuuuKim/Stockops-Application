## Task A: Center filter for inventory lookup

- Added a center select dropdown to `InventoryPage` in `src/App.tsx`.
- `InventoryPage` now loads centers with `fetchCenters()` and passes `centerId` into `filterInventory`.
- `filterInventory` in `src/domain.ts` now applies `centerId` alongside query, warehouse, and low-stock filters.
- Verification:
  - `npm run test:run` ✅
  - `npm run build` ✅
