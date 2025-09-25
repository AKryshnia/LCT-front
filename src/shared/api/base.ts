import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * В продакшене ходим на относительный /api.
 * В деве можно либо тоже на /api (через Vite proxy),
 * либо на абсолютный VITE_API_URL, если он задан.
 */
const RAW = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '';
const baseUrl =
  import.meta.env.PROD
    ? '/api'
    : (RAW ? `${RAW}/api` : '/api');

export const baseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (h) => h, // здесь потом добавиmь auth при дальнейшей разработке
});
