import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const session = authService.loadSession()
    if (session?.user) setUser(session.user)
    setInitializing(false)
  }, [])

  const login = useCallback(async (username, password, remember) => {
    const session = await authService.login(username, password)
    authService.persistSession(session, remember)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(() => {
    authService.clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), initializing, login, logout }),
    [user, initializing, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
