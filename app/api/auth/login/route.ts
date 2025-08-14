import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { fetchBackend } from '@/app/lib/fetch-with-proxy'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { detail: 'メールアドレスとパスワードが必要です' },
        { status: 400 }
      )
    }

    // バックエンドのAPIにリクエストを転送
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    console.log('Attempting login for:', email)

    const response = await fetchBackend('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Login failed:', response.status, data)
      return NextResponse.json(
        { detail: data.detail || '認証に失敗しました' },
        { status: response.status }
      )
    }

    console.log('Login successful for:', email)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { detail: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}