import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="min-h-screen p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
