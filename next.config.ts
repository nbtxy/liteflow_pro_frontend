import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // =====================================================================
  // 当需要对接真实的 Java 后端时，可以通过下面配置将前端 /api 的请求代理过去
  // 这样能避免本地开发时的跨域问题。启用时请把前面的注释解开即可。
  // =====================================================================
  /*
  async rewrites() {
    return [
      {
        // 匹配所有 /api/ 开头的请求
        source: '/api/:path*',
        // 代理到 Java 后端地址 (根据实际情况修改端口和路径)
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
  */
};

export default nextConfig;
