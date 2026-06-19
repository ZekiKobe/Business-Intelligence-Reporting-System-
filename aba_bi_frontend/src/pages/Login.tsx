import React from "react";
import LoginForm from "../components/LoginForm";

const Login: React.FC = () => {
  return (
    <div className="portal-auth-page flex flex-col items-stretch justify-center min-h-screen font-sans px-4 py-8 lg:px-8">
      <LoginForm />
    </div>
  );
};

export default Login;