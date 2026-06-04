/**
 * Custom hook for WebSocket connection using STOMP over native WebSocket.
 * Connects to backend /ws endpoint with JWT authentication.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import type { IFrame, IMessage } from '@stomp/stompjs'
import { useAuthStore } from '@/stores/authStore'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'fallback'

export interface WebSocketMessage {
  eventType: string
  [key: string]: unknown
}

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const apiBase = import.meta.env.VITE_API_BASE_URL || ''

  if (!apiBase) {
    return `${protocol}//${window.location.host}/ws`
  }

  const baseUrl = new URL(apiBase, window.location.origin)
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = baseUrl.pathname.replace(/\/api\/?$/, '') + '/ws'
  baseUrl.search = ''
  baseUrl.hash = ''

  return baseUrl.toString()
}

/**
 * Opens a STOMP WebSocket connection, subscribes to the given topic,
 * and returns the latest message plus connection status.
 *
 * Implements exponential backoff reconnect (max 5 retries, base 1s).
 * Falls back to "fallback" status on permanent failure.
 *
 * @param topic - STOMP destination to subscribe (e.g., '/topic/environment')
 * @returns lastMessage, connectionStatus, error
 *
 * @example
 * const { lastMessage, connectionStatus } = useWebSocket('/topic/environment')
 * useEffect(() => {
 *   if (lastMessage?.eventType === 'ENV_SENSOR') {
 *     console.log(lastMessage.value)
 *   }
 * }, [lastMessage])
 */
export function useWebSocket(topic: string): {
  lastMessage: WebSocketMessage | null
  connectionStatus: ConnectionStatus
  error: Error | null
} {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [error, setError] = useState<Error | null>(null)

  const clientRef = useRef<Client | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    const token = useAuthStore.getState().token
    if (!token) {
      /* eslint-disable react-hooks/set-state-in-effect -- websocket setup falls back immediately when no auth token is available. */
      setConnectionStatus('fallback')
      setError(new Error('No authentication token available'))
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }

    function createClient(authToken: string): Client {
      return new Client({
        brokerURL: getWebSocketUrl(),
        connectHeaders: {
          Authorization: `Bearer ${authToken}`,
        },
        debug: () => {},
        reconnectDelay: 0,
        onConnect: () => {
          if (!isMountedRef.current) return
          retryCountRef.current = 0
          setConnectionStatus('connected')
          setError(null)

          clientRef.current?.subscribe(topic, (message: IMessage) => {
            if (!isMountedRef.current) return
            try {
              const body = JSON.parse(message.body) as WebSocketMessage
              setLastMessage(body)
            } catch {
              /* intentionally ignored: malformed payload */
            }
          })
        },
        onStompError: (frame: IFrame) => {
          if (!isMountedRef.current) return
          setError(new Error(frame.headers['message'] || 'STOMP error'))
          handleReconnect(authToken)
        },
        onWebSocketError: () => {
          if (!isMountedRef.current) return
          handleReconnect(authToken)
        },
        onDisconnect: () => {
          if (!isMountedRef.current) return
          handleReconnect(authToken)
        },
      })
    }

    function handleReconnect(authToken: string) {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }

      if (retryCountRef.current >= MAX_RETRIES) {
        setConnectionStatus('fallback')
        setError(new Error('WebSocket connection failed after maximum retries'))
        return
      }

      const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current)
      retryCountRef.current += 1

      retryTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return
        clientRef.current?.deactivate()
        const newClient = createClient(authToken)
        clientRef.current = newClient
        setConnectionStatus('connecting')
        newClient.activate()
      }, delay)
    }

    const client = createClient(token)
    clientRef.current = client
    client.activate()

    return () => {
      isMountedRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      clientRef.current?.deactivate()
    }
  }, [topic])

  return { lastMessage, connectionStatus, error }
}
