/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
        return [
          {
            source: "/posts",
            destination: "http://localhost:3001/posts",
          },
          {
            source: "/profile",
            destination: "http://localhost:3001/profile",
          },
          {
            source: "/reactions",
            destination: "http://localhost:3001/reactions",
          },
          {
            source: '/graphql',
            destination: 'https://proxy.berkeley.minaexplorer.com/graphql',
          }
        ];
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
          ],
        },
      ];
    }
}

module.exports = nextConfig
