import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Search, Edit, Trash2, X, ShoppingCart, 
  Printer, Calendar, CheckCircle, Clock, Sparkles, BrainCircuit, 
  AlertTriangle, Truck, FileText, Users
} from 'lucide-react';

const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]); // <-- NEW: Store vendors here
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isCustomVendor, setIsCustomVendor] = useState(false); // <-- NEW: Toggle for dropdown vs text input

  const initialFormState = {
    vendor_name: '', vendor_email: '', order_date: new Date().toISOString().split('T')[0], expected_delivery_date: '',
    currency: 'NPR', status: 'Draft', notes: '', apply_vat: true,
    items: [{ id: Date.now(), name: '', quantity: 1, price: '' }],
    subtotal: 0, vat_amount: 0, total_amount: 0
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:purchase_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      // Fetch POs
      const { data: poData } = await supabase.from('purchase_orders').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (poData) setPurchaseOrders(poData);

      // Fetch Suppliers securely
      const { data: suppData } = await supabase.from('suppliers').select('*').eq('user_id', session.user.id).order('name', { ascending: true });
      if (suppData) setSuppliers(suppData);

      // Fetch Settings
      const { data: settingsData } = await supabase.from('store_settings').select('*').eq('user_id', session.user.id).single();
      if (settingsData) setStoreSettings(settingsData);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ---
  const calculateInsights = () => {
    let pendingValue = 0;
    let pendingCount = 0;
    let completedValue = 0;

    purchaseOrders.forEach(po => {
      const amt = Number(po.total_amount);
      if (po.status === 'Sent' || po.status === 'Draft') {
        pendingValue += amt;
        pendingCount++;
      } else if (po.status === 'Received') {
        completedValue += amt;
      }
    });

    let aiAdvice = "Track vendor lead times to avoid stockouts.";
    if (pendingCount > 5) {
        aiAdvice = `Action Required: You have ${pendingCount} pending orders. Follow up with vendors.`;
    } else if (pendingValue > 100000) {
        aiAdvice = `Cashflow Notice: You have Rs ${pendingValue.toLocaleString()} locked in pending purchase orders.`;
    }

    return { pendingValue, pendingCount, completedValue, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. FORM LOGIC & MATH ---
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
    setFormData({ ...formData, items, subtotal: sub, vat_amount: vatAmt, total_amount: finalAmount, apply_vat: applyVat });
  };

  // --- 4. CRUD ACTIONS ---
  const openModal = (poToEdit = null) => {
    if (poToEdit) {
      setEditingId(poToEdit.id);
      setFormData({
        ...poToEdit,
        apply_vat: poToEdit.vat_amount > 0
      });
      // Smart check: If vendor isn't in supplier list, switch to Custom mode
      const isKnownVendor = suppliers.some(s => s.name === poToEdit.vendor_name);
      setIsCustomVendor(!isKnownVendor);
    } else {
      setEditingId(null);
      setFormData(initialFormState);
      setIsCustomVendor(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Session expired. Please log in again.");

    const payload = {
      user_id: currentUser.id,
      vendor_name: formData.vendor_name,
      vendor_email: formData.vendor_email || null,
      order_date: formData.order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: formData.expected_delivery_date || null,
      currency: formData.currency || 'NPR',
      subtotal: parseFloat(formData.subtotal) || 0,
      vat_amount: parseFloat(formData.vat_amount) || 0,
      total_amount: parseFloat(formData.total_amount) || 0,
      status: formData.status || 'Draft',
      notes: formData.notes || '',
      items: formData.items.map(item => ({ 
          name: item.name, 
          quantity: parseInt(item.quantity) || 1, 
          price: parseFloat(item.price) || 0 
      }))
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('purchase_orders').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('purchase_orders').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Detailed DB Error:", error);
      alert(`Failed to save Purchase Order.\nReason: ${error.message}`);
    }
  };

  // --- 5. AUTOMATED INVENTORY SYNC ---
  const updateStatus = async (po, newStatus) => {
    try {
      const { error: statusError } = await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', po.id);
      if (statusError) throw statusError;

      if (newStatus === 'Received') {
        let updatedCount = 0;

        for (const item of po.items) {
           const { data: productData } = await supabase
             .from('products')
             .select('id, name, stock_quantity')
             .ilike('name', item.name) 
             .eq('user_id', currentUser.id)
             .single();

           if (productData) {
              const currentStock = parseInt(productData.stock_quantity) || 0;
              const addedQty = parseInt(item.quantity) || 0;
              const newStock = currentStock + addedQty;

              await supabase.from('products').update({ stock_quantity: newStock }).eq('id', productData.id);

              await supabase.from('inventory_logs').insert([{
                 user_id: currentUser.id,
                 product_id: productData.id,
                 product_name: productData.name,
                 adjustment_type: 'Add',
                 quantity_changed: addedQty,
                 previous_stock: currentStock,
                 new_stock: newStock,
                 reason: `PO Received: PO-${po.id.slice(0,6).toUpperCase()}`
              }]);
              
              updatedCount++;
           }
        }
        if (updatedCount > 0) {
            alert(`Order Received! Added ${updatedCount} products to your inventory and stock history.`);
        } else {
            alert("Order Received! Note: No inventory was updated because the item names didn't perfectly match your Product Catalog.");
        }
      }

      fetchData();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(`Error updating status: ${error.message}`);
    }
  };

  const deletePO = async (id) => {
    if (window.confirm("Delete this Purchase Order?")) {
      await supabase.from('purchase_orders').delete().eq('id', id);
      fetchData();
    }
  };

  // --- 6. PRINT / PDF GENERATION ---
  const printPO = (po) => {
    const printWindow = window.open('', '_blank');
    const currency = po.currency || 'Rs';
    const sName = storeSettings?.store_name || 'My Company';
    
    const itemsHtml = po.items?.map(i => `
      <tr>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0;">${i.name}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center;">${i.quantity}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right;">${currency} ${Number(i.price).toLocaleString()}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right;">${currency} ${(Number(i.price) * Number(i.quantity)).toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head><title>PO #${po.id.slice(0,8).toUpperCase()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #334155; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1774b5; padding-bottom: 20px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;}
          .total-line { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .grand-total { font-size: 18px; font-weight: bold; color: #1774b5; border-bottom: none; padding-top: 15px; }
        </style></head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0; color:#0f172a; font-size:24px;">${sName}</h1>
              <p style="margin:5px 0 0 0; font-size:14px; color:#64748b;">${storeSettings?.address || ''}<br/>${storeSettings?.phone || ''}</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #1774b5;">PURCHASE ORDER</h2>
              <p style="margin: 5px 0 0 0;">PO #: PO-${po.id.slice(0,6).toUpperCase()}<br/>Date: ${new Date(po.order_date).toLocaleDateString()}</p>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom: 30px; background:#f8fafc; padding:20px; border-radius:4px;">
            <div>
                <p style="margin:0; font-size:11px; text-transform:uppercase; font-weight:bold; color:#64748b;">Vendor / Supplier:</p>
                <p style="margin:5px 0 0 0; font-size:16px;"><strong>${po.vendor_name}</strong><br/>${po.vendor_email || ''}</p>
            </div>
            <div style="text-align:right;">
                <p style="margin:0; font-size:11px; text-transform:uppercase; font-weight:bold; color:#64748b;">Expected Delivery:</p>
                <p style="margin:5px 0 0 0; font-size:14px;"><strong>${po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'TBD'}</strong></p>
            </div>
          </div>
          <table>
            <thead><tr><th>Description</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 300px;">
              <div class="total-line"><span>Subtotal:</span> <span>${currency} ${Number(po.subtotal).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
              ${po.vat_amount > 0 ? `<div class="total-line"><span>VAT (13%):</span> <span>${currency} ${Number(po.vat_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>` : ''}
              <div class="total-line grand-total"><span>Total Authorized:</span> <span>${currency} ${Number(po.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            </div>
          </div>
          ${po.notes ? `<div style="margin-top:40px; padding-top:20px; border-top:1px solid #e2e8f0;"><p style="font-size:12px; color:#64748b;"><strong>Notes:</strong><br/>${po.notes}</p></div>` : ''}
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredPOs = purchaseOrders.filter(po => 
    po.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    po.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Manage supplier orders, track expected deliveries, and monitor costs.</p>
        </div>
        <div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors shadow-sm rounded-sm">
            <Plus size={16} /> Create PO
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
              <h2 className="text-base font-medium text-white leading-tight">Supply Chain Health</h2>
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
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Clock size={12}/> Pending Orders</p>
            <p className="text-2xl font-bold text-white">{insights.pendingCount}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><AlertTriangle size={12}/> Committed Value (Pending)</p>
            <p className="text-2xl font-bold text-amber-200">Rs {insights.pendingValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><CheckCircle size={12}/> Value Received</p>
            <p className="text-2xl font-bold text-white">Rs {insights.completedValue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search vendor name or PO ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1774b5] shadow-sm transition-colors" 
        />
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100">PO Details</th>
                <th className="py-4 px-6 border-r border-slate-100">Vendor / Supplier</th>
                <th className="py-4 px-6 border-r border-slate-100">Total Value</th>
                <th className="py-4 px-6 border-r border-slate-100">Status</th>
                <th className="py-4 px-6 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading purchase orders...</td></tr>
              ) : filteredPOs.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No purchase orders found.</td></tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Details */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileText size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-900 font-mono text-xs">PO-{po.id.slice(0, 6).toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5"><Calendar size={10}/> Order: {new Date(po.order_date).toLocaleDateString()}</p>
                      {po.expected_delivery_date && (
                         <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 mt-0.5"><Truck size={10}/> ETA: {new Date(po.expected_delivery_date).toLocaleDateString()}</p>
                      )}
                    </td>

                    {/* Vendor */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-semibold text-slate-800 mb-0.5">{po.vendor_name}</p>
                      <p className="text-xs text-slate-500">{po.vendor_email || 'No email'}</p>
                    </td>

                    {/* Financials */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-bold text-slate-900 mb-1">{po.currency} {Number(po.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      {po.vat_amount > 0 ? (
                          <span className="text-[9px] font-bold text-[#1774b5] bg-blue-50 px-1.5 py-0.5 border border-blue-200 rounded-sm">13% VAT INCL.</span>
                      ) : (
                          <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200 rounded-sm">NO VAT</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="flex flex-col items-start gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-sm ${
                          po.status === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          po.status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          po.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {po.status}
                        </span>
                        
                        {po.status === 'Sent' && (
                            <button onClick={() => updateStatus(po, 'Received')} className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                                <CheckCircle size={10}/> Mark Received
                            </button>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col gap-2 items-center">
                        <button onClick={() => printPO(po)} className="text-[#1774b5] hover:bg-blue-100 transition-colors w-full flex items-center justify-center gap-1.5 text-[11px] font-bold bg-blue-50 px-2 py-1.5 border border-blue-100 rounded-sm">
                          <Printer size={12} /> Print PDF
                        </button>
                        <div className="flex gap-2 w-full justify-center">
                            <button onClick={() => openModal(po)} className="text-slate-500 hover:text-[#1774b5] transition-colors p-1" title="Edit">
                                <Edit size={16} />
                            </button>
                            <button onClick={() => deletePO(po.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Delete">
                                <Trash2 size={16} />
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

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl shadow-2xl rounded-md border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Purchase Order' : 'Create Purchase Order'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="p-6 custom-scrollbar">
              <form id="poForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Vendor Info (SMART DROPDOWN IMPLEMENTED HERE) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Vendor / Supplier *</label>
                    {!isCustomVendor ? (
                      <select 
                        required
                        value={formData.vendor_name}
                        onChange={(e) => {
                          if (e.target.value === 'CUSTOM_NEW_VENDOR') {
                            setIsCustomVendor(true);
                            setFormData({ ...formData, vendor_name: '', vendor_email: '' });
                          } else {
                            const selectedVendor = suppliers.find(s => s.name === e.target.value);
                            setFormData({ 
                              ...formData, 
                              vendor_name: selectedVendor?.name || '', 
                              vendor_email: selectedVendor?.email || '' 
                            });
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] cursor-pointer"
                      >
                        <option value="" disabled>-- Select a Vendor --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                        <option value="CUSTOM_NEW_VENDOR" className="font-bold text-[#1774b5]">+ Add Custom Vendor...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          required type="text" 
                          value={formData.vendor_name} 
                          onChange={e => setFormData({...formData, vendor_name: e.target.value})} 
                          className="w-full bg-white border border-[#1774b5] p-2.5 text-sm rounded-sm outline-none shadow-sm" 
                          placeholder="Type new vendor name..." 
                          autoFocus
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsCustomVendor(false);
                            setFormData({ ...formData, vendor_name: '', vendor_email: '' });
                          }} 
                          className="px-4 bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Vendor Email</label>
                    <input type="email" value={formData.vendor_email} onChange={e => setFormData({...formData, vendor_email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" placeholder="contact@supplier.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Order Date *</label>
                    <input required type="date" value={formData.order_date} onChange={e => setFormData({...formData, order_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide text-[#1774b5]">Expected Delivery Date</label>
                    <input type="date" value={formData.expected_delivery_date} onChange={e => setFormData({...formData, expected_delivery_date: e.target.value})} className="w-full bg-blue-50/50 border border-blue-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" />
                  </div>
                </div>

                {/* 2. Items List */}
                <div className="border border-slate-200 rounded-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2"><ShoppingCart size={16} className="text-[#1774b5]"/> Items to Order</h3>
                    <button type="button" onClick={addItemRow} className="text-xs bg-white border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 rounded-sm flex items-center gap-1 transition-colors">
                        <Plus size={14} /> Add Row
                    </button>
                  </div>
                  
                  <div className="p-4 bg-white space-y-3">
                    <div className="hidden md:flex gap-3 px-1">
                        <div className="flex-[3] text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Description</div>
                        <div className="w-20 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Qty</div>
                        <div className="w-32 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right pr-2">Unit Cost</div>
                        {formData.items.length > 1 && <div className="w-8"></div>}
                    </div>

                    {formData.items.map((item) => (
                      <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        <input required type="text" placeholder="Description" value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} className="w-full md:flex-[3] bg-slate-50 border border-slate-200 p-2 text-sm rounded-sm outline-none focus:border-[#1774b5]" />
                        <div className="flex w-full md:w-auto gap-3">
                            <input required type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} className="w-full md:w-20 bg-slate-50 border border-slate-200 p-2 text-sm text-center rounded-sm outline-none focus:border-[#1774b5]" />
                            <input required type="number" placeholder="Price" min="0" step="0.01" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} className="w-full md:w-32 bg-slate-50 border border-slate-200 p-2 text-sm text-right rounded-sm outline-none focus:border-[#1774b5]" />
                            {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItemRow(item.id)} className="w-10 flex justify-center items-center text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Notes & Totals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full mb-4 bg-slate-50 border border-slate-200 p-2 text-sm rounded-sm outline-none focus:border-[#1774b5] cursor-pointer">
                      <option value="Draft">Draft (Planning)</option>
                      <option value="Sent">Sent to Vendor (Pending Delivery)</option>
                      <option value="Received">Received (Completed)</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Internal Notes</label>
                    <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] resize-y" placeholder="Shipping instructions, terms..." />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm flex flex-col justify-end space-y-3">
                    <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-200">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Currency</label>
                        <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="bg-white border border-slate-300 p-1 text-sm outline-none rounded-sm">
                            <option value="NPR">NPR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>

                    <div className="flex justify-between text-sm text-slate-600 px-1">
                      <span>Subtotal:</span>
                      <span>{formData.currency} {formData.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    
                    <label className="flex items-center justify-between cursor-pointer border-y border-slate-200 py-3 px-1 hover:bg-slate-100 transition-colors rounded-sm">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 accent-[#1774b5]" checked={formData.apply_vat} onChange={e => {
                            setFormData({...formData, apply_vat: e.target.checked});
                            calculateTotal(formData.items, e.target.checked);
                        }} />
                        <span className="text-sm font-medium text-slate-800 select-none">Include 13% Tax/VAT</span>
                      </div>
                      <span className="text-sm text-[#1774b5] font-bold">
                        + {formData.currency} {formData.vat_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </span>
                    </label>

                    <div className="flex justify-between items-center pt-2 px-1">
                      <span className="text-base font-bold text-slate-900">Total Value:</span>
                      <span className="text-2xl font-black text-slate-900">{formData.currency} {formData.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>

                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors rounded-sm">Cancel</button>
              <button type="submit" form="poForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium border border-[#1774b5] hover:bg-[#135d90] transition-colors shadow-sm rounded-sm flex items-center gap-2">
                <CheckCircle size={16} /> {editingId ? 'Save Changes' : 'Issue Purchase Order'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;