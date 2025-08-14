'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { login as apiLogin, getMe } from '../lib/api'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const userData = await getMe()
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.username || userData.email,
        role: userData.role
      })
    } catch (error) {
      console.error('Auth check error:', error)
      localStorage.removeItem('access_token')
      localStorage.removeItem('token_type')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const data = await apiLogin(email, password)
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('token_type', data.token_type)
      
      // ユーザー情報を取得
      const userData = await getMe()
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.username || userData.email,
        role: userData.role
      })
      
      router.push('/')
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('token_type')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}