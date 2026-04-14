import { getApiUrl } from './config';
import { getAccessToken } from './auth';

/**
 * 构建文件下载/预览的完整 URL
 * 后端下载接口: GET /api/conversations/{conversationId}/files/download?path={path}
 */
export function getFileDownloadUrl(conversationId: string, filePath: string): string {
  return getApiUrl(`/api/conversations/${conversationId}/files/download?path=${encodeURIComponent(filePath)}`);
}

/**
 * 带认证的文件下载（通过后端代理）
 */
export async function downloadFileWithAuth(conversationId: string, filePath: string, fileName: string): Promise<void> {
  const res = await authFetch(getFileDownloadUrl(conversationId, filePath));

  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

/**
 * 带认证的文件内容读取（返回文本）
 */
export async function fetchFileContent(conversationId: string, filePath: string): Promise<string> {
  const res = await authFetch(getFileDownloadUrl(conversationId, filePath));

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }

  return res.text();
}

/**
 * 带认证的文件内容读取（返回 blob URL，用于图片/PDF 等二进制预览）
 */
export async function fetchFileBlobUrl(conversationId: string, filePath: string): Promise<string> {
  const res = await authFetch(getFileDownloadUrl(conversationId, filePath));

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * 带认证的文件删除
 * 后端接口: DELETE /api/conversations/{conversationId}/files/delete?path={path}
 */
export async function deleteFileWithAuth(conversationId: string, filePath: string): Promise<void> {
  const url = getApiUrl(`/api/conversations/${conversationId}/files/delete?path=${encodeURIComponent(filePath)}`);
  const res = await authFetch(url, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status}`);
  }
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  return fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
}
