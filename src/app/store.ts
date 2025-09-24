
import { configureStore } from '@reduxjs/toolkit'
import auth from '@features/auth/model/auth.slice'
import { lctApi } from '@shared/api/lctApi'

export const store = configureStore({
  reducer: { 
    auth,
    [lctApi.reducerPath]: lctApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(lctApi.middleware),
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
