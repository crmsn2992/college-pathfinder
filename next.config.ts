const nextConfig = {
  reactStrictMode: true,
  // appDir may not be present in the installed Next.js type definitions in some environments
  // so avoid strict typing here to prevent TypeScript build errors on Vercel.
  appDir: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
