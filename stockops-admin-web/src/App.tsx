/**
 * Main application component with routing configuration.
 * Sets up React Router with protected routes and authentication flow.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/MainLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'

function lazyPage<T extends Record<string, ComponentType>>(loader: () => Promise<T>, exportName: keyof T) {
  return lazy(async () => {
    const module = await loader()
    return { default: module[exportName] }
  })
}

const LoginPage = lazyPage(() => import('@/pages/LoginPage'), 'LoginPage')
const DashboardPage = lazyPage(() => import('@/pages/DashboardPage'), 'DashboardPage')
const InventoryPage = lazyPage(() => import('@/pages/InventoryPage'), 'InventoryPage')
const InboundPage = lazyPage(() => import('@/pages/InboundPage'), 'InboundPage')
const OutboundPage = lazyPage(() => import('@/pages/OutboundPage'), 'OutboundPage')
const ExpiryPage = lazyPage(() => import('@/pages/ExpiryPage'), 'ExpiryPage')
const LocationsPage = lazyPage(() => import('@/pages/LocationsPage'), 'LocationsPage')
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage')
const CentersPage = lazyPage(() => import('@/pages/CentersPage'), 'CentersPage')
const WarehousesPage = lazyPage(() => import('@/pages/WarehousesPage'), 'WarehousesPage')
const PurchaseOrderPage = lazyPage(() => import('@/pages/PurchaseOrderPage'), 'PurchaseOrderPage')
const ProductsPage = lazyPage(() => import('@/pages/ProductsPage'), 'ProductsPage')
const EnvironmentPage = lazyPage(() => import('@/pages/EnvironmentPage'), 'EnvironmentPage')
const ReportsPage = lazyPage(() => import('@/pages/ReportsPage'), 'ReportsPage')
const AIFeaturesPage = lazyPage(() => import('@/pages/AIFeaturesPage'), 'AIFeaturesPage')
const StockAdjustmentPage = lazyPage(() => import('@/pages/StockAdjustmentPage'), 'StockAdjustmentPage')
const AdminPage = lazyPage(() => import('@/pages/admin/AdminPage'), 'AdminPage')
const NoticeManagement = lazyPage(() => import('@/pages/admin/NoticeManagement'), 'NoticeManagement')
const AuditLogViewer = lazyPage(() => import('@/pages/admin/AuditLogViewer'), 'AuditLogViewer')
const AISuggestionsPage = lazyPage(() => import('@/pages/AISuggestionsPage'), 'AISuggestionsPage')
const EscalationPolicyPage = lazyPage(() => import('@/pages/settings/EscalationPolicyPage'), 'EscalationPolicyPage')
const NotificationChannelPage = lazyPage(
  () => import('@/pages/settings/NotificationChannelPage'),
  'NotificationChannelPage'
)
const CycleCountPage = lazyPage(() => import('@/pages/CycleCountPage'), 'CycleCountPage')
const NotificationsPage = lazyPage(() => import('@/pages/NotificationsPage'), 'NotificationsPage')
const InventoryTransferPage = lazyPage(() => import('@/pages/InventoryTransferPage'), 'InventoryTransferPage')

function PageLoading() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-neutral-600">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
        <p className="text-sm font-medium">화면을 불러오는 중입니다</p>
      </div>
    </div>
  )
}

function routeElement(element: ReactNode) {
  return <Suspense fallback={<PageLoading />}>{element}</Suspense>
}

/**
 * Main App component with route configuration.
 * - /login: Public login page
  * - /: Protected routes (restores auth from refresh cookie before redirecting)
 * - /dashboard: Dashboard page
 * - /inventory: Inventory page
 * - /inbound: Inbound page
 * - /outbound: Outbound page
 * - /locations: Locations page
 * - /expiry: Expiry management page
 * - /settings: Settings page
 * - /environment: Environment monitoring page
 *
 * @returns App JSX element with router configuration
 */
function App() {
  return (
    <BrowserRouter basename="/admin">
      <InstallPrompt />
      <Routes>
        <Route path="/login" element={routeElement(<LoginPage />)} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={routeElement(<DashboardPage />)} />
          <Route path="centers" element={routeElement(<CentersPage />)} />
          <Route path="warehouses" element={routeElement(<WarehousesPage />)} />
          <Route path="products" element={routeElement(<ProductsPage />)} />
          <Route path="purchase-orders" element={routeElement(<PurchaseOrderPage />)} />
          <Route path="inventory" element={routeElement(<InventoryPage />)} />
          <Route path="inbound" element={routeElement(<InboundPage />)} />
          <Route path="outbound" element={routeElement(<OutboundPage />)} />
          <Route path="stock-adjustments" element={routeElement(<StockAdjustmentPage />)} />
          <Route path="locations" element={routeElement(<LocationsPage />)} />
          <Route path="expiry" element={routeElement(<ExpiryPage />)} />
          <Route path="settings" element={routeElement(<SettingsPage />)} />
          <Route path="settings/escalation" element={routeElement(<EscalationPolicyPage />)} />
          <Route path="settings/notification-channels" element={routeElement(<NotificationChannelPage />)} />
          <Route path="environment" element={routeElement(<EnvironmentPage />)} />
          <Route path="reports" element={routeElement(<ReportsPage />)} />
          <Route path="ai" element={routeElement(<AIFeaturesPage />)} />
          <Route path="admin" element={routeElement(<AdminPage />)} />
          <Route path="admin/notices" element={routeElement(<NoticeManagement />)} />
          <Route path="admin/audit-logs" element={routeElement(<AuditLogViewer />)} />
          <Route path="admin/ai-suggestions" element={routeElement(<AISuggestionsPage />)} />
          <Route path="demand-forecast" element={<Navigate to="/ai" replace />} />
          <Route path="inventory-transfers" element={routeElement(<InventoryTransferPage />)} />
          <Route path="cycle-counts" element={routeElement(<CycleCountPage />)} />
          <Route path="notifications" element={routeElement(<NotificationsPage />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
