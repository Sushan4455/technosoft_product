import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Plus, Search, FileText, Printer, Sparkles, 
  TrendingUp, AlertCircle, CheckCircle, X, Trash2, Mail, Clock, 
  UploadCloud, Briefcase, Edit, AlertTriangle
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const AllInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Custom Invoice Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef(null);
  
  const initialFormState = {
    customer_name: '', customer_pan: '', customer_email: '', 
    shipping_address: '', shipping_city: '', project_tag: '',
    currency: 'NPR', due_date: '', 
    items: [{ id: Date.now(), name: '', quantity: 1, price: '' }],
    apply_vat: false, subtotal: 0, vat_amount: 0, amount: 0, status: 'Pending'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:orders_invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
      
      const { data: invoiceData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (invoiceData) setInvoices(invoiceData);

      const { data: productData } = await supabase.from('products').select('*').eq('user_id', session.user.id).neq('status', 'Draft');
      if (productData) setAvailableProducts(productData);

      const { data: settingsData } = await supabase.from('store_settings').select('*').eq('user_id', session.user.id).single();
      if (settingsData) setStoreSettings(settingsData);
    }
    setLoading(false);
  };

  const calculateInsights = () => {
    let totalRevenue = 0, pendingRevenue = 0, overdueCount = 0;
    const today = new Date();

    invoices.forEach(inv => {
      let amt = Number(inv.amount);
      if (inv.currency === 'USD') amt *= 133; 
      
      if (inv.status === 'Delivered' || inv.status === 'Paid') {
        totalRevenue += amt;
      } else if (inv.status === 'Processing' || inv.status === 'Pending') {
        pendingRevenue += amt;
        if (inv.due_date && new Date(inv.due_date) < today) overdueCount++;
      }
    });

    return { totalRevenue, pendingRevenue, overdueCount, projectedNextMonth: totalRevenue > 0 ? totalRevenue * 1.2 : 0 };
  };

  const insights = calculateInsights();

  // --- 2. INVOICE LOGIC & MATH ---
  const openModal = (invoice = null) => {
    setExtractionMessage({ text: '', type: '' });
    if (invoice) {
        setEditingId(invoice.id);
        const apply_vat = Number(invoice.vat_amount) > 0;
        const subtotal = Number(invoice.amount) - Number(invoice.vat_amount || 0);
        // Ensure items have unique frontend IDs for rendering
        const itemsWithIds = (invoice.items || []).map((i, idx) => ({ ...i, id: Date.now() + idx }));
        
        setFormData({ ...invoice, apply_vat, subtotal, items: itemsWithIds.length > 0 ? itemsWithIds : initialFormState.items });
    } else {
        setEditingId(null);
        setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleProductSelect = (id, productName) => {
    const selectedProduct = availableProducts.find(p => p.name === productName);
    const price = selectedProduct ? selectedProduct.price : 0;
    
    const newItems = formData.items.map(item => 
        item.id === id ? { ...item, name: productName, price: price } : item
    );
    calculateTotal(newItems, formData.apply_vat);
  };

  const handleItemChange = (id, field, value) => {
    const newItems = formData.items.map(item => item.id === id ? { ...item, [field]: value } : item);
    calculateTotal(newItems, formData.apply_vat);
  };

  const addItemRow = () => setFormData({ ...formData, items: [...formData.items, { id: Date.now(), name: '', quantity: 1, price: '' }] });
  
  const removeItemRow = (idToRemove) => {
    const newItems = formData.items.filter(item => item.id !== idToRemove);
    calculateTotal(newItems, formData.apply_vat);
  };

  const calculateTotal = (items, applyVat) => {
    const sub = items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)), 0);
    const vatAmt = applyVat ? sub * 0.13 : 0;
    const finalAmount = sub + vatAmt;
    setFormData({ ...formData, items, subtotal: sub, vat_amount: vatAmt, amount: finalAmount, apply_vat: applyVat });
  };

  const handleVatToggle = (e) => {
    const apply = e.target.checked;
    calculateTotal(formData.items, apply);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("You must be logged in.");

    // Validation: Ensure all items have selected a product
    const hasEmptyProduct = formData.items.some(i => i.name === '');
    if (hasEmptyProduct) return alert("Please select a valid product from the catalog for all items.");

    const invoiceToSave = {
      user_id: currentUser.id,
      customer_name: formData.customer_name,
      customer_pan: formData.customer_pan || null,
      customer_email: formData.customer_email,
      shipping_address: formData.shipping_address,
      shipping_city: formData.shipping_city,
      project_tag: formData.project_tag || null,
      currency: formData.currency,
      due_date: formData.due_date || null,
      amount: parseFloat(formData.amount),
      vat_amount: parseFloat(formData.vat_amount),
      status: formData.status,
      notes: formData.apply_vat ? 'VAT_APPLIED' : '',
      items: formData.items.map(item => ({ name: item.name, quantity: parseInt(item.quantity), price: parseFloat(item.price) }))
    };

    try {
      if (editingId) {
          const { error } = await supabase.from('orders').update(invoiceToSave).eq('id', editingId);
          if (error) throw error;
      } else {
          const { error } = await supabase.from('orders').insert([invoiceToSave]);
          if (error) throw error;
      }
      
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error("Save Error:", err);
      alert(`Database Error: ${err.message}.`);
    }
  };

  const updateStatus = async (id, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  const deleteInvoice = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice permanently? This will remove the revenue from your analytics.")) {
      await supabase.from('orders').delete().eq('id', id);
      fetchData();
    }
  };

  // --- 3. PDF EXTRACTION ---
  const triggerFileInput = () => {
    setExtractionMessage({ text: '', type: '' });
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionMessage({ text: 'Reading PDF...', type: 'info' });
    
    try {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const loadingTask = pdfjsLib.getDocument({ data: typedarray });
                const pdf = await loadingTask.promise;
                
                const textBlocks = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    textBlocks.push(...textContent.items.map(item => item.str.trim()).filter(s => s.length > 0));
                }

                let extractedData = { ...formData };
                let foundTotal = false;

                for (let i = 0; i < textBlocks.length; i++) {
                    const str = textBlocks[i].toLowerCase();

                    if (str === 'billed to:' || str === 'customer:') {
                        if (i + 1 < textBlocks.length) extractedData.customer_name = textBlocks[i + 1];
                    }
                    if (str.includes('@') && str.includes('.')) {
                        const emailMatch = textBlocks[i].match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
                        if (emailMatch) extractedData.customer_email = emailMatch[0]; 
                    }
                    const panMatch = str.match(/(?:pan|vat)[\s:.-]*(\d{9})/i);
                    if (panMatch) extractedData.customer_pan = panMatch[1];

                    if (str === 'total due:' || str === 'total:') {
                        if (i + 1 < textBlocks.length) {
                            const parsed = parseFloat(textBlocks[i + 1].replace(/[^\d.-]/g, ''));
                            if (!isNaN(parsed)) {
                                extractedData.amount = parsed;
                                extractedData.subtotal = parsed;
                                // We leave the name blank so the user is forced to pick a product from the catalog
                                extractedData.items = [{ id: Date.now(), name: '', quantity: 1, price: parsed }];
                                foundTotal = true;
                            }
                        }
                    }
                }

                setFormData(extractedData);
                setExtractionMessage({ text: foundTotal ? `Success! Extracted details. Please assign the product.` : 'Partial extraction.', type: foundTotal ? 'success' : 'warning' });
            } catch (err) {
                setExtractionMessage({ text: `Failed to read PDF.`, type: 'error' });
            } finally { setIsExtracting(false); }
        };
        fileReader.readAsArrayBuffer(file);
    } catch (error) { setIsExtracting(false); }
  };

  // --- 4. PRINT INVOICE ---
  const printInvoice = (invoice) => {
    const printWindow = window.open('', '_blank');
    const currency = invoice.currency || 'Rs';
    const subtotal = invoice.amount - (invoice.vat_amount || 0);
    const sName = storeSettings?.store_name || 'My Company';
    const sLogo = storeSettings?.logo_url || null;
    const brandHtml = sLogo ? `<img src="${sLogo}" alt="${sName}" style="max-height: 70px; margin-bottom: 10px; object-fit: contain;" /><br/><span style="font-weight: bold; font-size: 18px; color: #1774b5;">${sName}</span>` : `<h1 class="title">${sName}</h1>`;

    const itemsHtml = invoice.items?.map(i => `
      <tr><td style="padding:12px; border-bottom:1px solid #eee;">${i.name}</td><td style="padding:12px; border-bottom:1px solid #eee; text-align:center;">${i.quantity}</td><td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">${currency} ${Number(i.price).toLocaleString()}</td><td style="padding:12px; border-bottom:1px solid #eee; text-align:right;">${currency} ${(Number(i.price) * Number(i.quantity)).toLocaleString()}</td></tr>
    `).join('') || '';

    printWindow.document.write(`
      <html>
        <head><title>TAX INVOICE #${invoice.id.slice(0,8).toUpperCase()}</title><style>body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; } .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1774b5; padding-bottom: 20px; margin-bottom: 30px; } table { width: 100%; border-collapse: collapse; margin-bottom: 30px; } th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; } .total-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; } .grand-total { font-size: 18px; font-weight: bold; color: #1774b5; border-bottom: none; padding-top: 15px; }</style></head>
        <body>
          <div class="header"><div>${brandHtml}<p style="font-size:12px;">PAN: ${storeSettings?.pan_number || 'N/A'}</p></div><div style="text-align: right;"><h2>TAX INVOICE</h2><p>INV-${invoice.id.slice(0,6).toUpperCase()}<br/>Date: ${new Date(invoice.created_at).toLocaleDateString()}</p></div></div>
          <div style="margin-bottom: 30px;"><p><strong>Billed To:</strong><br/>${invoice.customer_name}<br/>${invoice.customer_pan ? `PAN: ${invoice.customer_pan}<br/>` : ''}${invoice.customer_email || ''}</p></div>
          <table><thead><tr><th>Description</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Rate</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table>
          <div style="display: flex; justify-content: flex-end;"><div style="width: 300px;"><div class="total-line"><span>Subtotal:</span> <span>${currency} ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>${invoice.vat_amount > 0 ? `<div class="total-line"><span>VAT (13%):</span> <span>${currency} ${Number(invoice.vat_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>` : ''}<div class="total-line grand-total"><span>Total Due:</span> <span>${currency} ${Number(invoice.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div></div></div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.project_tag && inv.project_tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200/80 pb-4 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-regular tracking-tight text-slate-800">Sales Invoices</h1>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors rounded-lg">
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      {/* AI INSIGHTS BANNER */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="w-full bg-[#1774b5] text-white p-5 rounded-lg border border-blue-800/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-blue-400/30">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 text-white rounded-md"><Sparkles size={20} /></div>
                <div><p className="text-blue-100 text-[10px] font-medium uppercase tracking-widest mb-0.5">TechnosoftAI Insight</p><h2 className="text-lg font-medium text-white leading-tight">Receivables Dashboard</h2></div>
            </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
                <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest"><CheckCircle size={12}/> Collected Revenue</p>
                <p className="text-2xl font-semibold text-white">Rs {insights.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
                <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest"><AlertCircle size={12}/> Outstanding ({insights.overdueCount} Overdue)</p>
                <p className="text-xl font-semibold text-amber-300 mt-1">Rs {insights.pendingRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
                <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest"><TrendingUp size={12}/> Projected Next Month</p>
                <p className="text-xl font-semibold text-white mt-1">Rs {insights.projectedNextMonth.toLocaleString()}</p>
            </div>
            </div>
        </div>
      </div>

      {/* INVOICES TABLE */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Search customer, project, or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#1774b5] rounded-md transition-colors" />
                </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6 pl-6">Invoice & Project</th>
                    <th className="py-3 px-6">Billed To</th>
                    <th className="py-3 px-6">Tax & Amount</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-center w-32 pr-6">Manage</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                {loading ? (
                    <tr><td colSpan="5" className="p-10 text-center text-slate-400">Loading invoices...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                    <tr><td colSpan="5" className="p-10 text-center text-slate-400">No invoices found.</td></tr>
                ) : (
                    filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* ID & Project */}
                        <td className="py-4 px-6 pl-6">
                            <div className="flex items-center gap-2 mb-1.5">
                                <FileText size={14} className="text-[#1774b5]" />
                                <span className="font-semibold text-slate-800 font-mono text-xs">INV-{inv.id.slice(0, 6).toUpperCase()}</span>
                            </div>
                            {inv.project_tag ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold border border-indigo-100">
                                    <Briefcase size={10} /> {inv.project_tag}
                                </span>
                            ) : <span className="text-[11px] text-slate-400">Created: {new Date(inv.created_at).toLocaleDateString()}</span>}
                        </td>

                        {/* Customer & PAN */}
                        <td className="py-4 px-6">
                            <p className="font-medium text-slate-800 mb-1">{inv.customer_name}</p>
                            {inv.customer_pan && <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 border border-slate-200 text-slate-600 rounded">PAN: {inv.customer_pan}</span>}
                        </td>

                        {/* Financials & Tax */}
                        <td className="py-4 px-6">
                            <p className="font-bold text-slate-900 mb-1">{inv.currency || 'NPR'} {Number(inv.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            {inv.vat_amount > 0 ? (
                                <span className="text-[9px] font-bold text-[#1774b5] bg-blue-50 px-1.5 py-0.5 border border-blue-200 rounded">13% VAT</span>
                            ) : (
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200 rounded">0% VAT (EXEMPT)</span>
                            )}
                        </td>

                        {/* Status (Clickable to Mark Paid) */}
                        <td className="py-4 px-6">
                            <div className="flex flex-col items-start gap-1.5">
                                <span className={`inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold border rounded ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    {inv.status}
                                </span>
                                {inv.status !== 'Paid' && (
                                    <button onClick={() => updateStatus(inv.id, 'Paid')} className="text-[10px] font-bold text-[#1774b5] hover:underline flex items-center gap-1">
                                        <CheckCircle size={10}/> Mark Paid
                                    </button>
                                )}
                            </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 pr-6">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex gap-1.5 w-full">
                                    <button onClick={() => openModal(inv)} className="flex-1 flex justify-center items-center bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-[#1774b5] py-1.5 rounded transition-colors" title="Edit">
                                        <Edit size={12} />
                                    </button>
                                    <button onClick={() => deleteInvoice(inv.id)} className="flex-1 flex justify-center items-center bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 py-1.5 rounded transition-colors" title="Delete">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <button onClick={() => printInvoice(inv)} className="text-[#1774b5] hover:text-white hover:bg-[#1774b5] transition-colors flex items-center justify-center gap-1.5 text-[10px] font-bold w-full bg-blue-50 px-2 py-1.5 border border-blue-200 rounded">
                                    <Printer size={12} /> Print PDF
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
      </div>

      {/* --- CUSTOM INVOICE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col mb-10 rounded-xl">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Invoice' : 'Draft Sales Invoice'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20}/></button>
            </div>

            {/* OCR Scanner */}
            <div className="px-6 py-4 bg-blue-50/30 border-b border-blue-100 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-bold text-[#1774b5] flex items-center gap-1.5 uppercase tracking-widest mb-1"><Sparkles size={14}/> AI Invoice Digitizer</h3>
                    <p className="text-[10px] text-slate-500">Upload an old PDF to instantly extract Customer Name, PAN, and Totals.</p>
                </div>
                <div className="shrink-0 relative">
                    <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button type="button" onClick={triggerFileInput} disabled={isExtracting} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#1774b5] text-[#1774b5] text-xs font-medium hover:bg-blue-50 rounded-md transition-colors">
                        {isExtracting ? <Clock size={14} className="animate-spin" /> : <UploadCloud size={14} />} Extract Data
                    </button>
                </div>
            </div>

            <div className="p-6">
              <form id="invoiceForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Client Details */}
                <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-1.5 uppercase tracking-widest">Customer Name *</label>
                        <input required type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-md transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1.5 uppercase tracking-widest">Customer PAN</label>
                        <input type="text" value={formData.customer_pan} onChange={e => setFormData({...formData, customer_pan: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-md font-mono transition-colors" placeholder="9 Digits" />
                    </div>
                    
                    <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1.5 uppercase tracking-widest">Email Address</label>
                        <input type="email" value={formData.customer_email} onChange={e => setFormData({...formData, customer_email: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-md transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1.5 uppercase tracking-widest">Due Date</label>
                        <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-md transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1.5 uppercase tracking-widest">Project Tag</label>
                        <input type="text" value={formData.project_tag} onChange={e => setFormData({...formData, project_tag: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-md transition-colors" placeholder="e.g. Web Dev" />
                    </div>
                    </div>
                </div>

                {/* Line Items (STRICT CATALOG ENFORCEMENT) */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Services & Products</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Select items directly from your Product Catalog for accurate reporting.</p>
                    </div>
                    <button type="button" onClick={addItemRow} className="text-xs bg-white border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-1 transition-colors">
                        <Plus size={14} /> Add Item
                    </button>
                  </div>
                  
                  <div className="p-4 bg-white space-y-3">
                    <div className="hidden md:flex gap-3 px-1">
                        <div className="flex-[3] text-[10px] font-medium text-slate-500 uppercase tracking-widest">Product Catalog Selection</div>
                        <div className="w-24 text-[10px] font-medium text-slate-500 uppercase tracking-widest text-center">Qty</div>
                        <div className="w-32 text-[10px] font-medium text-slate-500 uppercase tracking-widest text-right pr-2">Rate</div>
                        {formData.items.length > 1 && <div className="w-10"></div>}
                    </div>

                    {formData.items.map((item) => (
                      <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        
                        {/* RESTRICTED TO CATALOG DROPDOWN */}
                        <select 
                            required 
                            value={item.name} 
                            onChange={e => handleProductSelect(item.id, e.target.value)} 
                            className="w-full md:flex-[3] bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-md cursor-pointer"
                        >
                            <option value="" disabled>-- Select a product --</option>
                            {availableProducts.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>

                        <div className="flex w-full md:w-auto gap-3">
                            <input required type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} className="w-full md:w-24 bg-slate-50 border border-slate-200 p-2.5 text-sm text-center focus:outline-none focus:border-[#1774b5] rounded-md" />
                            <input required type="number" placeholder="Rate" min="0" step="0.01" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} className="w-full md:w-32 bg-slate-50 border border-slate-200 p-2.5 text-sm text-right focus:outline-none focus:border-[#1774b5] rounded-md" />
                            {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItemRow(item.id)} className="w-10 flex justify-center items-center text-slate-400 hover:text-rose-600 transition-colors bg-slate-50 hover:bg-rose-50 rounded-md border border-transparent hover:border-rose-200">
                                <Trash2 size={16} />
                            </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Totals */}
                <div className="flex justify-end pt-2">
                  <div className="w-full max-w-sm space-y-3 bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                    
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200">
                        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Currency</label>
                        <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="bg-white border border-slate-200 p-1.5 text-sm outline-none rounded-md w-full font-medium">
                            <option value="NPR">NPR (Rs)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>
                    </div>

                    <div className="flex justify-between text-sm text-slate-600 font-medium">
                      <span>Subtotal:</span>
                      <span>{formData.currency} {formData.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    
                    <label className="flex items-center justify-between cursor-pointer border border-slate-200 bg-white p-3 rounded-md transition-colors hover:border-[#1774b5]">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 accent-[#1774b5]" checked={formData.apply_vat} onChange={handleVatToggle} />
                        <span className="text-sm font-medium text-slate-800 select-none">Apply 13% VAT</span>
                      </div>
                      <span className="text-sm text-[#1774b5] font-bold">
                        + {formData.currency} {formData.vat_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </span>
                    </label>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">Total Due:</span>
                      <span className="text-2xl font-bold text-slate-900">{formData.currency} {formData.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-xl shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors rounded-lg">Cancel</button>
              <button type="submit" form="invoiceForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors rounded-lg">
                {editingId ? 'Update Ledger' : 'Save to Ledger'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AllInvoices;