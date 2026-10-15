export type AdminRole = 'owner' | 'admin' | 'staff'

export interface AdminProfile {
  id: string
  email: string
  fullName: string
  role: AdminRole
  avatarUrl: string | null
  isActive: boolean
  createdAt: Date
}
