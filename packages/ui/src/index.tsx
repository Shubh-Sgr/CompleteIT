import type { ButtonHTMLAttributes, ReactNode } from "react";
export function Button({className="", ...props}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 ${className}`} {...props}/>;
}
export function Badge({children}: {children: ReactNode}) { return <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">{children}</span>; }
