/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
        return [
          {
            source: "/posts",
            destination: "http://localhost:3001/posts",
          }
        ];
    }
}

module.exports = nextConfig
