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
import LoginPage from '@pages/login'
import AnalyticsPage from '@pages/analytics'
import './index.css'
import AppShell from '@widgets/shell/AppShell'
import { Toaster } from '@/components/ui/toaster'
import { preloadGeoJson } from '@/shared/lib/geoJsonLoader'
import { GEO_URL } from '@/shared/constants/geo'
import { ProtectedRoute } from '@features/auth/ProtectedRoute'

// Enable MSW only when VITE_DEMO_MODE is explicitly set to 'true'
if (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true') {
  import('@shared/mocks/browser').then(({ worker }) => {
    worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    });
  });
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <AppShell><DashboardPage /></AppShell> },
  { path: '/region/:code', element: <AppShell><RegionPage /></AppShell> },
  { 
    path: '/analytics', 
    element: <AppShell><AnalyticsPage /></AppShell>
  },
  { 
    path: '/uploads', 
    element: (
      <ProtectedRoute roles={['operator', 'analyst', 'admin']}>
        <AppShell><UploadsPage /></AppShell>
      </ProtectedRoute>
    )
  },
  { 
    path: '/admin', 
    element: (
      <ProtectedRoute roles={['admin']}>
        <AppShell><AdminPage /></AppShell>
      </ProtectedRoute>
    )
  },
  { 
    path: '/admin/builder', 
    element: (
      <ProtectedRoute roles={['admin']}>
        <AppShell><RatingBuilder /></AppShell>
      </ProtectedRoute>
    )
  },
])


preloadGeoJson(GEO_URL);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster />
    </Provider>
  </React.StrictMode>
)
