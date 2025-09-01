import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  // Configure image domains for external images
  images: {
    domains: [
      'lh3.googleusercontent.com',  // For Google profile pictures
      'lh1.googleusercontent.com',  // Adding variants just in case
      'lh2.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'avatars.githubusercontent.com',
      'github.com',
      'articom.blob.core.windows.net',  // For assistant avatars from Azure Blob Storage
      'images.unsplash.com',  // For Unsplash images
    ],
  },
};

export default nextConfig;
