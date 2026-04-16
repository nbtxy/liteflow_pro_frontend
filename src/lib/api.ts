import { getAccessToken, refreshAccessToken } from './auth';
import { toast } from '@/components/ui/Toast';
import { getApiUrl } from './config';

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
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
      const refreshed = await refreshAccessToken();
      token = refreshed.accessToken;
      if (!token) {
        if (refreshed.status === 'invalid') {
          toast.error('登录已过期，请重新登录');
          window.location.href = '/login';
          throw new Error('Unauthorized');
        }
        toast.error('登录状态刷新失败，请稍后重试');
        throw new Error('RefreshUnavailable');
      }

      res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (res.status === 401) {
        toast.error('登录已过期，请重新登录');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
    }

    if (!res.ok) {
      toast.error(`请求失败: ${res.status}`);
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const json = await res.json();
    if (json.code !== 200) {
      toast.error(json.message || '请求失败');
      throw new Error(json.message || '请求失败');
    }

    return json.data;
  } catch (error) {
    if (error instanceof Error && error.message !== 'Unauthorized' && !error.message.startsWith('HTTP') && !error.message.startsWith('请求')) {
      toast.error('网络连接失败，请检查网络设置');
    }
    throw error;
  }
}
