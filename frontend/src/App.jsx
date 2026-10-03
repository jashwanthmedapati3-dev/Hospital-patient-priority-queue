import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import { useTheme } from './context/ThemeContext.jsx'
import {
  Activity, Users, Clock, BarChart3, History,
  Bot, Binary, LogOut, Sun, Moon, Menu,
  UserPlus, Settings, Bell, ChevronRight,
  ShieldCheck, Stethoscope, CheckCircle2, ChevronDown
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getInitials } from './utils/helpers.js'
import api from './utils/api.js'

import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import QueuePage from './pages/QueuePage.jsx'
import PatientsPage from './pages/PatientsPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import HeapVisualizerPage from './pages/HeapVisualizerPage.jsx'
import AIAssistantPage from './pages/AIAssistantPage.jsx'

import PatientModal from './components/PatientModal.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import ManagePhysiciansModal from './components/ManagePhysiciansModal.jsx'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [queueCount, setQueueCount] = useState(6)
  const [currentTimeStr, setCurrentTimeStr] = useState('')
  const [doctorsList, setDoctorsList] = useState([])

  // Live ticking date/time matching screenshot format: Sat, Oct 3, 2026, 12:57:52 PM
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ', ' + now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
      setCurrentTimeStr(formatted)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Sync queue count & doctors for sidebar badge & modals
  useEffect(() => {
    const fetchQueueCount = async () => {
      try {
        const [qRes, docRes] = await Promise.all([
          api.get('/queue'),
          api.get('/doctors').catch(() => ({ data: { doctors: [] } }))
        ])
        if (qRes.data?.queue) {
          setQueueCount(qRes.data.queue.length)
        }
        if (docRes.data?.doctors?.length) {
          setDoctorsList(docRes.data.doctors)
        }
      } catch (err) {
        // use fallback count
      }
    }
    fetchQueueCount()
    const interval = setInterval(fetchQueueCount, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleRegisterPatient = async (patientData) => {
    try {
      await api.post('/patients', patientData)
      setShowRegisterModal(false)
      window.dispatchEvent(new CustomEvent('refresh-er-data'))
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleDocStatus = async (docId) => {
    try {
      const res = await api.post(`/doctors/${docId}/toggle`)
      if (res.data?.doctors) {
        setDoctorsList(res.data.doctors)
      } else {
        setDoctorsList(prev => prev.map(d => (d.id === docId || d.name === docId) ? { ...d, status: d.status === 'Available' ? 'Busy' : 'Available' } : d))
      }
      window.dispatchEvent(new CustomEvent('refresh-er-data'))
    } catch (e) {
      setDoctorsList(prev => prev.map(d => (d.id === docId || d.name === docId) ? { ...d, status: d.status === 'Available' ? 'Busy' : 'Available' } : d))
    }
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Activity, exact: true },
    {
      label: 'Patient Registration',
      icon: UserPlus,
      action: () => setShowRegisterModal(true),
    },
    { path: '/queue', label: 'Emergency Queue', icon: Clock, badge: queueCount },
    { path: '/history', label: 'Queue History', icon: History },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/assistant', label: 'AI Queue Assistant', icon: Bot },
    {
      label: 'Staff & Doctors',
      icon: Users,
      action: () => setShowStaffModal(true),
    },
    { path: '/visualizer', label: 'Heap Visualizer', icon: Binary },
    {
      label: 'Settings',
      icon: Settings,
      action: () => setShowSettingsModal(true),
    },
  ]

  return (
    <div className="trauma-app-wrapper">
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <header className="trauma-top-header">
        <div className="top-header-left">
          {/* Mobile menu toggle */}
          <button
            className="btn btn-icon btn-ghost mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>

          {/* Red squircle logo */}
          <div className="trauma-brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>

          <div className="trauma-brand-info">
            <div className="trauma-title-row">
              <span className="trauma-title-text">Metro General Trauma Center</span>
              <span className="trauma-level-badge">Trauma Level I</span>
            </div>
            <div className="trauma-subtitle-text">
              Emergency Department Patient Priority Queue System (Binary Max Heap Engine)
            </div>
          </div>
        </div>

        <div className="top-header-right">
          {/* Live Date/Time Pill */}
          <div className="header-clock-pill">
            {currentTimeStr || 'Sat, Oct 3, 2026, 12:57:52 PM'}
          </div>

          {/* Notification Bell */}
          <div className="header-icon-btn notification-wrapper" title="Queue Notifications">
            <Bell size={18} />
            <span className="notification-red-dot" />
          </div>

          {/* Theme Toggle */}
          <button
            className="header-icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Profile */}
          <div className="header-user-profile">
            <div className="header-user-avatar">
              {getInitials(user?.full_name || 'Dr. Marcus Chen') || 'D'}
            </div>
            <div className="header-user-details">
              <span className="header-user-name">{user?.full_name || 'Dr. Marcus Chen'}</span>
              <span className="header-user-role-badge">
                <Stethoscope size={11} /> DOCTOR
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main App Layout (Sidebar + Content) ────────────────────── */}
      <div className="trauma-body-layout">
        {/* Left Sidebar */}
        <aside className={`trauma-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="trauma-nav-list">
            {navItems.map((item, idx) => {
              const isActive = item.path ? (item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)) : false

              if (item.action) {
                return (
                  <button
                    key={idx}
                    className="trauma-nav-btn"
                    onClick={() => {
                      item.action()
                      setSidebarOpen(false)
                    }}
                  >
                    <item.icon className="nav-btn-icon" size={18} />
                    <span className="nav-btn-label">{item.label}</span>
                  </button>
                )
              }

              return (
                <button
                  key={idx}
                  className={`trauma-nav-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    navigate(item.path)
                    setSidebarOpen(false)
                  }}
                >
                  <item.icon className="nav-btn-icon" size={18} />
                  <span className="nav-btn-label">{item.label}</span>

                  {item.badge !== undefined && (
                    <span className="nav-count-badge">
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <ChevronRight size={16} className="nav-chevron-active" />
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Page Content */}
        <main className="trauma-main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/visualizer" element={<HeapVisualizerPage />} />
            <Route path="/assistant" element={<AIAssistantPage />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      {showRegisterModal && (
        <PatientModal
          onClose={() => setShowRegisterModal(false)}
          onSubmit={handleRegisterPatient}
        />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {showStaffModal && (
        <ManagePhysiciansModal
          doctors={doctorsList}
          onToggleStatus={handleToggleDocStatus}
          onClose={() => setShowStaffModal(false)}
        />
      )}
    </div>
  )
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
