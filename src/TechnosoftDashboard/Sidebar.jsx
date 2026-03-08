import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calculator, ShoppingCart, Package, Users2, 
  BrainCircuit, PieChart, Settings, LifeBuoy, ChevronRight, 
  ChevronDown, Sparkles
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen, onClose, setActiveTab }) => {
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (label) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  // --- NEW MENU STRUCTURE ---
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: "Dashboard", path: "/app/dashboard" },
    {
      icon: <Calculator size={20} />,
      label: "Accounting",
      subItems: [
        { label: "Chart of Accounts", path: "/app/accounting/accounts" },
        { label: "Journal Entries", path: "/app/accounting/journal" },
        { label: "Invoices", path: "/app/accounting/invoices" },
        { label: "Bills & Expenses", path: "/app/accounting/expenses" },
        { label: "Payments", path: "/app/accounting/links" }, 
        { label: "Bank Reconciliation", path: "/app/accounting/reconciliation" },
        { label: "VAT / Tax Management", path: "/app/accounting/tax" },
      ]
    },
    {
      icon: <ShoppingCart size={20} />,
      label: "Sales & Orders",
      subItems: [
        { label: "Sales Orders", path: "/app/orders" },
        { label: "Quotations", path: "/app/accounting/estimates" },
        { label: "Customers", path: "/app/customers" },
        { label: "POS", path: "/app/sales/pos" },
        { label: "Returns & Refunds", path: "/app/orders/returns" },
        { label: "Delivery Tracking", path: "/app/orders/fulfillment" },
      ]
    },
    {
      icon: <Package size={20} />,
      label: "Inventory",
      subItems: [
        { label: "Products / SKUs", path: "/app/catalog/products" },
        { label: "Stock Levels", path: "/app/catalog/inventory" },
        { label: "Warehouses", path: "/app/inventory/warehouses" },
        { label: "Purchase Orders", path: "/app/inventory/purchase-orders" },
        { label: "Suppliers", path: "/app/inventory/suppliers" },
        { label: "Reorder Alerts", path: "/app/inventory/alerts" },
        { label: "Dead Stock", path: "/app/inventory/dead-stock" },
      ]
    },
    {
      icon: <Users2 size={20} />,
      label: "Customers",
      subItems: [
        { label: "Customer Directory", path: "/app/customers/directory" },
        { label: "Customer Ledger", path: "/app/customers/ledger" },
        { label: "Credit Management", path: "/app/customers/credit" },
        { label: "Payment History", path: "/app/customers/payments" },
        { label: "Customer Segments", path: "/app/customers/segments" },
        { label: "Churn Risk (Predictive)", path: "/app/customers/churn" },
      ]
    },
    {
      icon: <BrainCircuit size={20} />,
      label: "Business Intelligence",
      isBI: true, 
      subItems: [
        { label: "Revenue Forecast", path: "/app/bi/revenue" },
        { label: "Cash Flow Forecast", path: "/app/bi/cash-flow" },
        { label: "Sales Trend", path: "/app/bi/sales-trend" },
        { label: "Risk Center", path: "/app/bi/risk-center" },
        { label: "Profitability Insights", path: "/app/bi/profitability" },
        { label: "Business Health Score", path: "/app/bi/health" },
      ]
    },
    {
      icon: <PieChart size={20} />,
      label: "Reports",
      subItems: [
        { label: "Sales Reports", path: "/app/reports/sales" },
        { label: "Expense Reports", path: "/app/reports/expenses" },
        { label: "Inventory Reports", path: "/app/reports/inventory" },
        { label: "Customer Reports", path: "/app/reports/customers" },
        { label: "Custom Reports", path: "/app/reports/custom" },
        { label: "Export Center", path: "/app/reports/export" },
      ]
    },
    {
      icon: <Settings size={20} />,
      label: "Settings",
      subItems: [
        { label: "Company Profile", path: "/app/settings/store" },
        { label: "Tax Settings", path: "/app/settings/tax" },
        { label: "Subscription & Billing", path: "/app/settings/billing" },
        { label: "Integrations", path: "/app/settings/integrations" },
        { label: "User Management", path: "/app/settings/users" },
        { label: "Data Backup", path: "/app/settings/backup" },
      ]
    },
    {
      icon: <LifeBuoy size={20} />,
      label: "Help & Support",
      subItems: [
        { label: "Help Center", path: "/app/support/help-center" },
        { label: "Tutorials", path: "/app/support/tutorials" },
        { label: "Raise Ticket", path: "/app/support/tickets" },
        { label: "Feature Requests", path: "/app/support/feature-requests" },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop - Closes the sidebar when tapping outside on small screens */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity" 
          onClick={onClose} 
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed top-0 left-0 h-screen z-50 w-72 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full w-full bg-slate-50 border-r border-slate-200 flex flex-col shadow-2xl lg:shadow-none">

          {/* --- LOGO HEADER --- */}
          <div className="h-16 flex items-center px-6 shrink-0 mt-2 border-b border-slate-100">
            {/* Added onClose so clicking logo on mobile hides sidebar */}
            <Link to="/app/dashboard" className="flex items-center" onClick={onClose}>
              <img
                src="/src/assets/Technosoft International-02.jpg"
                alt="Technosoft"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          {/* --- CONTINUOUS SCROLLABLE MENU --- */}
          <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar pb-24">
            {menuItems.map((item, index) => (
              <SidebarItem
                key={index}
                item={item}
                location={location}
                isOpen={openDropdown === item.label}
                onToggle={() => toggleDropdown(item.label)}
                setActiveTab={setActiveTab}
                onClose={onClose} // Pass onClose down to items
              />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};

// --- SUB-COMPONENT ---
const SidebarItem = ({ item, location, isOpen, onToggle, setActiveTab, onClose }) => {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isPathActive = location.pathname === item.path || item.subItems?.some(s => s.path === location.pathname);

  // Standard Styles
  const activeStyle = "bg-blue-50/70 text-[#1774b5] border-r-2 border-[#1774b5] font-semibold";
  const inactiveStyle = "text-slate-600 hover:bg-slate-100/50 hover:text-[#1774b5] border-r-2 border-transparent";
  const activeParentStyle = "bg-blue-50/40 text-[#1774b5] font-semibold border-r-2 border-transparent";

  // Special BI Highlight Styles
  const biParentActive = "bg-gradient-to-r from-amber-50 to-orange-50 text-orange-600 font-bold border-r-2 border-transparent";
  const biParentInactive = "text-slate-600 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/50 hover:text-orange-600 border-r-2 border-transparent";

  // Helper to handle clicks: Update tab name and close mobile sidebar
  const handleLinkClick = (label) => {
    if (setActiveTab) setActiveTab(label);
    if (onClose) onClose(); // Closes sidebar on mobile
  };

  if (hasSubItems) {
    return (
      <div className="space-y-0">
        <button
          onClick={onToggle}
          className={`w-full group flex items-center justify-between px-6 py-3 transition-colors duration-200 ${
            item.isBI ? (isPathActive && !isOpen ? biParentActive : biParentInactive) : 
            (isPathActive && !isOpen ? activeParentStyle : inactiveStyle)
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`${
              item.isBI ? 'text-orange-500 group-hover:text-orange-600' :
              isPathActive && !isOpen ? 'text-[#1774b5]' : 'text-slate-400 group-hover:text-[#1774b5]'
            } transition-colors`}>
              {item.icon}
            </span>
            <span className={`text-sm tracking-tight ${item.isBI && 'flex items-center gap-1.5'}`}>
              {item.label} 
              {item.isBI && <Sparkles size={14} className="text-amber-500 fill-amber-500" />}
            </span>
          </div>
          <ChevronDown size={16} className={`transition-transform duration-200 ${
            isOpen ? (item.isBI ? 'rotate-180 text-orange-600' : 'rotate-180 text-[#1774b5]') : 'text-slate-400'
          }`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`overflow-hidden ${item.isBI ? 'bg-orange-50/30' : 'bg-slate-50/50'}`}
            >
              <div className="py-1">
                {item.subItems.map((sub, idx) => {
                  const isSubActive = location.pathname === sub.path;
                  
                  const subActiveStyle = item.isBI 
                    ? 'text-orange-700 bg-orange-100/50 font-semibold border-r-2 border-orange-500' 
                    : 'text-[#1774b5] bg-blue-50/50 font-semibold border-r-2 border-[#1774b5]';
                    
                  const subInactiveStyle = item.isBI
                    ? 'text-slate-500 hover:text-orange-600 hover:bg-orange-50 border-r-2 border-transparent'
                    : 'text-slate-500 hover:text-[#1774b5] hover:bg-slate-100/50 border-r-2 border-transparent';

                  return (
                    <Link
                      key={idx}
                      to={sub.path}
                      onClick={() => handleLinkClick(sub.label)}
                      className={`block pl-14 pr-6 py-2.5 text-sm transition-colors ${isSubActive ? subActiveStyle : subInactiveStyle}`}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Regular single-link items (like Dashboard)
  return (
    <Link
      to={item.path}
      onClick={() => handleLinkClick(item.label)}
      className={`group flex items-center justify-between px-6 py-3 transition-colors duration-200 ${isPathActive ? activeStyle : inactiveStyle}`}
    >
      <div className="flex items-center gap-3">
        <span className={`${isPathActive ? 'text-[#1774b5]' : 'text-slate-400 group-hover:text-[#1774b5] transition-colors'}`}>
          {item.icon}
        </span>
        <span className="text-sm tracking-tight">{item.label}</span>
      </div>
      {!isPathActive && <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-blue-400" />}
    </Link>
  );
};

export default Sidebar;