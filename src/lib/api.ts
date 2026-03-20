import { getAccessToken, refreshAccessToken } from './auth';
import { toast } from '@/components/ui/Toast';
import { getApiUrl } from './config';

export async function apiFetch(path: string, options: RequestInit = {}) {
  let token = getAccessToken();
  const url = getApiUrl(path);

  try {
    let res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    // accessToken 过期 → 自动刷新 → 重试一次
    if (res.status === 401) {
      token = await refreshAccessToken();
      if (!token) {
        toast.error('登录已过期，请重新登录');
        window.location.href = '/login';
        return res;
      }

      res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
    }

    if (!res.ok && res.status !== 401) {
      toast.error(`请求失败: ${res.status}`);
    }

    return res;
  } catch (error) {
    toast.error('网络连接失败，请检查网络设置');
    throw error;
  }
}
