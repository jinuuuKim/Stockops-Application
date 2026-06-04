/**
 * Application entry point with React Query provider setup.
 * Configures QueryClient for server state management.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

function unregisterServiceWorker(): void {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      void Promise.all(registrations.map((registration) => registration.unregister()))
    }).catch(() => {
      // Service worker cleanup should never block the inventory workflow.
    })
  })
}

/**
 * Query client instance with default configuration.
 * Disables window focus refetching for better UX.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

unregisterServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
