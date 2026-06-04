/**
 * Main layout component with sidebar navigation.
 * Enhanced with dark sidebar, warehouse selector, and notification bell.
 * Keeps the sidebar visible on desktop and toggled via hamburger on mobile.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
  MapPin, LogOut, Clock, Settings,
  Building2, Warehouse, Menu, X,
  Thermometer, BarChart3, Brain,
  Shield, Bell, FileText, SlidersHorizontal, ClipboardList,
  ShoppingCart, ArrowLeftRight, Zap, MoreHorizontal
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const allNavItems: NavItem[] = [
  { to: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/environment', label: '환경 모니터링', icon: Thermometer },
  { to: '/centers', label: '센터 관리', icon: Building2 },
  { to: '/warehouses', label: '창고 관리', icon: Warehouse },
  { to: '/products', label: '상품 관리', icon: Package },
  { to: '/inventory', label: '재고 관리', icon: Package },
  { to: '/stock-adjustments', label: '재고 조정', icon: SlidersHorizontal },
  { to: '/inventory-transfers', label: '재고 이동', icon: ArrowLeftRight },
  { to: '/cycle-counts', label: '재고 실사', icon: ClipboardList },
  { to: '/inbound', label: '입고 관리', icon: ArrowDownToLine },
  { to: '/outbound', label: '출고 관리', icon: ArrowUpFromLine },
  { to: '/locations', label: '위치 관리', icon: MapPin },
  { to: '/purchase-orders', label: '발주 관리', icon: ShoppingCart },
  { to: '/expiry', label: '유통기한', icon: Clock },
  { to: '/notifications', label: '알림 센터', icon: Bell },
  { to: '/reports', label: '리포트', icon: BarChart3 },
  { to: '/ai', label: 'AI 발주 추천', icon: Brain },
  { to: '/settings', label: '설정', icon: Settings },
]

const pageTitleOverrides: Record<string, string> = {
  '/admin/ai-suggestions': 'AI 제안 관리',
}

/**
 * Returns navigation items visible to the given user role.
 *
 * @param role - User role string (e.g., 'ADMIN', 'MANAGER', 'OPERATOR')
 * @returns Filtered array of navigation items for the role
 */
function getNavItemsForRole(role: string | undefined): NavItem[] {
  switch (role) {
    case 'ADMIN':
    case 'ROLE_ADMIN':
    case 'SYSTEM_ADMIN':
      return allNavItems
    case 'MANAGER':
      return allNavItems.filter(item => !['/settings', '/ai'].includes(item.to))
    case 'OPERATOR':
      return allNavItems.filter(item =>
        !['/settings', '/ai', '/centers', '/warehouses', '/products', '/reports'].includes(item.to)
      )
    default:
      return allNavItems
  }
}

function isAdminRole(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'ROLE_ADMIN' || role === 'SYSTEM_ADMIN'
}

/**
 * Main layout with responsive sidebar navigation.
 * Sidebar is fixed on desktop and toggled via hamburger on mobile.
 * Includes overlay backdrop, ESC key support, and focus trap.
 *
 * @returns Main layout JSX element
 */
export function MainLayout() {
  const { user, logout } = useAuthStore()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const openSidebar = useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement
    setSidebarOpen(true)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    // Return focus to hamburger button
    hamburgerRef.current?.focus()
  }, [])

  const handleSidebarNavigate = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const toggleSidebar = useCallback(() => {
    if (sidebarOpen) {
      closeSidebar()
    } else {
      openSidebar()
    }
  }, [sidebarOpen, openSidebar, closeSidebar])

  // Handle ESC key to close sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        closeSidebar()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen, closeSidebar])

  // Focus trap when sidebar is open
  useEffect(() => {
    if (!sidebarOpen || !sidebarRef.current) return

    const sidebar = sidebarRef.current
    const focusableElements = sidebar.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element when sidebar opens
    firstElement?.focus()

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    sidebar.addEventListener('keydown', handleTabKey)
    return () => sidebar.removeEventListener('keydown', handleTabKey)
  }, [sidebarOpen])

  const getPageTitle = () => {
    const overrideTitle = pageTitleOverrides[location.pathname]
    if (overrideTitle) {
      return overrideTitle
    }

    const item = allNavItems.find(item => item.to === location.pathname)
    return item?.label || 'StockOps'
  }

  const bottomNavItems = [
    { to: '/dashboard', label: '홈', icon: LayoutDashboard },
    { to: '/inbound', label: '입고', icon: ArrowDownToLine },
    { to: '/outbound', label: '출고', icon: ArrowUpFromLine },
    { to: '/inventory', label: '재고', icon: Package },
  ]

  return (
    <div data-testid="app-shell" className="min-h-screen flex bg-bg-secondary pb-16 md:pb-0">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        id="main-sidebar"
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-64 bg-bg-dark text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">📦 StockOps</h1>
            <button
              type="button"
              onClick={closeSidebar}
              className="p-2 hover:bg-white/10 rounded-lg lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {getNavItemsForRole(user?.role).map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleSidebarNavigate}
                className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}

          {isAdminRole(user?.role) && (
            <>
              <div className="mt-4 pt-4 border-t border-white/10" />
              <p className="px-3 text-xs text-white/40 uppercase tracking-wider mb-2">관리자</p>
              <Link
                to="/admin"
                onClick={handleSidebarNavigate}
                className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  location.pathname === '/admin'
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Shield className="w-5 h-5" />
                관리자 대시보드
              </Link>
              <Link
                to="/admin/notices"
                onClick={handleSidebarNavigate}
                className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  location.pathname === '/admin/notices'
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Bell className="w-5 h-5" />
                공지 관리
              </Link>
              <Link
                to="/admin/audit-logs"
                onClick={handleSidebarNavigate}
                className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  location.pathname === '/admin/audit-logs'
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <FileText className="w-5 h-5" />
                감사 로그
              </Link>
              <Link
                to="/admin/ai-suggestions"
                onClick={handleSidebarNavigate}
                className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  location.pathname === '/admin/ai-suggestions'
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Brain className="w-5 h-5" />
                AI 제안 관리
              </Link>
              <Link
                to="/settings/escalation"
                onClick={handleSidebarNavigate}
                className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  location.pathname === '/settings/escalation'
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Zap className="w-5 h-5" />
                알림 에스컬레이션
              </Link>
              <Link
                to="/settings/notification-channels"
                onClick={handleSidebarNavigate}
                className={`flex items-center gap-3 p-3 rounded-lg mb-1 transition-colors ${
                  location.pathname === '/settings/notification-channels'
                    ? 'bg-primary-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Bell className="w-5 h-5" />
                알림 채널 설정
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm text-white/70 mb-3">
            <span>{user?.email || 'admin@stockops.com'}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 p-2 rounded hover:bg-white/10 w-full text-white/70"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-neutral-200 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              type="button"
              ref={hamburgerRef}
              onClick={toggleSidebar}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors lg:hidden"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
              aria-controls="main-sidebar"
            >
              <Menu className="w-6 h-6 text-text-secondary" />
            </button>
            <h1 className="text-xl font-semibold text-text-primary">
              {getPageTitle()}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button
              type="button"
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-neutral-100 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </header>

        {!isOnline && (
          <div
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            data-testid="offline-readonly-banner"
          >
            오프라인 읽기 전용 모드입니다. 조회는 유지되지만 승인, 생성, 다운로드 요청은 비활성화됩니다.
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-neutral-200 z-40 flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[11px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={openSidebar}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-medium">더보기</span>
        </button>
      </nav>
    </div>
  )
}
