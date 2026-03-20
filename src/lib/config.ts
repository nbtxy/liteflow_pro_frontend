export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function getApiUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }
  
  const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const targetPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${basePath}${targetPath}`;
}
