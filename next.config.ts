import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.2', '192.168.1.2:3000', '10.5.211.204', '10.5.211.204:3000', 'localhost:3000', '127.0.0.1:3000'],
};

export default nextConfig;
