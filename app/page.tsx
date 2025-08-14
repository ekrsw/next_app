'use client'

import Link from "next/link";
import { useAuth } from "./contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Knowledge System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {user.name} ({user.role === 'admin' ? '管理者' : '一般ユーザー'})
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow px-6 py-8">
            <h2 className="text-2xl font-bold mb-6">ダッシュボード</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">ユーザー情報</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">ID:</dt>
                    <dd className="font-mono text-sm">{user.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">名前:</dt>
                    <dd>{user.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">メール:</dt>
                    <dd>{user.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">役割:</dt>
                    <dd>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? '管理者' : '一般ユーザー'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">クイックアクション</h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-left">
                    修正案を作成
                  </button>
                  <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-left">
                    承認待ち一覧
                  </button>
                  {user.role === 'admin' && (
                    <button className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-left">
                      システム管理
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">最近の活動</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-600">まだ活動はありません</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
