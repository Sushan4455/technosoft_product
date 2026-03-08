import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Search, Edit, Trash2, X, MapPin, 
  User, Building2, Phone, Sparkles, BrainCircuit, ShieldCheck, AlertCircle
} from 'lucide-react';

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormState = {
    name: '', 
    location: '', 
    manager_name: '', 
    contact_number: '', 
    status: 'Active'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:warehouses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      const { data } = await supabase.from('warehouses').select('*').order('name', { ascending: true });
      if (data) setWarehouses(data);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ---
  const calculateInsights = () => {
    const total = warehouses.length;
    const active = warehouses.filter(w => w.status === 'Active').length;
    const inactive = total - active;

    let aiAdvice = "Centralize your inventory to optimize fulfillment times.";
    if (total === 1) {
        aiAdvice = "You currently operate from a single location. Consider adding a secondary fulfillment center as order volume grows.";
    } else if (inactive > 0) {
        aiAdvice = `Notice: You have ${inactive} inactive location(s). Ensure remaining inventory is transferred to active sites.`;
    } else if (total > 1) {
        aiAdvice = "Multi-location routing active. Assign orders to the closest warehouse to save on shipping costs.";
    }

    return { total, active, inactive, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. ACTIONS ---
  const openModal = (warehouseToEdit = null) => {
    if (warehouseToEdit) {
      setEditingId(warehouseToEdit.id);
      setFormData(warehouseToEdit);
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Session expired. Please login again.");

    const payload = {
      user_id: currentUser.id,
      name: formData.name,
      location: formData.location,
      manager_name: formData.manager_name,
      contact_number: formData.contact_number,
      status: formData.status
    };

    try {
      if (editingId) {
        await supabase.from('warehouses').update(payload).eq('id', editingId);
      } else {
        await supabase.from('warehouses').insert([payload]);
      }

      setIsModalOpen(false);
      setFormData(initialFormState);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to save warehouse details.");
    }
  };

  const deleteWarehouse = async (id) => {
    if (window.confirm("Are you sure you want to delete this warehouse? This might affect attached inventory records.")) {
      await supabase.from('warehouses').delete().eq('id', id);
      fetchData();
    }
  };

  // --- 4. FILTERING ---
  const filteredWarehouses = warehouses.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (w.location && w.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (w.manager_name && w.manager_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER (Customized: Regular, Small Font as requested) */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-normal text-slate-800 tracking-wide">Warehouses</h1>
          <p className="text-slate-500 text-xs mt-1">Manage your storage locations and distribution centers.</p>
        </div>
        <div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors shadow-sm rounded-sm">
            <Plus size={16} /> Add Location
          </button>
        </div>
      </div>

      {/* AI INSIGHTS BANNER */}
      <div className="w-full bg-[#1774b5] text-white p-5 mb-8 shadow-sm rounded-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-blue-400/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">TechnosoftAI Insight</p>
              <h2 className="text-base font-medium text-white leading-tight">Logistics Network</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-medium text-amber-200 flex items-center md:justify-end gap-2 bg-blue-900/30 p-2 rounded-sm inline-flex">
               <BrainCircuit size={16} className="shrink-0" />
               <span className="text-left md:text-right">{insights.aiAdvice}</span>
             </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Building2 size={12}/> Total Locations</p>
            <p className="text-2xl font-bold text-white">{insights.total}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><ShieldCheck size={12}/> Active Centers</p>
            <p className="text-2xl font-bold text-emerald-300">{insights.active}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><AlertCircle size={12}/> Inactive</p>
            <p className="text-2xl font-bold text-white">{insights.inactive}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search by name, location, or manager..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1774b5] shadow-sm transition-colors" 
        />
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100 w-1/3">Warehouse Details</th>
                <th className="py-4 px-6 border-r border-slate-100">Contact Information</th>
                <th className="py-4 px-6 border-r border-slate-100">Status</th>
                <th className="py-4 px-6 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading locations...</td></tr>
              ) : filteredWarehouses.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No warehouses found.</td></tr>
              ) : (
                filteredWarehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Details */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 rounded-sm">
                          <Building2 size={18} className="text-[#1774b5]" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight mb-1">{warehouse.name}</p>
                          <p className="text-xs text-slate-500 flex items-start gap-1">
                            <MapPin size={12} className="shrink-0 mt-0.5" />
                            {warehouse.location || 'No address provided'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                        <User size={14} className="text-slate-400" />
                        {warehouse.manager_name || 'Unassigned'}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        {warehouse.contact_number || 'N/A'}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border rounded-sm ${
                        warehouse.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {warehouse.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openModal(warehouse)} className="text-slate-400 hover:text-[#1774b5] transition-colors p-1" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteWarehouse(warehouse.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Delete">
                          <Trash2 size={16} />
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

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg shadow-2xl rounded-md border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Warehouse' : 'Add New Location'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="p-6 custom-scrollbar">
              <form id="warehouseForm" onSubmit={handleSubmit} className="space-y-5">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Warehouse / Store Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="e.g. Kathmandu Main Hub" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Complete Address</label>
                  <textarea rows="2" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] resize-y" placeholder="e.g. Ring Road, Boudha, Kathmandu" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Manager Name</label>
                      <input type="text" value={formData.manager_name} onChange={e => setFormData({...formData, manager_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="e.g. Ram Shrestha" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Contact Number</label>
                      <input type="text" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="+977 98..." />
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Operational Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] cursor-pointer">
                    <option value="Active">Active (Receiving/Shipping)</option>
                    <option value="Inactive">Inactive (Closed)</option>
                  </select>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button onClick={() => setIsModalOpen(false)} type="button" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-sm transition-colors">Cancel</button>
              <button type="submit" form="warehouseForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium border border-[#1774b5] hover:bg-[#135d90] rounded-sm shadow-sm transition-colors">
                {editingId ? 'Update Details' : 'Save Location'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;