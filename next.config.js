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
            source: "/posts/delete",
            destination: "http://localhost:3001/posts/delete",
          },
          {
            source: "/posts/restore",
            destination: "http://localhost:3001/posts/restore",
          },
          {
            source: "/reactions",
            destination: "http://localhost:3001/reactions",
          },
          {
            source: "/comments",
            destination: "http://localhost:3001/comments",
          },
          {
            source: "/comments/delete",
            destination: "http://localhost:3001/comments/delete",
          },
          {
            source: "/comments/restore",
            destination: "http://localhost:3001/comments/restore",
          },
          {
            source: "/reposts",
            destination: "http://localhost:3001/reposts",
          },
          {
            source: "/reposts/delete",
            destination: "http://localhost:3001/reposts/delete",
          },
          {
            source: "/reposts/restore",
            destination: "http://localhost:3001/reposts/restore",
          },
          {
            source: '/graphql',
            destination: 'https://proxy.berkeley.minaexplorer.com/graphql',
          },
          {
            source: "/reactions/delete",
            destination: "http://localhost:3001/reactions/delete",
          },
          {
            source: "/reactions/restore",
            destination: "http://localhost:3001/reactions/restore",
          },
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
