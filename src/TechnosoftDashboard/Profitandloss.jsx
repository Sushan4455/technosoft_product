import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Download, AlertCircle } from 'lucide-react';

const ProfitAndLoss = () => {
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState(null);
  const [revenue, setRevenue] = useState(0);
  const [expenseCategories, setExpenseCategories] = useState({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [timeframe, setTimeframe] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchData();
  }, [timeframe]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1. Fetch Store Settings
    const { data: settingsData } = await supabase
      .from('store_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    if (settingsData) setStoreSettings(settingsData);

    const startOfYear = `${timeframe}-01-01`;
    const endOfYear = `${timeframe}-12-31`;

    // 2. Fetch Revenue
    const { data: salesData } = await supabase
      .from('orders')
      .select('amount, status, created_at')
      .eq('user_id', session.user.id)
      .gte('created_at', startOfYear)
      .lte('created_at', endOfYear);

    let calcRevenue = 0;
    if (salesData) {
      salesData.forEach(sale => {
        if (sale.status === 'Paid' || sale.status === 'Delivered') {
          calcRevenue += Number(sale.amount);
        }
      });
    }
    setRevenue(calcRevenue);

    // 3. Fetch Expenses
    const { data: expenseData } = await supabase
      .from('expenses')
      .select('amount, category, expense_date')
      .eq('user_id', session.user.id)
      .gte('expense_date', startOfYear)
      .lte('expense_date', endOfYear);

    let calcExpenses = 0;
    const categories = {};
    
    if (expenseData) {
      expenseData.forEach(exp => {
        const amt = Number(exp.amount);
        const cat = exp.category || 'Uncategorized';
        calcExpenses += amt;
        
        if (categories[cat]) {
          categories[cat] += amt;
        } else {
          categories[cat] = amt;
        }
      });
    }
    setTotalExpenses(calcExpenses);
    setExpenseCategories(categories);
    setLoading(false);
  };

  const netProfit = revenue - totalExpenses;
  const isProfit = netProfit >= 0;

  // --- REFINED PDF PRINT LOGIC ---
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    const sName = storeSettings?.store_name || 'My Company';
    const sPan = storeSettings?.pan_number || 'N/A';
    
    const expenseRowsHtml = Object.entries(expenseCategories)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `
        <tr>
          <td style="padding: 8px 12px; color: #475569; font-size: 13px;">${cat}</td>
          <td style="padding: 8px 12px; text-align: right; color: #475569; font-size: 13px;">Rs ${amt.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('');

    const profitColor = isProfit ? '#059669' : '#dc2626';
    const profitBg = isProfit ? '#ecfdf5' : '#fef2f2';

    const html = `
      <html>
        <head>
          <title>Profit and Loss - ${timeframe}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; }
            .header { text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 30px; margin-bottom: 40px; }
            .header h1 { margin: 0; font-size: 22px; color: #0f172a; letter-spacing: 0.5px; }
            .header h2 { margin: 8px 0 4px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
            .header p { margin: 0; font-size: 12px; color: #94a3b8; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .section-title td { font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #475569; border-bottom: 1px solid #cbd5e1; padding: 0 12px 8px 12px; }
            
            .total-row td { font-weight: 600; font-size: 13px; color: #0f172a; padding: 12px; border-top: 1px solid #e2e8f0; background-color: #f8fafc; }
            
            .net-profit { margin-top: 20px; border-radius: 6px; background-color: ${profitBg}; border: 1px solid ${profitColor}40; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
            .net-profit span { font-size: 18px; font-weight: 700; color: ${profitColor}; }
            
            .footer { margin-top: 60px; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: justify; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${sName}</h1>
            <h2>Profit & Loss Statement</h2>
            <p>For the Year Ended December 31, ${timeframe}</p>
            <p style="font-family: monospace; margin-top: 4px;">PAN: ${sPan}</p>
          </div>

          <table>
            <tr class="section-title">
              <td colspan="2">Income</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #475569; font-size: 13px; padding-top: 16px;">Sales Revenue (Recognized)</td>
              <td style="padding: 12px; text-align: right; color: #475569; font-size: 13px; padding-top: 16px;">Rs ${revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            <tr class="total-row">
              <td>Total Income</td>
              <td style="text-align: right;">Rs ${revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </table>

          <table>
            <tr class="section-title">
              <td colspan="2">Operating Expenses</td>
            </tr>
            <tr><td colspan="2" style="height: 8px;"></td></tr>
            ${expenseRowsHtml || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #94a3b8; font-size: 13px;">No expenses recorded</td></tr>'}
            <tr class="total-row">
              <td>Total Operating Expenses</td>
              <td style="text-align: right;">Rs ${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </table>

          <div class="net-profit">
            <span>Net ${isProfit ? 'Profit' : 'Loss'}</span>
            <span>Rs ${Math.abs(netProfit).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>

          <div class="footer">
            <strong>Disclaimer:</strong> This is a computer-generated report created via Technosoft Accounting Software. 
            While every effort has been made to ensure data accuracy based on your inputs, please verify this statement 
            with your professional accountant or certified tax auditor before finalizing your books or submitting to the Inland Revenue Department (IRD).
          </div>
          
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return <div className="p-8 text-slate-500 flex justify-center mt-20 font-medium">Loading financial data...</div>;
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profit & Loss</h1>
          <p className="text-slate-500 text-sm mt-1">Review your income, expenses, and net margins.</p>
        </div>
        <div className="flex items-center gap-3">
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm px-4 py-2.5 rounded-sm shadow-sm outline-none focus:border-[#1774b5] font-medium cursor-pointer"
            >
                <option value="2026">Fiscal Year 2026</option>
                <option value="2025">Fiscal Year 2025</option>
                <option value="2024">Fiscal Year 2024</option>
            </select>
            <button 
              onClick={handlePrintPDF} 
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all shadow-sm rounded-sm"
            >
              <Download size={16} className="text-[#1774b5]" /> Export PDF
            </button>
        </div>
      </div>

      {/* --- A4 PAPER PREVIEW (REFINED DESIGN) --- */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg min-h-[297mm] mb-10 border border-slate-100 rounded-sm print:shadow-none print:border-none">
        
        {/* A4 Padding Wrapper */}
        <div className="p-10 sm:p-16">
          
          {/* Header Section */}
          <div className="text-center border-b border-slate-200 pb-8 mb-10">
            <h1 className="text-2xl font-bold text-slate-800 tracking-wide mb-1">
              {storeSettings?.store_name || 'My Company'}
            </h1>
            <h2 className="text-sm text-slate-500 uppercase tracking-widest font-semibold mt-2">Profit & Loss Statement</h2>
            <p className="text-xs text-slate-400 mt-1">For the Year Ended December 31, {timeframe}</p>
            {storeSettings?.pan_number && <p className="text-[11px] text-slate-400 mt-2 font-mono">PAN: {storeSettings.pan_number}</p>}
          </div>

          {/* Table Data */}
          <div className="w-full">
            
            {/* INCOME SECTION */}
            <div className="mb-10">
                <h3 className="font-semibold text-slate-600 text-xs uppercase tracking-widest border-b border-slate-200 pb-2 mb-3 px-2">Income</h3>
                <div className="flex justify-between py-2 text-sm text-slate-600 px-4">
                  <span>Sales Revenue (Recognized)</span>
                  <span>Rs {revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between py-3 mt-2 border-t border-slate-100 bg-slate-50 px-4 text-sm font-semibold text-slate-800 rounded-sm">
                  <span>Total Income</span>
                  <span>Rs {revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
            </div>

            {/* EXPENSES SECTION */}
            <div className="mb-10">
                <h3 className="font-semibold text-slate-600 text-xs uppercase tracking-widest border-b border-slate-200 pb-2 mb-3 px-2">Operating Expenses</h3>
                
                <div className="space-y-1 mb-3 px-4">
                  {Object.keys(expenseCategories).length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-400 italic">No expenses recorded for this period.</div>
                  ) : (
                    Object.entries(expenseCategories)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between py-2 text-sm text-slate-600">
                          <span>{cat}</span>
                          <span>Rs {amt.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between py-3 mt-2 border-t border-slate-100 bg-slate-50 px-4 text-sm font-semibold text-slate-800 rounded-sm">
                  <span>Total Operating Expenses</span>
                  <span>Rs {totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
            </div>

            {/* NET PROFIT SECTION */}
            <div className={`flex justify-between items-center py-5 px-6 mt-4 rounded-md text-lg font-bold border ${isProfit ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
              <span>Net {isProfit ? 'Profit' : 'Loss'}</span>
              <span>Rs {Math.abs(netProfit).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>

          </div>

          {/* Legal Disclaimer */}
          <div className="mt-20 pt-6 border-t border-slate-100 flex gap-3 text-slate-400">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-slate-300" />
            <p className="text-[10px] leading-relaxed text-justify">
              <strong>Disclaimer:</strong> This is a computer-generated report created via Technosoft Accounting Software. 
              While every effort has been made to ensure data accuracy based on your inputs, please verify this statement 
              with your professional accountant or certified tax auditor before finalizing your books or submitting to the Inland Revenue Department (IRD).
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ProfitAndLoss;