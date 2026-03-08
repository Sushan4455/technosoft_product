import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // Adjust this import path if needed
import { Menu, Bell, User } from 'lucide-react';

const Dashboard = () => {
  // This state controls the mobile sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Optional: Keeps track of the page title for the header
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans">
      
      {/* SIDEBAR COMPONENT */}
      {/* We pass the state and the function to close it down to the sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        setActiveTab={setActiveTab}
      />

      {/* MAIN CONTENT WRAPPER */}
      {/* lg:ml-72 pushes the content to the right on desktop so the sidebar doesn't cover it */}
      <main className="flex-1 w-full lg:ml-72 flex flex-col h-screen transition-all duration-300">
        
        {/* --- TOP HEADER --- */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 sticky top-0">
          
          <div className="flex items-center gap-3">
            {/* THE "THREE LINE" HAMBURGER MENU (Visible only on mobile/tablets) */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 mr-2 text-slate-600 hover:bg-slate-100 rounded-md lg:hidden focus:outline-none transition-colors"
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>
            
            {/* Dynamic Page Title (Hidden on very small screens to save space) */}
            <h2 className="text-lg font-semibold text-slate-800 hidden sm:block">
              {activeTab}
            </h2>
          </div>

          {/* Right side header icons (Notifications & Profile) */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-[#1774b5] transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#1774b5] overflow-hidden cursor-pointer hover:bg-blue-100 transition-colors">
               <User size={18} />
            </div>
          </div>
        </header>

        {/* --- PAGE CONTENT AREA --- */}
        {/* FIXED: Removed the p-6 max-w-7xl classes so your pages stretch beautifully */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 relative">
          <Outlet context={{ setActiveTab }} />
        </div>

      </main>
    </div>
  );
};

export default Dashboard;