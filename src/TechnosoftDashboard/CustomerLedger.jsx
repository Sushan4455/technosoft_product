import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Users, Search, FileText, Printer, ArrowDownRight, 
  ArrowUpRight, Wallet, Phone, Mail, MapPin, Receipt,
  Package, CreditCard
} from 'lucide-react';

const CustomerLedger = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Ledger & Order Data
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeSettings, setStoreSettings] = useState(null);

  // --- 1. FETCH INITIAL DATA ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Fetch Customers
    const { data: custData } = await supabase.from('customers').select('*').eq('user_id', session.user.id).order('name', { ascending: true });
    if (custData) setCustomers(custData);

    // Fetch Store Settings (for printing)
    const { data: settings } = await supabase.from('store_settings').select('*').eq('user_id', session.user.id).single();
    if (settings) setStoreSettings(settings);

    setLoading(false);
  };

  // --- 2. FETCH SPECIFIC CUSTOMER DATA ---
  const handleSelectCustomer = async (customer) => {
      setSelectedCustomer(customer);
      setLedgerEntries([]);
      setOrderHistory([]);

      // Fetch Financial Ledger (Debt & Payments)
      const { data: ledgers } = await supabase
          .from('credit_ledgers')
          .select('*')
          .eq('customer_id', customer.id)
          .order('transaction_date', { ascending: true }) 
          .order('created_at', { ascending: true });

      // Calculate Running Balance mathematically
      let currentBalance = 0;
      const processedLedgers = (ledgers || []).map(entry => {
          const amt = Number(entry.amount);
          if (entry.type === 'Credit Used') {
              currentBalance += amt; // Debt increases
          } else {
              currentBalance -= amt; // Debt decreases (Payment)
          }
          return { ...entry, runningBalance: currentBalance };
      });
      
      setLedgerEntries(processedLedgers.reverse());

      // Fetch Order History (Products & Payment Methods)
      const { data: orders } = await supabase
          .from('orders')
          .select('id, created_at, amount, status, payment_method, items')
          .eq('customer_name', customer.name)
          .order('created_at', { ascending: false });

      if (orders) setOrderHistory(orders);
  };

  // --- 3. PRINT STATEMENT OF ACCOUNT ---
  const printStatement = () => {
      if (!selectedCustomer) return;

      const invoiceWindow = window.open('', '_blank');
      const sName = storeSettings?.store_name || 'My Company';
      const sAddress = storeSettings?.address || 'Kathmandu, Nepal';
      const sPhone = storeSettings?.phone || '';
      
      const ledgerHtml = ledgerEntries.slice().reverse().map(entry => {
          const isDebit = entry.type === 'Credit Used';
          const debitAmt = isDebit ? Number(entry.amount).toFixed(2) : '-';
          const creditAmt = !isDebit ? Number(entry.amount).toFixed(2) : '-';
          return `
            <tr>
              <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px; color:#334155;">${new Date(entry.transaction_date).toLocaleDateString()}</td>
              <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px; color:#334155;">${entry.notes || entry.type}</td>
              <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px; text-align:right; color:#ef4444;">${debitAmt}</td>
              <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px; text-align:right; color:#10b981;">${creditAmt}</td>
              <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-size:12px; text-align:right; font-weight:bold; color:#0f172a;">${Number(entry.runningBalance).toFixed(2)}</td>
            </tr>
          `;
      }).join('');

      invoiceWindow.document.write(`
        <html>
          <head>
            <title>Statement of Account - ${selectedCustomer.name}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1774b5; padding-bottom: 20px; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background: #f8fafc; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #cbd5e1; }
              .summary-box { background: #f8fafc; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 30px; display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1 style="margin:0; font-size:24px;">${sName}</h1>
                <p style="margin:5px 0 0 0; font-size:12px; color:#64748b;">${sAddress}<br/>${sPhone}</p>
              </div>
              <div style="text-align: right;">
                <h2 style="margin: 0; color: #1774b5; font-size: 20px;">STATEMENT OF ACCOUNT</h2>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Date Generated: ${new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div class="summary-box">
              <div>
                <p style="margin:0; font-size:10px; text-transform:uppercase; font-weight:bold; color:#94a3b8;">Bill To:</p>
                <p style="margin:5px 0 0 0; font-size:14px; font-weight:bold;">${selectedCustomer.name}</p>
                <p style="margin:2px 0 0 0; font-size:12px; color:#475569;">${selectedCustomer.company_name || ''}<br/>${selectedCustomer.phone || ''}</p>
              </div>
              <div style="text-align:right;">
                <p style="margin:0; font-size:10px; text-transform:uppercase; font-weight:bold; color:#94a3b8;">Total Amount Due:</p>
                <p style="margin:5px 0 0 0; font-size:22px; font-weight:bold; color:#ef4444;">Rs ${Number(selectedCustomer.outstanding_balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description / Reference</th>
                  <th style="text-align:right;">Debit (Charge)</th>
                  <th style="text-align:right;">Credit (Payment)</th>
                  <th style="text-align:right;">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${ledgerHtml || '<tr><td colSpan="5" style="padding:20px; text-align:center; color:#94a3b8;">No transactions found.</td></tr>'}
              </tbody>
            </table>

            <div style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              Please make checks payable to ${sName}. Thank you for your business.
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      invoiceWindow.document.close();
  };

  const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="font-sans text-slate-900 w-full h-full bg-slate-50/50 flex flex-col md:flex-row overflow-hidden pb-12">
        
      {/* LEFT SIDEBAR: CUSTOMER DIRECTORY */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200/60 flex flex-col h-[calc(100vh-64px)] shrink-0 z-10">
          <div className="p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4"><Users size={18} className="text-[#1774b5]"/> Directory</h2>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                    type="text" 
                    placeholder="Search clients..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-sm focus:outline-none focus:border-[#1774b5] transition-colors" 
                />
              </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
              {loading ? (
                  <p className="text-center text-slate-400 text-sm mt-10">Loading...</p>
              ) : filteredCustomers.map(c => (
                  <button 
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className={`w-full text-left p-4 rounded-lg transition-all border ${selectedCustomer?.id === c.id ? 'bg-blue-50/50 border-blue-200 text-[#1774b5]' : 'bg-transparent border-transparent hover:bg-slate-50 text-slate-800'}`}
                  >
                      <p className="font-semibold text-sm">{c.name}</p>
                      {c.company_name && <p className="text-xs text-slate-500 truncate mt-0.5">{c.company_name}</p>}
                      {(Number(c.outstanding_balance) > 0) && (
                          <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">Due: Rs {Number(c.outstanding_balance).toLocaleString()}</p>
                      )}
                  </button>
              ))}
          </div>
      </div>

      {/* RIGHT MAIN AREA: LEDGER & PURCHASES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 bg-slate-50/30">
          {!selectedCustomer ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <FileText size={64} className="text-slate-200 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600">Select a Customer</h3>
                  <p className="text-sm mt-2 text-center max-w-sm">Choose a client from the directory to view their complete financial ledger, exact products purchased, and print official statements.</p>
              </div>
          ) : (
              <div className="max-w-6xl mx-auto space-y-6">
                  
                  {/* HEADER PROFILE */}
                  <div className="bg-white border border-slate-200/60 rounded-xl p-6 flex flex-col md:flex-row justify-between md:items-start gap-4">
                      <div>
                          <h1 className="text-2xl font-bold text-slate-800 mb-1">{selectedCustomer.name}</h1>
                          <p className="text-sm text-[#1774b5] font-medium mb-4">{selectedCustomer.company_name || 'Individual Account'}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                              {selectedCustomer.phone && <span className="flex items-center gap-1.5"><Phone size={14}/> {selectedCustomer.phone}</span>}
                              {selectedCustomer.email && <span className="flex items-center gap-1.5"><Mail size={14}/> {selectedCustomer.email}</span>}
                              {selectedCustomer.city && <span className="flex items-center gap-1.5"><MapPin size={14}/> {selectedCustomer.city}</span>}
                          </div>
                      </div>
                      <button onClick={printStatement} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium rounded-lg hover:bg-[#135d90] transition-colors w-full md:w-auto">
                          <Printer size={16} /> Print Statement
                      </button>
                  </div>

                  {/* FINANCIAL KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="bg-white border border-slate-200/60 p-6 rounded-xl relative overflow-hidden">
                          <div className="absolute left-0 top-0 w-1 h-full bg-rose-500"></div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Wallet size={14}/> Outstanding Balance</p>
                          <p className="text-3xl font-black text-slate-800">Rs {Number(selectedCustomer.outstanding_balance || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-white border border-slate-200/60 p-6 rounded-xl">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">Authorized Credit Limit</p>
                          <p className="text-2xl font-bold text-slate-700 mt-1">Rs {Number(selectedCustomer.credit_limit || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-white border border-slate-200/60 p-6 rounded-xl">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">Available to Spend</p>
                          <p className={`text-2xl font-bold mt-1 ${(Number(selectedCustomer.credit_limit || 0) - Number(selectedCustomer.outstanding_balance || 0)) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              Rs {Math.max(0, (Number(selectedCustomer.credit_limit || 0) - Number(selectedCustomer.outstanding_balance || 0))).toLocaleString()}
                          </p>
                      </div>
                  </div>

                  {/* SPLIT PANES: Ledger vs Products */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      
                      {/* --- FINANCIAL STATEMENT OF ACCOUNT --- */}
                      <div className="bg-white border border-slate-200/60 rounded-xl flex flex-col h-[500px]">
                          <div className="p-6 border-b border-slate-100 shrink-0">
                              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-[#1774b5]"/> Statement of Account</h3>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Financial Debt & Payments</p>
                          </div>
                          <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                              <table className="w-full text-left text-sm">
                                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 z-10">
                                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          <th className="py-3 px-4 pl-6">Date</th>
                                          <th className="py-3 px-4">Activity</th>
                                          <th className="py-3 px-4 text-right">Debit/Credit</th>
                                          <th className="py-3 px-4 pr-6 text-right">Running Bal</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                      {ledgerEntries.length === 0 ? (
                                          <tr><td colSpan="4" className="p-6 text-center text-slate-400">No financial ledger entries found.</td></tr>
                                      ) : (
                                          ledgerEntries.map(entry => (
                                              <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                                  <td className="py-4 px-4 pl-6 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                      {new Date(entry.transaction_date).toLocaleDateString()}
                                                  </td>
                                                  <td className="py-4 px-4">
                                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                                                          entry.type === 'Credit Used' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                      }`}>
                                                          {entry.type === 'Credit Used' ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>} {entry.type}
                                                      </span>
                                                      {entry.notes && <p className="text-[10px] text-slate-500 mt-1.5 truncate max-w-[140px]">{entry.notes}</p>}
                                                  </td>
                                                  <td className="py-4 px-4 text-right">
                                                      <span className={`font-semibold ${entry.type === 'Credit Used' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                          {entry.type === 'Credit Used' ? '+' : '-'} {Number(entry.amount).toLocaleString(undefined, {maximumFractionDigits:0})}
                                                      </span>
                                                  </td>
                                                  <td className="py-4 px-4 pr-6 text-right font-bold text-slate-800">
                                                      {Number(entry.runningBalance).toLocaleString(undefined, {maximumFractionDigits:0})}
                                                  </td>
                                              </tr>
                                          ))
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>

                      {/* --- DETAILED PURCHASE HISTORY (Products & Methods) --- */}
                      <div className="bg-white border border-slate-200/60 rounded-xl flex flex-col h-[500px]">
                          <div className="p-6 border-b border-slate-100 shrink-0">
                              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Receipt size={18} className="text-[#1774b5]"/> Purchase & Product History</h3>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">What they bought & How they paid</p>
                          </div>
                          <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                              <table className="w-full text-left text-sm">
                                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 z-10">
                                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          <th className="py-3 px-4 pl-6">Invoice</th>
                                          <th className="py-3 px-4">Products Purchased</th>
                                          <th className="py-3 px-4">Payment Method</th>
                                          <th className="py-3 px-4 pr-6 text-right">Total</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                      {orderHistory.length === 0 ? (
                                          <tr><td colSpan="4" className="p-6 text-center text-slate-400">No recorded purchases found.</td></tr>
                                      ) : (
                                          orderHistory.map(order => (
                                              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors align-top">
                                                  
                                                  <td className="py-4 px-4 pl-6">
                                                      <p className="font-mono text-xs font-bold text-slate-700">INV-{order.id.slice(0,6).toUpperCase()}</p>
                                                      <p className="text-[10px] text-slate-400 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                                                  </td>
                                                  
                                                  {/* Products List Breakdown */}
                                                  <td className="py-4 px-4">
                                                      <div className="flex flex-col gap-1.5">
                                                          {order.items?.map((item, idx) => (
                                                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                                                                  <Package size={12} className="shrink-0 text-slate-400 mt-0.5" />
                                                                  <span className="leading-tight">
                                                                      <strong className="text-slate-800">{item.quantity}x</strong> {item.name}
                                                                  </span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </td>

                                                  {/* Payment Method Badge */}
                                                  <td className="py-4 px-4">
                                                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md w-fit">
                                                          <CreditCard size={12} className="text-slate-500" />
                                                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{order.payment_method || 'Standard'}</span>
                                                      </div>
                                                  </td>

                                                  <td className="py-4 px-4 pr-6 text-right">
                                                      <p className="font-semibold text-slate-800">Rs {Number(order.amount).toLocaleString(undefined, {maximumFractionDigits:0})}</p>
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
          )}
      </div>

    </div>
  );
};

export default CustomerLedger;