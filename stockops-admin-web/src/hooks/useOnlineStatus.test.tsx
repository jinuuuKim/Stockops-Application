import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useOnlineStatus } from './useOnlineStatus'

describe('useOnlineStatus', () => {
  it('reacts to online and offline browser events', () => {
    const { result } = renderHook(() => useOnlineStatus())

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current).toBe(true)
  })
})
