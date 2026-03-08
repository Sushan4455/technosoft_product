import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  Plus, Search, FileSignature, Printer, Sparkles,
  Target, CheckCircle, X, Trash2, Check, XCircle, BrainCircuit, ArrowRight
} from 'lucide-react';

const Estimates = () => {
  const [estimates, setEstimates] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const defaultValidDate = new Date();
  defaultValidDate.setDate(defaultValidDate.getDate() + 14);

  const initialFormState = {
    customer_name: '', customer_email: '',
    items: [{ id: Date.now(), name: '', quantity: 1, price: '' }],
    apply_vat: false, subtotal: 0, amount: 0, status: 'Draft',
    valid_until: defaultValidDate.toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:estimates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estimates' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);

      const { data: estData } = await supabase.from('estimates').select('*').order('created_at', { ascending: false });
      if (estData) setEstimates(estData);

      const { data: settingsData } = await supabase.from('store_settings').select('*').eq('user_id', session.user.id).single();
      if (settingsData) setStoreSettings(settingsData);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ---
  const calculateInsights = () => {
    let pipelineValue = 0;
    let acceptedValue = 0;
    let totalQuotes = estimates.length;
    let acceptedQuotes = 0;

    estimates.forEach(est => {
      if (est.status === 'Draft' || est.status === 'Sent') {
        pipelineValue += Number(est.amount);
      } else if (est.status === 'Accepted') {
        acceptedValue += Number(est.amount);
        acceptedQuotes++;
      }
    });

    const winRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
    const expectedValue = pipelineValue * (winRate / 100 || 0.3);

    return { pipelineValue, acceptedValue, winRate, expectedValue };
  };

  const insights = calculateInsights();

  // --- 3. TECHNOSOFT AI QUOTE OPTIMIZER ---
  const generateAiSuggestion = (items) => {
    const text = items.map(i => i.name.toLowerCase()).join(' ');
    if (text.length < 3) return setAiSuggestion("");

    if (text.includes('website') || text.includes('app') || text.includes('software')) {
      setAiSuggestion("AI Upsell Suggestion: Clients buying software often need ongoing support. Consider adding an 'Annual Maintenance Contract (AMC)' line item.");
    } else if (text.includes('marketing') || text.includes('seo') || text.includes('ads')) {
      setAiSuggestion("AI Upsell Suggestion: Enhance this marketing quote by offering a 'One-Time Setup & Audit Fee' before the monthly retainer begins.");
    } else if (text.includes('consulting') || text.includes('training')) {
      setAiSuggestion("AI Value Suggestion: Consulting quotes close 20% faster when you include a clear 'Deliverables Timeline' in the description.");
    } else if (formData.amount > 100000) {
      setAiSuggestion("AI Strategy: High-value quote detected (Rs 100k+). Consider offering a 5% discount if paid upfront to secure cash flow.");
    } else {
      setAiSuggestion("AI Analysis: Quote looks standard. Ensure your item descriptions highlight the value, not just the feature.");
    }
  };

  // --- 4. QUOTE BUILDER LOGIC ---
  const handleItemChange = (id, field, value) => {
    const newItems = formData.items.map(item => item.id === id ? { ...item, [field]: value } : item);
    calculateTotal(newItems, formData.apply_vat);
    if (field === 'name' || field === 'price') generateAiSuggestion(newItems);
  };

  const addItemRow = () => setFormData({ ...formData, items: [...formData.items, { id: Date.now(), name: '', quantity: 1, price: '' }] });

  const removeItemRow = (idToRemove) => {
    const newItems = formData.items.filter(item => item.id !== idToRemove);
    calculateTotal(newItems, formData.apply_vat);
    generateAiSuggestion(newItems);
  };

  const calculateTotal = (items, applyVat) => {
    const sub = items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)), 0);
    const finalAmount = applyVat ? sub + (sub * 0.13) : sub;
    setFormData({ ...formData, items, subtotal: sub, amount: finalAmount, apply_vat: applyVat });
  };

  const handleVatToggle = (e) => {
    const apply = e.target.checked;
    calculateTotal(formData.items, apply);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const estimateToSave = {
      user_id: currentUser.id,
      customer_name: formData.customer_name,
      customer_email: formData.customer_email,
      amount: formData.amount,
      status: formData.status,
      valid_until: formData.valid_until,
      notes: formData.apply_vat ? 'VAT_APPLIED' : '',
      items: formData.items.map(item => ({ name: item.name, quantity: item.quantity, price: item.price }))
    };

    await supabase.from('estimates').insert([estimateToSave]);
    setIsModalOpen(false);
    setFormData(initialFormState);
    setAiSuggestion("");
    fetchData();
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from('estimates').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  const deleteEstimate = async (id) => {
    if (window.confirm("Are you sure you want to delete this quote permanently?")) {
      await supabase.from('estimates').delete().eq('id', id);
      fetchData();
    }
  };

  // --- 5. ADVANCED: CONVERT QUOTE TO INVOICE ---
  const convertToInvoice = async (quote) => {
    if (window.confirm(`Convert Quote EST-${quote.id.slice(0, 6).toUpperCase()} to an active Invoice?`)) {
      setIsConverting(quote.id);
      try {
        const invoiceData = {
          user_id: currentUser.id,
          customer_name: quote.customer_name,
          customer_email: quote.customer_email,
          amount: quote.amount,
          status: 'Processing', // Default invoice status
          notes: quote.notes,
          items: quote.items
        };

        // Insert into orders (invoices) table
        await supabase.from('orders').insert([invoiceData]);
        // Mark estimate as converted
        await supabase.from('estimates').update({ is_converted: true, status: 'Accepted' }).eq('id', quote.id);

        alert("Successfully converted to Invoice! Check your Invoices tab.");
        fetchData();
      } catch (error) {
        console.error(error);
        alert("Failed to convert. Ensure your 'orders' table exists and allows inserts.");
      } finally {
        setIsConverting(false);
      }
    }
  };

  // --- 6. PRINT QUOTE (PDF) ---
  const printQuote = (quote) => {
    const printWindow = window.open('', '_blank');
    const isVatApplied = quote.notes === 'VAT_APPLIED';

    const subtotal = isVatApplied ? (quote.amount / 1.13) : quote.amount;
    const vatAmount = isVatApplied ? (quote.amount - subtotal) : 0;

    const sName = storeSettings?.store_name || 'My Company';
    const sLogo = storeSettings?.logo_url || null;
    const sAddress = storeSettings?.address || '';
    const sCity = storeSettings?.city || '';
    const sPhone = storeSettings?.phone || '';
    const sEmail = storeSettings?.email || '';

    const addressLine = [sAddress, sCity].filter(Boolean).join(', ');
    const contactLine = [sPhone, sEmail].filter(Boolean).join('<br/>');

    const brandHtml = sLogo
      ? `<img src="${sLogo}" alt="${sName}" style="max-height: 70px; margin-bottom: 10px; object-fit: contain;" /><br/><span style="font-weight: bold; font-size: 18px; color: #1774b5;">${sName}</span>`
      : `<h1 class="title">${sName}</h1>`;

    const itemsHtml = quote.items?.map(i => `
      <tr>
        <td style="padding:12px; border-bottom:1px solid #eee;">${i.name}</td>
        <td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${i.quantity}</td>
        <td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">Rs ${Number(i.price).toLocaleString()}</td>
        <td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">Rs ${(Number(i.price) * Number(i.quantity)).toLocaleString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="4">Custom Service</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>QUOTE #${quote.id.slice(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #1774b5; padding-bottom: 20px; }
            .title { color: #1774b5; font-size: 28px; margin: 0; font-weight: bold; text-transform: uppercase; }
            .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8fafc; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; color: #64748b; }
            .totals-row { display: flex; justify-content: flex-end; }
            .totals-box { width: 300px; }
            .total-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .grand-total { font-size: 18px; font-weight: bold; color: #1774b5; border-bottom: none; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              ${brandHtml}
              <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                ${addressLine ? addressLine + '<br/>' : ''}
                ${contactLine ? contactLine + '<br/>' : ''}
              </p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #333;">ESTIMATE / QUOTE</h2>
              <p style="margin: 5px 0 0 0; color: #64748b;">Quote #: EST-${quote.id.slice(0, 6).toUpperCase()}<br/>Date: ${new Date(quote.created_at).toLocaleDateString()}</p>
              <p style="margin: 5px 0 0 0; color: #1774b5; font-weight: bold;">Valid Until: ${new Date(quote.valid_until).toLocaleDateString()}</p>
            </div>
          </div>

          <div class="details">
            <div>
              <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Prepared For:</p>
              <p style="margin: 5px 0 0 0; font-size: 16px;"><strong>${quote.customer_name}</strong><br/>${quote.customer_email || ''}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="totals-row">
            <div class="totals-box">
              <div class="total-line"><span>Subtotal:</span> <span>Rs ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              ${isVatApplied ? `<div class="total-line"><span>Estimated VAT (13%):</span> <span>Rs ${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
              <div class="total-line grand-total"><span>Estimated Total:</span> <span>Rs ${Number(quote.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
          </div>
          
          <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #64748b; font-size: 12px;">
            This is an estimate, not a contract or invoice. Prices are subject to change. <br/>
            To accept this quote, please sign below and return: <br/><br/><br/>
            ____________________________________________________<br/>
            Signature & Date
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredEstimates = estimates.filter(est =>
    est.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    est.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full">

      {/* HEADER */}
      <div className="flex justify-between items-end mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estimates & Quotes</h1>
          <p className="text-slate-500 text-sm mt-1">Draft intelligent proposals, track your pipeline, and convert to invoices.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-all shadow-sm rounded-sm"
        >
          <Plus size={16} /> Draft Estimate
        </button>
      </div>

      {/* REBRANDED AI INSIGHTS BANNER (Navy Blue) */}
      <div className="w-full bg-[#1774b5] text-white p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shadow-sm rounded-sm">
        <div className="flex items-center gap-3 border-r border-blue-400/30 pr-6">
          <div className="p-2 bg-white/20 text-white rounded-full">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">TechnosoftAI Insight</p>
            <h2 className="text-lg font-medium text-white leading-tight">Pipeline Intelligence</h2>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><FileSignature size={12} /> Active Pipeline</p>
            <p className="text-xl font-bold text-white">Rs {insights.pipelineValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Target size={12} /> Historical Win Rate</p>
            <p className="text-xl font-bold text-amber-200">{insights.winRate}%</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><CheckCircle size={12} /> AI Expected Value</p>
            <p className="text-xl font-bold text-white">Rs {insights.expectedValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100 w-1/5">Quote Details</th>
                <th className="py-4 px-6 border-r border-slate-100 w-1/4">Customer</th>
                <th className="py-4 px-6 border-r border-slate-100">Amount & Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading estimates...</td></tr>
              ) : filteredEstimates.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No quotes found.</td></tr>
              ) : (
                filteredEstimates.map((est) => (
                  <tr key={est.id} className={`hover:bg-slate-50 transition-colors ${est.is_converted ? 'bg-slate-50/50 opacity-70' : ''}`}>

                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <FileSignature size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-900 font-mono text-xs">EST-{est.id.slice(0, 6).toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-slate-500">Valid til: {new Date(est.valid_until).toLocaleDateString()}</span>
                    </td>

                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-medium text-slate-800">{est.customer_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{est.customer_email || 'No email'}</p>
                    </td>

                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-semibold text-slate-900 mb-1">Rs {Number(est.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border rounded-sm ${est.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          est.status === 'Sent' ? 'bg-blue-50 text-[#1774b5] border-blue-200' :
                            est.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                        {est.is_converted ? 'INVOICED' : est.status}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col items-center gap-2">

                        {/* Status Toggles */}
                        {!est.is_converted && (
                          <div className="flex items-center gap-2 w-full">
                            {est.status !== 'Accepted' && est.status !== 'Rejected' && (
                              <>
                                <button onClick={() => updateStatus(est.id, 'Accepted')} className="flex-1 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors text-[10px] font-bold uppercase rounded-sm flex justify-center items-center gap-1" title="Mark Accepted">
                                  <Check size={12} /> Accept
                                </button>
                                <button onClick={() => updateStatus(est.id, 'Rejected')} className="flex-1 py-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors text-[10px] font-bold uppercase rounded-sm flex justify-center items-center gap-1" title="Mark Rejected">
                                  <XCircle size={12} /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Convert to Invoice Button (Only if Accepted and not already converted) */}
                        {est.status === 'Accepted' && !est.is_converted && (
                          <button
                            onClick={() => convertToInvoice(est)}
                            disabled={isConverting === est.id}
                            className="w-full py-1.5 bg-[#1774b5] text-white hover:bg-[#135d90] transition-colors text-[10px] font-bold uppercase tracking-wider rounded-sm flex justify-center items-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <ArrowRight size={12} /> Convert to Invoice
                          </button>
                        )}

                        <div className="flex justify-center items-center gap-4 mt-1 w-full border-t border-slate-100 pt-2">
                          <button onClick={() => printQuote(est)} className="text-slate-500 hover:text-[#1774b5] transition-colors flex items-center gap-1 text-[10px] font-bold uppercase">
                            <Printer size={12} /> Print
                          </button>
                          <button onClick={() => deleteEstimate(est.id)} className="text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] rounded-md">

            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">Draft New Quote</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
            </div>

            {/* AI QUOTE OPTIMIZER BANNER */}
            <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-100 shrink-0 min-h-[60px] flex items-center">
              {aiSuggestion ? (
                <p className="text-xs font-medium text-amber-700 flex items-start gap-2">
                  <BrainCircuit size={14} className="mt-0.5 shrink-0" />
                  <span>{aiSuggestion}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-400 flex items-center gap-2 italic">
                  <Sparkles size={14} /> Start typing items to receive AI Upsell and Strategy suggestions...
                </p>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="quoteForm" onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Customer / Company *</label>
                    <input required type="text" value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input type="email" value={formData.customer_email} onChange={e => setFormData({ ...formData, customer_email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Valid Until *</label>
                    <input required type="date" value={formData.valid_until} onChange={e => setFormData({ ...formData, valid_until: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-800">Proposed Services / Items</h3>
                    <button type="button" onClick={addItemRow} className="text-xs bg-white border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 hover:text-[#1774b5] transition-colors rounded-sm flex items-center gap-1">
                      <Plus size={14} /> Add Service
                    </button>
                  </div>

                  <div className="p-4 bg-white space-y-3">
                    <div className="hidden md:flex gap-3 px-1">
                      <div className="flex-[3] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</div>
                      <div className="w-20 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Qty</div>
                      <div className="w-32 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right pr-2">Rate (Rs)</div>
                      {formData.items.length > 1 && <div className="w-8"></div>}
                    </div>

                    {formData.items.map((item) => (
                      <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        <input
                          required type="text" placeholder="Description" value={item.name}
                          onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                          className="w-full md:flex-[3] bg-slate-50 border border-slate-200 p-2 text-sm focus:outline-none focus:border-[#1774b5] focus:bg-white rounded-sm transition-colors"
                        />
                        <div className="flex w-full md:w-auto gap-3">
                          <input
                            required type="number" placeholder="Qty" min="1" value={item.quantity}
                            onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                            className="w-full md:w-20 bg-slate-50 border border-slate-200 p-2 text-sm text-center focus:outline-none focus:border-[#1774b5] focus:bg-white rounded-sm transition-colors"
                          />
                          <input
                            required type="number" placeholder="Rate (Rs)" min="0" step="0.01" value={item.price}
                            onChange={e => handleItemChange(item.id, 'price', e.target.value)}
                            className="w-full md:w-32 bg-slate-50 border border-slate-200 p-2 text-sm text-right focus:outline-none focus:border-[#1774b5] focus:bg-white rounded-sm transition-colors"
                          />
                          {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItemRow(item.id)} className="w-10 flex justify-center items-center text-slate-400 hover:text-red-600 transition-colors" title="Remove Item">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between text-sm text-slate-600 px-1">
                      <span>Subtotal:</span>
                      <span>Rs {formData.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <label className="flex items-center justify-between cursor-pointer border-y border-slate-100 py-3 px-1 hover:bg-slate-50 transition-colors rounded-sm">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 accent-[#1774b5]" checked={formData.apply_vat} onChange={handleVatToggle} />
                        <span className="text-sm font-medium text-slate-800 select-none">Apply Estimated 13% VAT</span>
                      </div>
                      <span className="text-sm text-slate-600">
                        {formData.apply_vat ? `Rs ${(formData.subtotal * 0.13).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Rs 0.00'}
                      </span>
                    </label>

                    <div className="flex justify-between items-center pt-2 px-1">
                      <span className="text-base font-bold text-slate-900">Estimated Total:</span>
                      <span className="text-2xl font-bold text-[#1774b5]">Rs {formData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button onClick={() => setIsModalOpen(false)} type="button" className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-all rounded-sm">Cancel</button>
              <button type="submit" form="quoteForm" onClick={() => setFormData({ ...formData, status: 'Sent' })} className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-all shadow-sm rounded-sm">
                Save & Send Quote
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Estimates;