import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Search, Edit, Trash2, X, Mail, Phone, 
  MapPin, Sparkles, BrainCircuit, Users, Star, 
  Download, Building, ShieldCheck, AlertTriangle
} from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormState = {
    name: '', email: '', phone: '', company_name: '', pan_vat: '',
    address: '', city: '', country: 'Nepal', status: 'Active'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (custError) console.error("Error fetching customers:", custError);
      else if (custData) setCustomers(custData);

      const { data: orderData } = await supabase
        .from('orders')
        .select('customer_name, customer_email, amount, status, created_at')
        .eq('user_id', session.user.id)
        .neq('status', 'Cancelled');
        
      if (orderData) setOrders(orderData);
    }
    setLoading(false);
  };

  // --- 2. CALCULATE LIFETIME VALUE & AI SEGMENT ---
  const getCustomerStats = (customer) => {
    // 1. Find all orders for this customer
    const customerOrders = orders.filter(o => 
      (customer.email && o.customer_email && o.customer_email.toLowerCase() === customer.email.toLowerCase()) ||
      (o.customer_name.toLowerCase() === customer.name.toLowerCase())
    );
    
    const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.amount), 0);
    const orderCount = customerOrders.length;
    
    // 2. Find Recency (Days since last order)
    let lastOrderDate = new Date(0);
    customerOrders.forEach(o => {
        const d = new Date(o.created_at);
        if (d > lastOrderDate) lastOrderDate = d;
    });

    const now = new Date();
    const daysSinceLastOrder = orderCount > 0 ? Math.floor((now - lastOrderDate) / (1000 * 60 * 60 * 24)) : 999;

    // 3. Debt Assessment
    const limit = Number(customer.credit_limit) || 0;
    const debt = Number(customer.outstanding_balance) || 0;
    const debtRatio = limit > 0 ? (debt / limit) : 0;

    // 4. Dynamic Segmentation Logic
    let segment = 'New / Unsegmented';
    let segmentColor = 'bg-slate-100 text-slate-600 border-slate-200';

    if (debt > 0 && debtRatio >= 0.8) {
        segment = 'High Debt Risk';
        segmentColor = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (orderCount >= 3 && totalSpent > 10000 && daysSinceLastOrder <= 30) {
        segment = 'VIP Champions';
        segmentColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    } else if (orderCount > 1 && daysSinceLastOrder <= 60) {
        segment = 'Loyal Regulars';
        segmentColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (orderCount === 1 && daysSinceLastOrder <= 30) {
        segment = 'Recent Buyers';
        segmentColor = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (orderCount > 0 && daysSinceLastOrder > 60) {
        segment = 'At Risk (Sleeping)';
        segmentColor = 'bg-amber-50 text-amber-700 border-amber-200';
    }

    return { totalSpent, orderCount, daysSinceLastOrder, segment, segmentColor };
  };

  // --- 3. AI INSIGHTS ---
  const calculateInsights = () => {
    const total = customers.length;
    let totalRevenue = 0;
    let vipCount = 0;
    let riskCount = 0;

    customers.forEach(c => {
      const stats = getCustomerStats(c);
      totalRevenue += stats.totalSpent;
      if (stats.segment === 'VIP Champions') vipCount++;
      if (stats.segment === 'At Risk (Sleeping)' || stats.segment === 'High Debt Risk') riskCount++;
    });

    const avgLTV = total > 0 ? (totalRevenue / total).toFixed(0) : 0;

    let aiAdvice = "Your customer base is growing. Focus on retention and repeat orders.";
    if (riskCount > vipCount) {
        aiAdvice = `Retention Alert: You have ${riskCount} clients tagged as "At Risk" or "High Debt". Prioritize re-engagement and collection.`;
    } else if (vipCount > 0) {
        aiAdvice = `Excellent: You have ${vipCount} active VIP Champions. Treat them well to maintain your baseline revenue.`;
    }

    return { total, avgLTV, vipCount, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 4. ACTIONS ---
  const openModal = (customerToEdit = null) => {
    if (customerToEdit) {
      setEditingId(customerToEdit.id);
      setFormData({
        name: customerToEdit.name || '',
        email: customerToEdit.email || '',
        phone: customerToEdit.phone || '',
        company_name: customerToEdit.company_name || '',
        pan_vat: customerToEdit.pan_vat || '',
        address: customerToEdit.address || '',
        city: customerToEdit.city || '',
        country: customerToEdit.country || 'Nepal',
        status: customerToEdit.status || 'Active'
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Session expired.");

    const payload = {
      user_id: currentUser.id,
      name: formData.name, 
      email: formData.email || null, 
      phone: formData.phone || null,
      company_name: formData.company_name || null, 
      pan_vat: formData.pan_vat || null,
      address: formData.address || null, 
      city: formData.city || null, 
      country: formData.country || 'Nepal',
      status: formData.status || 'Active'
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert([payload]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setFormData(initialFormState); 
      fetchData(); 
    } catch (error) {
      alert(`Failed to save customer!\nReason: ${error.message}`);
    }
  };

  const deleteCustomer = async (id) => {
    if (window.confirm("Delete this customer? Past orders will remain, but the directory entry will be removed.")) {
      await supabase.from('customers').delete().eq('id', id);
      fetchData();
    }
  };

  const exportToCSV = () => {
    if (customers.length === 0) return alert("No customers to export.");
    const headers = ["Name", "Email", "Phone", "Company", "Segment", "Total Spent (LTV)", "Orders"];
    const csvRows = [headers.join(',')];
    
    customers.forEach(c => {
      const stats = getCustomerStats(c);
      csvRows.push(`"${c.name}",${c.email || ''},${c.phone || ''},"${c.company_name || ''}",${stats.segment},${stats.totalSpent},${stats.orderCount}`);
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // --- FILTERING ---
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-lg font-regular tracking-tight text-slate-800">Customer Directory</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/80 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm shadow-slate-200/50">
            <Download size={16} className="text-[#1774b5]"/> Export CRM
          </button>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] rounded-lg transition-colors shadow-sm">
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {/* AI INSIGHTS BANNER (Flat UI) */}
      <div className="w-full bg-[#1774b5] text-white p-6 mb-8 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 pb-6 border-b border-blue-400/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 text-white rounded-md">
              <BrainCircuit size={24} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Technosoft CRM Insight</p>
              <h2 className="text-xl font-bold text-white leading-tight">Client Base Analytics</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-medium text-blue-50 bg-blue-900/40 p-3 rounded-md inline-flex items-start gap-2 border border-blue-400/20 text-left">
               <Sparkles size={16} className="shrink-0 text-amber-300 mt-0.5" />
               <span>{insights.aiAdvice}</span>
             </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Users size={14}/> Total Customers</p>
            <p className="text-3xl font-black text-white">{insights.total}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Star size={14}/> VIP Champions</p>
            <p className="text-3xl font-black text-amber-300">{insights.vipCount}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Building size={14}/> Average LTV</p>
            <p className="text-2xl font-bold text-white mt-1">Rs {Number(insights.avgLTV).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search by name, email, or company..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-lg text-sm focus:outline-none focus:border-[#1774b5] transition-colors shadow-sm shadow-slate-200/50" 
        />
      </div>

      {/* DATA TABLE (Flat UI) */}
      <div className="bg-white border border-slate-200/60 w-full rounded-lg overflow-hidden shadow-sm shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100 pl-6 w-1/3">Client Details</th>
                <th className="py-4 px-6 border-r border-slate-100">Contact Info</th>
                <th className="py-4 px-6 border-r border-slate-100">Performance & Segment</th>
                <th className="py-4 px-6 border-r border-slate-100">Status</th>
                <th className="py-4 px-6 text-center pr-6">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400">Loading directory...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400">No customers found in database.</td></tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const stats = getCustomerStats(customer);
                  const isVIP = stats.segment === 'VIP Champions';

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Details */}
                      <td className="py-4 px-6 pl-6 border-r border-slate-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 rounded-md">
                            <Users size={18} className="text-[#1774b5]" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-tight flex items-center gap-2">
                                {customer.name}
                                {isVIP && <Star size={12} className="text-amber-500 fill-amber-500" title="VIP Client" />}
                            </p>
                            {customer.company_name && (
                                <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                                    <Building size={10} /> {customer.company_name}
                                </p>
                            )}
                            {customer.pan_vat && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded inline-block mt-1">PAN: {customer.pan_vat}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <div className="flex flex-col gap-1.5">
                            {customer.email && (
                                <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                                  <Mail size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{customer.email}</span>
                                </p>
                            )}
                            {customer.phone && (
                                <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium font-mono">
                                  <Phone size={12} className="text-slate-400 shrink-0" /> {customer.phone}
                                </p>
                            )}
                            {(customer.city || customer.address) && (
                                <p className="text-[11px] text-slate-500 flex items-start gap-1.5 mt-0.5">
                                  <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" /> 
                                  <span className="line-clamp-1">{customer.city ? `${customer.city}, ${customer.country}` : customer.address}</span>
                                </p>
                            )}
                        </div>
                      </td>

                      {/* Performance & AI Segment */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <div className="flex flex-col items-start gap-1.5">
                            <p className="font-bold text-slate-900 text-base leading-none">Rs {stats.totalSpent.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1">From {stats.orderCount} Order(s)</p>
                            <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border rounded ${stats.segmentColor}`}>
                                {stats.segment}
                            </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase border rounded-full ${
                          customer.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {customer.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 pr-6">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => openModal(customer)} className="text-slate-400 hover:text-[#1774b5] transition-colors p-1.5 bg-slate-50 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200" title="Edit Profile">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => deleteCustomer(customer.id)} className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 bg-slate-50 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200" title="Delete Customer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD/EDIT MODAL (Flat UI) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl shrink-0">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Customer Profile' : 'Add New Customer'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 custom-scrollbar">
              <form id="customerForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Basic Info */}
                <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-[#1774b5] uppercase tracking-wide mb-4">1. Personal & Contact Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Full Name *</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="e.g. Ram Bahadur Thapa" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Email Address</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="client@example.com" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Phone Number</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors font-mono" placeholder="+977 98..." />
                    </div>
                  </div>
                </div>

                {/* 2. Business Info (Optional) */}
                <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-[#1774b5] uppercase tracking-wide mb-4">2. Business / B2B Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Company / Business Name</label>
                      <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="e.g. Thapa Traders Pvt Ltd" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">PAN / VAT Number</label>
                      <input type="text" value={formData.pan_vat} onChange={e => setFormData({...formData, pan_vat: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors font-mono" placeholder="9-digit IRD Number" />
                    </div>
                  </div>
                </div>

                {/* 3. Address Info */}
                <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-[#1774b5] uppercase tracking-wide mb-4">3. Billing & Shipping Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Street Address</label>
                      <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="e.g. Ring Road, Koteshwor" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">City</label>
                      <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="e.g. Kathmandu" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Country</label>
                      <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Account Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] cursor-pointer transition-colors font-medium">
                        <option value="Active">Active Account</option>
                       <option value="Inactive">Inactive / Suspended</option>
                      </select>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-xl shrink-0">
              <button onClick={() => setIsModalOpen(false)} type="button" className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="customerForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-bold hover:bg-[#135d90] rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-blue-900/20">
                <ShieldCheck size={18} /> {editingId ? 'Update Profile' : 'Save Customer'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;