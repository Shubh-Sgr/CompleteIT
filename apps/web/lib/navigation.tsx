import {forwardRef, useEffect, useLayoutEffect, useMemo, useRef} from "react";
import {Link as RouterLink, useLocation, useNavigate, useNavigationType, type LinkProps} from "react-router-dom";
export {useParams} from "react-router-dom";

// Keep href-based page markup while delegating navigation to React Router.
const Link = forwardRef<HTMLAnchorElement, Omit<LinkProps, "to"> & {href: string}>(function Link({href, ...props}, ref) {
  return <RouterLink {...props} to={href} ref={ref}/>;
});
export default Link;

export function usePathname() { return useLocation().pathname.replace(/\/$/, "") || "/"; }

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(() => ({
    push: (href: string, options?: {scroll?: boolean}) => navigate(href, {state: {preserveScroll: options?.scroll === false}}),
    replace: (href: string, options?: {scroll?: boolean}) => navigate(href, {replace: true, state: {preserveScroll: options?.scroll === false}})
  }), [navigate]);
}

export function NavigationEffects() {
  const location = useLocation(), navigationType = useNavigationType();
  const positions = useRef(new Map<string, [number, number]>());
  const previousKey = useRef(location.key);
  const lastPosition = useRef<[number, number]>([window.scrollX, window.scrollY]);
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const trackScroll = () => { lastPosition.current = [window.scrollX, window.scrollY]; };
    window.addEventListener("scroll", trackScroll, {passive: true});
    return () => { window.history.scrollRestoration = previous; window.removeEventListener("scroll", trackScroll); };
  }, []);
  useLayoutEffect(() => {
    positions.current.set(previousKey.current, lastPosition.current);
    if (positions.current.size > 200) positions.current.delete(positions.current.keys().next().value!);
    previousKey.current = location.key;
    if (location.state?.preserveScroll && navigationType !== "POP") return;
    const saved = navigationType === "POP" ? positions.current.get(location.key) : undefined;
    let hash = "";
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* A malformed shared link must not crash the page. */ }
    const restore = () => {
      if (hash) {
        const target = document.getElementById(hash);
        if (!target) return false;
        target.scrollIntoView({behavior: "instant"});
        return true;
      }
      window.scrollTo({left: saved?.[0] ?? 0, top: saved?.[1] ?? 0, behavior: "instant"});
      return !saved || document.documentElement.scrollHeight >= saved[1] + window.innerHeight;
    };
    // Notification targets may arrive after the route chunk and its API data.
    const observer = new MutationObserver(() => { if (restore()) observer.disconnect(); });
    if (!restore()) observer.observe(document.getElementById("main-content")!, {childList: true, subtree: true});
    const timer = window.setTimeout(() => observer.disconnect(), 180_000);
    const cancel = () => observer.disconnect();
    window.addEventListener("wheel", cancel, {passive: true});
    window.addEventListener("touchstart", cancel, {passive: true});
    return () => {
      observer.disconnect(); window.clearTimeout(timer);
      window.removeEventListener("wheel", cancel); window.removeEventListener("touchstart", cancel);
    };
  }, [location.key, location.hash, location.state, navigationType]);
  return null;
}
