import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Receipt, Search, Download, CheckCircle, 
  ArrowDownRight, Wallet, Calendar, Printer, Filter,
  Sparkles, BrainCircuit, LineChart
} from 'lucide-react';

const PaymentHistory = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  
  // UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState('All'); 

  // KPIs
  const [kpi, setKpi] = useState({
      totalCollected: 0,
      thisMonthCollected: 0,
      debtRecovered: 0,
      directSales: 0
  });

  const [aiInsight, setAiInsight] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: settings } = await supabase.from('store_settings').select('*').eq('user_id', session.user.id).single();
    if (settings) setStoreSettings(settings);

    const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, customer_name, amount, payment_method, status')
        .eq('user_id', session.user.id)
        .neq('payment_method', 'Customer Credit')
        .neq('status', 'Cancelled');

    const { data: ledgers } = await supabase
        .from('credit_ledgers')
        .select('id, transaction_date, amount, notes, customers(name)')
        .eq('user_id', session.user.id)
        .eq('type', 'Payment Received');

    const unifiedTimeline = [];
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    
    let total = 0, thisMonth = 0, debtRec = 0, directRev = 0;

    if (orders) {
        orders.forEach(o => {
            const amt = Number(o.amount);
            total += amt;
            directRev += amt;
            if (o.created_at.startsWith(currentMonthPrefix)) thisMonth += amt;

            unifiedTimeline.push({
                id: o.id,
                date: o.created_at,
                customer_name: o.customer_name || 'Walk-in Customer',
                amount: amt,
                type: 'Direct Sale',
                method: o.payment_method || 'Standard',
                ref: `INV-${o.id.slice(0,6).toUpperCase()}`
            });
        });
    }

    if (ledgers) {
        ledgers.forEach(l => {
            const amt = Number(l.amount);
            total += amt;
            debtRec += amt;
            if (l.transaction_date.startsWith(currentMonthPrefix)) thisMonth += amt;

            unifiedTimeline.push({
                id: l.id,
                date: l.transaction_date,
                customer_name: l.customers?.name || 'Unknown Client',
                amount: amt,
                type: 'Debt Recovery',
                method: 'Account Payment',
                ref: l.notes || 'Ledger Settlement'
            });
        });
    }

    unifiedTimeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate Dynamic Insight
    if (debtRec > (directRev * 0.5)) {
        setAiInsight("Strong debt recovery this period. Ensure new credit limits remain strict to balance cash flow.");
    } else if (thisMonth > (total * 0.2)) {
        setAiInsight("Exceptional collection velocity this month. Cash reserves are highly liquid.");
    } else {
        setAiInsight("Inbound cash flow is stable. Direct sales remain the primary revenue driver.");
    }

    setPayments(unifiedTimeline);
    setKpi({ totalCollected: total, thisMonthCollected: thisMonth, debtRecovered: debtRec, directSales: directRev });
    setLoading(false);
  };

  const filteredPayments = payments.filter(p => {
      const matchesSearch = p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.ref.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'All' || p.type === filterType;
      return matchesSearch && matchesFilter;
  });

  const exportToCSV = () => {
    if (filteredPayments.length === 0) return;
    const headers = ["Date", "Customer Name", "Amount", "Payment Category", "Payment Method", "Reference"];
    const csvRows = [headers.join(',')];
    
    filteredPayments.forEach(p => {
      csvRows.push(`${new Date(p.date).toLocaleDateString()},"${p.customer_name}",${p.amount},${p.type},${p.method},"${p.ref}"`);
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payment_History_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const printReceipt = (payment) => {
      const receiptWindow = window.open('', '_blank', 'width=600,height=800');
      const sName = storeSettings?.store_name || 'Technosoft International';
      const sAddress = storeSettings?.address || 'Kathmandu, Nepal';
      const sPhone = storeSettings?.phone || '';

      receiptWindow.document.write(`
        <html>
          <head>
            <title>Payment Receipt - ${payment.ref}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0f172a; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 20px; }
              .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 20px; }
              h1 { margin: 0; font-size: 22px; color: #1774b5; }
              p { margin: 4px 0; font-size: 13px; color: #64748b; }
              .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0; }
              .amount-box h2 { margin: 0; font-size: 28px; }
              .amount-box span { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; opacity: 0.8; }
              table { width: 100%; border-collapse: collapse; font-size: 14px; }
              td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
              .label { color: #64748b; font-weight: bold; width: 40%; }
              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${sName}</h1>
              <p>${sAddress} | ${sPhone}</p>
              <p style="margin-top: 10px; font-weight: bold; color: #0f172a;">OFFICIAL RECEIPT</p>
            </div>

            <div class="amount-box">
              <span>Amount Received</span>
              <h2>Rs ${Number(payment.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</h2>
            </div>

            <table>
              <tr><td class="label">Date:</td><td>${new Date(payment.date).toLocaleString()}</td></tr>
              <tr><td class="label">Received From:</td><td style="font-weight:bold; color:#0f172a;">${payment.customer_name}</td></tr>
              <tr><td class="label">Payment Type:</td><td>${payment.type}</td></tr>
              <tr><td class="label">Payment Method:</td><td>${payment.method}</td></tr>
              <tr><td class="label">Reference / Note:</td><td>${payment.ref}</td></tr>
            </table>

            <div class="footer">
              <p>Thank you for your payment!</p>
              <p style="font-size: 10px; margin-top: 10px;">Generated automatically by Technosoft AI</p>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      receiptWindow.document.close();
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <Receipt className="animate-pulse text-[#1774b5] mb-4" size={48} />
              <p className="font-medium text-lg">Compiling Payment History...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      


      {/* BRAND CONSISTENT AI BANNER */}
      <div className="w-full bg-[#1774b5] text-white p-6 mb-8 mt-10 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 pb-6 border-b border-blue-400/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 text-white rounded-md">
              <BrainCircuit size={24} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Technosoft AI Insight</p>
              <h2 className="text-xl font-bold text-white leading-tight">Cash Flow Analytics</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-medium text-blue-50 bg-blue-900/40 p-3 rounded-md inline-flex items-start gap-2 border border-blue-400/20 text-left">
               <Sparkles size={16} className="shrink-0 text-amber-300 mt-0.5" />
               <span>{aiInsight}</span>
             </p>
          </div>
        </div>
        
        {/* KPIs INTEGRATED INTO BANNER */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Calendar size={14}/> This Month</p>
            <p className="text-3xl font-black text-white">Rs {kpi.thisMonthCollected.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><CheckCircle size={14}/> Lifetime Collected</p>
            <p className="text-2xl font-bold text-white mt-1">Rs {kpi.totalCollected.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-md border border-emerald-400/30 bg-emerald-900/20">
            <p className="text-emerald-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Wallet size={14}/> Direct Sales</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">Rs {kpi.directSales.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-md border border-indigo-400/30 bg-indigo-900/20">
            <p className="text-indigo-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><ArrowDownRight size={14}/> Debt Recovered</p>
            <p className="text-2xl font-bold text-indigo-300 mt-1">Rs {kpi.debtRecovered.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
        </div>
      </div>

      {/* DATA TABLE (Flat, Clean) */}
      <div className="bg-white border border-slate-200/60 rounded-lg shadow-sm shadow-slate-200/50 overflow-hidden">
          
          {/* Controls Header */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
              <div className="flex items-center gap-3">
                  <Filter size={16} className="text-[#1774b5]"/>
                  <select 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 text-sm px-3 py-1.5 rounded-md outline-none focus:border-[#1774b5] font-medium"
                  >
                      <option value="All">All Payments</option>
                      <option value="Direct Sale">Direct Sales (Invoices)</option>
                      <option value="Debt Recovery">Debt Recovery (Credit Ledger)</option>
                  </select>
              </div>
              <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                      type="text" 
                      placeholder="Search customer or reference..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-[#1774b5] transition-colors" 
                  />
              </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-4 px-6 pl-6">Date</th>
                          <th className="py-4 px-6">Customer / Payer</th>
                          <th className="py-4 px-6">Category & Method</th>
                          <th className="py-4 px-6 text-right">Amount Received</th>
                          <th className="py-4 px-6 text-center pr-6">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {filteredPayments.length === 0 ? (
                          <tr><td colSpan="5" className="p-10 text-center text-slate-400">No payment records found.</td></tr>
                      ) : (
                          filteredPayments.map((p, idx) => (
                              <tr key={`${p.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                  
                                  {/* Date */}
                                  <td className="py-4 px-6 pl-6">
                                      <p className="font-medium text-slate-800">{new Date(p.date).toLocaleDateString()}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(p.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                  </td>
                                  
                                  {/* Customer */}
                                  <td className="py-4 px-6">
                                      <p className="font-semibold text-slate-800">{p.customer_name}</p>
                                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">Ref: {p.ref}</p>
                                  </td>
                                  
                                  {/* Category */}
                                  <td className="py-4 px-6">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                                          p.type === 'Direct Sale' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      }`}>
                                          {p.type}
                                      </span>
                                      <p className="text-[11px] text-slate-500 mt-1 font-medium">via {p.method}</p>
                                  </td>
                                  
                                  {/* Amount */}
                                  <td className="py-4 px-6 text-right">
                                      <p className="font-black text-emerald-600 text-base">+ Rs {p.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
                                  </td>

                                  {/* Action */}
                                  <td className="py-4 px-6 text-center pr-6">
                                      <button 
                                        onClick={() => printReceipt(p)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-blue-50 hover:text-[#1774b5] hover:border-blue-200 transition-all shadow-sm shadow-slate-100"
                                      >
                                          <Printer size={12}/> Receipt
                                      </button>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default PaymentHistory;