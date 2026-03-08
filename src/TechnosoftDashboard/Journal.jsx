import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Book, Plus, Search, Trash2, X, CheckCircle, 
  AlertCircle, FileText, ArrowRightLeft, AlignLeft
} from 'lucide-react';

const JournalEntries = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [entries, setEntries] = useState([]);
  const [chartOfAccounts, setChartOfAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewOnlyEntry, setViewOnlyEntry] = useState(null); // For viewing past entries

  // Form State
  const initialFormState = {
    entry_date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    lines: [
        { id: 1, account_name: '', description: '', debit: '', credit: '' },
        { id: 2, account_name: '', description: '', debit: '', credit: '' }
    ]
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
      
      // Fetch Past Journal Entries
      const { data: jeData } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (jeData) setEntries(jeData);

      // Fetch Chart of Accounts for the dropdowns
      const { data: coaData } = await supabase
        .from('chart_of_accounts')
        .select('account_code, account_name, account_type')
        .eq('user_id', session.user.id)
        .eq('status', 'Active')
        .order('account_code', { ascending: true });
      if (coaData) setChartOfAccounts(coaData);
    }
    setLoading(false);
  };

  // --- 2. FORM LINE MANAGEMENT ---
  const addLine = () => {
      setFormData({
          ...formData,
          lines: [...formData.lines, { id: Date.now(), account_name: '', description: '', debit: '', credit: '' }]
      });
  };

  const removeLine = (idToRemove) => {
      if (formData.lines.length <= 2) return alert("A journal entry must have at least 2 lines.");
      setFormData({
          ...formData,
          lines: formData.lines.filter(line => line.id !== idToRemove)
      });
  };

  const handleLineChange = (id, field, value) => {
      const updatedLines = formData.lines.map(line => {
          if (line.id === id) {
              const updated = { ...line, [field]: value };
              // Auto-clear opposite field to prevent user from putting both Debit and Credit on same line
              if (field === 'debit' && value !== '') updated.credit = '';
              if (field === 'credit' && value !== '') updated.debit = '';
              return updated;
          }
          return line;
      });
      setFormData({ ...formData, lines: updatedLines });
  };

  // --- 3. MATH & VALIDATION ---
  const calculateTotals = () => {
      let totalDebit = 0;
      let totalCredit = 0;
      
      formData.lines.forEach(line => {
          totalDebit += parseFloat(line.debit) || 0;
          totalCredit += parseFloat(line.credit) || 0;
      });

      return { totalDebit, totalCredit, isBalanced: totalDebit === totalCredit && totalDebit > 0 };
  };

  const totals = calculateTotals();

  // --- 4. ACTIONS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Session expired.");

    // Strict Double-Entry Validation
    if (!totals.isBalanced) {
        return alert(`Your entry is not balanced! \nTotal Debits: Rs ${totals.totalDebit} \nTotal Credits: Rs ${totals.totalCredit}`);
    }

    // Ensure all lines have an account selected
    const hasEmptyAccounts = formData.lines.some(l => !l.account_name);
    if (hasEmptyAccounts) return alert("Please select an account for every line item.");

    const payload = {
        user_id: currentUser.id,
        entry_date: formData.entry_date,
        reference: formData.reference,
        description: formData.description,
        total_amount: totals.totalDebit, // Since they are equal, we just save the balanced amount
        lines: formData.lines.map(l => ({
            account_name: l.account_name,
            description: l.description,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0
        }))
    };

    try {
        const { error } = await supabase.from('journal_entries').insert([payload]);
        if (error) throw error;
        
        setIsModalOpen(false);
        setFormData(initialFormState);
        fetchData();
    } catch (err) {
        console.error(err);
        alert(`Failed to save Journal Entry: ${err.message}`);
    }
  };

  const deleteEntry = async (id) => {
      if (window.confirm("Are you sure you want to void/delete this journal entry? This will permanently remove it from the ledger.")) {
          const { error } = await supabase.from('journal_entries').delete().eq('id', id);
          if (error) alert(`Failed to delete: ${error.message}`);
          fetchData();
      }
  };

  const openViewModal = (entry) => {
      setViewOnlyEntry(entry);
  };

  const filteredEntries = entries.filter(e => 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.reference && e.reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-lg font-regular tracking-tight text-slate-800 flex items-center gap-2">
            Journal Entries
          </h1>
        </div>
        <button onClick={() => { setFormData(initialFormState); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors shadow-sm rounded-lg">
          <Plus size={16} /> New Journal Entry
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search by description or reference..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-lg text-sm focus:outline-none focus:border-[#1774b5] shadow-sm shadow-slate-200/50 transition-colors" 
        />
      </div>

      {/* DATA TABLE (Flat & Clean) */}
      <div className="bg-white border border-slate-200/60 rounded-lg shadow-sm shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6 pl-6">Date & Ref</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Lines</th>
                <th className="py-4 px-6 text-right">Total Amount</th>
                <th className="py-4 px-6 text-center pr-6">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400">Loading journal ledger...</td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400">No journal entries found. Create one to adjust your books.</td></tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onDoubleClick={() => openViewModal(entry)}>
                    <td className="py-4 px-6 pl-6">
                      <p className="font-semibold text-slate-800">{new Date(entry.entry_date).toLocaleDateString()}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">Ref: {entry.reference || 'N/A'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-slate-700 truncate max-w-[250px]">{entry.description}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">
                        {entry.lines ? entry.lines.length : 0} Accounts
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className="font-bold text-slate-900">Rs {Number(entry.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </td>
                    <td className="py-4 px-6 text-center pr-6">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openViewModal(entry)} className="text-slate-400 hover:text-[#1774b5] transition-colors p-1" title="View Entry">
                            <AlignLeft size={16} />
                        </button>
                        <button onClick={() => deleteEntry(entry.id)} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Delete">
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

      {/* --- CREATE JOURNAL ENTRY MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-5xl shadow-2xl rounded-lg border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ArrowRightLeft size={18} className="text-[#1774b5]"/> Record Journal Entry</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
              <form id="jeForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-white p-5 rounded-lg border border-slate-200/60 shadow-sm shadow-slate-200/30">
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Entry Date *</label>
                        <input required type="date" value={formData.entry_date} onChange={e => setFormData({...formData, entry_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm font-medium rounded-md outline-none focus:border-[#1774b5] transition-colors" />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Reference #</label>
                        <input type="text" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors font-mono" placeholder="e.g. ADJ-001" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Description / Memo *</label>
                        <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="Why are you making this entry?" />
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="bg-white rounded-lg border border-slate-200/60 shadow-sm shadow-slate-200/30 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-3 pl-4 w-1/3">Account</th>
                                    <th className="p-3 w-1/3">Line Description</th>
                                    <th className="p-3 w-32 text-right">Debit (Rs)</th>
                                    <th className="p-3 w-32 text-right">Credit (Rs)</th>
                                    <th className="p-3 w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {formData.lines.map((line, index) => (
                                    <tr key={line.id} className="hover:bg-slate-50/50">
                                        <td className="p-2 pl-4">
                                            <select 
                                                required 
                                                value={line.account_name} 
                                                onChange={e => handleLineChange(line.id, 'account_name', e.target.value)}
                                                className="w-full bg-transparent border border-slate-200 p-2 text-xs rounded-md outline-none focus:border-[#1774b5] cursor-pointer"
                                            >
                                                <option value="" disabled>Select Account...</option>
                                                {chartOfAccounts.map(acc => (
                                                    <option key={acc.account_code} value={`${acc.account_code} - ${acc.account_name}`}>
                                                        {acc.account_code} - {acc.account_name} ({acc.account_type})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <input 
                                                type="text" 
                                                value={line.description} 
                                                onChange={e => handleLineChange(line.id, 'description', e.target.value)}
                                                className="w-full bg-transparent border border-slate-200 p-2 text-xs rounded-md outline-none focus:border-[#1774b5]" 
                                                placeholder="Optional memo"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input 
                                                type="number" min="0" step="0.01"
                                                value={line.debit} 
                                                onChange={e => handleLineChange(line.id, 'debit', e.target.value)}
                                                className="w-full bg-transparent border border-slate-200 p-2 text-xs text-right font-medium rounded-md outline-none focus:border-[#1774b5]" 
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input 
                                                type="number" min="0" step="0.01"
                                                value={line.credit} 
                                                onChange={e => handleLineChange(line.id, 'credit', e.target.value)}
                                                className="w-full bg-transparent border border-slate-200 p-2 text-xs text-right font-medium rounded-md outline-none focus:border-[#1774b5]" 
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="p-2 text-center pr-2">
                                            <button type="button" onClick={() => removeLine(line.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                                                <Trash2 size={14}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Totals & Add Line Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button type="button" onClick={addLine} className="text-xs font-bold text-[#1774b5] hover:text-[#135d90] flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 transition-colors">
                            <Plus size={14}/> Add New Line
                        </button>
                        
                        <div className="flex items-center gap-6 pr-10">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Debits</p>
                                <p className="text-sm font-black text-slate-800">Rs {totals.totalDebit.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Credits</p>
                                <p className="text-sm font-black text-slate-800">Rs {totals.totalCredit.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Validation Indicator */}
                <div className={`p-3 rounded-lg flex items-center justify-center gap-2 border text-sm font-bold ${
                    totals.totalDebit === 0 ? 'bg-slate-50 border-slate-200 text-slate-500' :
                    totals.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                    {totals.totalDebit === 0 ? <span className="opacity-70">Enter amounts to balance journal.</span> : 
                     totals.isBalanced ? <><CheckCircle size={16}/> Debits and Credits perfectly balanced.</> : 
                     <><AlertCircle size={16}/> Out of balance! Difference: Rs {Math.abs(totals.totalDebit - totals.totalCredit).toLocaleString()}</>}
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-lg shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg shadow-sm">Cancel</button>
              <button 
                  type="submit" form="jeForm" 
                  disabled={!totals.isBalanced}
                  className={`px-6 py-2.5 text-white text-sm font-bold transition-all shadow-sm rounded-lg flex items-center gap-2 ${totals.isBalanced ? 'bg-[#1774b5] hover:bg-[#135d90] cursor-pointer' : 'bg-slate-400 cursor-not-allowed opacity-70'}`}
              >
                <Book size={16} /> Post Journal Entry
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- VIEW PAST ENTRY MODAL --- */}
      {viewOnlyEntry && (
          <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-3xl shadow-2xl rounded-lg border border-slate-200 flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/80 rounded-t-lg">
                  <div>
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-[#1774b5]"/> Journal Voucher</h2>
                      <p className="text-xs text-slate-500 mt-1 font-mono">Date: {new Date(viewOnlyEntry.entry_date).toLocaleDateString()} | Ref: {viewOnlyEntry.reference || 'N/A'}</p>
                  </div>
                  <button onClick={() => setViewOnlyEntry(null)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20}/></button>
              </div>
              <div className="p-6">
                  <p className="text-sm text-slate-700 font-medium mb-4 bg-slate-50 p-3 border border-slate-100 rounded-md">
                      <strong>Memo:</strong> {viewOnlyEntry.description}
                  </p>
                  <table className="w-full text-left text-sm border-collapse border border-slate-200">
                      <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="p-3 border-r border-slate-200">Account</th>
                              <th className="p-3 border-r border-slate-200 text-right w-32">Debit</th>
                              <th className="p-3 text-right w-32">Credit</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {viewOnlyEntry.lines.map((l, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="p-3 border-r border-slate-100">
                                      <p className="font-semibold text-slate-800">{l.account_name}</p>
                                      {l.description && <p className="text-[10px] text-slate-500 mt-0.5">{l.description}</p>}
                                  </td>
                                  <td className="p-3 border-r border-slate-100 text-right font-medium">{l.debit > 0 ? l.debit.toLocaleString() : '-'}</td>
                                  <td className="p-3 text-right font-medium">{l.credit > 0 ? l.credit.toLocaleString() : '-'}</td>
                              </tr>
                          ))}
                          <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-800">
                              <td className="p-3 border-r border-slate-200 text-right text-[11px] uppercase tracking-widest">Totals</td>
                              <td className="p-3 border-r border-slate-200 text-right">Rs {Number(viewOnlyEntry.total_amount).toLocaleString()}</td>
                              <td className="p-3 text-right">Rs {Number(viewOnlyEntry.total_amount).toLocaleString()}</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
            </div>
          </div>
      )}

    </div>
  );
};

export default JournalEntries;