import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI, userAPI } from '../api/client'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('coinvault_token'))
  const [isLoading, setIsLoading] = useState(true)
  const [xpPopup, setXpPopup] = useState({ show: false, amount: 0, reason: '' })

  const isAuthenticated = !!user

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('coinvault_token')
    if (savedToken) {
      userAPI.getProfile()
        .then((res) => {
          setUser(res.data.user || res.data)
          setToken(savedToken)
        })
        .catch(() => {
          localStorage.removeItem('coinvault_token')
          setToken(null)
          setUser(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password)
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('coinvault_token', newToken)
    setToken(newToken)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (email, password, name) => {
    const res = await authAPI.register(email, password, name)
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('coinvault_token', newToken)
    setToken(newToken)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('coinvault_token')
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((userData) => {
    setUser((prev) => ({ ...prev, ...userData }))
  }, [])

  const showXP = useCallback((amount, reason) => {
    setXpPopup({ show: true, amount, reason })
  }, [])

  const hideXP = useCallback(() => {
    setXpPopup({ show: false, amount: 0, reason: '' })
  }, [])

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    showXP,
    hideXP,
    xpPopup,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
