import React from 'react';
import { Rocket, ArrowLeft, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const ComingSoon = () => {
  const location = useLocation();
  
  // Automatically format the URL path to look like a title (e.g., "chart-of-accounts" -> "Chart Of Accounts")
  const pathName = location.pathname
    .split('/')
    .pop()
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[75vh] text-center px-4 w-full font-sans">
      
      <div className="relative mb-6">
        <div className="absolute -top-2 -right-2 text-amber-400 animate-pulse">
            <Sparkles size={24} />
        </div>
        <div className="w-24 h-24 bg-blue-50 border border-blue-100 text-[#1774b5] rounded-full flex items-center justify-center shadow-inner">
          <Rocket size={48} className="animate-bounce" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">
        {pathName || "This Feature"} is Coming Soon
      </h2>
      
      <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
        Our engineers are currently building this module to give you the best experience. It will be unlocked in an upcoming update!
      </p>
      
      <Link 
        to="/app/dashboard"
        className="flex items-center gap-2 px-6 py-3 bg-[#1774b5] text-white rounded-sm font-medium hover:bg-[#135d90] transition-all shadow-sm"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>
      
    </div>
  );
};

export default ComingSoon;