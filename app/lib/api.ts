// Next.jsのAPIルートを使用してプロキシを回避
const API_BASE_URL = '/api'

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token')
  const tokenType = localStorage.getItem('token_type') || 'Bearer'
  
  const headers = {
    ...options.headers,
    ...(token && { 'Authorization': `${tokenType} ${token}` })
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'ログインに失敗しました' }))
    throw new Error(error.detail || 'ログインに失敗しました')
  }

  return response.json()
}

export async function getMe() {
  const response = await fetchWithAuth(`${API_BASE_URL}/auth/me`)
  
  if (!response.ok) {
    throw new Error('ユーザー情報の取得に失敗しました')
  }
  
  return response.json()
}