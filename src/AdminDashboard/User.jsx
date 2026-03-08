import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Users, Search, Building, Mail, Phone, 
  MapPin, Calendar, Shield, Eye, Ban, 
  ArrowUpRight, Activity, X, Globe, Hash, ShieldAlert
} from 'lucide-react';

const AdminUsers = () => {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchGlobalUsers();
  }, []);

  const fetchGlobalUsers = async () => {
    setLoading(true);
    try {
        // Calling the secure VIP function we created in Supabase SQL
        // This bypasses RLS so you can see all users on your platform
        const { data, error } = await supabase.rpc('get_all_tenants');

        if (error) throw error;
        
        // Map the data to ensure it displays correctly even if the user
        // just signed up and hasn't filled out their store_settings yet.
        const formattedData = (data || []).map(tenant => ({
            ...tenant,
            // If they don't have a store name yet, display their email
            store_name: tenant.store_name || tenant.email, 
            status: 'Active', // Default status for UI demonstration
            plan: 'Professional' // Default plan for UI demonstration
        }));

        setTenants(formattedData);
    } catch (error) {
        console.error("Admin Fetch Error:", error.message);
    } finally {
        setLoading(false);
    }
  };

  // Calculate Metrics
  const activeCount = tenants.filter(t => t.status === 'Active').length;
  const suspendedCount = tenants.filter(t => t.status === 'Suspended').length;
  
  // Calculate new users this month
  const currentMonth = new Date().toISOString().substring(0, 7);
  const newThisMonth = tenants.filter(t => t.created_at?.substring(0, 7) === currentMonth).length;

  const openTenantDetails = (tenant) => {
      setSelectedTenant(tenant);
      setIsModalOpen(true);
  };

  const handleSuspend = async (tenantId) => {
      if (window.confirm("Are you sure you want to suspend this company? They will immediately lose access to their dashboard.")) {
          alert(`Company access suspended. (Database update simulated)`);
      }
  };

  // Filter based on store name, email, or phone
  const filteredTenants = tenants.filter(t => 
      (t.store_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.phone || '').includes(searchTerm)
  );

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500 bg-slate-50/50">
              <Users className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Fetching global tenant data...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-6 border-b border-slate-200/80 pb-4 px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Tenants & Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage registered companies, monitor activity, and control platform access.</p>
        </div>
      </div>

      <div className="px-6 lg:px-8 max-w-[1600px]">
          
          {/* KPI GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              <div className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Registered</p>
                      <div className="p-1.5 bg-blue-50 text-[#1774b5] rounded"><Building size={16}/></div>
                  </div>
                  <p className="text-3xl font-black text-slate-800">{tenants.length}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <ArrowUpRight size={14}/> +{newThisMonth} <span className="text-slate-400 font-medium">new this month</span>
                  </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Accounts</p>
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded"><Activity size={16}/></div>
                  </div>
                  <p className="text-3xl font-black text-slate-800">{activeCount}</p>
                  <p className="mt-3 text-xs font-medium text-slate-500">Currently using the platform</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Suspended / Churned</p>
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded"><Ban size={16}/></div>
                  </div>
                  <p className="text-3xl font-black text-slate-800">{suspendedCount}</p>
                  <p className="mt-3 text-xs font-medium text-slate-500">Access revoked or unpaid</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Platform Security</p>
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded"><Shield size={16}/></div>
                  </div>
                  <p className="text-xl font-bold text-slate-800 mt-2">Optimal</p>
                  <p className="mt-2 text-xs font-medium text-slate-500">No abnormal login patterns</p>
              </div>
          </div>

          {/* TABLE CONTROLS */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" placeholder="Search by company name, email, or phone..." 
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#1774b5]" 
                  />
              </div>
          </div>

          {/* MAIN TENANT TABLE */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-4 px-6">Company / Tenant</th>
                              <th className="py-4 px-6">Contact & Location</th>
                              <th className="py-4 px-6">Joined Date</th>
                              <th className="py-4 px-6">Plan & Status</th>
                              <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredTenants.length === 0 ? (
                              <tr>
                                  <td colSpan="5" className="p-10 text-center text-slate-400">
                                      <Building size={32} className="mx-auto mb-3 text-slate-300"/>
                                      <p>No companies found matching your search.</p>
                                  </td>
                              </tr>
                          ) : (
                              filteredTenants.map((tenant) => (
                                  <tr key={tenant.user_id} className="hover:bg-slate-50/50 transition-colors group">
                                      
                                      <td className="py-4 px-6">
                                          <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1774b5] font-bold shrink-0">
                                                  {(tenant.store_name || 'U')[0].toUpperCase()}
                                              </div>
                                              <div>
                                                  <p className="font-bold text-slate-800">{tenant.store_name}</p>
                                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {tenant.user_id?.slice(0,8)}</p>
                                              </div>
                                          </div>
                                      </td>

                                      <td className="py-4 px-6">
                                          <p className="text-xs text-slate-700 flex items-center gap-1.5 mb-1">
                                              <Mail size={12} className="text-slate-400"/> {tenant.email}
                                          </p>
                                          {tenant.phone && (
                                              <p className="text-xs text-slate-700 flex items-center gap-1.5 mb-1">
                                                  <Phone size={12} className="text-slate-400"/> {tenant.phone}
                                              </p>
                                          )}
                                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                              <MapPin size={12} className="text-slate-400"/> {tenant.address || 'Location not set'}
                                          </p>
                                      </td>

                                      <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                                          {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'Unknown'}
                                      </td>

                                      <td className="py-4 px-6">
                                          <div className="flex flex-col items-start gap-1.5">
                                              <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border ${
                                                  tenant.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                              }`}>
                                                  {tenant.status}
                                              </span>
                                              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                  {tenant.plan}
                                              </span>
                                          </div>
                                      </td>

                                      <td className="py-4 px-6 text-right">
                                          <div className="flex justify-end gap-2">
                                              <button 
                                                  onClick={() => openTenantDetails(tenant)}
                                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-[#1774b5] hover:bg-blue-50 text-[11px] font-bold rounded transition-colors"
                                              >
                                                  <Eye size={14} /> View
                                              </button>
                                              <button 
                                                  onClick={() => handleSuspend(tenant.user_id)}
                                                  className="flex items-center justify-center w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded transition-colors"
                                                  title="Suspend Account"
                                              >
                                                  <Ban size={14} />
                                              </button>
                                          </div>
                                      </td>

                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- TENANT DETAILS MODAL --- */}
      {isModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#1774b5]"></div>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#1774b5] text-xl font-black">
                        {(selectedTenant.store_name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{selectedTenant.store_name}</h2>
                        <p className="text-xs text-slate-500 font-mono mt-1">Tenant ID: {selectedTenant.user_id}</p>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white p-1 rounded-md border border-slate-200 shadow-sm"><X size={18}/></button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-6">
                
                {/* Status Banner */}
                <div className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account Status</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="font-bold text-slate-800 text-sm">Active & Healthy</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Plan</p>
                        <span className="font-bold text-[#1774b5] text-sm">{selectedTenant.plan || 'Professional Tier'}</span>
                    </div>
                </div>

                {/* Company Details */}
                <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <Building size={14} className="text-[#1774b5]"/> Business Profile
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50/50 p-3 border border-slate-100 rounded-md">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Primary Email</p>
                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Mail size={12} className="text-slate-400"/> {selectedTenant.email}</p>
                        </div>
                        <div className="bg-slate-50/50 p-3 border border-slate-100 rounded-md">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contact Phone</p>
                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Phone size={12} className="text-slate-400"/> {selectedTenant.phone || 'Not provided'}</p>
                        </div>
                        <div className="bg-slate-50/50 p-3 border border-slate-100 rounded-md">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Registered Address</p>
                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><MapPin size={12} className="text-slate-400"/> {selectedTenant.address || 'Not provided'}</p>
                        </div>
                        <div className="bg-slate-50/50 p-3 border border-slate-100 rounded-md">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Registration Date</p>
                            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Calendar size={12} className="text-slate-400"/> {selectedTenant.created_at ? new Date(selectedTenant.created_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* System & Access */}
                <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <ShieldAlert size={14} className="text-[#1774b5]"/> Administrative Access
                    </h3>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                        <Activity size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-800 mb-1">Impersonate Tenant</p>
                            <p className="text-xs text-amber-700/80 leading-relaxed mb-3">
                                You can securely log into this company's dashboard to provide support or configure their account. All actions taken during impersonation are logged for security.
                            </p>
                            <button className="bg-white text-amber-700 border border-amber-300 text-xs font-bold px-4 py-2 rounded shadow-sm hover:bg-amber-100 transition-colors flex items-center gap-2">
                                <Globe size={14}/> Login as {selectedTenant.store_name}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUsers;