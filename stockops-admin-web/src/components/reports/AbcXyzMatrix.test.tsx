import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AbcXyzMatrix } from './AbcXyzMatrix'
import type { AbcXyzMatrixCell } from '@/types/analytics'

function createCells(): AbcXyzMatrixCell[] {
  return [
    {
      abcClass: 'A',
      xyzClass: 'X',
      productCount: 5,
      products: [
        { productId: 1, productName: 'Product A' },
        { productId: 2, productName: 'Product B' },
      ],
    },
    {
      abcClass: 'B',
      xyzClass: 'Y',
      productCount: 3,
      products: [{ productId: 3, productName: 'Product C' }],
    },
    {
      abcClass: 'C',
      xyzClass: 'Z',
      productCount: 8,
      products: [],
    },
  ]
}

describe('AbcXyzMatrix', () => {
  it('renders 3x3 grid with headers', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    expect(screen.getByText('X')).toBeInTheDocument()
    expect(screen.getByText('Y')).toBeInTheDocument()
    expect(screen.getByText('Z')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('renders correct product counts in cells', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('applies correct color coding for AX cell', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    const axButton = screen.getByText('5').closest('button')
    expect(axButton?.className).toContain('bg-emerald-500')
  })

  it('applies correct color coding for CZ cell', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    const czButton = screen.getByText('8').closest('button')
    expect(czButton?.className).toContain('bg-red-500')
  })

  it('renders legend items', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    expect(screen.getByText('최우선 관리 (AX)')).toBeInTheDocument()
    expect(screen.getByText('중간 관리')).toBeInTheDocument()
    expect(screen.getByText('저우선순위 (CZ)')).toBeInTheDocument()
  })

  it('opens modal when clicking a cell with products', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    const axButton = screen.getByText('5').closest('button')!
    fireEvent.click(axButton)
    expect(screen.getByText('AX 분류 품목 (5개)')).toBeInTheDocument()
    expect(screen.getByText('Product A')).toBeInTheDocument()
    expect(screen.getByText('Product B')).toBeInTheDocument()
  })

  it('closes modal when clicking the close button', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    fireEvent.click(screen.getByText('5').closest('button')!)
    expect(screen.getByText('AX 분류 품목 (5개)')).toBeInTheDocument()
    const closeBtn = screen.getByRole('button', { name: /닫기/i })
    fireEvent.click(closeBtn)
    expect(screen.queryByText('AX 분류 품목 (5개)')).not.toBeInTheDocument()
  })

  it('shows empty message in modal for cell with zero products', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    fireEvent.click(screen.getByText('8').closest('button')!)
    expect(screen.getByText('등록된 품목이 없습니다')).toBeInTheDocument()
  })

  it('renders zero for missing cells', () => {
    render(<AbcXyzMatrix cells={createCells()} />)
    const zeroCells = screen.getAllByText('0')
    expect(zeroCells.length).toBe(6)
  })
})
