/** @type {import('next').NextConfig} */

const base = process.env.DEEPLYNX_URL;

const nextConfig = {
  env: {
    DEEPLYNX_BASE: process.env.DEEPLYNX_URL,
    DEEPLYNX_KEY: process.env.DEEPLYNX_KEY,
    DEEPLYNX_SECRET: process.env.DEEPLYNX_SECRET,
    DEEPLYNX_TOKEN: process.env.DEEPLYNX_TOKEN,
  },
};

export default nextConfig;
