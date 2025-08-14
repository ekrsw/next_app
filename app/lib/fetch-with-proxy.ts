import { HttpsProxyAgent } from 'https-proxy-agent';

// プロキシ設定を環境に応じて取得
function getProxyAgent() {
  // サーバーサイドでのみプロキシを使用
  if (typeof window === 'undefined') {
    const proxyUrl = process.env.HTTP_PROXY || process.env.http_proxy;
    
    if (proxyUrl) {
      console.log('Using proxy:', proxyUrl.replace(/:[^:@]*@/, ':***@')); // パスワードを隠す
      return new HttpsProxyAgent(proxyUrl);
    }
  }
  
  return undefined;
}

// バックエンドAPIへのfetch関数
export async function fetchBackend(path: string, options: RequestInit = {}) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const url = `${backendUrl}${path}`;
  
  // サーバーサイドでプロキシエージェントを使用
  const agent = getProxyAgent();
  
  const fetchOptions: any = {
    ...options,
    // Node.jsでのみagentオプションを追加
    ...(agent && typeof window === 'undefined' ? { agent } : {})
  };
  
  // ローカルホストへの接続の場合はプロキシを使用しない
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  if (isLocalhost && agent) {
    delete fetchOptions.agent;
  }
  
  try {
    const response = await fetch(url, fetchOptions);
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}