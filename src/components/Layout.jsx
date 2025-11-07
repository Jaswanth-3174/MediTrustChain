import React from "react";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen w-full relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-x-hidden">
      {/* Enhanced decorative elements */}
      <div className="pointer-events-none select-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-300 to-purple-300 opacity-20 blur-3xl -z-10" />
      <div className="pointer-events-none select-none absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 opacity-20 blur-3xl -z-10" />
      <div className="pointer-events-none select-none absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-emerald-300 to-teal-300 opacity-20 blur-3xl -z-10" />

      {/* Page content */}
      <Navbar />
      <div className="relative pt-6 pb-10 w-full">
        {children}
      </div>
    </div>
  );
}
