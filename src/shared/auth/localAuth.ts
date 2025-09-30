import type { Role } from '@features/auth/model/auth.slice';

const AUTH_KEY = 'lct_auth';

export type AuthState = {
  isAuthed: boolean;
  name: string;
  roles: Role[];
};

export const getAuth = (): AuthState | null => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAuth = (auth: AuthState): void => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
};

export const clearAuth = (): void => {
  localStorage.removeItem(AUTH_KEY);
};
