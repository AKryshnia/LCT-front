import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// In development use same-origin to let MSW intercept /api/* requests.
// In production, you can set VITE_API_URL to absolute origin like https://api.example.com
const DEV_HOST = '';
const PROD_HOST = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const API_URL = import.meta.env.DEV ? DEV_HOST : PROD_HOST;

export const baseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api`,
  prepareHeaders: (h) => {
    // место для auth, когда будет Keycloak
    return h;
  },
});
