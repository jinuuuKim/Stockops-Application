/**
 * Barcode/QR scanner component with camera and keyboard input fallback.
 * Supports both camera-based scanning and keyboard scanner input for mobile/desktop environments.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { Camera, Keyboard, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

/**
 * Camera permission states.
 */
type PermissionState = 'unknown' | 'granted' | 'denied' | 'prompt'

/**
 * Scanner mode selection.
 */
type ScannerMode = 'camera' | 'keyboard'

/**
 * Props for BarcodeScanner component.
 *
 * @param onScan - Callback when barcode/QR code is successfully scanned
 * @param placeholder - Placeholder text for keyboard input
 * @param disabled - Whether the scanner is disabled
 * @param autoFocus - Whether to auto-focus on keyboard input (default: true)
 * @param continuous - Whether to continue scanning after success (default: false)
 * @param onSuccess - Optional callback for successful scan with feedback
 * @param onError - Optional callback for scan error
 */
interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  continuous?: boolean
  onSuccess?: (barcode: string) => void
  onError?: (error: string) => void
}

/**
 * Scan result feedback state.
 */
interface ScanFeedback {
  type: 'success' | 'error' | null
  message: string
  barcode?: string
}

/**
 * Barcode/QR scanner component with dual input modes.
 * Provides camera-based scanning for mobile devices and keyboard input fallback.
 *
 * @param props - Component props
 * @returns Scanner JSX element
 * @example
 * <BarcodeScanner
 *   onScan={(barcode) => console.log('Scanned:', barcode)}
 *   placeholder="바코드를 스캔하거나 입력하세요"
 * />
 */
export function BarcodeScanner({
  onScan,
  placeholder = '바코드를 스캔하거나 입력하세요',
  disabled = false,
  autoFocus = true,
  continuous = false,
  onSuccess,
  onError,
}: BarcodeScannerProps) {
  const [mode, setMode] = useState<ScannerMode>('keyboard')
  const [permission, setPermission] = useState<PermissionState>('unknown')
  const [keyboardInput, setKeyboardInput] = useState('')
  const [feedback, setFeedback] = useState<ScanFeedback>({ type: null, message: '' })
  const [isScanning, setIsScanning] = useState(false)

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const keyboardInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  /**
   * Check camera permission status on mount.
   */
  useEffect(() => {
    async function checkPermission() {
      try {
        if ('permissions' in navigator && 'query' in navigator.permissions) {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
          setPermission(result.state as PermissionState)

          result.addEventListener('change', () => {
            setPermission(result.state as PermissionState)
          })
        }
      } catch {
        // Permissions API not supported, will check on camera access
        setPermission('unknown')
      }
    }

    checkPermission()
  }, [])

  /**
   * Auto-focus keyboard input when in keyboard mode.
   */
  useEffect(() => {
    if (mode === 'keyboard' && autoFocus && keyboardInputRef.current) {
      keyboardInputRef.current.focus()
    }
  }, [mode, autoFocus])

  /**
   * Cleanup scanner on unmount or mode change.
   */
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {
          // Ignore cleanup errors
        })
        scannerRef.current = null
      }
    }
  }, [])

  /**
   * Initialize camera scanner when switching to camera mode.
   */
  useEffect(() => {
    if (mode !== 'camera' || disabled) return

    const containerId = 'barcode-scanner-container'

    // Create scanner configuration
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      rememberLastUsedCamera: true,
    }

    /**
     * Handle successful scan from camera.
     */
    const handleScanSuccess = (decodedText: string) => {
      setFeedback({ type: 'success', message: '스캔 성공!', barcode: decodedText })
      onScan(decodedText)
      onSuccess?.(decodedText)

      if (!continuous) {
        // Stop scanner after successful scan
        scannerRef.current?.clear().catch(() => {})
        setIsScanning(false)
      }
    }

    /**
     * Handle scan error from camera.
     */
    const handleScanError = (error: string) => {
      // Ignore common "not found" errors during scanning
      if (!error.includes('No QR code found')) {
        setFeedback({ type: 'error', message: `스캔 오류: ${error}` })
        onError?.(error)
      }
    }

    // Initialize scanner
    const initScanner = async () => {
      try {
        scannerRef.current = new Html5QrcodeScanner(containerId, config, false)
        await scannerRef.current.render(handleScanSuccess, handleScanError)
        // Use flushSync or queueMicrotask to avoid cascading render warning
        queueMicrotask(() => {
          setIsScanning(true)
          setPermission('granted')
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '카메라 초기화 실패'
        setFeedback({ type: 'error', message: errorMessage })
        setPermission('denied')
        onError?.(errorMessage)
      }
    }

    initScanner()

    // Cleanup function
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [mode, disabled, continuous, onScan, onSuccess, onError])

  /**
   * Handle keyboard input submission.
   */
  const handleKeyboardSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      const barcode = keyboardInput.trim()
      if (!barcode) {
        setFeedback({ type: 'error', message: '바코드를 입력해주세요' })
        return
      }

      setFeedback({ type: 'success', message: '입력 완료!', barcode })
      onScan(barcode)
      onSuccess?.(barcode)
      setKeyboardInput('')

      if (!continuous && keyboardInputRef.current) {
        keyboardInputRef.current.focus()
      }
    },
    [keyboardInput, onScan, onSuccess, continuous]
  )

  /**
   * Handle keyboard input change.
   */
  const handleKeyboardChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyboardInput(e.target.value)
    setFeedback({ type: null, message: '' })
  }, [])

  /**
   * Clear feedback after timeout.
   */
  useEffect(() => {
    if (feedback.type) {
      const timer = setTimeout(() => {
        setFeedback({ type: null, message: '' })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  /**
   * Request camera permission explicitly.
   */
  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      setPermission('granted')
      setMode('camera')
    } catch {
      setPermission('denied')
      setFeedback({ type: 'error', message: '카메라 접근이 거부되었습니다. 키보드 입력을 사용하세요.' })
    }
  }, [])

  /**
   * Switch to camera mode with permission check.
   */
  const switchToCameraMode = useCallback(() => {
    if (permission === 'denied') {
      setFeedback({ type: 'error', message: '카메라 접근이 거부되었습니다. 브라우저 설정에서 허용해주세요.' })
      return
    }

    if (permission === 'unknown' || permission === 'prompt') {
      requestCameraPermission()
    } else {
      setMode('camera')
    }
  }, [permission, requestCameraPermission])

  /**
   * Switch to keyboard mode.
   */
  const switchToKeyboardMode = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {})
      scannerRef.current = null
    }
    setIsScanning(false)
    setMode('keyboard')
  }, [])

  return (
    <div ref={containerRef} className="w-full">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={switchToKeyboardMode}
          disabled={disabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            mode === 'keyboard'
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Keyboard className="w-4 h-4" />
          키보드 입력
        </button>
        <button
          type="button"
          onClick={switchToCameraMode}
          disabled={disabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            mode === 'camera'
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Camera className="w-4 h-4" />
          카메라 스캔
        </button>
      </div>

      {/* Feedback Message */}
      {feedback.type && (
        <div
          className={`flex items-center gap-2 p-3 mb-4 rounded-lg ${
            feedback.type === 'success'
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
          {feedback.barcode && (
            <code className="ml-2 px-2 py-0.5 bg-white/50 rounded text-xs">
              {feedback.barcode}
            </code>
          )}
        </div>
      )}

      {/* Keyboard Input Mode */}
      {mode === 'keyboard' && (
        <form onSubmit={handleKeyboardSubmit} className="space-y-3">
          <div className="relative">
            <input
              ref={keyboardInputRef}
              type="text"
              value={keyboardInput}
              onChange={handleKeyboardChange}
              disabled={disabled}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
            />
            {keyboardInput && !disabled && (
              <button
                type="button"
                onClick={() => setKeyboardInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 rounded"
              >
                <XCircle className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={disabled || !keyboardInput.trim()}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            입력 확인
          </button>
        </form>
      )}

      {/* Camera Scanner Mode */}
      {mode === 'camera' && (
        <div className="space-y-3">
          {/* Permission Denied Warning */}
          {permission === 'denied' && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 text-warning rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">카메라 접근이 차단되었습니다.</p>
                <p className="mt-1">
                  브라우저 설정에서 카메라 권한을 허용하거나 키보드 입력을 사용하세요.
                </p>
              </div>
            </div>
          )}

          {/* Scanner Container */}
          {permission !== 'denied' && (
            <div
              id="barcode-scanner-container"
              className="w-full rounded-lg overflow-hidden border border-neutral-200"
            />
          )}

          {/* Scanning Status */}
          {isScanning && permission === 'granted' && (
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
              <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
              바코드를 스캔하세요...
            </div>
          )}

          {/* Manual Switch to Keyboard */}
          {permission === 'denied' && (
            <button
              type="button"
              onClick={switchToKeyboardMode}
              className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              키보드 입력으로 전환
            </button>
          )}
        </div>
      )}
    </div>
  )
}