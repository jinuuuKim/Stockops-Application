/**
 * Shared authentication and authorization scope types.
 *
 * @author StockOps Team
 * @since 2.0
 */

export type ScopeType = 'ADMIN' | 'CENTER' | 'WAREHOUSE' | 'STORE'

/**
 * Single scope assignment returned by the backend.
 */
export interface ScopeAssignment {
  scope: ScopeType
  centerId: number | null
  warehouseId: number | null
}

/**
 * Effective scope metadata for the authenticated user.
 */
export interface ScopeMetadata {
  global: boolean
  assignments: ScopeAssignment[]
  centerIds: number[]
  warehouseIds: number[]
}

/**
 * Authenticated user information stored in the frontend state.
 */
export interface AuthenticatedUser {
  id: number
  email: string
  name: string
  role: string
  permissions: string[]
  scopeMetadata: ScopeMetadata
}

/**
 * Login response contract returned by the backend.
 */
export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: AuthenticatedUser
}
