import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getToken, login as apiLogin, register as apiRegister, fetchMe, logout as apiLogout } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: check if we have a valid token
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    fetchMe()
      .then(u => setUser(u))
      .catch(() => apiLogout())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await apiLogin(email, password)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email, username, password) => {
    const u = await apiRegister(email, username, password)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
  }, [])

  const isLoggedIn = !!user

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
