
import { createSlice } from '@reduxjs/toolkit'
export type Role = 'operator'|'analyst'|'admin'|'superadmin'
type State = { name: string, roles: Role[] }
const initial: State = { name: 'Demo SuperAdmin', roles: ['superadmin','admin','analyst','operator'] }
const slice = createSlice({
  name: 'auth', initialState: initial, reducers: {
    setRole(state, { payload }: { payload: Role }) {
      state.roles = payload === 'superadmin' ? ['superadmin','admin','analyst','operator'] : [payload]
    }
  }
})
export const { setRole } = slice.actions
export default slice.reducer
