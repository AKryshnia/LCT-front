
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setRole, type Role } from './model/auth.slice'
import type { RootState } from '@app/store'

export const RoleSwitcher: React.FC = () => {
  const dispatch = useDispatch()
  const roles = useSelector((s: RootState) => s.auth.roles)
  const current: Role = roles[0]
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">Роль:</span>
      <select className="border rounded px-2 py-1" value={current} onChange={e=>dispatch(setRole(e.target.value as Role))}>
        <option value="admin">admin</option>
        <option value="analyst">analyst</option>
        <option value="operator">operator</option>
      </select>
    </div>
  )
}

export const RoleGuard: React.FC<{ allow: Role[], children: React.ReactNode }> = ({ allow, children }) => {
  const roles = useSelector((s: RootState) => s.auth.roles)
  const ok = roles.some(r => allow.includes(r))
  if (!ok) return null
  return <>{children}</>
}
