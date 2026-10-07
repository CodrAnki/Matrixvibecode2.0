import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import DashboardLayout from './components/DashboardLayout'
import AdminLayout from './admin/AdminLayout'
import ErrorBoundary from './components/ErrorBoundary'
import { scrollToTarget } from './lib/smoothScroll'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MyTeam = lazy(() => import('./pages/MyTeam'))
const TeamQr = lazy(() => import('./pages/TeamQr'))
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'))
const Announcements = lazy(() => import('./pages/Announcements'))
const NotFound = lazy(() => import('./pages/NotFound'))

const AdminLogin = lazy(() => import('./admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'))
const AdminTeams = lazy(() => import('./admin/pages/AdminTeams'))
const AdminDeletedTeams = lazy(() => import('./admin/pages/AdminDeletedTeams'))
const AdminTeamDetail = lazy(() => import('./admin/pages/AdminTeamDetail'))
const AdminProblems = lazy(() => import('./admin/pages/AdminProblems'))
const AdminAnnouncements = lazy(() => import('./admin/pages/AdminAnnouncements'))
const AdminCheckins = lazy(() => import('./admin/pages/AdminCheckins'))
const AdminAccounts = lazy(() => import('./admin/pages/AdminAccounts'))
const AdminSettings = lazy(() => import('./admin/pages/AdminSettings'))

function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return }
    let tries = 0
    const t = window.setInterval(() => {
      const el = document.querySelector(hash)
      if (el) { scrollToTarget(el); window.clearInterval(t) }
      else if (++tries > 20) window.clearInterval(t)
    }, 100)
    return () => window.clearInterval(t)
  }, [pathname, hash, key])
  return null
}

/** Clears a page-level error when the user navigates elsewhere. Sits OUTSIDE Suspense so a failed lazy chunk load is caught too. */
function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}

function Loader() {
  return (
    <div className="grid min-h-[100svh] place-items-center bg-void">
      <div className="w-56 text-center">
        <p className="hud-label mb-4">Loading</p>
        <div className="loader-bar h-px w-full" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <ScrollManager />
          <RouteBoundary>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/team" element={<MyTeam />} />
                <Route path="/dashboard/qr" element={<TeamQr />} />
                <Route path="/dashboard/workflow" element={<WorkflowPage />} />
                <Route path="/dashboard/announcements" element={<Announcements />} />
                <Route path="/dashboard/profile" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/teams" element={<AdminTeams />} />
                <Route path="/admin/teams/deleted" element={<AdminDeletedTeams />} />
                <Route path="/admin/teams/:teamId" element={<AdminTeamDetail />} />
                <Route path="/admin/problems" element={<AdminProblems />} />
                <Route path="/admin/announcements" element={<AdminAnnouncements />} />
                <Route path="/admin/checkins" element={<AdminCheckins />} />
                <Route path="/admin/accounts" element={<AdminAccounts />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
              </Route>

              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </RouteBoundary>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
    </MotionConfig>
  )
}
