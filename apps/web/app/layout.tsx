import {Nav} from "@/components/nav";

export default function Layout({children}: {children: React.ReactNode}) {
  return <><a href="#main-content" className="skip-link">Skip to content</a><Nav/><main id="main-content" tabIndex={-1} className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-7xl px-4 py-7 pb-28 sm:px-6 sm:py-10 lg:pb-14 lg:py-12">{children}</main></>;
}
