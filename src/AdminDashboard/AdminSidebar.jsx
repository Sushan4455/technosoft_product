import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { 
  LayoutDashboard, Users, CreditCard, PieChart, 
  ShieldAlert, Settings, LifeBuoy, Server, 
  ArrowLeftRight, LogOut 
} from 'lucide-react';

const AdminSidebar = () => {
  const location = useLocation();
  const activePath = location.pathname;

  const menuItems = [
    { name: 'Platform Overview', icon: LayoutDashboard, path: '/admin' },
    { name: 'Tenants & Users', icon: Users, path: '/admin/users' },
    { name: 'Subscriptions & Billing', icon: CreditCard, path: '/admin/billing' },
    { name: 'KYC Verification', icon: ShieldCheck, path: '/admin/kyc' },
    { name: 'Platform Financials', icon: PieChart, path: '/admin/financials' },
    { name: 'Staff Access Control', icon: ShieldAlert, path: '/admin/staff' },
    { name: 'System Health', icon: Server, path: '/admin/health' },
    { name: 'Support Tickets', icon: LifeBuoy, path: '/admin/support' },
    { name: 'Global Settings', icon: Settings, path: '/admin/settings' },
    
  ];

  return (
    <div className="w-64 h-screen bg-white text-slate-800 flex flex-col border-r border-slate-200 shrink-0 sticky top-0 shadow-sm">
      
      {/* Brand Header */}
      <div className="h-[68px] flex items-center px-6 border-b border-slate-200 shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#1774b5] rounded flex items-center justify-center text-white font-bold text-sm">
                T
            </div>
            <span className="font-bold text-slate-800 tracking-wide text-lg">
                technosoft <span className="text-[#1774b5] text-xs align-top uppercase tracking-widest">Admin</span>
            </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Mission Control</p>
        
        {menuItems.map((item) => {
          // Check if it's the exact path (for /admin) or starts with the path (for sub-pages)
          const isExactActive = activePath === item.path;

          return (
            <Link 
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isExactActive 
                  ? 'bg-blue-50 text-[#1774b5]' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#1774b5]'
              }`}
            >
              <item.icon 
                size={18} 
                className={isExactActive ? 'text-[#1774b5]' : 'text-slate-400 group-hover:text-[#1774b5]'} 
              />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Admin Profile / Bottom Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <Link 
          to="/app/dashboard" 
          className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-sm font-medium text-slate-600 hover:text-[#1774b5] hover:bg-white border border-transparent hover:border-slate-200 transition-all mb-1"
        >
            <ArrowLeftRight size={18} className="text-slate-400" /> Exit to Tenant App
        </Link>
        <button className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all">
            <LogOut size={18} className="text-rose-500" /> Secure Logout
        </button>
      </div>

    </div>
  );
};

export default AdminSidebar;