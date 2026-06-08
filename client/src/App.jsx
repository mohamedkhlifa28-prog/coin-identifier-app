import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/Layout/AppShell'

// Auth pages
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// Legal pages (public)
import PrivacyPolicy from './pages/Legal/PrivacyPolicy'
import TermsOfService from './pages/Legal/TermsOfService'

// Protected pages
import ScanScreen from './pages/Scan/ScanScreen'
import ResultSheet from './pages/Scan/ResultSheet'
import CollectionGrid from './pages/Collection/CollectionGrid'
import CoinDetail from './pages/Collection/CoinDetail'
import MarketplaceBrowse from './pages/Marketplace/MarketplaceBrowse'
import CreateListing from './pages/Marketplace/CreateListing'
import ListingDetail from './pages/Marketplace/ListingDetail'
import CommunityFeed from './pages/Community/CommunityFeed'
import ProfilePage from './pages/Profile/ProfilePage'
import MessagesPage from './pages/Messages/MessagesPage'
import CRHPage from './pages/CRH/CRHPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#D4A017] border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm font-body">Loading CoinVault...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return children
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#D4A017] border-t-transparent animate-spin" />
      </div>
    )
  }

  return <Navigate to={isAuthenticated ? '/scan' : '/auth/login'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth routes */}
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />

      {/* Public legal routes */}
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* Protected routes wrapped in AppShell */}
      <Route
        path="/scan"
        element={
          <ProtectedRoute>
            <AppShell>
              <ScanScreen />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan/result"
        element={
          <ProtectedRoute>
            <AppShell>
              <ResultSheet />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/collection"
        element={
          <ProtectedRoute>
            <AppShell>
              <CollectionGrid />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/collection/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <CoinDetail />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketplace"
        element={
          <ProtectedRoute>
            <AppShell>
              <MarketplaceBrowse />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketplace/create"
        element={
          <ProtectedRoute>
            <AppShell>
              <CreateListing />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketplace/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <ListingDetail />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <AppShell>
              <CommunityFeed />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <ProfilePage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <AppShell>
              <MessagesPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages/:userId"
        element={
          <ProtectedRoute>
            <AppShell>
              <MessagesPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/crh"
        element={
          <ProtectedRoute>
            <AppShell>
              <CRHPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
