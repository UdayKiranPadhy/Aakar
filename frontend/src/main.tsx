import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import "./styles/global.css";

// Side-effect imports register the default Block/Layout/Detail/ModelView
// strategies. Once registered, the rest of the app resolves them via the
// relevant registry. See docs/block-types.md for how to add a new renderer.
import "./presentation/blocks/register";
import "./presentation/layout/register";
import "./presentation/details/register";
import "./presentation/model-views/register";
import "./presentation/compare-views/register";
import "./presentation/learn-views/register";

// TEMP diagnostic: confirm whether VITE_API_URL was injected at build time.
// On the deployed site, open DevTools → Console: you should see your backend
// URL here. If it logs `undefined`, the Cloudflare build variable wasn't set
// and the app falls back to localhost. Remove this once verified.
console.log(
  "[Aakar] VITE_API_URL =",
  import.meta.env.VITE_API_URL ?? "(undefined → falling back to http://localhost:8000)",
);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("#root element not found in index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
