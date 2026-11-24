/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const upstream = (process.env.API_UPSTREAM_ORIGIN || "http://127.0.0.1:8080").replace(/\/+$/, "");
    return [
      { source: "/api/v1/:path*", destination: `${upstream}/api/v1/:path*` },
      { source: "/uploads/:path*", destination: `${upstream}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
