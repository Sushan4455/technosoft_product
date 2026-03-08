import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { supabase } from '../supabase'; // Adjust path to your supabase config

const Dashboard = () => {
  const [userName, setUserName] = useState("Admin");
  const [greeting, setGreeting] = useState("Hello");

  // --- Fetch User & Set Time Logic ---
  useEffect(() => {
    // 1. Get the user's name from Supabase
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.user_metadata?.full_name) {
        // Grab the first name only for a friendlier greeting
        const firstName = session.user.user_metadata.full_name.split(' ')[0];
        setUserName(firstName);
      }
    };
    fetchUser();

    // 2. Determine time of day for the greeting
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans relative">
      
      {/* --- SIDEBAR --- */}
      <Sidebar 
        isOpen={true} 
        onClose={() => {}} 
      />

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 w-full lg:ml-72 flex flex-col h-screen">
        
        {/* --- MINIMAL TOP HEADER --- */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 md:px-10 shrink-0 z-10">
          
          {/* Dynamic Greeting */}
          <div className="text-slate-600 text-sm">
            {greeting}, <span className="font-semibold text-slate-900">{userName}</span>
          </div>
          
          {/* Profile Icon */}
          <div className="flex items-center gap-3 cursor-pointer p-1 rounded-full hover:bg-slate-50 transition-colors">
            <img 
              // Dicebear dynamically generates a 3D avatar based on their name!
              src={`https://api.dicebear.com/7.x/micah/svg?seed=${userName}&backgroundColor=f5f5f5`} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-slate-200 bg-white shadow-sm"
            />
          </div>

        </header>

        {/* --- DYNAMIC PAGES (Overview, Invoices, etc.) --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
             <Outlet /> 
          </div>
        </div>

      </main>
      
    </div>
  );
};

export default Dashboard;