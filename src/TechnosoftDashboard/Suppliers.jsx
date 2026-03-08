import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Search, Edit, Trash2, X, Building2, 
  Phone, Mail, MapPin, Sparkles, BrainCircuit, ShieldAlert, User, CheckCircle
} from 'lucide-react';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormState = {
    name: '', 
    contact_person: '', 
    email: '', 
    phone: '', 
    address: '',
    pan_number: '',
    status: 'Active'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:suppliers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      // THE FIX: Added .eq('user_id', session.user.id) to strictly fetch this user's data
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', session.user.id) // <--- ADD THIS LINE
        .order('name', { ascending: true });
        
      if (error) console.error("Fetch error:", error);
      if (data) setSuppliers(data);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ---
  const calculateInsights = () => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status === 'Active').length;
    const missingPan = suppliers.filter(s => !s.pan_number || s.pan_number.trim() === '').length;

    let aiAdvice = "Maintain strong vendor relationships to negotiate better purchasing rates.";
    if (missingPan > 0) {
        aiAdvice = `Compliance Alert: ${missingPan} of your suppliers are missing PAN/VAT details. You need this to claim Input VAT on the Tax screen.`;
    } else if (total > 0 && missingPan === 0) {
        aiAdvice = "Great job! All your suppliers have PAN details recorded, ensuring seamless IRD tax compliance.";
    }

    return { total, active, missingPan, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. ACTIONS ---
  const openModal = (supplierToEdit = null) => {
    if (supplierToEdit) {
      setEditingId(supplierToEdit.id);
      setFormData(supplierToEdit);
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
      contact_person: formData.contact_person,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      pan_number: formData.pan_number,
      status: formData.status
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setFormData(initialFormState);
      fetchData();
    } catch (error) {
      console.error(error);
      alert(`Failed to save supplier details: ${error.message}`);
    }
  };

  const deleteSupplier = async (id) => {
    if (window.confirm("Are you sure you want to remove this supplier from your directory?")) {
      await supabase.from('suppliers').delete().eq('id', id);
      fetchData();
    }
  };

  // --- 4. FILTERING ---
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.pan_number && s.pan_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors & Suppliers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your supply chain contacts and billing details.</p>
        </div>
        <div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors shadow-sm rounded-sm">
            <Plus size={16} /> Add Supplier
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
              <h2 className="text-base font-medium text-white leading-tight">Supplier Health & Compliance</h2>
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
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Building2 size={12}/> Total Suppliers</p>
            <p className="text-2xl font-bold text-white">{insights.total}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><CheckCircle size={12}/> Active Accounts</p>
            <p className="text-2xl font-bold text-emerald-300">{insights.active}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><ShieldAlert size={12}/> Missing PAN / VAT</p>
            <p className={`text-2xl font-bold ${insights.missingPan > 0 ? 'text-amber-300' : 'text-white'}`}>{insights.missingPan}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search by company name, contact person, or PAN..." 
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
                <th className="py-4 px-6 border-r border-slate-100 w-1/3">Company Details</th>
                <th className="py-4 px-6 border-r border-slate-100">Primary Contact</th>
                <th className="py-4 px-6 border-r border-slate-100">Status</th>
                <th className="py-4 px-6 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading directory...</td></tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No suppliers found.</td></tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Details */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 rounded-sm">
                          <Building2 size={18} className="text-[#1774b5]" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight mb-1">{supplier.name}</p>
                          <div className="flex flex-col gap-1">
                            {supplier.pan_number ? (
                                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm inline-block w-fit">PAN: {supplier.pan_number}</span>
                            ) : (
                                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1 w-fit"><ShieldAlert size={10}/> Missing PAN</span>
                            )}
                            {supplier.address && (
                                <span className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                                    <MapPin size={12} className="shrink-0 mt-0.5" /> {supplier.address}
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
                        <User size={14} className="text-[#1774b5]" />
                        {supplier.contact_person || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mb-1">
                        <Phone size={12} className="text-slate-400" /> {supplier.phone || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-400" /> {supplier.email || 'N/A'}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border rounded-sm ${
                        supplier.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openModal(supplier)} className="text-slate-400 hover:text-[#1774b5] transition-colors p-1" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteSupplier(supplier.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Delete">
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
          <div className="bg-white w-full max-w-2xl shadow-2xl rounded-md border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Supplier Profile' : 'Add New Supplier'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="p-6 custom-scrollbar">
              <form id="supplierForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Company Info */}
                <div>
                  <h3 className="text-sm font-bold text-[#1774b5] uppercase tracking-wide border-b border-blue-100 pb-2 mb-4">1. Company Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Supplier / Company Name *</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="e.g. Global Tech Distributors Pvt Ltd" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">PAN / VAT Number</label>
                      <input type="text" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] font-mono" placeholder="9-digit IRD Number" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] cursor-pointer">
                        <option value="Active">Active Vendor</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Full Business Address</label>
                      <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] resize-y" placeholder="e.g. Putalisadak, Kathmandu, Nepal" />
                    </div>
                  </div>
                </div>

                {/* 2. Contact Info */}
                <div>
                  <h3 className="text-sm font-bold text-[#1774b5] uppercase tracking-wide border-b border-blue-100 pb-2 mb-4">2. Primary Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Contact Person Name</label>
                      <input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="e.g. Shyam Thapa" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Phone Number</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="+977 98..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Email Address</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="sales@supplier.com" />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button onClick={() => setIsModalOpen(false)} type="button" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-sm transition-colors">Cancel</button>
              <button type="submit" form="supplierForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium border border-[#1774b5] hover:bg-[#135d90] rounded-sm shadow-sm transition-colors flex items-center gap-2">
                <CheckCircle size={16} /> {editingId ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;