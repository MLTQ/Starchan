import React from "react";
import { createRoot } from "react-dom/client";

window.React = React;
window.ReactDOM = { createRoot };

import("./api.jsx")
  .then(() => import("./themes.jsx"))
  .then(() => import("./layout.jsx"))
  .then(() => import("./graphs.jsx"))
  .then(() => import("./screens.jsx"))
  .then(() => import("./app.jsx"));
