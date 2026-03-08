import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Landmark, Search, ShieldAlert, Sparkles, BrainCircuit, X, 
  ArrowDownRight, ArrowUpRight, ShieldCheck, Wallet, History, Users
} from 'lucide-react';

const CreditManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerLedger, setCustomerLedger] = useState([]);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Forms
  const [limitForm, setLimitForm] = useState({ credit_limit: 0 });
  const [transactionForm, setTransactionForm] = useState({
      type: 'Payment Received',
      amount: '',
      transaction_date: new Date().toISOString().split('T')[0],
      notes: ''
  });

  // --- 1. FETCH CUSTOMERS ---
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
      const { data } = await supabase.from('customers').select('*').eq('user_id', session.user.id).order('name', { ascending: true });
      if (data) setCustomers(data);
    }
    setLoading(false);
  };

  // --- 2. FETCH SPECIFIC CUSTOMER LEDGER ---
  const fetchLedger = async (customerId) => {
      const { data } = await supabase
        .from('credit_ledgers')
        .select('*')
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (data) setCustomerLedger(data);
  };

  // --- 3. AI INSIGHTS ---
  const calculateInsights = () => {
    let totalReceivables = 0;
    let totalCreditRisk = 0;
    let highRiskCount = 0;

    customers.forEach(c => {
      const balance = Number(c.outstanding_balance) || 0;
      const limit = Number(c.credit_limit) || 0;
      
      totalReceivables += balance;
      totalCreditRisk += limit;
      
      // If they have used 90% or more of their credit limit
      if (limit > 0 && (balance / limit) >= 0.9) {
          highRiskCount++;
      }
    });

    let aiAdvice = "Receivables are healthy. Keep monitoring active credit lines.";
    if (highRiskCount > 0) {
        aiAdvice = `Risk Alert: ${highRiskCount} customers are nearing or exceeding their maximum credit limits. Consider pausing further credit sales for them.`;
    }

    return { totalReceivables, totalCreditRisk, highRiskCount, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 4. ACTIONS ---
  const openManageModal = (customer) => {
      setSelectedCustomer(customer);
      setLimitForm({ credit_limit: customer.credit_limit || 0 });
      setTransactionForm({ type: 'Payment Received', amount: '', transaction_date: new Date().toISOString().split('T')[0], notes: '' });
      fetchLedger(customer.id);
      setIsManageModalOpen(true);
  };

  const handleUpdateLimit = async (e) => {
      e.preventDefault();
      try {
          const { error } = await supabase.from('customers').update({ credit_limit: parseFloat(limitForm.credit_limit) || 0 }).eq('id', selectedCustomer.id);
          if (error) throw error;
          
          alert("Credit limit updated successfully.");
          // Update local state to reflect change instantly
          setSelectedCustomer({...selectedCustomer, credit_limit: parseFloat(limitForm.credit_limit)});
          fetchCustomers();
      } catch (err) {
          alert(`Error updating limit: ${err.message}`);
      }
  };

  const handleLogTransaction = async (e) => {
      e.preventDefault();
      const amt = parseFloat(transactionForm.amount);
      if (!amt || amt <= 0) return alert("Please enter a valid amount.");

      try {
          // 1. Calculate new outstanding balance
          const currentBalance = Number(selectedCustomer.outstanding_balance) || 0;
          let newBalance = currentBalance;
          
          if (transactionForm.type === 'Payment Received') {
              newBalance -= amt; // Payment reduces debt
          } else {
              newBalance += amt; // Credit Used increases debt
          }

          // 2. Insert into Ledger Table
          const ledgerPayload = {
              user_id: currentUser.id,
              customer_id: selectedCustomer.id,
              amount: amt,
              type: transactionForm.type,
              transaction_date: transactionForm.transaction_date,
              notes: transactionForm.notes || null
          };
          const { error: ledgerError } = await supabase.from('credit_ledgers').insert([ledgerPayload]);
          if (ledgerError) throw ledgerError;

          // 3. Update Customer's Master Balance
          const { error: custError } = await supabase.from('customers').update({ outstanding_balance: newBalance }).eq('id', selectedCustomer.id);
          if (custError) throw custError;

          // Reset form and refresh data
          setTransactionForm({ type: 'Payment Received', amount: '', transaction_date: new Date().toISOString().split('T')[0], notes: '' });
          setSelectedCustomer({...selectedCustomer, outstanding_balance: newBalance});
          fetchLedger(selectedCustomer.id);
          fetchCustomers();

      } catch (err) {
          console.error(err);
          alert(`Transaction failed: ${err.message}`);
      }
  };

  // THE FIX: Show ALL customers from the CRM so you can assign limits to them
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50">
      
 

      {/* AI INSIGHTS BANNER (Brand Blue) */}
      <div className="px-4 sm:px-6 lg:px-8 mb-8 mt-10">
        <div className="w-full bg-[#1774b5] text-white p-6 shadow-sm rounded-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 pb-6 border-b border-blue-400/30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 text-white rounded-sm"><BrainCircuit size={20} /></div>
                    <div>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Technosoft Intelligence</p>
                        <h2 className="text-xl font-bold text-white leading-tight">Credit Risk Dashboard</h2>
                    </div>
                </div>
                <div className="flex-1 md:text-right w-full">
                    <p className="text-sm font-medium text-amber-200 flex items-center md:justify-end gap-2 bg-blue-900/30 p-2.5 rounded-sm inline-flex">
                        <Sparkles size={16} className="shrink-0" />
                        <span className="text-left md:text-right">{insights.aiAdvice}</span>
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white/10 p-5 rounded-sm border border-white/20">
                    <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest">Total Receivables (Due to you)</p>
                    <p className="text-3xl font-black text-white">Rs {insights.totalReceivables.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                </div>
                <div className="bg-white/10 p-5 rounded-sm border border-white/20">
                    <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest">Total Market Credit Limit</p>
                    <p className="text-2xl font-bold text-white mt-1">Rs {insights.totalCreditRisk.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                </div>
                <div className="bg-white text-slate-900 p-5 rounded-sm shadow-inner relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldAlert size={60}/></div>
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                    <p className="text-slate-500 text-[10px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest">High Risk Accounts</p>
                    <p className="text-3xl font-black text-rose-600">{insights.highRiskCount} <span className="text-sm font-medium text-slate-500 tracking-normal">Clients &gt; 90% Limit</span></p>
                </div>
            </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
          {/* SEARCH */}
          <div className="mb-4 relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Search credit accounts by name or company..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-[#1774b5] shadow-sm transition-colors" 
            />
          </div>

          {/* DATA TABLE (Flat UI) */}
          <div className="bg-white border border-slate-300 w-full rounded-sm overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6 border-r border-slate-200">Customer Details</th>
                    <th className="py-4 px-6 border-r border-slate-200">Authorized Limit</th>
                    <th className="py-4 px-6 border-r border-slate-200 bg-rose-50/30 text-rose-700">Outstanding Balance</th>
                    <th className="py-4 px-6 border-r border-slate-200">Account Health</th>
                    <th className="py-4 px-6 text-center w-36">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading credit profiles...</td></tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">No customers found. Please add your clients in the Customer Directory first.</td></tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const limit = Number(c.credit_limit) || 0;
                      const balance = Number(c.outstanding_balance) || 0;
                      const available = limit - balance;
                      const usagePercent = limit > 0 ? (balance / limit) * 100 : (balance > 0 ? 100 : 0);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6 border-r border-slate-200">
                            <p className="font-bold text-slate-800 flex items-center gap-2"><Users size={14} className="text-[#1774b5]"/>{c.name}</p>
                            {c.company_name && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{c.company_name}</p>}
                          </td>
                          <td className="py-4 px-6 border-r border-slate-200 font-semibold text-slate-700">
                              Rs {limit.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 border-r border-slate-200 bg-rose-50/10">
                              <p className="font-black text-rose-600 text-base">Rs {balance.toLocaleString()}</p>
                              {available > 0 ? (
                                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Rs {available.toLocaleString()} Available</p>
                              ) : (
                                  <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mt-1">Limit Exceeded</p>
                              )}
                          </td>
                          <td className="py-4 px-6 border-r border-slate-200">
                              {/* Visual Progress Bar */}
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1.5">
                                  <div className={`h-1.5 rounded-full ${usagePercent > 90 ? 'bg-rose-500' : usagePercent > 60 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{usagePercent.toFixed(1)}% Used</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                              <button onClick={() => openManageModal(c)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors shadow-sm">
                                  <Landmark size={12} /> Manage
                              </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* --- MANAGE CUSTOMER CREDIT MODAL --- */}
      {isManageModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-md shadow-2xl border border-slate-300 flex flex-col max-h-[90vh] my-8">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Wallet className="text-[#1774b5]"/> Client Ledger: {selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedCustomer.company_name || 'Individual Account'}</p>
              </div>
              <button onClick={() => setIsManageModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={24}/></button>
            </div>
            
            {/* Modal Body (Grid Layout) */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                
                {/* Left Column: Stats & Settings */}
                <div className="w-full lg:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto custom-scrollbar shrink-0">
                    <div className="bg-white border border-slate-200 p-5 rounded-sm shadow-sm mb-6 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Outstanding Debt</p>
                        <p className="text-4xl font-black text-rose-600">Rs {Number(selectedCustomer.outstanding_balance || 0).toLocaleString()}</p>
                    </div>

                    <form onSubmit={handleUpdateLimit} className="bg-white border border-slate-200 p-5 rounded-sm shadow-sm">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#1774b5]"/> Account Limit settings</p>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">Authorized Credit Limit (Rs)</label>
                        <input 
                            type="number" min="0" step="1" 
                            value={limitForm.credit_limit} 
                            onChange={e => setLimitForm({ credit_limit: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-300 p-2.5 text-sm font-bold text-slate-800 rounded-sm outline-none focus:border-[#1774b5] mb-3" 
                        />
                        <button type="submit" className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors">
                            Update Limit
                        </button>
                    </form>
                </div>

                {/* Right Column: New Transaction & Ledger History */}
                <div className="w-full lg:w-2/3 p-6 overflow-y-auto custom-scrollbar flex flex-col">
                    
                    {/* Add Transaction Form */}
                    <div className="bg-white border border-slate-200 rounded-sm p-5 mb-6 shadow-sm">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Record New Activity</p>
                        <form onSubmit={handleLogTransaction} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                            <div className="sm:col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Transaction Type</label>
                                <select 
                                    value={transactionForm.type} 
                                    onChange={e => setTransactionForm({...transactionForm, type: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-300 p-2 text-sm rounded-sm outline-none cursor-pointer"
                                >
                                    <option value="Payment Received">Payment Received (Lowers Debt)</option>
                                    <option value="Credit Used">Credit Sale (Increases Debt)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Amount (Rs) *</label>
                                <input required type="number" min="1" step="0.01" value={transactionForm.amount} onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})} className="w-full bg-white border border-[#1774b5] p-2 text-sm font-bold rounded-sm outline-none" placeholder="0.00" />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Date *</label>
                                <input required type="date" value={transactionForm.transaction_date} onChange={e => setTransactionForm({...transactionForm, transaction_date: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-2 text-sm rounded-sm outline-none" />
                            </div>
                            <div className="sm:col-span-2">
                                <input type="text" value={transactionForm.notes} onChange={e => setTransactionForm({...transactionForm, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-2 text-sm rounded-sm outline-none" placeholder="Reference note / check number (Optional)" />
                            </div>
                            <div className="sm:col-span-1">
                                <button type="submit" className="w-full px-4 py-2 bg-[#1774b5] text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#135d90] transition-colors shadow-sm">
                                    Save Entry
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Transaction Ledger History */}
                    <div className="flex-1 flex flex-col">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-1.5"><History size={14}/> Statement History</p>
                        <div className="border border-slate-200 rounded-sm overflow-hidden flex-1 flex flex-col bg-white shadow-sm">
                            <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[300px]">
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="py-3 px-4 border-r border-slate-200">Date</th>
                                            <th className="py-3 px-4 border-r border-slate-200">Activity Type</th>
                                            <th className="py-3 px-4 border-r border-slate-200">Notes</th>
                                            <th className="py-3 px-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {customerLedger.length === 0 ? (
                                            <tr><td colSpan="4" className="p-6 text-center text-slate-400 italic">No transaction history found for this account.</td></tr>
                                        ) : (
                                            customerLedger.map(tx => (
                                                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 px-4 border-r border-slate-100 text-slate-600 text-xs font-medium whitespace-nowrap">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                                                    <td className="py-3 px-4 border-r border-slate-100">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest ${
                                                            tx.type === 'Payment Received' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            {tx.type === 'Payment Received' ? <ArrowDownRight size={10}/> : <ArrowUpRight size={10}/>} {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 border-r border-slate-100 text-slate-600 text-xs truncate max-w-[150px]">{tx.notes || '-'}</td>
                                                    <td className={`py-3 px-4 text-right font-bold ${tx.type === 'Payment Received' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {tx.type === 'Payment Received' ? '-' : '+'} Rs {Number(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
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

export default CreditManagement;