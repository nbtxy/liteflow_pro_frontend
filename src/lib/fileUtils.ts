import OSS from 'ali-oss';
import { getApiUrl } from './config';
import { getAccessToken } from './auth';

/**
 * 获取 STS Token
 */
export async function getStsToken(conversationId: string): Promise<any> {
  let token = getAccessToken();
  try {
    const url = `/api/oss/sts?conversationId=${conversationId}`;
    let stsRes = await fetch(getApiUrl(url), {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (stsRes.status === 401) {
      const { refreshAccessToken } = await import('@/lib/auth');
      token = await refreshAccessToken();
      if (token) {
        stsRes = await fetch(getApiUrl(url), {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        throw new Error('Unauthorized');
      }
    }

    if (stsRes.ok) {
      const json = await stsRes.json();
      if (json.code === 200 && json.data?.accessKeyId) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch STS token', err);
  }
  return null;
}

/**
 * 构建文件下载/预览的完整 URL
 * 后端下载接口: GET /api/conversations/{conversationId}/files/download?path={path}
 */
export function getFileDownloadUrl(conversationId: string, filePath: string): string {
  return getApiUrl(`/api/conversations/${conversationId}/files/download?path=${encodeURIComponent(filePath)}`);
}

/**
 * 根据 STS Token 初始化 OSS Client
 */
export function getOssClient(stsToken: any, conversationId: string): OSS {
  return new OSS({
    region: stsToken.region.startsWith('oss-') ? stsToken.region : `oss-${stsToken.region}`,
    accessKeyId: stsToken.accessKeyId,
    accessKeySecret: stsToken.accessKeySecret,
    stsToken: stsToken.securityToken,
    bucket: stsToken.bucket,
    secure: true,
    refreshSTSToken: async () => {
      const newToken = await getStsToken(conversationId);
      if (newToken) {
        return {
          accessKeyId: newToken.accessKeyId,
          accessKeySecret: newToken.accessKeySecret,
          stsToken: newToken.securityToken
        };
      }
      throw new Error('Failed to refresh STS token');
    },
    refreshSTSTokenInterval: 300000 // 5 minutes
  });
}

/**
 * 带认证的文件下载（通过 fetch + blob 或 STS SDK signatureUrl）
 */
export async function downloadFileWithAuth(conversationId: string, filePath: string, fileName: string): Promise<void> {
  const token = getAccessToken();

  // Try STS first
  const stsToken = await getStsToken(conversationId);
  if (stsToken) {
    try {
        const client = getOssClient(stsToken, conversationId);
        const objectKey = `conversations/${conversationId}/${filePath}`;
        const url = client.signatureUrl(objectKey, {
        response: {
          'content-disposition': `attachment; filename=${encodeURIComponent(fileName)}`
        }
      });
      
      const fileRes = await fetch(url);
      const blob = await fileRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(blobUrl);
      return;
    } catch (err) {
      console.warn('Failed to download via STS token, falling back to proxy', err);
    }
  }

  // Try to get presigned URL first (Fallback 1)
  try {
    const presignedRes = await fetch(
      getApiUrl(`/api/conversations/${conversationId}/files/presigned-url?path=${encodeURIComponent(filePath)}&method=GET`),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (presignedRes.ok) {
      const json = await presignedRes.json();
      if (json.code === 200 && json.data?.url) {
        // Since cross-origin download might be blocked or open in a new tab instead of downloading,
        // we can fetch the blob and then download it.
        const fileRes = await fetch(json.data.url);
        const blob = await fileRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(blobUrl);
        return;
      }
    }
  } catch (err) {
    console.warn('Failed to download via presigned URL, falling back to proxy', err);
  }

  // Fallback to proxy
  const url = getFileDownloadUrl(conversationId, filePath);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

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
  const token = getAccessToken();

  // Try STS first
  const stsToken = await getStsToken(conversationId);
  if (stsToken) {
      try {
        const client = getOssClient(stsToken, conversationId);
        const objectKey = `conversations/${conversationId}/${filePath}`;
        const url = client.signatureUrl(objectKey);
      const fileRes = await fetch(url);
      return await fileRes.text();
    } catch (err) {
      console.warn('Failed to fetch content via STS token, falling back to proxy', err);
    }
  }

  try {
    const presignedRes = await fetch(
      getApiUrl(`/api/conversations/${conversationId}/files/presigned-url?path=${encodeURIComponent(filePath)}&method=GET`),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (presignedRes.ok) {
      const json = await presignedRes.json();
      if (json.code === 200 && json.data?.url) {
        const fileRes = await fetch(json.data.url);
        return fileRes.text();
      }
    }
  } catch (err) {
    console.warn('Failed to fetch content via presigned URL, falling back to proxy', err);
  }

  const url = getFileDownloadUrl(conversationId, filePath);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`);
  }

  return res.text();
}

/**
 * 带认证的文件内容读取（返回 blob URL，用于图片/PDF 等二进制预览）
 */
export async function fetchFileBlobUrl(conversationId: string, filePath: string): Promise<string> {
  const token = getAccessToken();

  // Try STS first
  const stsToken = await getStsToken(conversationId);
  if (stsToken) {
      try {
        const client = getOssClient(stsToken, conversationId);
        const objectKey = `conversations/${conversationId}/${filePath}`;
        return client.signatureUrl(objectKey);
    } catch (err) {
      console.warn('Failed to fetch blob url via STS token, falling back to proxy', err);
    }
  }

  try {
    const presignedRes = await fetch(
      getApiUrl(`/api/conversations/${conversationId}/files/presigned-url?path=${encodeURIComponent(filePath)}&method=GET`),
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (presignedRes.ok) {
      const json = await presignedRes.json();
      if (json.code === 200 && json.data?.url) {
        return json.data.url;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch blob url via presigned URL, falling back to proxy', err);
  }

  const url = getFileDownloadUrl(conversationId, filePath);
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

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
  const token = getAccessToken();

  const res = await fetch(url, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status}`);
  }
}
