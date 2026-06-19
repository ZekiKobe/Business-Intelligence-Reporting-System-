import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";  // <- must import your tailwind CSS
import { BrandingProvider } from "./context/BrandingContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrandingProvider>
    <App />
  </BrandingProvider>
);
