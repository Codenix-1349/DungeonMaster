import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  getToken, login as apiLogin, register as apiRegister, fetchMe, logout as apiLogout,
  verifyEmail as apiVerifyEmail, resendVerification as apiResendVerification,
  devLogin as apiDevLogin,
} from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: check if we have a valid token, or try dev auto-login
  useEffect(() => {
    const token = getToken()
    if (token) {
      fetchMe()
        .then(u => setUser(u))
        .catch(() => apiLogout())
        .finally(() => setLoading(false))
      return
    }

    // Try dev auto-login (endpoint only exists when DEV_AUTO_LOGIN is set)
    apiDevLogin()
      .then(u => setUser(u))
      .catch(() => { /* dev-login not available — normal login flow */ })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await apiLogin(email, password)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email, username, password) => {
    const u = await apiRegister(email, username, password)
    // Don't set user — email must be verified before login
    apiLogout() // clear the token from register response
    return u
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
  }, [])

  const verifyEmail = useCallback(async (token) => {
    const result = await apiVerifyEmail(token)
    // Update local user state
    setUser(prev => prev ? { ...prev, emailVerified: true } : prev)
    return result
  }, [])

  const resendVerification = useCallback(async () => {
    return apiResendVerification()
  }, [])

  const isLoggedIn = !!user

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn, loading,
      login, register, logout,
      verifyEmail, resendVerification,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
