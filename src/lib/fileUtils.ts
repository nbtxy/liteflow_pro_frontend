import { getApiUrl } from './config';
import { getAccessToken } from './auth';
import { apiFetch } from './api';
import OSS from 'ali-oss';
import {
  acquireBlobUrl as cacheAcquireBlobUrl,
  getText as cacheGetText,
  invalidate as cacheInvalidate,
  type BlobUrlHandle,
} from './filePreviewCache';

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
 * 带认证的文件内容读取（返回文本，走两级缓存）
 */
export async function fetchFileContent(conversationId: string, filePath: string): Promise<string> {
  return cacheGetText(conversationId, filePath);
}

/**
 * 带认证的文件内容读取（返回 blob URL handle，用于图片/PDF 等二进制预览）
 * 调用方在不再使用时必须调 handle.release() 以释放该 URL。Blob 本身仍由缓存持有。
 */
export async function fetchFileBlobUrl(
  conversationId: string,
  filePath: string,
): Promise<BlobUrlHandle> {
  return cacheAcquireBlobUrl(conversationId, filePath);
}

interface ThumbnailMemoEntry {
  url: string;
  expiresAt: number;
}
const thumbnailMemo = new Map<string, ThumbnailMemoEntry>();
const THUMBNAIL_TTL_MS = 9 * 60 * 1000;

export async function fetchFileThumbnailSignedUrl(
  conversationId: string,
  filePath: string,
  width = 160,
  height = 160
): Promise<string> {
  const memoKey = `${conversationId}::${filePath}::${width}x${height}`;
  const cached = thumbnailMemo.get(memoKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  const query = `path=${encodeURIComponent(filePath)}&w=${width}&h=${height}`;
  const data = await apiFetch<{ url?: string }>(`/api/conversations/${conversationId}/files/thumbnail-url?${query}`);
  if (!data?.url) {
    throw new Error('Thumbnail URL is empty');
  }
  thumbnailMemo.set(memoKey, { url: data.url, expiresAt: Date.now() + THUMBNAIL_TTL_MS });
  return data.url;
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

  await cacheInvalidate(conversationId, filePath);
  for (const [k] of thumbnailMemo) {
    if (k.startsWith(`${conversationId}::${filePath}::`)) {
      thumbnailMemo.delete(k);
    }
  }
}

interface UploadSTSResponse {
  region: string;
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  objectKey: string;
  path: string;
  expiration?: string;
}

interface UploadCompleteResponse {
  path?: string;
}

export interface UploadConversationFileParams {
  conversationId: string;
  file: File;
  onProgress?: (percent: number) => void;
}

export interface UploadConversationFileResult {
  path: string;
  objectKey: string;
}

export async function uploadConversationFile(params: UploadConversationFileParams): Promise<UploadConversationFileResult> {
  const { conversationId, file, onProgress } = params;
  const sts = await apiFetch<UploadSTSResponse>(`/api/conversations/${conversationId}/files/sts`, {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name }),
  });

  const refreshSTSToken = async () => {
    const refreshed = await apiFetch<UploadSTSResponse>(`/api/conversations/${conversationId}/files/sts`, {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, path: sts.path }),
    });
    return {
      accessKeyId: refreshed.accessKeyId,
      accessKeySecret: refreshed.accessKeySecret,
      stsToken: refreshed.securityToken,
    };
  };

  const client = new OSS({
    region: sts.region,
    endpoint: sts.endpoint,
    bucket: sts.bucket,
    accessKeyId: sts.accessKeyId,
    accessKeySecret: sts.accessKeySecret,
    stsToken: sts.securityToken,
    secure: true,
    refreshSTSToken,
    refreshSTSTokenInterval: calcSTSRefreshInterval(sts.expiration),
  });

  await client.multipartUpload(sts.objectKey, file, {
    progress: (p: number) => {
      if (onProgress) {
        onProgress(Math.max(1, Math.min(99, Math.round(p * 100))));
      }
    },
  });

  const complete = await apiFetch<UploadCompleteResponse>(`/api/conversations/${conversationId}/files/complete`, {
    method: 'POST',
    body: JSON.stringify({
      path: sts.path,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    }),
  });

  return {
    path: complete?.path || sts.path,
    objectKey: sts.objectKey,
  };
}

function calcSTSRefreshInterval(expiration?: string): number {
  if (!expiration) {
    return 10 * 60 * 1000;
  }
  const expireAt = Date.parse(expiration);
  if (!Number.isFinite(expireAt)) {
    return 10 * 60 * 1000;
  }
  const now = Date.now();
  const ms = expireAt - now - 2 * 60 * 1000;
  if (ms < 30 * 1000) {
    return 30 * 1000;
  }
  return ms;
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
