import React, { useState, useEffect } from 'react';
import { User, LayoutDashboard, LogOut } from 'lucide-react'; 
import logoImage from '../assets/Technosoft International-02.jpg';

// IMPORTANT: Make sure this import points to your actual Supabase client configuration file!
import { supabase } from '../supabase'; 

const Navbar = () => {
  const [session, setSession] = useState(null);

  // --- SUPABASE REAL-TIME AUTH LISTENER ---
  useEffect(() => {
    // 1. Get the current session when the component mounts
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // --- LOGOUT HANDLER ---
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error logging out:", error.message);
  };

  const navLinks = [
    { name: 'Products', href: '#' },
    { name: 'Features', href: '#' },
    { name: 'Pricing', href: '#' },
    { name: 'Resources', href: '#' },
    { name: 'Blogs', href: '#' },
  ];

  // Extract a display name (fallback to the first part of their email if no name is set)
  const userName = session?.user?.user_metadata?.full_name 
    || session?.user?.email?.split('@')[0] 
    || "User";

  return (
    <header className="w-full font-sans flex flex-col">
      
      {/* 1. Main Navigation */}
      <nav className="max-w-[1440px] w-full mx-auto px-6 lg:px-12 py-4 flex items-center justify-between bg-white">
        
        {/* LEFT SIDE: Logo & Nav Links */}
        <div className="flex items-center gap-8 lg:gap-12">
          
          <a href="/" className="flex items-center gap-3 cursor-pointer group">
            <img 
              src={logoImage} 
              alt="Technosoft Logo" 
              className="w-30 h-10 object-contain" 
            />
          </a>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-[#007dd0] transition-colors duration-200"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: Authentication / Dashboard */}
        <div className="flex items-center gap-5">
          {session ? (
            // --- LOGGED IN VIEW ---
            <>
              <div className="hidden sm:flex items-center gap-4 border-r border-slate-200 pr-5">
                
                {/* User Info */}
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#007dd0]">
                    <User size={16} />
                  </div>
                  <span className="max-w-[120px] truncate">{userName}</span>
                </div>

                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  title="Sign out"
                >
                  <LogOut size={18} />
                </button>

              </div>
              
              {/* Dashboard Button */}
              <a 
                href="/app/dashboard" 
                className="flex items-center gap-2 text-sm font-semibold text-white bg-[#007dd0] hover:bg-[#006bb0] px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_14px_0_rgba(0,125,208,0.2)] hover:shadow-[0_6px_20px_rgba(0,125,208,0.3)] hover:-translate-y-0.5"
              >
                <LayoutDashboard size={16} />
                Technosoft Studio
              </a>
            </>
          ) : (
            // --- LOGGED OUT VIEW ---
            <a 
              href="/login" 
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-[#007dd0] transition-colors group"
            >
              Sign in 
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="group-hover:translate-x-1 transition-transform duration-200"
              >
                <path d="m10 17 5-5-5-5"/>
                <path d="M15 12H3"/>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              </svg>
            </a>
          )}
        </div>
      </nav>

      {/* 2. Top Menu Banner */}
      <div className="w-full bg-[#007dd0] py-2 px-4 text-center">
        <h4 className="text-white text-sm md:text-base font-normal tracking-wide">
          Say goodbye to messy spreadsheets. Manage your accounting, inventory, and sales in one unified platform.{" "}
          <a href="#" className="underline font-medium hover:text-blue-100 transition-colors ml-1">
            Learn more
          </a>
        </h4>
      </div>

    </header>
  );
};

export default Navbar;