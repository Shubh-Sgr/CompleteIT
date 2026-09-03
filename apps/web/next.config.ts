import type {NextConfig} from "next";
const config:NextConfig={
  transpilePackages:["@completeit/ui","@completeit/contracts"],
  typedRoutes:false,
  // The development tools badge overlaps the mobile bottom navigation.
  // Compile and runtime errors still appear in the normal Next.js overlay.
  devIndicators:false
};
export default config;
