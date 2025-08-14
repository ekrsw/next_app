import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { fetchBackend } from '@/app/lib/fetch-with-proxy'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { detail: '認証が必要です' },
        { status: 401 }
      )
    }

    // バックエンドのAPIにリクエストを転送
    const response = await fetchBackend('/api/v1/auth/me', {
      headers: {
        'Authorization': authHeader
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail || 'トークンが無効です' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { detail: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}