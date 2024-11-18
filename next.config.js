/** @type {import('next').NextConfig} */
const path = require('path');
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
          source: "/posts/audit",
          destination: "http://localhost:3001/posts/audit",
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
          destination: 'https://api.minascan.io/node/devnet/v1/graphql',
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
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        o1js: path.resolve(__dirname, "node_modules/o1js/dist/web/index.js"),
      };
    } else {
      config.externals.push("o1js"); // https://nextjs.org/docs/app/api-reference/next-config-js/serverExternalPackages
    }
    config.experiments = { ...config.experiments, topLevelAwait: true };
    config.optimization.minimizer = [];
    return config;
  }
}

module.exports = nextConfig
