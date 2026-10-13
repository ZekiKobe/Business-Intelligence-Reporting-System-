import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Home from "../pages/Home";
import ReportExecution from "../pages/ReportExecution";
import ForgotPassword from "../pages/ForgotPassword";
import HelpSupportPage from "../pages/HelpSupportPage";
import ProfilePage from "../pages/ProfilePage";
import ChangePasswordPage from "../pages/ChangePasswordPage";
import Settings from "../pages/Settings";

const AppRoutes: React.FC = () => {
  const RequireSession: React.FC<{ children: React.ReactElement }> = ({ children }) =>
    localStorage.getItem("bi_token") ? children : <Navigate to="/" replace />;
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path='/home' element={<RequireSession><Home /></RequireSession>}/>
      <Route path="/report/:id" element={<RequireSession><ReportExecution /></RequireSession>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/help" element={<RequireSession><HelpSupportPage /></RequireSession>} />
      {/* Settings with nested routes */}
      <Route path="/settings" element={<RequireSession><Settings /></RequireSession>}>
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
