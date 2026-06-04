import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeadTimeChart } from './LeadTimeChart'
import type { LeadTimeMonthly, LeadTimeSupplier } from '@/types/analytics'

function createMonthlyData(): LeadTimeMonthly[] {
  return [
    { month: '2024-01', avgLeadTimeHours: 48 },
    { month: '2024-02', avgLeadTimeHours: 52 },
    { month: '2024-03', avgLeadTimeHours: 45 },
  ]
}

function createSuppliers(): LeadTimeSupplier[] {
  return [
    { supplierName: 'Supplier A', avgLeadTimeHours: 36, orderCount: 10 },
    { supplierName: 'Supplier B', avgLeadTimeHours: 80, orderCount: 5 },
    { supplierName: 'Supplier C', avgLeadTimeHours: 60, orderCount: 8 },
  ]
}

describe('LeadTimeChart', () => {
  it('renders chart when monthlyData is provided', () => {
    render(<LeadTimeChart monthlyData={createMonthlyData()} />)
    expect(screen.getByText('평균 리드타임')).toBeInTheDocument()
    expect(screen.getByText('48.3시간')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
  })

  it('shows empty state when no monthly data', () => {
    render(<LeadTimeChart />)
    expect(screen.getByText('월별 리드타임 데이터가 없습니다')).toBeInTheDocument()
  })

  it('shows empty state when monthlyData is empty array', () => {
    render(<LeadTimeChart monthlyData={[]} />)
    expect(screen.getByText('월별 리드타임 데이터가 없습니다')).toBeInTheDocument()
  })

  it('triggers CSV export when chart is present', () => {
    const createObjectURL = vi.fn(() => 'blob:url')
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()

    render(<LeadTimeChart monthlyData={createMonthlyData()} />)
    const exportBtn = screen.getByText('CSV')
    fireEvent.click(exportBtn)
    expect(createObjectURL).toHaveBeenCalled()
  })

  it('renders supplier table when suppliers are provided', () => {
    render(<LeadTimeChart monthlyData={createMonthlyData()} suppliers={createSuppliers()} />)
    expect(screen.getByText('공급사별 리드타임')).toBeInTheDocument()
    expect(screen.getByText('Supplier A')).toBeInTheDocument()
    expect(screen.getByText('Supplier B')).toBeInTheDocument()
    expect(screen.getByText('Supplier C')).toBeInTheDocument()
  })

  it('applies green badge for fast suppliers (< 48h)', () => {
    render(<LeadTimeChart monthlyData={createMonthlyData()} suppliers={createSuppliers()} />)
    const supplierARow = screen.getByText('Supplier A').closest('tr')!
    expect(supplierARow.innerHTML).toContain('bg-emerald-100')
  })

  it('applies red badge for slow suppliers (> 72h)', () => {
    render(<LeadTimeChart monthlyData={createMonthlyData()} suppliers={createSuppliers()} />)
    const supplierBRow = screen.getByText('Supplier B').closest('tr')!
    expect(supplierBRow.innerHTML).toContain('bg-red-100')
  })

  it('does not render supplier table when suppliers array is empty', () => {
    render(<LeadTimeChart monthlyData={createMonthlyData()} suppliers={[]} />)
    expect(screen.queryByText('공급사별 리드타임')).not.toBeInTheDocument()
  })
})
