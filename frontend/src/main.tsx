import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./styles/global.css";

// Side-effect imports register the default Block/Layout/Detail strategies.
// Once registered, the rest of the app resolves them via the relevant registry.
// See docs/block-types.md for how to add a new renderer.
import "./presentation/blocks/register";
import "./presentation/layout/register";
import "./presentation/details/register";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("#root element not found in index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
