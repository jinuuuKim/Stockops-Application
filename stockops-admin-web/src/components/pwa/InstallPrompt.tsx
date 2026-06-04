/**
 * PWA install banner component.
 * Displays a bottom banner prompting the user to install the app.
 * On iOS Safari, shows manual install instructions instead of a native prompt.
 *
 * @author StockOps Team
 * @since 1.0
 * @see usePwaInstall
 */

import { useState, useEffect } from 'react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { Download, X, Share2 } from 'lucide-react'

/**
 * Mobile-only PWA install prompt banner.
 * Appears at the bottom of the viewport when the app is installable
 * and the user has not recently dismissed it.
 *
 * @returns Install prompt JSX or null when hidden
 */
export function InstallPrompt() {
  const { isInstallable, isStandalone, isIos, promptInstall, dismissPrompt, isDismissed } =
    usePwaInstall()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- derived visibility is synchronized from browser installability signals. */
    if ((isInstallable || isIos) && !isStandalone && !isDismissed) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isInstallable, isIos, isStandalone, isDismissed])

  const handleDismiss = () => {
    setIsVisible(false)
    dismissPrompt()
  }

  const handleInstall = async () => {
    await promptInstall()
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-3 mb-3 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-primary-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">
              StockOps를 홈 화면에 추가하세요
            </p>

            {isIos ? (
              <p className="mt-1 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1">
                  하단의
                  <Share2 className="w-3 h-3 inline" />
                  공유 버튼을 누르고,
                </span>
                <br />
                &quot;홈 화면에 추가&quot;를 선택하세요.
              </p>
            ) : (
              <p className="mt-1 text-xs text-text-secondary">
                더 빠르게 접근하고 오프라인에서도 사용할 수 있습니다.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-text-light hover:text-text-secondary hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isIos && (
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={handleInstall}
              className="w-full py-2.5 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors"
            >
              홈 화면에 추가
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
