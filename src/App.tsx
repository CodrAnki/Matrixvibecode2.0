import { lazy, Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import DashboardLayout from './components/DashboardLayout'
import AdminLayout from './admin/AdminLayout'
import ErrorBoundary from './components/ErrorBoundary'
import SimulationBar from './components/SimulationBar'
import DevCredits from './components/DevCredits'
import { scrollToSection, scrollToTarget, startSmoothScroll, stopSmoothScroll } from './lib/smoothScroll'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MyTeam = lazy(() => import('./pages/MyTeam'))
const TeamQr = lazy(() => import('./pages/TeamQr'))
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'))
const Announcements = lazy(() => import('./pages/Announcements'))
const DashboardSupport = lazy(() => import('./pages/DashboardSupport'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Problems = lazy(() => import('./pages/Problems'))
const Support = lazy(() => import('./pages/Support'))

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
const AdminEventDay = lazy(() => import('./admin/pages/AdminEventDay'))

/**
 * Scrolls on every navigation. Keyed on `location.key`, not just pathname/hash: clicking "About"
 * a second time produces the same URL, and without the key the effect wouldn't re-run, so the
 * page would stay wherever the user had scrolled to.
 */
function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  const prevPath = useRef<string | null>(null)

  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual'
    const firstLoad = prevPath.current === null
    const samePage = prevPath.current === pathname
    prevPath.current = pathname

    // A browser refresh on the home page starts at the top instead of restoring a stale #hash.
    // Only on the first load: the navigation entry keeps reporting "reload" for the rest of the
    // visit, and checking it on later clicks would swallow every in-page link.
    if (firstLoad) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (pathname === '/' && navigation?.type === 'reload') {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
        scrollToTarget(0, true)
        return
      }
    }

    if (!hash) {
      // Same page (e.g. "Home" while already home) glides up; a new page starts at the top.
      scrollToTarget(0, !samePage)
      return
    }

    const find = () => document.getElementById(decodeURIComponent(hash.slice(1)))
    const now = find()
    if (now) {
      scrollToSection(now)
      return
    }
    // Target not mounted yet (arriving from another page while Home's chunk loads).
    let tries = 0
    const t = window.setInterval(() => {
      const el = find()
      if (el) { window.clearInterval(t); scrollToSection(el) }
      else if (++tries > 50) window.clearInterval(t)
    }, 100)
    return () => window.clearInterval(t)
  }, [pathname, hash, key])
  return null
}

/** Smooth wheel scrolling everywhere except the admin panel, which stays plain native scrolling. */
function SmoothScroll() {
  const admin = useLocation().pathname.startsWith('/admin')
  useEffect(() => {
    if (admin) return
    startSmoothScroll()
    return stopSmoothScroll
  }, [admin])
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
        <p className="hud-label mb-4">Initializing Matrix</p>
        <div className="loader-bar h-px w-full" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <SmoothScroll />
          <ScrollManager />
          <SimulationBar />
          <DevCredits />
          <RouteBoundary>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/problems" element={<Problems />} />
              <Route path="/support" element={<Support />} />
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/team" element={<MyTeam />} />
                <Route path="/dashboard/qr" element={<TeamQr />} />
                <Route path="/dashboard/workflow" element={<WorkflowPage />} />
                <Route path="/dashboard/announcements" element={<Announcements />} />
                <Route path="/dashboard/support" element={<DashboardSupport />} />
                <Route path="/dashboard/profile" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/teams" element={<AdminTeams />} />
                <Route path="/admin/teams/deleted" element={<AdminDeletedTeams />} />
                <Route path="/admin/teams/:teamId" element={<AdminTeamDetail />} />
                <Route path="/admin/problems" element={<AdminProblems />} />
                <Route path="/admin/event-day" element={<AdminEventDay />} />
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
  )
}
