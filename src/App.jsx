import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { SoundProvider } from './context/SoundContext'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import AdventurePage from './pages/AdventurePage'
import CharacterPage from './pages/CharacterPage'
import GamePage from './pages/GamePage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
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
