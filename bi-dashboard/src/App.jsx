import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ReportGroups from './pages/ReportGroups';
import Users from './pages/Users';
import Settings from './pages/Settings';
import DataSources from './pages/DataSources';
import LoginPage from './pages/LoginPage';
import './App.css';
import AccessGroupAssignment from './pages/AccessGroupAssignment';
import ViewReportPage from './pages/ViewReportPage';
import RunReportPage from './pages/RunReportPage';
import DesignReport from './pages/DesignReport';
import ProfilePage from './pages/ProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import { useBranding } from './context/BrandingContext';
import { LoadingBarProvider } from './context/LoadingBarContext';

function App() {
  const ProtectedLayout = () => {
    const token = localStorage.getItem("bi_token");
    if (!token) {
      return <Navigate to="/" replace />;
    }
    return <Layout />;
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { branding } = useBranding();

  useEffect(() => {
    document.title = `${branding.companyName} | ${branding.productName}`;
  }, [branding.companyName, branding.productName]);

  // Layout for authenticated routes (dashboard, reports, etc.)
  const Layout = () => (
    <div className="flex h-screen font-sans antialiased" style={{ background: "var(--app-bg)" }}>
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        mobileSidebarOpen={mobileSidebarOpen} 
        setMobileSidebarOpen={setMobileSidebarOpen} 
      />
      <div className="main-content flex-1 min-h-0 transition-all duration-300 ease-in-out overflow-auto min-w-0">
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          mobileSidebarOpen={mobileSidebarOpen} 
          setMobileSidebarOpen={setMobileSidebarOpen} 
        />
        <Outlet />
      </div>
    </div>
  );

  return (
    <Router>
      <LoadingBarProvider>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<LoginPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/reports" element={<ViewReportPage />} />
            <Route path="/reports/run/:reportId" element={<RunReportPage />} />
            <Route path="/reports/create" element={<Navigate to="/reports/design" replace />} />
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/reports/design" element={<DesignReport />} />
            <Route path="/reports/design/:reportId" element={<DesignReport />} />
            <Route path="/report-groups" element={<ReportGroups />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/user/access" element={<AccessGroupAssignment />} />
            <Route path="/view-report" element={<ViewReportPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </LoadingBarProvider>
    </Router>
  );
}

export default App;
