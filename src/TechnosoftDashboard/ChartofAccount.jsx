import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Search, Edit, Trash2, X, BookOpen, 
  Sparkles, BrainCircuit, Landmark, Wallet, Briefcase, Calculator
} from 'lucide-react';

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormState = {
    account_code: '',
    account_name: '',
    account_type: 'Asset', // Asset, Liability, Equity, Revenue, Expense
    description: '',
    balance: 0,
    status: 'Active'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('account_code', { ascending: true });
        
      if (data) setAccounts(data);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ---
  const calculateInsights = () => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    accounts.forEach(acc => {
      if (acc.account_type === 'Asset') totalAssets += Number(acc.balance);
      if (acc.account_type === 'Liability') totalLiabilities += Number(acc.balance);
    });

    const currentRatio = totalLiabilities > 0 ? (totalAssets / totalLiabilities).toFixed(2) : 'N/A';

    let aiAdvice = "Ensure you reconcile your main bank accounts at the end of every month.";
    if (accounts.length === 0) {
        aiAdvice = "Your Chart of Accounts is empty. Start by adding your Bank Account (Asset) and Share Capital (Equity).";
    } else if (currentRatio !== 'N/A' && currentRatio < 1) {
        aiAdvice = `Liquidity Alert: Your liabilities currently exceed your assets (Current Ratio: ${currentRatio}). Monitor cash flow closely.`;
    } else if (currentRatio !== 'N/A' && currentRatio > 2) {
        aiAdvice = `Healthy Liquidity: Your assets comfortably cover your liabilities (Current Ratio: ${currentRatio}).`;
    }

    return { totalAssets, totalLiabilities, currentRatio, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. CRUD ACTIONS ---
  const openModal = (accToEdit = null) => {
    if (accToEdit) {
      setEditingId(accToEdit.id);
      setFormData(accToEdit);
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
      account_code: formData.account_code,
      account_name: formData.account_name,
      account_type: formData.account_type,
      description: formData.description,
      balance: parseFloat(formData.balance) || 0,
      status: formData.status
    };

    try {
      if (editingId) {
        // THE FIX: Explicitly check for an error object returned by Supabase
        const { error } = await supabase.from('chart_of_accounts').update(payload).eq('id', editingId);
        if (error) throw error; 
      } else {
        // THE FIX: Explicitly check for an error object returned by Supabase
        const { error } = await supabase.from('chart_of_accounts').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert(`Failed to save account: ${error.message}`);
    }
  };

  const deleteAccount = async (id) => {
    if (window.confirm("Delete this account? Ensure it has a zero balance before deleting.")) {
      const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id);
      if (error) alert(`Failed to delete: ${error.message}`);
      fetchData();
    }
  };

  // --- 4. FILTERING ---
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.account_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          acc.account_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "All" ? true : acc.account_type === filterType;
    return matchesSearch && matchesType;
  });

  const getAccountTypeColor = (type) => {
      switch(type) {
          case 'Asset': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
          case 'Liability': return 'bg-rose-50 text-rose-700 border-rose-200';
          case 'Equity': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
          case 'Revenue': return 'bg-blue-50 text-blue-700 border-blue-200';
          case 'Expense': return 'bg-amber-50 text-amber-700 border-amber-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  };

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-regular tracking-tight">Chart of Accounts</h1>
        </div>
        <div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors shadow-sm rounded-sm">
            <Plus size={16} /> Add Account
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
              <h2 className="text-base font-medium text-white leading-tight">Ledger Health</h2>
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
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Landmark size={12}/> Total Assets</p>
            <p className="text-2xl font-bold text-white">Rs {insights.totalAssets.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Briefcase size={12}/> Total Liabilities</p>
            <p className="text-2xl font-bold text-amber-200">Rs {insights.totalLiabilities.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Calculator size={12}/> Current Ratio</p>
            <p className="text-2xl font-bold text-white">{insights.currentRatio}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
              type="text" 
              placeholder="Search by account name or code (e.g. 1000)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1774b5] shadow-sm transition-colors" 
          />
        </div>
        
        <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-sm text-slate-700 outline-none focus:border-[#1774b5] rounded-sm shadow-sm cursor-pointer"
        >
            <option value="All">All Account Types</option>
            <option value="Asset">Assets</option>
            <option value="Liability">Liabilities</option>
            <option value="Equity">Equity</option>
            <option value="Revenue">Revenue</option>
            <option value="Expense">Expenses</option>
        </select>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100 w-1/3">Account Details</th>
                <th className="py-4 px-6 border-r border-slate-100 w-1/6">Type</th>
                <th className="py-4 px-6 border-r border-slate-100 w-1/4">Current Balance</th>
                <th className="py-4 px-6 border-r border-slate-100">Status</th>
                <th className="py-4 px-6 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading ledger accounts...</td></tr>
              ) : filteredAccounts.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No accounts match your criteria.</td></tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Details */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 rounded-sm">
                          <BookOpen size={18} className="text-[#1774b5]" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 mb-0.5">{acc.account_name}</p>
                          <p className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm inline-block">Code: {acc.account_code}</p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-sm ${getAccountTypeColor(acc.account_type)}`}>
                        {acc.account_type}
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-bold text-slate-900">Rs {Number(acc.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-sm ${
                        acc.status === 'Active' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {acc.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openModal(acc)} className="text-slate-400 hover:text-[#1774b5] transition-colors p-1" title="Edit">
                            <Edit size={16} />
                        </button>
                        <button onClick={() => deleteAccount(acc.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Delete">
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
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Ledger Account' : 'Add New Account'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="p-6 custom-scrollbar">
              <form id="accountForm" onSubmit={handleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Account Name *</label>
                        <input required type="text" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="e.g. Cash in Bank (Nabil)" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Account Code *</label>
                        <input required type="text" value={formData.account_code} onChange={e => setFormData({...formData, account_code: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] font-mono" placeholder="e.g. 1000" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Account Type *</label>
                        <select value={formData.account_type} onChange={e => setFormData({...formData, account_type: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] cursor-pointer">
                            <option value="Asset">Asset</option>
                            <option value="Liability">Liability</option>
                            <option value="Equity">Equity</option>
                            <option value="Revenue">Revenue</option>
                            <option value="Expense">Expense</option>
                        </select>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Opening / Current Balance</label>
                  <input type="number" step="0.01" value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-base font-bold text-[#1774b5] rounded-sm outline-none focus:border-[#1774b5]" placeholder="0.00" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Description (Optional)</label>
                  <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] resize-y" placeholder="What is this account used for?" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] cursor-pointer">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors rounded-sm">Cancel</button>
              <button type="submit" form="accountForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium border border-[#1774b5] hover:bg-[#135d90] transition-colors shadow-sm rounded-sm">
                {editingId ? 'Save Changes' : 'Create Account'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;