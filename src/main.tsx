import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@app/store'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import DashboardPage from '@pages/dashboard'
import { RegionPage } from '@pages/region'
import { AdminPage } from '@pages/admin'
import UploadsPage from '@pages/uploads'
import RatingBuilder from '@pages/admin/RatingBuilder'
import './index.css'
import AppShell from '@widgets/shell/AppShell'
import { Toaster } from '@/components/ui/toaster'

if (import.meta.env.DEV) {
  import('@shared/mocks/browser').then(({ worker }) => {
    worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' }, // лежит в /public
    });
  });
}

const router = createBrowserRouter([
  { path: '/', element: <AppShell><DashboardPage /></AppShell> },
  { path: '/region/:code', element: <AppShell><RegionPage /></AppShell> },
  { path: '/uploads', element: <AppShell><UploadsPage /></AppShell> },
  { path: '/admin', element: <AppShell><AdminPage /></AppShell> },
  { path: '/admin/builder', element: <AppShell><RatingBuilder /></AppShell> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster />
    </Provider>
  </React.StrictMode>
)
