import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpiryWasteChart } from './ExpiryWasteChart'
import type { ExpiryWasteSummary, ExpiryWasteMonthly } from '@/types/analytics'

function createSummary(): ExpiryWasteSummary {
  return { rowCount: 10, quarantinedQuantity: 150, quarantinedLotCount: 20 }
}

function createMonthlyData(): ExpiryWasteMonthly[] {
  return [
    { month: '2024-01', quarantinedQuantity: 30 },
    { month: '2024-02', quarantinedQuantity: 45 },
    { month: '2024-03', quarantinedQuantity: 25 },
  ]
}

describe('ExpiryWasteChart', () => {
  it('renders summary cards with correct values', () => {
    render(<ExpiryWasteChart summary={createSummary()} />)
    expect(screen.getByText('격리 수량')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('격리 LOT 수')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('영향 품목')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders chart when monthlyData is provided', () => {
    render(<ExpiryWasteChart summary={createSummary()} monthlyData={createMonthlyData()} />)
    expect(screen.getByText('월별 격리 수량')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
  })

  it('shows empty state when no monthly data', () => {
    render(<ExpiryWasteChart summary={createSummary()} />)
    expect(screen.getByText('월별 데이터가 없습니다')).toBeInTheDocument()
  })

  it('shows empty state when monthlyData is empty array', () => {
    render(<ExpiryWasteChart summary={createSummary()} monthlyData={[]} />)
    expect(screen.getByText('월별 데이터가 없습니다')).toBeInTheDocument()
  })

  it('triggers CSV export when chart is present', () => {
    const createObjectURL = vi.fn(() => 'blob:url')
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()

    render(<ExpiryWasteChart summary={createSummary()} monthlyData={createMonthlyData()} />)
    const exportBtn = screen.getByText('CSV')
    fireEvent.click(exportBtn)
    expect(createObjectURL).toHaveBeenCalled()
  })

  it('formats large numbers with locale', () => {
    const largeSummary: ExpiryWasteSummary = {
      rowCount: 1234,
      quarantinedQuantity: 56789,
      quarantinedLotCount: 999,
    }
    render(<ExpiryWasteChart summary={largeSummary} />)
    expect(screen.getByText('56,789')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })
})
