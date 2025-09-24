import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Always use VITE_API_URL if provided, otherwise fall back to mocks in development
const PROD_HOST = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const DEV_HOST = PROD_HOST || ''; // Use PROD_HOST in development if available

export const API_URL = import.meta.env.DEV ? DEV_HOST : PROD_HOST;

export const baseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api`,
  prepareHeaders: (h) => {
    // место для auth, когда будет Keycloak
    return h;
  },
});
