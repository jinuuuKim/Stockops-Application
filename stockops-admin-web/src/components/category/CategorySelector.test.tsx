import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategorySelector } from './CategorySelector'
import type { Category } from '@/types/category'

const mockOnChange = vi.fn()

vi.mock('@/hooks/useCategories', () => ({
  useCategoryTree: vi.fn(),
}))

import { useCategoryTree } from '@/hooks/useCategories'

function createCategories(): Category[] {
  return [
    {
      id: 1,
      name: '식품',
      code: 'FOOD',
      level: 1,
      sortOrder: 1,
      active: true,
      parentId: null,
      children: [
        {
          id: 2,
          name: '유제품',
          code: 'DAIRY',
          level: 2,
          sortOrder: 1,
          active: true,
          parentId: 1,
          children: [
            {
              id: 3,
              name: '우유',
              code: 'MILK',
              level: 3,
              sortOrder: 1,
              active: true,
              parentId: 2,
              children: [],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 4,
      name: '생활용품',
      code: 'LIVING',
      level: 1,
      sortOrder: 2,
      active: true,
      parentId: null,
      children: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]
}

describe('CategorySelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCategoryTree).mockReturnValue({
      data: createCategories(),
      isLoading: false,
    } as ReturnType<typeof useCategoryTree>)
  })

  it('renders three select dropdowns', () => {
    render(<CategorySelector onChange={mockOnChange} />)
    expect(screen.getByText('대분류 선택')).toBeInTheDocument()
    expect(screen.getByText('중분류 선택')).toBeInTheDocument()
    expect(screen.getByText('소분류 선택')).toBeInTheDocument()
  })

  it('shows loading skeleton when isLoading is true', () => {
    vi.mocked(useCategoryTree).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useCategoryTree>)
    render(<CategorySelector onChange={mockOnChange} />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })

  it('renders nullable option when nullable is true', () => {
    render(<CategorySelector onChange={mockOnChange} nullable />)
    expect(screen.getByText('미분류')).toBeInTheDocument()
  })

  it('cascades level 1 selection and enables level 2', () => {
    render(<CategorySelector onChange={mockOnChange} />)
    const level1Select = screen.getByText('대분류 선택').closest('select')!
    fireEvent.change(level1Select, { target: { value: '1' } })
    expect(mockOnChange).not.toHaveBeenCalled()
    const level2Select = screen.getByText('중분류 선택').closest('select')!
    expect(level2Select).not.toBeDisabled()
  })

  it('cascades level 2 selection and enables level 3', () => {
    render(<CategorySelector onChange={mockOnChange} />)
    const level1Select = screen.getByText('대분류 선택').closest('select')!
    fireEvent.change(level1Select, { target: { value: '1' } })
    const level2Select = screen.getByText('중분류 선택').closest('select')!
    fireEvent.change(level2Select, { target: { value: '2' } })
    expect(level2Select).not.toBeDisabled()
    const level3Select = screen.getByText('소분류 선택').closest('select')!
    expect(level3Select).not.toBeDisabled()
  })

  it('calls onChange with leaf category ID when level 3 is selected', () => {
    render(<CategorySelector onChange={mockOnChange} />)
    fireEvent.change(screen.getByText('대분류 선택').closest('select')!, { target: { value: '1' } })
    fireEvent.change(screen.getByText('중분류 선택').closest('select')!, { target: { value: '2' } })
    fireEvent.change(screen.getByText('소분류 선택').closest('select')!, { target: { value: '3' } })
    expect(mockOnChange).toHaveBeenCalledWith(3)
  })

  it('calls onChange with null when selecting a leafless level 1', () => {
    render(<CategorySelector onChange={mockOnChange} />)
    fireEvent.change(screen.getByText('대분류 선택').closest('select')!, { target: { value: '4' } })
    expect(mockOnChange).toHaveBeenCalledWith(4)
  })

  it('syncs internal state when external value prop changes', () => {
    const { rerender } = render(<CategorySelector value={null} onChange={mockOnChange} />)
    rerender(<CategorySelector value={3} onChange={mockOnChange} />)
    const level1Select = screen.getByText('대분류 선택').closest('select')! as HTMLSelectElement
    expect(level1Select.value).toBe('1')
  })

  it('resets lower levels when level 1 changes', () => {
    render(<CategorySelector onChange={mockOnChange} />)
    fireEvent.change(screen.getByText('대분류 선택').closest('select')!, { target: { value: '1' } })
    fireEvent.change(screen.getByText('중분류 선택').closest('select')!, { target: { value: '2' } })
    fireEvent.change(screen.getByText('소분류 선택').closest('select')!, { target: { value: '3' } })
    fireEvent.change(screen.getByText('대분류 선택').closest('select')!, { target: { value: '4' } })
    const level2Select = screen.getByText('중분류 선택').closest('select')! as HTMLSelectElement
    expect(level2Select.value).toBe('')
  })
})
