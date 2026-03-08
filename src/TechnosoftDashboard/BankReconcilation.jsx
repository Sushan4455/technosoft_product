import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  Landmark, UploadCloud, Search, CheckCircle, AlertTriangle, 
  Link as LinkIcon, BrainCircuit, Sparkles, X, Plus, 
  ArrowRight, Wallet, TrendingUp, TrendingDown, Building, 
  FileSpreadsheet, AlertCircle, Receipt, ShoppingCart, Calendar,
  Wand2, Settings2, SplitSquareHorizontal, FileOutput, CheckSquare,
  Activity, Trash2
} from 'lucide-react';

const BankReconciliation = () => {
  const [bankFeeds, setBankFeeds] = useState([]);
  const [internalLedger, setInternalLedger] = useState([]);
  const [bankAccount, setBankAccount] = useState(null); 
  const [liveMath, setLiveMath] = useState({ revenue: 0, outflow: 0 }); 
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]); 
  
  // UI States
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [selectedBankTx, setSelectedBankTx] = useState(null);
  const fileInputRef = useRef(null);

  const [bankForm, setBankForm] = useState({ 
      bank_name: '', account_number: '', starting_balance: '' 
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
      date: new Date().toISOString().split('T')[0], description: '', type: 'Debit', amount: '', reason: 'Bank Fee'
  });

  // --- 1. FETCH & PROCESS DATA ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      // Fetch Bank Account
      const { data: bankAccData } = await supabase.from('bank_accounts').select('*').eq('user_id', session.user.id).single();
      if (bankAccData) {
          setBankAccount(bankAccData);
          setBankForm({
              bank_name: bankAccData.bank_name || '',
              account_number: bankAccData.account_number || '',
              starting_balance: bankAccData.starting_balance || ''
          });
      }

      // Fetch Bank Feeds
      const { data: bankData } = await supabase.from('bank_transactions').select('*').eq('user_id', session.user.id).order('transaction_date', { ascending: false });
      
      // Process Suspicious / Duplicate Flags
      let processedFeeds = [];
      if (bankData) {
          const amounts = bankData.map(t => Number(t.amount));
          const avgAmount = amounts.length > 0 ? amounts.reduce((a,b)=>a+b, 0) / amounts.length : 0;
          
          const seenDocs = new Set();
          processedFeeds = bankData.map(tx => {
              let flag = null;
              const dupKey = `${tx.transaction_date}-${tx.amount}-${tx.type}`;
              
              if (seenDocs.has(dupKey)) flag = 'Duplicate Risk';
              else if (Number(tx.amount) > (avgAmount * 5) && avgAmount > 1000) flag = 'Unusually Large';
              
              seenDocs.add(dupKey);
              return { ...tx, flag };
          });
      }
      setBankFeeds(processedFeeds);

      // Fetch Internal Records
      const { data: orders } = await supabase.from('orders').select('id, created_at, customer_name, amount').eq('user_id', session.user.id);
      const { data: expenses } = await supabase.from('expenses').select('id, expense_date, vendor_name, amount').eq('user_id', session.user.id);

      let totalRevenue = 0;
      let totalOutflow = 0;
      let mergedLedger = [];

      if (orders) {
        orders.forEach(o => {
            totalRevenue += Number(o.amount);
            mergedLedger.push({ id: o.id, type: 'Sale', date: o.created_at.split('T')[0], entity: o.customer_name, amount: Number(o.amount) });
        });
      }

      if (expenses) {
        expenses.forEach(e => {
            totalOutflow += Number(e.amount);
            mergedLedger.push({ id: e.id, type: 'Expense', date: e.expense_date, entity: e.vendor_name, amount: Number(e.amount) });
        });
      }

      setLiveMath({ revenue: totalRevenue, outflow: totalOutflow });
      mergedLedger.sort((a, b) => new Date(b.date) - new Date(a.date));
      setInternalLedger(mergedLedger);
    }
    setLoading(false);
  };

  // Calculations
  const systemBalance = (bankAccount ? Number(bankAccount.starting_balance) : 0) + liveMath.revenue - liveMath.outflow;
  
  let currentBankBalance = bankAccount ? Number(bankAccount.starting_balance) : 0;
  let unmatchedCount = 0;
  bankFeeds.forEach(tx => {
      if (tx.type === 'Credit') currentBankBalance += Number(tx.amount);
      else currentBankBalance -= Number(tx.amount);
      if (tx.status === 'Unmatched') unmatchedCount++;
  });

  const discrepancy = Math.abs(currentBankBalance - systemBalance);

  // --- 2. ADVANCED ACTIONS ---
  
  const handleSaveBankDetails = async (e) => {
      e.preventDefault();
      const payload = {
          user_id: currentUser.id, bank_name: bankForm.bank_name, account_number: bankForm.account_number, starting_balance: parseFloat(bankForm.starting_balance) || 0
      };
      if (bankAccount) await supabase.from('bank_accounts').update(payload).eq('id', bankAccount.id);
      else await supabase.from('bank_accounts').insert([payload]);
      setIsBankModalOpen(false);
      fetchData();
  };

  const handleAddAdjustment = async (e) => {
      e.preventDefault();
      const payload = {
          user_id: currentUser.id, transaction_date: adjustmentForm.date, 
          description: `${adjustmentForm.reason}: ${adjustmentForm.description}`, 
          type: adjustmentForm.type, amount: parseFloat(adjustmentForm.amount), 
          status: 'Matched', matched_type: 'Adjustment'
      };
      await supabase.from('bank_transactions').insert([payload]);
      setIsAdjustmentOpen(false);
      setAdjustmentForm({ date: new Date().toISOString().split('T')[0], description: '', type: 'Debit', amount: '', reason: 'Bank Fee' });
      fetchData();
  };

  const handleDeleteTransaction = async (id) => {
      if (window.confirm("Are you sure you want to delete this bank record completely?")) {
          try {
              await supabase.from('bank_transactions').delete().eq('id', id);
              fetchData();
          } catch (err) {
              alert(`Failed to delete: ${err.message}`);
          }
      }
  };

  const runAutoMatch = async () => {
      setLoading(true);
      let matchCount = 0;
      const unmatchedFeeds = bankFeeds.filter(f => f.status === 'Unmatched');
      
      for (const feed of unmatchedFeeds) {
          const expectedType = feed.type === 'Credit' ? 'Sale' : 'Expense';
          const exactMatch = internalLedger.find(l => l.type === expectedType && Number(l.amount) === Number(feed.amount));
          
          if (exactMatch) {
              await supabase.from('bank_transactions').update({ 
                  status: 'Matched', matched_type: exactMatch.type, matched_id: exactMatch.id 
              }).eq('id', feed.id);
              matchCount++;
          }
      }
      alert(`AI Auto-Match complete! Successfully linked ${matchCount} exact matches.`);
      fetchData();
  };

  const handleCSVImport = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setTimeout(() => {
          alert(`Successfully imported ${file.name}. \n(In a live environment, this parses rows into the bank table).`);
          setIsImportOpen(false);
      }, 1000);
  };

  const confirmMatch = async (internalRecord, isPartial = false) => {
    try {
        const payload = { 
            status: isPartial ? 'Partially Matched' : 'Matched', 
            matched_type: internalRecord.type, 
            matched_id: internalRecord.id 
        };
        await supabase.from('bank_transactions').update(payload).eq('id', selectedBankTx.id);
        setIsMatchModalOpen(false);
        setSelectedBankTx(null);
        fetchData();
    } catch (err) { alert(`Error: ${err.message}`); }
  };

  const unlinkTransaction = async (id) => {
      await supabase.from('bank_transactions').update({ status: 'Unmatched', matched_type: null, matched_id: null }).eq('id', id);
      fetchData();
  };

  const generateReport = () => {
      alert("Downloading Reconciliation Summary PDF...");
  };

  const filteredFeeds = bankFeeds.filter(tx => 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tx.amount.toString().includes(searchTerm)
  );

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500 bg-slate-50/50">
              <Settings2 className="animate-spin text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Syncing Ledgers & Verifying Balances...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
              <h1 className="text-lg font-regular tracking-tight text-slate-800 flex items-center gap-2">
                   Bank Matcher
              </h1>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-indigo-200">Reconciliation</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIsBankModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 transition-colors">
            <Settings2 size={14} className="text-slate-400" /> Bank Setup
          </button>
          <button onClick={generateReport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 transition-colors">
            <FileOutput size={14} className="text-slate-400" /> Export Summary
          </button>
        </div>
      </div>

      {/* TOP AI BANNER (Navy Blue instead of Red) */}
      <div className={`w-full text-white p-6 mb-6 rounded-lg ${discrepancy === 0 && bankAccount ? 'bg-emerald-600' : 'bg-[#1774b5]'}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="p-3 bg-white/20 text-white rounded-md shrink-0">
            {discrepancy === 0 ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="flex-1">
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                Reconciliation Status
            </p>
            <h2 className="text-lg font-medium text-white leading-relaxed">
                {!bankAccount ? "Setup your bank account to begin tracking." : 
                 discrepancy === 0 ? "Perfectly Balanced! Your system exactly matches your bank." : 
                 `Out of Balance: There is a Rs ${discrepancy.toLocaleString()} difference between your system and reality.`}
            </h2>
          </div>
        </div>
      </div>

      {/* BALANCE COMPARISON GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex flex-col">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Wallet size={14} className="text-[#1774b5]"/> System Balance
              </p>
              <p className="text-3xl font-bold text-slate-800">Rs {systemBalance.toLocaleString(undefined, {minimumFractionDigits:0})}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">Calculated from invoices & bills</p>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex flex-col">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Building size={14} className="text-[#1774b5]"/> Actual Bank Balance
              </p>
              <p className="text-3xl font-bold text-slate-800">Rs {currentBankBalance.toLocaleString(undefined, {minimumFractionDigits:0})}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">Based on statement imports</p>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex flex-col">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-[#1774b5]"/> Action Required
              </p>
              <p className={`text-3xl font-bold ${unmatchedCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{unmatchedCount}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">Unmatched Transactions</p>
          </div>
      </div>

      {/* ACTION TOOLBAR */}
      <div className="bg-white border border-slate-200/80 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" placeholder="Search transactions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#1774b5]" 
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => setIsAdjustmentOpen(true)} className="flex-1 md:flex-none justify-center flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 transition-colors">
                  <Plus size={14} /> Adjustment
              </button>
              <button onClick={() => setIsImportOpen(true)} className="flex-1 md:flex-none justify-center flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 transition-colors">
                  <UploadCloud size={14} /> Import CSV
              </button>
              <button onClick={runAutoMatch} className="flex-1 md:flex-none justify-center flex items-center gap-1.5 px-5 py-2 bg-[#1774b5] hover:bg-[#135d90] text-white rounded-md text-xs font-medium transition-colors shadow-sm">
                  <Wand2 size={14} /> AI Auto-Match
              </button>
          </div>
      </div>

      {/* BANK FEED TABLE */}
      <div className="bg-white border border-slate-200/80 w-full rounded-lg overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center"><CheckSquare size={14} className="text-slate-300 inline" /></th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Bank Record Details</th>
                <th className="py-3 px-4">Alerts</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center pr-6 w-36">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {bankFeeds.length === 0 ? (
                <tr><td colSpan="7" className="p-10 text-center text-slate-400">No bank transactions imported yet.</td></tr>
              ) : (
                filteredFeeds.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    <td className="py-4 px-4 text-center">
                        <input type="checkbox" className="w-3.5 h-3.5 accent-[#1774b5] rounded-sm border-slate-300" />
                    </td>
                    
                    <td className="py-4 px-4 text-slate-500 font-medium text-xs whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString()}
                    </td>
                    
                    <td className="py-4 px-4">
                        <p className="font-medium text-slate-800">{tx.description}</p>
                    </td>

                    <td className="py-4 px-4">
                        {tx.flag && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded">
                                <AlertCircle size={10}/> {tx.flag}
                            </span>
                        )}
                    </td>
                    
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                        <p className={`font-semibold text-sm ${tx.type === 'Credit' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {tx.type === 'Credit' ? '+' : '-'} Rs {Number(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </p>
                    </td>
                    
                    <td className="py-4 px-4 text-center">
                        {tx.status === 'Matched' || tx.status === 'Partially Matched' ? (
                            <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border rounded ${tx.status === 'Matched' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                    <CheckCircle size={10} /> {tx.status}
                                </span>
                                <span className="text-[9px] text-slate-500 truncate max-w-[100px]">{tx.matched_type}</span>
                            </div>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold uppercase tracking-widest"><AlertTriangle size={10} /> Pending</span>
                        )}
                    </td>
                    
                    <td className="py-4 px-4 text-center pr-6">
                        {tx.status === 'Matched' || tx.status === 'Partially Matched' ? (
                            tx.matched_type === 'Adjustment' ? (
                                <button onClick={() => handleDeleteTransaction(tx.id)} className="text-[10px] font-medium text-slate-500 hover:text-[#1774b5] hover:bg-blue-50 px-3 py-1.5 rounded transition-colors w-full border border-transparent hover:border-blue-200">
                                    Delete
                                </button>
                            ) : (
                                <button onClick={() => unlinkTransaction(tx.id)} className="text-[10px] font-medium text-slate-500 hover:text-[#1774b5] hover:bg-blue-50 px-3 py-1.5 rounded transition-colors w-full border border-transparent hover:border-blue-200">
                                    Unlink
                                </button>
                            )
                        ) : (
                            <div className="flex gap-1.5">
                                <button onClick={() => { setSelectedBankTx(tx); setIsMatchModalOpen(true); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-[#1774b5] hover:bg-blue-50 hover:border-blue-200 text-[10px] font-bold uppercase tracking-widest rounded transition-all">
                                    Match
                                </button>
                                <button onClick={() => handleDeleteTransaction(tx.id)} className="flex items-center justify-center px-2 py-1.5 bg-white border border-slate-200 text-slate-400 hover:text-[#1774b5] hover:bg-blue-50 hover:border-blue-200 rounded transition-all" title="Delete Entry">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS (Using Consistent Flat UI) --- */}
      
      {/* 1. BANK CONFIG MODAL */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-xl border border-slate-200 flex flex-col mb-10 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Building size={18} className="text-[#1774b5]"/> Bank Setup</h2>
              <button onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>
            <div className="p-6">
              <form id="bankForm" onSubmit={handleSaveBankDetails} className="space-y-5">
                  <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Bank Name</label>
                      <input required type="text" value={bankForm.bank_name} onChange={e => setBankForm({...bankForm, bank_name: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5]" placeholder="e.g. Nabil Bank" />
                  </div>
                  <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Account Ending In</label>
                      <input type="text" value={bankForm.account_number} onChange={e => setBankForm({...bankForm, account_number: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] font-mono" placeholder="Last 4 digits" />
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-md">
                      <label className="block text-[11px] font-bold text-slate-800 mb-2 uppercase tracking-widest">Current Actual Balance (Rs)</label>
                      <input required type="number" step="0.01" value={bankForm.starting_balance} onChange={e => setBankForm({...bankForm, starting_balance: e.target.value})} className="w-full bg-white border border-[#1774b5] p-3 text-lg font-bold rounded-md outline-none text-[#1774b5]" placeholder="0.00" />
                  </div>
              </form>
            </div>
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setIsBankModalOpen(false)} type="button" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="bankForm" className="px-6 py-2.5 bg-[#1774b5] hover:bg-[#135d90] text-white text-sm font-medium rounded-lg transition-colors">Save Details</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADJUSTMENT MODAL */}
      {isAdjustmentOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-20 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-xl border border-slate-200 flex flex-col mb-10 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl">
              <h2 className="text-lg font-semibold text-slate-800">Add Adjustment</h2>
              <button onClick={() => setIsAdjustmentOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>
            <div className="p-6">
              <form id="adjForm" onSubmit={handleAddAdjustment} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Reason</label>
                          <select value={adjustmentForm.reason} onChange={e => setAdjustmentForm({...adjustmentForm, reason: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] cursor-pointer">
                              <option>Bank Fee</option>
                              <option>Interest Earned</option>
                              <option>Tax Deduction</option>
                              <option>Other Adjustment</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Type</label>
                          <select value={adjustmentForm.type} onChange={e => setAdjustmentForm({...adjustmentForm, type: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] cursor-pointer">
                              <option value="Debit">Debit (Money Out)</option>
                              <option value="Credit">Credit (Money In)</option>
                          </select>
                      </div>
                  </div>
                  <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Amount (Rs)</label>
                      <input required type="number" min="0" step="0.01" value={adjustmentForm.amount} onChange={e => setAdjustmentForm({...adjustmentForm, amount: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5]" />
                  </div>
                  <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Notes</label>
                      <input required type="text" value={adjustmentForm.description} onChange={e => setAdjustmentForm({...adjustmentForm, description: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5]" placeholder="e.g. Monthly maintenance fee" />
                  </div>
              </form>
            </div>
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setIsAdjustmentOpen(false)} type="button" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="adjForm" className="px-6 py-2.5 bg-[#1774b5] hover:bg-[#135d90] text-white text-sm font-medium rounded-lg transition-colors">Record Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. IMPORT CSV MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl border border-slate-200 flex flex-col shadow-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><FileSpreadsheet size={18} className="text-[#1774b5]"/> Import Statement</h2>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>
            <div className="p-6 text-center">
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVImport} className="hidden" />
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 rounded-lg mb-4">
                    <UploadCloud size={40} className="text-[#1774b5] mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-800 mb-1">Select a CSV File</p>
                    <p className="text-xs text-slate-500">Ensure columns: Date, Description, Type, Amount</p>
                </div>
                <button onClick={() => fileInputRef.current.click()} className="w-full py-2.5 bg-[#1774b5] hover:bg-[#135d90] text-white text-sm font-medium rounded-lg transition-colors">
                    Browse Files
                </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MATCHING MODAL */}
      {isMatchModalOpen && selectedBankTx && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-xl border border-slate-200 flex flex-col mb-10 shadow-xl">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl shrink-0">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><LinkIcon size={18} className="text-[#1774b5]"/> Match System Record</h2>
              <button onClick={() => setIsMatchModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            {/* Target Transaction Display */}
            <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Bank Transaction</p>
                    <h3 className="text-base font-bold text-slate-800">{selectedBankTx.description}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1"><Calendar size={12}/> {new Date(selectedBankTx.transaction_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{selectedBankTx.type === 'Credit' ? 'Money In' : 'Money Out'}</p>
                    <p className={`text-2xl font-black ${selectedBankTx.type === 'Credit' ? 'text-emerald-600' : 'text-slate-800'}`}>
                        Rs {Number(selectedBankTx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </p>
                </div>
            </div>

            <div className="p-6 bg-slate-50/50">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Suggested Internal Matches</p>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {internalLedger
                        .filter(record => 
                            (selectedBankTx.type === 'Credit' && record.type === 'Sale') || 
                            (selectedBankTx.type === 'Debit' && record.type === 'Expense')
                        )
                        .map(record => {
                            const isExactMatch = Number(record.amount) === Number(selectedBankTx.amount);
                            const isPartial = Number(record.amount) > Number(selectedBankTx.amount);
                            
                            return (
                                <div key={record.id} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${isExactMatch ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${record.type === 'Sale' ? 'bg-blue-50 text-[#1774b5] border-blue-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                {record.type}
                                            </span>
                                            {isExactMatch && <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1"><Sparkles size={10}/> Exact Match</span>}
                                        </div>
                                        <p className="font-medium text-slate-800 text-sm">{record.entity}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Record Date: {new Date(record.date).toLocaleDateString()}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-bold text-slate-900 text-base">Rs {Number(record.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                            {isPartial && <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">Partial Match Detected</p>}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <button onClick={() => confirmMatch(record, false)} className="flex justify-center items-center gap-1.5 px-4 py-2 bg-[#1774b5] hover:bg-[#135d90] text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors w-24">
                                                Link
                                            </button>
                                            {isPartial && (
                                                <button onClick={() => confirmMatch(record, true)} className="flex justify-center items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider rounded transition-colors w-24">
                                                    <SplitSquareHorizontal size={10}/> Split
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    }
                    {internalLedger.filter(record => (selectedBankTx.type === 'Credit' && record.type === 'Sale') || (selectedBankTx.type === 'Debit' && record.type === 'Expense')).length === 0 && (
                        <div className="text-center p-8 border border-slate-200 bg-white rounded-lg">
                            <AlertTriangle size={24} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-slate-500">No compatible system records found to match against.</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankReconciliation;