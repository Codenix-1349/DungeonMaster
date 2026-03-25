import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { GameProvider } from './context/GameContext'
import { SoundProvider } from './context/SoundContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdventurePage from './pages/AdventurePage'
import CharacterPage from './pages/CharacterPage'
import GamePage from './pages/GamePage'
import SettingsPage from './pages/SettingsPage'

function AppRoutes() {
  const { isLoggedIn, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!isLoggedIn) return <LoginPage />

  return (
    <GameProvider>
      <SoundProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/adventure" element={<AdventurePage />} />
              <Route path="/character" element={<CharacterPage />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </SoundProvider>
    </GameProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
