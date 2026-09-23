import React from "react";
import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./components/App/App";

import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
      <App />
  </StrictMode>,
);
