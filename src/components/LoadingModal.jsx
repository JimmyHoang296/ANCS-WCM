import React from "react";

const LoadingModal = ({message}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 bg z-50">
      <div className="flex flex-col items-center space-y-3 bg-white p-6 rounded-xl shadow-lg">
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        {/* Text */}
        <span className="text-gray-700 font-medium">{message}</span>
      </div>
    </div>
  );
};

export default LoadingModal;
