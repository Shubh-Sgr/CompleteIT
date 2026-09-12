import {Component, Suspense, lazy, type ComponentType, type ReactNode} from "react";
import {Route, Routes, useLocation, useParams} from "react-router-dom";
import Layout from "./layout";
import Loading from "./loading";
import ErrorPage from "./error";
import {NavigationEffects} from "@/lib/navigation";

const Home = lazy(() => import("./page"));
const Create = lazy(() => import("./create/page"));
const Explore = lazy(() => import("./explore/page"));
const Search = lazy(() => import("./search/page"));
const Login = lazy(() => import("./login/page"));
const Register = lazy(() => import("./register/page"));
const MySets = lazy(() => import("./my-sets/page"));
const Notifications = lazy(() => import("./notifications/page"));
const Following = lazy(() => import("./following/page"));
const Settings = lazy(() => import("./settings/page"));
const Moderation = lazy(() => import("./moderation/page"));
const SetDetail = lazy(() => import("./sets/[slug]/page"));
const SetEdit = lazy(() => import("./sets/[slug]/edit/page"));
const SetCompare = lazy(() => import("./sets/[slug]/compare/page"));
const SetFork = lazy(() => import("./sets/[slug]/fork/page"));
const Profile = lazy(() => import("./users/[username]/page"));
const Product = lazy(() => import("./products/[id]/page"));
const ProductWorld = lazy(() => import("./product-worlds/[slug]/page"));
const NotFound = lazy(() => import("./not-found"));

// Explicit routes preserve every existing URL, including saved library filters.
const routes: [string, ComponentType][] = [
  ["/", Home], ["/create", Create], ["/explore", Explore], ["/search", Search],
  ["/login", Login], ["/register", Register], ["/my-sets", MySets],
  ...["drafts", "private", "followers", "published", "unlisted", "forked", "following", "archived"].map(filter => [`/my-sets/${filter}`, MySets] as [string, ComponentType]),
  ["/notifications", Notifications], ["/following", Following], ["/settings", Settings], ["/moderation", Moderation],
  ["/sets/:slug", SetDetail], ["/sets/:slug/edit", SetEdit], ["/sets/:slug/compare", SetCompare], ["/sets/:slug/fork", SetFork],
  ["/users/:username", Profile], ["/products/:id", Product], ["/product-worlds/:slug", ProductWorld], ["*", NotFound]
];

class PageBoundary extends Component<{children: ReactNode; resetKey: string}, {error: Error | null}> {
  state: {error: Error | null} = {error: null};
  static getDerivedStateFromError(error: Error) { return {error}; }
  componentDidUpdate(previous: Readonly<{children: ReactNode; resetKey: string}>) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({error: null});
  }
  render() {
    return this.state.error ? <ErrorPage error={this.state.error} reset={() => window.location.reload()}/> : this.props.children;
  }
}

function Page({component: Content}: {component: ComponentType}) {
  const params = useParams();
  // New set/product/profile IDs reset local state; library filters keep search/sort.
  return <Content key={JSON.stringify(params)}/>;
}

export function AppRouter() {
  const location = useLocation();
  return <Layout><NavigationEffects/><PageBoundary resetKey={location.pathname}><Suspense fallback={<Loading/>}>
    <Routes>{routes.map(([path, component]) => <Route key={path} path={path} element={<Page component={component}/>}/>)}</Routes>
  </Suspense></PageBoundary></Layout>;
}
