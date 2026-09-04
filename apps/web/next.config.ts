import type {NextConfig} from "next";
const configuredApi=process.env.API_PROXY_ORIGIN??process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000";
const apiOrigin=configuredApi.replace(/\/api\/v1\/?$/,"").replace(/\/$/,"");
const config:NextConfig={
  transpilePackages:["@completeit/ui","@completeit/contracts"],
  typedRoutes:false,
  async rewrites(){return [{source:"/api/v1/:path*",destination:`${apiOrigin}/api/v1/:path*`}]},
  // The development tools badge overlaps the mobile bottom navigation.
  // Compile and runtime errors still appear in the normal Next.js overlay.
  devIndicators:false
};
export default config;
