import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';
import { 
  Plus, Download, Trash2, Search, Mail, Package, 
  X, Edit, Printer, Tag, CheckCircle, Wallet, Users, 
  AlertCircle, Receipt, ShoppingCart, TrendingUp, 
  Clock, RefreshCw, User, CreditCard // <-- Both User and CreditCard are now correctly imported!
} from 'lucide-react';

const AllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]); 
  const [crmCustomers, setCrmCustomers] = useState([]); 
  const [storeSettings, setStoreSettings] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewOrder, setPreviewOrder] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [selectedCrmCustomerId, setSelectedCrmCustomerId] = useState('WALK_IN');
  const [isSaving, setIsSaving] = useState(false);
  
  const initialFormState = {
    customer_name: '', customer_email: '', customer_phone: '',
    shipping_address: '', shipping_city: '', shipping_state: '', shipping_country: 'Nepal', shipping_method: 'Standard',
    payment_method: 'Cash', billing_same_as_shipping: true, 
    items: [{ id: Date.now(), name: '', quantity: 1, price: '', isCustom: false }], 
    subtotal: 0, discount: 0, amount: 0, status: 'Processing'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      const { data: orderData } = await supabase.from('orders').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (orderData) setOrders(orderData);

      const { data: prodData } = await supabase.from('products').select('*').eq('user_id', session.user.id).order('name', { ascending: true });
      if (prodData) setProducts(prodData);

      const { data: custData } = await supabase.from('customers').select('*').eq('user_id', session.user.id).order('name', { ascending: true });
      if (custData) setCrmCustomers(custData);

      const { data: settingsData } = await supabase.from('store_settings').select('*').eq('user_id', session.user.id).single();
      if (settingsData) setStoreSettings(settingsData);
    }
    setLoading(false);
  };

  // Metrics for Top Banner
  const pendingOrdersCount = orders.filter(o => o.status === 'Processing' || o.status === 'Pending').length;
  const totalRevenue = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + Number(o.amount), 0);

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customer_email && order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- 2. MODAL & DYNAMIC PRODUCTS ---
  const openModal = (orderToEdit = null) => {
    if (orderToEdit) {
      setEditingId(orderToEdit.id);
      
      const matchedCust = crmCustomers.find(c => c.name.toLowerCase() === orderToEdit.customer_name.toLowerCase());
      setSelectedCrmCustomerId(matchedCust ? matchedCust.id : 'WALK_IN');

      const mappedItems = orderToEdit.items?.map((i, index) => {
          const isCatalogItem = products.some(p => p.name === i.name);
          return {...i, id: index, isCustom: !isCatalogItem};
      }) || [];
      
      setFormData({ 
        ...orderToEdit, 
        items: mappedItems.length > 0 ? mappedItems : initialFormState.items,
        discount: orderToEdit.discount || 0
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
      setSelectedCrmCustomerId('WALK_IN');
    }
    setIsModalOpen(true);
  };

  const handleCustomerSelect = (customerId) => {
      setSelectedCrmCustomerId(customerId);
      if (customerId === 'WALK_IN') {
          setFormData({ ...formData, customer_name: '', customer_email: '', customer_phone: '', shipping_address: '', shipping_city: '', payment_method: 'Cash' });
      } else {
          const cust = crmCustomers.find(c => c.id === customerId);
          if (cust) {
              setFormData({ 
                  ...formData, 
                  customer_name: cust.name || '', 
                  customer_email: cust.email || '', 
                  customer_phone: cust.phone || '', 
                  shipping_address: cust.address || '', 
                  shipping_city: cust.city || ''
              });
          }
      }
  };

  const addItemRow = () => setFormData({ ...formData, items: [...formData.items, { id: Date.now(), name: '', quantity: 1, price: '', isCustom: false }] });
  
  const removeItemRow = (idToRemove) => {
    const newItems = formData.items.filter(item => item.id !== idToRemove);
    calculateTotal(newItems, formData.discount);
  };

  const handleItemChange = (id, field, value) => {
    const newItems = formData.items.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item, [field]: value };
        if (field === 'name' && value !== 'CUSTOM_ITEM_TRIGGER') {
            const selectedProd = products.find(p => p.name === value);
            if (selectedProd) updatedItem.price = selectedProd.price || 0; 
        }
        return updatedItem;
      }
      return item;
    });
    calculateTotal(newItems, formData.discount);
  };

  const calculateTotal = (currentItems, discountValue = formData.discount) => {
    const subtotal = currentItems.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)), 0);
    const safeDiscount = parseFloat(discountValue) || 0;
    const total = Math.max(0, subtotal - safeDiscount);
    setFormData({ ...formData, items: currentItems, subtotal: subtotal, discount: safeDiscount, amount: total });
  };

  const selectedCrmData = crmCustomers.find(c => c.id === selectedCrmCustomerId);
  const availableCredit = selectedCrmData ? (Number(selectedCrmData.credit_limit) || 0) - (Number(selectedCrmData.outstanding_balance) || 0) : 0;

  // --- 3. ACTIONS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Session expired.");

    if (formData.payment_method === 'Customer Credit') {
        if (selectedCrmCustomerId === 'WALK_IN') return alert("You must select a saved CRM Customer to use Customer Credit.");
        if (formData.amount > availableCredit) return alert(`Insufficient Credit! The customer only has Rs ${availableCredit.toLocaleString()} available.`);
    }

    setIsSaving(true);
    const orderToSave = {
      user_id: currentUser.id,
      customer_name: formData.customer_name, 
      customer_email: formData.customer_email, 
      customer_phone: formData.customer_phone,
      shipping_address: formData.shipping_address, 
      shipping_city: formData.shipping_city, 
      shipping_state: formData.shipping_state, 
      shipping_country: formData.shipping_country, 
      shipping_method: formData.shipping_method,
      payment_method: formData.payment_method, 
      billing_same_as_shipping: formData.billing_same_as_shipping,
      discount: parseFloat(formData.discount) || 0,
      amount: parseFloat(formData.amount) || 0, 
      status: formData.status,
      items: formData.items.map(item => ({ name: item.name, quantity: parseInt(item.quantity), price: parseFloat(item.price) }))
    };

    try {
      let savedOrder;
      
      if (editingId) {
        const { data, error } = await supabase.from('orders').update(orderToSave).eq('id', editingId).select();
        if (error) throw error;
        savedOrder = data[0];
      } else {
        const { data, error } = await supabase.from('orders').insert([orderToSave]).select();
        if (error) throw error;
        savedOrder = data[0];

        // AUTOMATIC CREDIT DEDUCTION
        if (formData.payment_method === 'Customer Credit' && selectedCrmData) {
            const newBalance = (Number(selectedCrmData.outstanding_balance) || 0) + formData.amount;
            await supabase.from('customers').update({ outstanding_balance: newBalance }).eq('id', selectedCrmData.id);
            await supabase.from('credit_ledgers').insert([{
                user_id: currentUser.id,
                customer_id: selectedCrmData.id,
                amount: formData.amount,
                type: 'Credit Used',
                transaction_date: new Date().toISOString().split('T')[0],
                notes: `Auto-billed for Order #INV-${savedOrder.id.slice(0,8).toUpperCase()}`
            }]);
        }
      }
      
      setIsModalOpen(false);
      setPreviewOrder(savedOrder); // TRIGGER AUTO-PREVIEW
      fetchData();
    } catch (error) {
      console.error(error);
      alert(`Failed to save order: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOrder = async (id) => {
    if (window.confirm("Permanently delete this order?")) {
      await supabase.from('orders').delete().eq('id', id);
      fetchData();
    }
  };

  const updateStatus = async (orderId, newStatus, customerEmail, customerName) => {
    setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
      if (customerEmail) notifyCustomer(customerEmail, customerName, newStatus, orderId);
    } catch (err) {
      alert(`Failed to update status!\nReason: ${err.message}`);
      fetchData(); 
    }
  };

  const notifyCustomer = (email, name, status, orderId) => {
    const SERVICE_ID = 'service_vhj9p17'; 
    const TEMPLATE_ID = 'template_22jd7wg';
    const PUBLIC_KEY = 'ODyxxyexpPCAxROL4';
    const sName = storeSettings?.store_name || "Our Store";

    const templateParams = { to_email: email, to_name: name, order_status: status, order_id: orderId.slice(0, 8).toUpperCase(), company_name: sName };
    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY).catch(err => console.error("Email failed:", err));
  };

  const exportToCSV = () => {
    if (filteredOrders.length === 0) return alert("No orders to export.");
    const headers = ["Order ID", "Customer Name", "Email", "Total", "Discount", "Payment Method", "Status", "Date"];
    const csvRows = [headers.join(',')];
    
    filteredOrders.forEach(order => {
      csvRows.push(`${order.id},"${order.customer_name}",${order.customer_email || ''},${order.amount},${order.discount || 0},${order.payment_method || 'N/A'},${order.status},${new Date(order.created_at).toLocaleDateString()}`);
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const printInvoice = (order) => {
    const invoiceWindow = window.open('', '_blank');
    const sName = storeSettings?.store_name || 'My Company';
    const sEmail = storeSettings?.support_email || currentUser?.email || '';
    const sPhone = storeSettings?.phone || '';
    const sAddress = storeSettings?.address || '';
    const sVat = storeSettings?.vat_number ? `PAN/VAT: ${storeSettings.vat_number}` : '';
    
    let statusColor = '#f59e0b'; 
    if (order.status === 'Delivered') statusColor = '#10b981'; 
    if (order.status === 'Shipped') statusColor = '#3b82f6'; 
    if (order.status === 'Cancelled') statusColor = '#ef4444'; 

    const itemsHtml = order.items?.map(i => `
      <tr>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; color:#334155;">${i.name}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#334155;">${i.quantity}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right; color:#334155;">Rs ${Number(i.price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:bold; color:#0f172a;">Rs ${(Number(i.price) * Number(i.quantity)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `).join('') || '';

    const subtotal = order.items?.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0) || 0;
    const discount = order.discount || 0;

    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${order.id.slice(0,8).toUpperCase()}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #334155; max-width: 800px; margin: 0 auto; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1774b5; padding-bottom: 20px; margin-bottom: 30px; }
            .badge { background-color: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}40; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
            .totals { width: 300px; margin-left: auto; }
            .total-line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #475569; }
            .grand-total { font-size: 20px; font-weight: 900; color: #1774b5; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0; color:#0f172a; font-size:28px; letter-spacing:-0.5px;">${sName}</h1>
              <p style="margin:8px 0 0 0; font-size:13px; color:#64748b; line-height:1.5;">
                ${sAddress}<br/>
                ${sPhone} | ${sEmail}<br/>
                <strong>${sVat}</strong>
              </p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #1774b5; font-size: 24px;">TAX INVOICE</h2>
              <p style="margin: 8px 0 12px 0; font-size: 14px; color: #64748b;">
                <strong>Order #:</strong> ${order.id.slice(0,8).toUpperCase()}<br/>
                <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}
              </p>
              <div class="badge">${order.status}</div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; margin-bottom: 40px; background:#f8fafc; padding:20px; border-radius:6px; border: 1px solid #f1f5f9;">
            <div>
              <p style="margin:0; font-size:11px; text-transform:uppercase; font-weight:bold; color:#94a3b8; letter-spacing:1px;">Billed To:</p>
              <p style="margin:8px 0 0 0; font-size:15px; color:#0f172a; line-height: 1.5;">
                <strong>${order.customer_name}</strong><br/>
                ${order.customer_email || 'No Email Provided'}<br/>
                ${order.customer_phone || ''}
              </p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0; font-size:11px; text-transform:uppercase; font-weight:bold; color:#94a3b8; letter-spacing:1px;">Payment Method:</p>
              <p style="margin:8px 0 0 0; font-size:14px; color:#334155; line-height: 1.5; font-weight: bold;">
                ${order.payment_method || 'Standard'}
              </p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-line"><span>Subtotal:</span> <span>Rs ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            ${discount > 0 ? `<div class="total-line" style="color:#ef4444;"><span>Discount Applied:</span> <span>- Rs ${discount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>` : ''}
            <div class="total-line grand-total"><span>Total Amount:</span> <span>Rs ${Number(order.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Shipped': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50">
      
      {/* HEADER SECTION */}
      <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Sales & Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all transactions, fulfillment statuses, and invoices.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 hover:text-[#1774b5] transition-colors shadow-sm">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white rounded-md text-sm font-bold hover:bg-[#135d90] transition-colors shadow-sm">
            <Plus size={16} /> New Sale
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-6">

        {/* SOLID NAVY BLUE BANNER */}
        <div className="w-full bg-[#1774b5] text-white p-6 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 text-white rounded-md shrink-0">
                    <ShoppingCart size={24} />
                </div>
                <div>
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Active Order Pipeline</p>
                    <h2 className="text-xl font-bold text-white leading-tight">Overview & Status</h2>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto bg-blue-900/30 p-4 rounded-md border border-blue-400/20">
                <div className="flex items-center gap-4 min-w-[150px]">
                    <div className="p-2 bg-amber-500/20 text-amber-200 rounded-md"><Clock size={16}/></div>
                    <div>
                        <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Pending Fulfillment</p>
                        <p className="text-lg font-black text-white">{pendingOrdersCount} Orders</p>
                    </div>
                </div>
                <div className="hidden sm:block w-px h-10 bg-blue-400/30"></div>
                <div className="flex items-center gap-4 min-w-[150px]">
                    <div className="p-2 bg-emerald-500/20 text-emerald-200 rounded-md"><TrendingUp size={16}/></div>
                    <div>
                        <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Gross Revenue</p>
                        <p className="text-lg font-black text-white">Rs {totalRevenue.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
              type="text" 
              placeholder="Search by customer name, email, or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#1774b5] shadow-sm transition-colors" 
          />
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6 border-r border-slate-100">Order ID & Items</th>
                  <th className="py-4 px-6 border-r border-slate-100">Customer Details</th>
                  <th className="py-4 px-6 border-r border-slate-100">Financials & Payment</th>
                  <th className="py-4 px-6 border-r border-slate-100">Fulfillment Status</th>
                  <th className="py-4 px-6 text-center w-36">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {loading ? (
                  <tr><td colSpan="5" className="p-12 text-center text-slate-400">Loading orders...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan="5" className="p-12 text-center text-slate-400">No orders found.</td></tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      
                      {/* Order Details */}
                      <td className="py-4 px-6 border-r border-slate-50">
                        <p className="font-bold text-slate-800 font-mono text-xs mb-1">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1.5">
                          <Package size={14} className="shrink-0 text-[#1774b5] mt-0.5" />
                          <span className="truncate max-w-[200px] block leading-tight font-medium">
                            {order.items?.length > 0 ? `${order.items.length} item(s): ${order.items.map(i=>i.name).join(', ')}` : 'No items'}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-6 border-r border-slate-50">
                        <p className="font-bold text-slate-800 mb-0.5">{order.customer_name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-1 font-medium">
                          <Mail size={12} className="text-slate-400" /> {order.customer_email || 'No email provided'}
                        </p>
                        <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 font-medium inline-block mt-0.5 shadow-sm">
                          {order.shipping_city}, {order.shipping_country}
                        </span>
                      </td>

                      {/* Financials & Payment Type */}
                      <td className="py-4 px-6 border-r border-slate-50">
                        <p className="font-black text-slate-900 mb-1">Rs {Number(order.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border rounded-md ${
                                order.payment_method === 'Customer Credit' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                                {order.payment_method || 'Standard'}
                            </span>
                            
                            {order.discount > 0 && (
                              <span className="text-[9px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 border border-rose-200 rounded-md">
                                <Tag size={10} /> -Rs {order.discount.toLocaleString()}
                              </span>
                            )}
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-4 px-6 border-r border-slate-50">
                        <div className="relative">
                          <select 
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value, order.customer_email, order.customer_name)}
                            className={`text-[11px] font-bold uppercase tracking-wider py-2 pl-3 border rounded-md cursor-pointer outline-none w-full appearance-none pr-8 shadow-sm ${getStatusStyle(order.status)}`}
                          >
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                             <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => { setPreviewOrder(order); }} className="text-[#1774b5] bg-blue-50 border border-blue-200 hover:bg-[#1774b5] hover:text-white p-1.5 rounded-md transition-colors shadow-sm" title="Preview & Print">
                            <Receipt size={16} />
                          </button>
                          <button onClick={() => openModal(order)} className="text-slate-500 bg-white hover:text-amber-600 border border-slate-200 hover:border-amber-300 hover:bg-amber-50 p-1.5 rounded-md transition-colors shadow-sm" title="Edit Order">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => deleteOrder(order.id)} className="text-slate-500 bg-white hover:text-rose-600 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 p-1.5 rounded-md transition-colors shadow-sm" title="Delete Order">
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

      </div>

      {/* --- ADD/EDIT ORDER MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-lg border border-slate-200 flex flex-col mb-10 shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingCart size={20} className="text-[#1774b5]"/> 
                  {editingId ? 'Edit Order Details' : 'Create New Sale'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white p-1 rounded-md shadow-sm border border-slate-200"><X size={18}/></button>
            </div>

            <div className="p-6 custom-scrollbar bg-white">
              <form id="orderForm" onSubmit={handleSubmit} className="space-y-8">
                
                {/* 1. Customer Info & CRM LINK */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2"><User size={14} className="text-[#1774b5]"/> 1. Customer Information</h3>
                      
                      <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-500" />
                          <select 
                              value={selectedCrmCustomerId} 
                              onChange={(e) => handleCustomerSelect(e.target.value)}
                              className="text-xs font-bold text-[#1774b5] bg-blue-50 border border-blue-200 py-1.5 px-3 rounded-md outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                          >
                              <option value="WALK_IN">Walk-in / New Customer</option>
                              <optgroup label="Saved CRM Clients">
                                  {crmCustomers.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                              </optgroup>
                          </select>
                      </div>
                  </div>

                  {/* CRM Credit Dashboard Widget */}
                  {selectedCrmData && (
                      <div className="mb-5 bg-indigo-50/50 border border-indigo-100 p-4 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                          <div className="flex items-start gap-3">
                              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-md shadow-sm shrink-0"><Wallet size={18}/></div>
                              <div>
                                  <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest mb-0.5">Active CRM Credit</p>
                                  <p className="text-sm font-semibold text-indigo-900">Limit: Rs {Number(selectedCrmData.credit_limit).toLocaleString()} <span className="text-indigo-300 font-normal mx-1">|</span> Used: Rs {Number(selectedCrmData.outstanding_balance).toLocaleString()}</p>
                              </div>
                          </div>
                          <div className="sm:text-right bg-white p-3 px-5 rounded-md border border-indigo-100 shadow-sm">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Available Credit</p>
                              <p className={`text-lg font-black ${availableCredit >= formData.amount ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  Rs {availableCredit.toLocaleString()}
                              </p>
                          </div>
                      </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Full Name *</label>
                      <input required type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:bg-white focus:border-[#1774b5] transition-colors" placeholder="Walk-in Customer" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Email Address</label>
                      <input type="email" value={formData.customer_email} onChange={e => setFormData({...formData, customer_email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:bg-white focus:border-[#1774b5] transition-colors" placeholder="email@example.com"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Phone Number</label>
                      <input type="tel" value={formData.customer_phone || ''} onChange={e => setFormData({...formData, customer_phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:bg-white focus:border-[#1774b5] transition-colors" placeholder="+977..." />
                    </div>
                  </div>
                </div>

                {/* 2. Order Items */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                    <span className="flex items-center gap-2"><Package size={14} className="text-[#1774b5]"/> 2. Products & Pricing</span>
                    <button type="button" onClick={addItemRow} className="text-[11px] bg-white border border-slate-200 px-3 py-1.5 font-bold text-[#1774b5] hover:bg-blue-50 hover:border-blue-200 rounded-md flex items-center gap-1.5 transition-colors shadow-sm">
                        <Plus size={12} /> Add Item
                    </button>
                  </h3>
                  
                  <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-lg space-y-3">
                    <div className="hidden md:flex gap-3 px-1">
                        <div className="flex-[3] text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Description</div>
                        <div className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qty</div>
                        <div className="w-32 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-2">Unit Price</div>
                        {formData.items.length > 1 && <div className="w-10"></div>}
                    </div>

                    {formData.items.map((item) => (
                      <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        
                        {!item.isCustom ? (
                          <select 
                              required 
                              value={item.name} 
                              onChange={(e) => {
                                if (e.target.value === 'CUSTOM_ITEM_TRIGGER') {
                                  handleItemChange(item.id, 'isCustom', true);
                                  handleItemChange(item.id, 'name', '');
                                  handleItemChange(item.id, 'price', '');
                                } else {
                                  handleItemChange(item.id, 'name', e.target.value);
                                }
                              }} 
                              className="w-full md:flex-[3] bg-white border border-slate-200 p-2.5 text-sm font-medium rounded-md outline-none focus:border-[#1774b5] cursor-pointer shadow-sm"
                          >
                              <option value="" disabled>-- Select Product from Catalog --</option>
                              {products.map(p => (
                                  <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                              <option value="CUSTOM_ITEM_TRIGGER" className="font-bold text-[#1774b5]">+ Custom / Misc Item</option>
                          </select>
                        ) : (
                          <div className="flex w-full md:flex-[3] gap-2">
                            <input 
                              required 
                              type="text" 
                              placeholder="Type custom product name..." 
                              value={item.name} 
                              onChange={e => handleItemChange(item.id, 'name', e.target.value)} 
                              className="w-full bg-white border border-[#1774b5] p-2.5 text-sm font-medium rounded-md outline-none shadow-sm focus:ring-2 focus:ring-blue-100" 
                              autoFocus
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                handleItemChange(item.id, 'isCustom', false);
                                handleItemChange(item.id, 'name', '');
                              }} 
                              className="px-3 bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-xs font-medium rounded-md transition-colors"
                              title="Cancel Custom Input"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}

                        <div className="flex w-full md:w-auto gap-3">
                            <input required type="number" placeholder="Qty" min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} className="w-full md:w-24 bg-white border border-slate-200 p-2.5 text-sm font-bold text-center rounded-md outline-none focus:border-[#1774b5] shadow-sm" />
                            <input required type="number" placeholder="Price" min="0" step="0.01" value={item.price !== undefined ? item.price : ''} onChange={e => handleItemChange(item.id, 'price', e.target.value)} className="w-full md:w-32 bg-white border border-slate-200 p-2.5 text-sm font-bold text-right rounded-md outline-none focus:border-[#1774b5] shadow-sm" />
                            {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItemRow(item.id)} className="w-10 flex justify-center items-center text-slate-400 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50 rounded-md transition-colors shadow-sm"><Trash2 size={16} /></button>
                            )}
                        </div>
                      </div>
                    ))}

                    <div className="pt-5 mt-5 border-t border-slate-200 flex flex-col md:flex-row justify-end items-center gap-6">
                        <div className="flex items-center gap-3">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Apply Discount (Rs):</label>
                            <input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                placeholder="0.00"
                                value={formData.discount || ''} 
                                onChange={e => calculateTotal(formData.items, e.target.value)} 
                                className="w-32 bg-white border border-slate-200 p-2 text-sm font-bold text-right rounded-md outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-50 shadow-sm text-amber-600" 
                            />
                        </div>
                        <div className="text-xl font-black text-[#1774b5] bg-blue-50 border border-blue-200 px-6 py-3 rounded-lg shadow-sm">
                            Total: Rs {formData.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </div>
                    </div>
                  </div>
                </div>

                {/* 3. Shipping Details & Payment */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><CreditCard size={14} className="text-[#1774b5]"/> 3. Fulfillment & Payment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="md:col-span-2 lg:col-span-4">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Street Address *</label>
                      <input required type="text" value={formData.shipping_address} onChange={e => setFormData({...formData, shipping_address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:bg-white focus:border-[#1774b5] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">City *</label>
                      <input required type="text" value={formData.shipping_city} onChange={e => setFormData({...formData, shipping_city: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:bg-white focus:border-[#1774b5] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">State / Province *</label>
                      <input required type="text" value={formData.shipping_state} onChange={e => setFormData({...formData, shipping_state: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:bg-white focus:border-[#1774b5] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Country *</label>
                      <input required type="text" value={formData.shipping_country} onChange={e => setFormData({...formData, shipping_country: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:bg-white focus:border-[#1774b5] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Payment Method</label>
                      <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm font-bold rounded-md outline-none focus:bg-white focus:border-[#1774b5] cursor-pointer transition-colors">
                        <option value="Cash">Cash / Walk-in</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="eSewa">eSewa</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Customer Credit" className="text-[#1774b5] font-black">★ Customer Credit</option>
                      </select>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Form Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-lg shrink-0">
                <button onClick={() => setIsModalOpen(false)} type="button" className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors shadow-sm">Cancel</button>
                <button type="submit" form="orderForm" disabled={isSaving} className="px-8 py-2.5 bg-[#1774b5] text-white text-sm font-bold border border-[#1774b5] hover:bg-[#135d90] rounded-md transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70">
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />} 
                  {editingId ? 'Update & View Bill' : 'Complete Sale & Bill'}
                </button>
            </div>

          </div>
        </div>
      )}

      {/* --- AUTO-PREVIEW INVOICE MODAL --- */}
      {previewOrder && (
        <div className="fixed inset-0 z-[70] flex justify-center items-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Success Banner Header */}
            <div className="bg-emerald-50 border-b border-emerald-100 p-6 text-center shrink-0 relative">
                <button onClick={() => setPreviewOrder(null)} className="absolute top-4 right-4 text-emerald-600/50 hover:text-emerald-700 bg-white p-1 rounded-md border border-emerald-200"><X size={18}/></button>
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <CheckCircle size={24} />
                </div>
                <h2 className="text-xl font-bold text-emerald-800">Order Saved Successfully!</h2>
                <p className="text-sm text-emerald-600 mt-1 font-medium">Invoice #{previewOrder.id.slice(0,8).toUpperCase()} is ready.</p>
            </div>

            {/* Receipt Preview Body */}
            <div className="p-8 bg-slate-50/50 flex-1 overflow-y-auto">
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative">
                    <div className="text-center mb-6 border-b border-slate-100 pb-4">
                        <h3 className="font-black text-lg text-slate-800">{storeSettings?.store_name || 'My Store'}</h3>
                        <p className="text-xs text-slate-500 mt-1">{storeSettings?.address || 'Kathmandu, Nepal'}</p>
                    </div>
                    
                    <div className="flex justify-between text-xs text-slate-600 mb-6 font-medium">
                        <div>
                            <p>To: <span className="font-bold text-slate-800">{previewOrder.customer_name}</span></p>
                            <p>Pay: {previewOrder.payment_method}</p>
                        </div>
                        <div className="text-right">
                            <p>Date: {new Date(previewOrder.created_at).toLocaleDateString()}</p>
                            <p className="text-[#1774b5] font-bold">Status: {previewOrder.status}</p>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                            <span>Item</span>
                            <span>Total</span>
                        </div>
                        {previewOrder.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-slate-700">
                                <span>{item.quantity}x {item.name}</span>
                                <span className="font-medium">Rs {(Number(item.price) * Number(item.quantity)).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-200 pt-4 space-y-2">
                        {previewOrder.discount > 0 && (
                            <div className="flex justify-between text-sm text-rose-600 font-medium">
                                <span>Discount</span>
                                <span>- Rs {previewOrder.discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-black text-slate-900 border-t border-slate-200 pt-2 mt-2">
                            <span>Grand Total</span>
                            <span className="text-[#1774b5]">Rs {Number(previewOrder.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-white border-t border-slate-100 flex gap-3">
                <button onClick={() => setPreviewOrder(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors">
                    Close
                </button>
                <button onClick={() => printInvoice(previewOrder)} className="flex-1 py-3 bg-[#1774b5] text-white font-bold rounded-lg hover:bg-[#135d90] transition-colors shadow-md flex justify-center items-center gap-2">
                    <Printer size={18} /> Print Invoice
                </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AllOrders;