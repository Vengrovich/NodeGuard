import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import { useSocket } from './hooks/useSocket'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

function RequireAuth({ children }) {
  const token = useStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  useSocket()
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<RequireAuth><DashboardPage /></RequireAuth>} />
    </Routes>
  )
}
