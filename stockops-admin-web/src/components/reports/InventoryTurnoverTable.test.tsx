import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InventoryTurnoverTable } from './InventoryTurnoverTable'
import type { InventoryTurnoverItem } from '@/types/analytics'

function createItems(): InventoryTurnoverItem[] {
  return [
    { productId: 1, productName: 'Apple', productBarcode: '8801001', turnoverRate: 12.5, cogs: 50000, avgInventory: 100 },
    { productId: 2, productName: 'Banana', productBarcode: '8801002', turnoverRate: 3.5, cogs: 30000, avgInventory: 200 },
    { productId: 3, productName: 'Cherry', productBarcode: '8801003', turnoverRate: 8.0, cogs: 45000, avgInventory: 150 },
  ]
}

describe('InventoryTurnoverTable', () => {
  it('renders summary cards with correct totals', () => {
    render(<InventoryTurnoverTable items={createItems()} />)
    expect(screen.getByText('전체 품목')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('평균 회전율')).toBeInTheDocument()
    expect(screen.getAllByText('8.00').length).toBeGreaterThan(0)
  })

  it('renders all rows with product data', () => {
    render(<InventoryTurnoverTable items={createItems()} />)
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
    expect(screen.getByText('Cherry')).toBeInTheDocument()
    expect(screen.getByText('8801001')).toBeInTheDocument()
  })

  it('sorts by turnoverRate descending by default', () => {
    render(<InventoryTurnoverTable items={createItems()} />)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Apple')
  })

  it('toggles sort direction when clicking same column header', () => {
    render(<InventoryTurnoverTable items={createItems()} />)
    const turnoverHeader = screen.getByText('회전율').closest('button')!
    fireEvent.click(turnoverHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Banana')
    fireEvent.click(turnoverHeader)
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Apple')
  })

  it('changes sort column when clicking different header', () => {
    render(<InventoryTurnoverTable items={createItems()} />)
    const nameHeader = screen.getByText('품목').closest('button')!
    fireEvent.click(nameHeader)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Cherry')
  })

  it('highlights high turnover rate with green badge', () => {
    render(<InventoryTurnoverTable items={createItems()} />)
    const appleRow = screen.getByText('Apple').closest('tr')!
    expect(appleRow.innerHTML).toContain('bg-emerald-100')
  })

  it('highlights low turnover rate with red badge', () => {
    render(<InventoryTurnoverTable items={createItems()} />)
    const bananaRow = screen.getByText('Banana').closest('tr')!
    expect(bananaRow.innerHTML).toContain('bg-red-100')
  })

  it('triggers CSV export on button click', () => {
    const createObjectURL = vi.fn(() => 'blob:url')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    render(<InventoryTurnoverTable items={createItems()} />)
    const exportBtn = screen.getByText('CSV 내보내기')
    fireEvent.click(exportBtn)
    expect(createObjectURL).toHaveBeenCalled()
  })

  it('renders empty table when items array is empty', () => {
    render(<InventoryTurnoverTable items={[]} />)
    expect(screen.getByText('전체 품목')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })
})
