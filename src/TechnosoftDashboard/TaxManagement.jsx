import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Landmark, FileText, Download, TrendingDown, TrendingUp, 
  Sparkles, BrainCircuit, ShieldCheck, ArrowRight, X, Percent, 
  Briefcase, Globe, Printer, Search, Package
} from 'lucide-react';

const TaxManagement = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Data States
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  
  // UI States
  const [timeframe, setTimeframe] = useState('current_year'); 
  const [vatSearchTerm, setVatSearchTerm] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    fetchTaxData();
  }, [timeframe]);

  const fetchTaxData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setCurrentUser(session.user);

    // Fetch Store Settings (for printing VAT bills)
    const { data: settings } = await supabase.from('store_settings').select('*').eq('user_id', session.user.id).single();
    if (settings) setStoreSettings(settings);

    // Fetch Orders (Revenue & Output VAT)
    const { data: salesData } = await supabase.from('orders').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (salesData) setSales(salesData);

    // Fetch Expenses (OpEx & Input VAT)
    const { data: expenseData } = await supabase.from('expenses').select('*').eq('user_id', session.user.id);
    if (expenseData) setExpenses(expenseData);

    // Fetch Purchase Orders (COGS & Input VAT)
    const { data: poData } = await supabase.from('purchase_orders').select('*').eq('user_id', session.user.id).neq('status', 'Draft');
    if (poData) setPurchaseOrders(poData);

    // Fetch Products (For Import & Customs Tracking)
    const { data: prodData } = await supabase.from('products').select('*').eq('user_id', session.user.id).order('name', { ascending: true });
    if (prodData) setProducts(prodData);

    setLoading(false);
  };

  // --- CORE FINANCIAL & TAX CALCULATIONS ---
  const calculateMetrics = () => {
    let totalRevenue = 0;
    let outputVAT = 0; 
    let taxableSales = 0;
    
    let totalExpenses = 0; // OpEx + COGS
    let inputVAT = 0; 
    let totalCustomDuties = 0;

    // 1. Process Sales
    sales.forEach(sale => {
      const amt = Number(sale.amount);
      totalRevenue += amt;
      // Assuming Nepal Standard 13% VAT is embedded in the total for taxable items
      const subtotal = amt / 1.13;
      const vat = amt - subtotal;
      outputVAT += vat;
      taxableSales += subtotal;
    });

    // 2. Process Operating Expenses
    expenses.forEach(exp => {
      const amt = Number(exp.amount);
      const vat = Number(exp.vat_amount || 0);
      totalExpenses += amt;
      inputVAT += vat;
    });

    // 3. Process Purchase Orders & Custom Duties
    purchaseOrders.forEach(po => {
        const amt = Number(po.total_amount);
        totalExpenses += amt;
        
        // Estimate Input VAT on Purchases (Assuming 13% standard)
        inputVAT += (amt - (amt / 1.13));

        // Calculate Custom Duty based on items in the PO
        if (po.items) {
            po.items.forEach(item => {
                const product = products.find(p => p.name === item.name);
                if (product && product.is_imported) {
                    const itemTotal = Number(item.price) * Number(item.quantity);
                    const dutyRate = Number(product.custom_duty_rate || 0) / 100;
                    totalCustomDuties += (itemTotal * dutyRate);
                }
            });
        }
    });

    // 4. Net Calculations
    const netVatPayable = outputVAT - inputVAT;
    const netProfit = totalRevenue - totalExpenses - totalCustomDuties;
    const estimatedIncomeTax = netProfit > 0 ? (netProfit * 0.25) : 0; // Standard 25% Corporate Tax

    // AI Advice
    let aiAdvice = "Financial data is balanced. Keep up with accurate data entry.";
    if (netVatPayable > 0) aiAdvice = `You owe Rs ${netVatPayable.toLocaleString(undefined, {minimumFractionDigits: 0})} in VAT. File your return by the 25th of the month.`;
    else if (netVatPayable < 0) aiAdvice = `You have a VAT Credit of Rs ${Math.abs(netVatPayable).toLocaleString(undefined, {minimumFractionDigits: 0})}. Use this to offset future liabilities.`;

    return { totalRevenue, totalExpenses, netProfit, outputVAT, inputVAT, netVatPayable, totalCustomDuties, estimatedIncomeTax, aiAdvice };
  };

  const metrics = calculateMetrics();

  // --- ACTIONS ---
  const toggleImportStatus = async (productId, currentStatus) => {
      await supabase.from('products').update({ is_imported: !currentStatus }).eq('id', productId);
      fetchTaxData();
  };

  const updateDutyRate = async (productId, newRate) => {
      await supabase.from('products').update({ custom_duty_rate: parseFloat(newRate) || 0 }).eq('id', productId);
      fetchTaxData();
  };

  // --- COMPREHENSIVE EXPORT (AUDIT REPORT) ---
  const exportAuditReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "TECHNOSOFT - COMPREHENSIVE TAX & AUDIT REPORT\n\n";
    
    csvContent += `Total Revenue,Rs ${metrics.totalRevenue}\n`;
    csvContent += `Total Operating Expenses & COGS,Rs ${metrics.totalExpenses}\n`;
    csvContent += `Total Customs Duty Paid,Rs ${metrics.totalCustomDuties}\n`;
    csvContent += `Net Profit Before Tax,Rs ${metrics.netProfit}\n`;
    csvContent += `Estimated Corporate Tax (25%),Rs ${metrics.estimatedIncomeTax}\n\n`;

    csvContent += "--- SALES REGISTER (Output VAT) ---\nDate,Invoice ID,Customer,Total Amount,VAT Collected (13%)\n";
    sales.forEach(s => {
        const amt = Number(s.amount);
        const vat = amt - (amt / 1.13);
        csvContent += `${new Date(s.created_at).toLocaleDateString()},INV-${s.id.slice(0,6).toUpperCase()},${s.customer_name},${amt.toFixed(2)},${vat.toFixed(2)}\n`;
    });

    csvContent += "\n--- EXPENSE & PURCHASE REGISTER (Input VAT) ---\nDate,Vendor/Payee,Type,Total Amount,VAT Claimed\n";
    expenses.forEach(e => {
        csvContent += `${new Date(e.expense_date).toLocaleDateString()},${e.vendor_name},OpEx,${e.amount},${e.vat_amount || 0}\n`;
    });
    purchaseOrders.forEach(po => {
        const amt = Number(po.total_amount);
        const vat = amt - (amt / 1.13);
        csvContent += `${new Date(po.order_date).toLocaleDateString()},${po.vendor_name},Inventory PO,${amt.toFixed(2)},${vat.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `Audit_Tax_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- PRINT OFFICIAL VAT BILL (MODERNIZED) ---
  const printVATBill = (order) => {
    const invoiceWindow = window.open('', '_blank');
    const sName = storeSettings?.store_name || 'My Company';
    const sAddress = storeSettings?.address || 'Kathmandu, Nepal';
    const sPhone = storeSettings?.phone || '';
    const sVat = storeSettings?.vat_number || '000000000';

    const itemsHtml = order.items?.map(i => {
        const rate = Number(i.price);
        const qty = Number(i.quantity);
        const amount = rate * qty;
        return `<tr>
            <td class="td-item">${i.name}</td>
            <td class="td-center">${qty}</td>
            <td class="td-right">${rate.toFixed(2)}</td>
            <td class="td-right">${amount.toFixed(2)}</td>
        </tr>`;
    }).join('') || '';

    const grandTotal = Number(order.amount);
    const taxableAmount = grandTotal / 1.13;
    const vatAmount = grandTotal - taxableAmount;

    invoiceWindow.document.write(`
      <html>
        <head>
          <title>TAX INVOICE - ${order.id.slice(0,8).toUpperCase()}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; -webkit-font-smoothing: antialiased; }
            h1, h2, h3, p { margin: 0; padding: 0; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .company-info h2 { color: #0f172a; font-size: 24px; font-weight: 700; margin-bottom: 4px; }
            .company-info p { color: #64748b; font-size: 13px; line-height: 1.5; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { color: #1774b5; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
            .invoice-title p { color: #64748b; font-size: 13px; margin-top: 4px; }
            
            .meta-section { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }
            .meta-block p { font-size: 14px; color: #334155; font-weight: 500; line-height: 1.6; }
            
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background: #f8fafc; padding: 12px 16px; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #64748b; text-align: left; border-bottom: 1px solid #cbd5e1; }
            .items-table .th-center { text-align: center; }
            .items-table .th-right { text-align: right; }
            .td-item { padding: 16px; font-size: 14px; font-weight: 500; color: #334155; border-bottom: 1px solid #f1f5f9; }
            .td-center { padding: 16px; font-size: 14px; text-align: center; color: #475569; border-bottom: 1px solid #f1f5f9; }
            .td-right { padding: 16px; font-size: 14px; text-align: right; color: #475569; border-bottom: 1px solid #f1f5f9; }
            
            .summary-container { display: flex; justify-content: flex-end; }
            .summary-box { width: 320px; }
            .summary-line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
            .summary-line.total { border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 16px; font-size: 18px; font-weight: 700; color: #0f172a; }
            
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
            .signature-box { margin-top: 60px; display: flex; justify-content: space-between; width: 100%; }
            .sig-line { border-top: 1px solid #cbd5e1; width: 200px; text-align: center; padding-top: 8px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="company-info">
              <h2>${sName}</h2>
              <p>${sAddress}<br/>Phone: ${sPhone}<br/><strong>PAN/VAT No: ${sVat}</strong></p>
            </div>
            <div class="invoice-title">
              <h1>TAX INVOICE</h1>
              <p>INV-${order.id.slice(0,8).toUpperCase()}<br/>Schedule 5 Format</p>
            </div>
          </div>

          <div class="meta-section">
            <div class="meta-block">
              <h3>Billed To</h3>
              <p><strong>${order.customer_name}</strong><br/>
              ${order.shipping_address || 'Address Not Provided'}<br/>
              ${order.shipping_city || ''}<br/>
              ${order.customer_pan ? `PAN: ${order.customer_pan}` : 'Customer PAN: N/A'}</p>
            </div>
            <div class="meta-block" style="text-align: right;">
              <h3>Invoice Details</h3>
              <p>Date: ${new Date(order.created_at).toLocaleDateString()}<br/>
              Payment Mode: ${order.payment_method || 'Standard'}</p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description of Goods / Services</th>
                <th class="th-center">Qty</th>
                <th class="th-right">Rate (Rs)</th>
                <th class="th-right">Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          
          <div class="summary-container">
            <div class="summary-box">
              <div class="summary-line"><span>Gross Amount:</span> <span>${grandTotal.toFixed(2)}</span></div>
              <div class="summary-line"><span>Discount:</span> <span>0.00</span></div>
              <div class="summary-line"><span>Taxable Amount:</span> <span>${taxableAmount.toFixed(2)}</span></div>
              <div class="summary-line"><span>13% VAT:</span> <span>${vatAmount.toFixed(2)}</span></div>
              <div class="summary-line total"><span style="color: #1774b5;">Grand Total:</span> <span style="color: #1774b5;">Rs ${grandTotal.toFixed(2)}</span></div>
            </div>
          </div>

          <div class="signature-box">
            <div class="sig-line">Customer Signature</div>
            <div class="sig-line">Authorized Signatory</div>
          </div>

          <div class="footer">
            <p>Thank you for your business. Subject to local jurisdiction.</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
  };

  const filteredSalesForVat = sales.filter(s => 
      s.customer_name.toLowerCase().includes(vatSearchTerm.toLowerCase()) || 
      s.id.toLowerCase().includes(vatSearchTerm.toLowerCase()) ||
      s.items?.some(i => i.name.toLowerCase().includes(vatSearchTerm.toLowerCase()))
  );

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500 bg-slate-50/50">
              <Landmark className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Calculating Tax Liabilities...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200/80 pb-4 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-regular tracking-tight text-slate-800 flex items-center gap-2">
    Unified Tax & Audit
          </h1>
        </div>
        <div className="flex items-center gap-3">
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-md outline-none focus:border-[#1774b5]"
            >
                <option value="current_year">Current Fiscal Year</option>
                <option value="current_month">Current Month</option>
            </select>
            <button onClick={exportAuditReport} className="flex items-center gap-2 px-5 py-2 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors rounded-lg">
              <Download size={16} /> Export Audit Report
            </button>
        </div>
      </div>

      {/* COMPLIANCE AI BANNER */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="w-full bg-[#1774b5] text-white p-6 rounded-lg border border-blue-800/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 pb-6 border-b border-blue-400/30">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 text-white rounded-md"><Sparkles size={20} /></div>
                    <div>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">AI Compliance Engine</p>
                        <h2 className="text-lg font-medium text-white leading-tight">Estimated Liability Dashboard</h2>
                    </div>
                </div>
                <div className="flex-1 md:text-right w-full">
                    <p className="text-sm font-medium text-amber-200 flex items-center md:justify-end gap-2 bg-blue-900/30 p-2.5 rounded-md inline-flex border border-blue-400/20">
                        <BrainCircuit size={16} className="shrink-0" />
                        <span className="text-left md:text-right">{metrics.aiAdvice}</span>
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white/10 p-5 rounded-md border border-white/20">
                    <p className="text-blue-100 text-[10px] mb-1.5 flex items-center gap-1.5 uppercase font-bold tracking-widest"><TrendingUp size={14}/> Output VAT (Collected)</p>
                    <p className="text-2xl font-bold text-white">Rs {metrics.outputVAT.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                </div>
                <div className="bg-white/10 p-5 rounded-md border border-white/20">
                    <p className="text-blue-100 text-[10px] mb-1.5 flex items-center gap-1.5 uppercase font-bold tracking-widest"><TrendingDown size={14}/> Input VAT (Paid)</p>
                    <p className="text-2xl font-bold text-white">Rs {metrics.inputVAT.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                </div>
                <div className="bg-white text-slate-900 p-5 rounded-md relative overflow-hidden border border-slate-100">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <p className="text-slate-500 text-[10px] mb-1.5 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Landmark size={14}/> Net VAT Payable</p>
                    <p className={`text-2xl font-bold ${metrics.netVatPayable > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Rs {Math.abs(metrics.netVatPayable).toLocaleString(undefined, {minimumFractionDigits: 0})} {metrics.netVatPayable < 0 && '(Cr)'}
                    </p>
                </div>
                <div className="bg-white text-slate-900 p-5 rounded-md relative overflow-hidden border border-slate-100">
                    <div className="absolute top-0 right-0 p-2 opacity-5"><Briefcase size={50}/></div>
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <p className="text-slate-500 text-[10px] mb-1.5 flex items-center gap-1.5 uppercase font-bold tracking-widest">Corporate Tax (25%)</p>
                    <p className="text-2xl font-bold text-slate-800">Rs {metrics.estimatedIncomeTax.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium">On Profit: Rs {metrics.netProfit.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                </div>
            </div>
        </div>
      </div>

      {/* BOTTOM CARDS (Flat UI, No Shadows) */}
      <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CUSTOMS & IMPORT DUTY MANAGER */}
        <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col h-[380px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <Globe size={18} className="text-[#1774b5]" />
                    <div>
                        <h3 className="font-semibold text-sm text-slate-800">Customs & Import Duties</h3>
                        <p className="text-[11px] text-slate-500">Est. Duties: <strong className="text-rose-600">Rs {metrics.totalCustomDuties.toLocaleString()}</strong></p>
                    </div>
                </div>
                <button onClick={() => setIsImportModalOpen(true)} className="text-[11px] font-medium bg-white border border-slate-200 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-50 hover:text-[#1774b5] transition-colors">
                    Manage Items
                </button>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center items-center text-center overflow-hidden">
                {products.filter(p => p.is_imported).length > 0 ? (
                    <div className="w-full h-full overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {products.filter(p => p.is_imported).map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 border border-slate-100 rounded bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <span className="text-sm font-medium text-slate-700">{p.name}</span>
                                <span className="text-[10px] font-bold text-[#1774b5] bg-blue-50 px-2 py-1 rounded border border-blue-100">{p.custom_duty_rate}% Duty</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <Globe size={32} className="text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-600">No imported products configured.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">Click "Manage Items" to flag specific items as imported and apply standard customs duty rates.</p>
                    </>
                )}
            </div>
        </div>

        {/* VAT INVOICE GENERATOR */}
        <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col h-[380px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                    <Printer size={16} className="text-[#1774b5]" />
                    <h3 className="font-semibold text-sm text-slate-800">Print Customer VAT Bills</h3>
                </div>
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search sales by customer name or order ID..." 
                        value={vatSearchTerm}
                        onChange={(e) => setVatSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#1774b5] transition-colors" 
                    />
                </div>
            </div>
            <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-slate-50">
                        {filteredSalesForVat.length === 0 ? (
                            <tr><td className="p-8 text-center text-slate-400 text-sm">Search for an order to generate a VAT bill.</td></tr>
                        ) : (
                            filteredSalesForVat.slice(0, 10).map(order => (
                                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4">
                                        <p className="font-medium text-slate-800">{order.customer_name}</p>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">INV-{order.id.slice(0,8).toUpperCase()} | {new Date(order.created_at).toLocaleDateString()}</p>
                                    </td>
                                    <td className="p-4 text-right">
                                        <p className="font-semibold text-slate-900">Rs {Number(order.amount).toLocaleString()}</p>
                                    </td>
                                    <td className="p-4 text-right w-32">
                                        <button onClick={() => printVATBill(order)} className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200 hover:border-[#1774b5] hover:text-[#1774b5] px-3 py-1.5 rounded transition-all w-full">
                                            Print VAT Bill
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

      {/* --- MANAGE IMPORT DUTIES MODAL --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 flex flex-col max-h-[80vh] shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0 rounded-t-xl">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Globe size={18} className="text-[#1774b5]"/> Product Import Configuration</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                <p className="text-sm text-slate-500 mb-6 leading-relaxed font-medium">Select which products are imported internationally and assign their custom duty percentage. Duties are automatically calculated against your Purchase Orders.</p>
                
                <div className="space-y-3">
                    {products.map(p => (
                        <div key={p.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg transition-colors ${p.is_imported ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white hover:border-blue-100'}`}>
                            <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                <input 
                                    type="checkbox" 
                                    checked={p.is_imported} 
                                    onChange={() => toggleImportStatus(p.id, p.is_imported)}
                                    className="w-4 h-4 accent-[#1774b5] cursor-pointer"
                                />
                                <div>
                                    <p className="font-medium text-slate-800 text-sm flex items-center gap-1.5"><Package size={14} className="text-slate-400"/> {p.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-medium">Base Cost: Rs {Number(p.cost_price).toLocaleString()}</p>
                                </div>
                            </div>
                            
                            {p.is_imported && (
                                <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-md shadow-sm ml-7 sm:ml-0 focus-within:border-[#1774b5] transition-colors">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Duty %</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.1"
                                        value={p.custom_duty_rate || ''}
                                        onChange={(e) => updateDutyRate(p.id, e.target.value)}
                                        className="w-16 p-1.5 text-sm font-semibold text-center border-l border-slate-200 outline-none text-[#1774b5]"
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0 rounded-b-xl">
                <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-white bg-[#1774b5] rounded-lg hover:bg-[#135d90] transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TaxManagement;