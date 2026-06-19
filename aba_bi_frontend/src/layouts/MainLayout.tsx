import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col w-screen min-h-screen">
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;