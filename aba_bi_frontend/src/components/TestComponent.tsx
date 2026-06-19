import React from "react";

const TestComponent: React.FC = () => {
  return (
    <div className="p-4 bg-blue-500 text-white rounded-lg">
      <h1 className="text-2xl font-bold mb-2">Tailwind CSS Test</h1>
      <p className="text-lg">If you can see this styled, Tailwind CSS is working!</p>
      <div className="mt-4 p-3 bg-blue-700 rounded">
        <p>This should have a darker background</p>
      </div>
    </div>
  );
};

export default TestComponent;