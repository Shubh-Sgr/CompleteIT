import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import {Providers} from "@/components/providers";
import {AppRouter} from "@/app/router";
import "@/app/globals.css";

createRoot(document.getElementById("root")!).render(
  <Providers><BrowserRouter><AppRouter/></BrowserRouter></Providers>
);
