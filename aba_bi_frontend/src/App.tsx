import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRoutes from "./routes/AppRoutes";
import "./index.css"; // Make sure Tailwind CSS is imported

const App: React.FC = () => {
  return (
    <div className="font-sans min-h-screen antialiased relative" style={{ color: "var(--portal-text)" }}>
      <div className="portal-app-top-accent" aria-hidden />
      <AppRoutes />
      <ToastContainer position="top-right" autoClose={4000} />
    </div>
  );
};

export default App;