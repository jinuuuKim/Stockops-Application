/**
 * Cascading category selector component.
 * Supports 3-level hierarchy: 대분류 → 중분류 → 소분류.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useEffect, useMemo } from 'react'
import { useCategoryTree } from '@/hooks/useCategories'
import type { Category } from '@/types/category'

interface CategorySelectorProps {
  /** Selected category ID (leaf node) */
  value?: number | null
  /** Callback when selection changes (passes leaf category ID or null) */
  onChange: (categoryId: number | null) => void
  /** Whether to show "미분류" (uncategorized) option */
  nullable?: boolean
  /** Additional CSS classes for the container */
  className?: string
}

/**
 * Builds a flat map of all categories from a tree for quick lookup.
 */
function buildCategoryMap(categories: Category[]): Map<number, Category> {
  const map = new Map<number, Category>()
  function traverse(nodes: Category[]) {
    for (const node of nodes) {
      map.set(node.id, node)
      if (node.children && node.children.length > 0) {
        traverse(node.children)
      }
    }
  }
  traverse(categories)
  return map
}

/**
 * Finds the path from root to a given category ID.
 * Returns [level1, level2, level3] IDs.
 */
function findCategoryPath(
  categories: Category[],
  categoryId: number,
): [number | null, number | null, number | null] {
  function search(nodes: Category[], path: number[]): number[] | null {
    for (const node of nodes) {
      if (node.id === categoryId) {
        return [...path, node.id]
      }
      if (node.children && node.children.length > 0) {
        const result = search(node.children, [...path, node.id])
        if (result) return result
      }
    }
    return null
  }
  const result = search(categories, [])
  if (!result) return [null, null, null]
  return [result[0] ?? null, result[1] ?? null, result[2] ?? null]
}

export function CategorySelector({
  value,
  onChange,
  nullable = false,
  className = '',
}: CategorySelectorProps) {
  const { data: categoryTree = [], isLoading } = useCategoryTree()

  const [level1, setLevel1] = useState<number | null>(null)
  const [level2, setLevel2] = useState<number | null>(null)
  const [level3, setLevel3] = useState<number | null>(null)

  const categoryMap = useMemo(() => buildCategoryMap(categoryTree), [categoryTree])

  /**
   * When external value changes, sync internal state.
   */
  useEffect(() => {
    if (value && categoryTree.length > 0) {
      const [l1, l2, l3] = findCategoryPath(categoryTree, value)
      /* eslint-disable react-hooks/set-state-in-effect -- mirrors an externally controlled category value into the three-level picker state. */
      setLevel1(l1)
      setLevel2(l2)
      setLevel3(l3)
      /* eslint-enable react-hooks/set-state-in-effect */
    } else if (!value) {
      setLevel1(null)
      setLevel2(null)
      setLevel3(null)
    }
  }, [value, categoryTree])

  const level1Options = useMemo(() => {
    return categoryTree.filter((c) => c.level === 1).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [categoryTree])

  const level2Options = useMemo(() => {
    if (!level1) return []
    const parent = categoryMap.get(level1)
    return (parent?.children ?? [])
      .filter((c) => c.level === 2)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [level1, categoryMap])

  const level3Options = useMemo(() => {
    if (!level2) return []
    const parent = categoryMap.get(level2)
    return (parent?.children ?? [])
      .filter((c) => c.level === 3)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [level2, categoryMap])

  const handleLevel1Change = (id: number | null) => {
    setLevel1(id)
    setLevel2(null)
    setLevel3(null)
    // Only emit if this level has no children (rare for level 1, but possible)
    const selected = id ? categoryMap.get(id) : null
    if (!selected || !selected.children || selected.children.length === 0) {
      onChange(id)
    }
  }

  const handleLevel2Change = (id: number | null) => {
    setLevel2(id)
    setLevel3(null)
    const selected = id ? categoryMap.get(id) : null
    if (!selected || !selected.children || selected.children.length === 0) {
      onChange(id)
    }
  }

  const handleLevel3Change = (id: number | null) => {
    setLevel3(id)
    onChange(id)
  }

  if (isLoading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <div className="flex-1 h-10 bg-neutral-100 rounded-lg animate-pulse" />
        <div className="flex-1 h-10 bg-neutral-100 rounded-lg animate-pulse" />
        <div className="flex-1 h-10 bg-neutral-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <select
        value={level1 ?? ''}
        onChange={(e) => {
          const val = e.target.value
          handleLevel1Change(val ? Number(val) : null)
        }}
        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
      >
        {nullable && <option value="">미분류</option>}
        <option value="">대분류 선택</option>
        {level1Options.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        value={level2 ?? ''}
        onChange={(e) => {
          const val = e.target.value
          handleLevel2Change(val ? Number(val) : null)
        }}
        disabled={!level1 || level2Options.length === 0}
        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
      >
        <option value="">중분류 선택</option>
        {level2Options.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        value={level3 ?? ''}
        onChange={(e) => {
          const val = e.target.value
          handleLevel3Change(val ? Number(val) : null)
        }}
        disabled={!level2 || level3Options.length === 0}
        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
      >
        <option value="">소분류 선택</option>
        {level3Options.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  )
}
