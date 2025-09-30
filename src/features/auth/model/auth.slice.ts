import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getAuth, setAuth, clearAuth } from '@/shared/auth/localAuth';

export type Role = 'operator' | 'analyst' | 'admin';
//export type Role = 'admin';

type State = {
  isAuthed: boolean;
  name: string;
  roles: Role[];
};

// Попытка восстановить состояние из localStorage
const savedAuth = getAuth();
const initial: State = savedAuth || {
  isAuthed: false,
  name: '',
  roles: [],
};

const slice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    login(state, { payload }: PayloadAction<{ name: string; roles: Role[] }>) {
      state.isAuthed = true;
      state.name = payload.name;
      state.roles = payload.roles;
      setAuth({ isAuthed: true, name: payload.name, roles: payload.roles });
    },
    logout(state) {
      state.isAuthed = false;
      state.name = '';
      state.roles = [];
      clearAuth();
    },
    setRole(state, { payload }: PayloadAction<Role>) {
      state.roles = [payload];
      if (state.isAuthed) {
        setAuth({ isAuthed: state.isAuthed, name: state.name, roles: state.roles });
      }
    },
  },
});

export const { login, logout, setRole } = slice.actions;
export default slice.reducer;
