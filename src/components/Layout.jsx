import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on navigation (mobile)
  React.useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded bg-dungeon-200/90 border border-gold-700/30 text-gold-500"
        aria-label="Menü öffnen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-auto w-full">
        <div className="min-h-screen p-6 pt-16 lg:pt-6 lg:p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
