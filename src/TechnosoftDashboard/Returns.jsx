import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';
import { 
  Search, RotateCcw, CreditCard, Package, Mail, X, Check, 
  Sparkles, BrainCircuit, TrendingDown, AlertTriangle, FileText, ArrowRight 
} from 'lucide-react';

const Returns = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [storeSettings, setStoreSettings] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionType, setActionType] = useState('Refunded'); // 'Refunded' or 'Returned'
  const [returnReason, setReturnReason] = useState('');
  const [restockInventory, setRestockInventory] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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
      const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (orderData) setOrders(orderData);

      const { data: settingsData } = await supabase.from('store_settings').select('*').eq('user_id', session.user.id).single();
      if (settingsData) setStoreSettings(settingsData);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ENGINE ---
  const calculateInsights = () => {
    let totalRefundedAmt = 0;
    let returnedCount = 0;
    let refundedCount = 0;

    orders.forEach(order => {
      if (order.status === 'Refunded') {
        totalRefundedAmt += Number(order.amount);
        refundedCount++;
      } else if (order.status === 'Returned') {
        returnedCount++;
      }
    });

    const totalIssues = refundedCount + returnedCount;
    const returnRate = orders.length > 0 ? ((totalIssues / orders.length) * 100).toFixed(1) : 0;

    let aiAdvice = "Monitor your return rates closely to ensure product quality.";
    if (returnRate > 10) {
        aiAdvice = `Alert: Your return rate is high (${returnRate}%). Consider reviewing your product descriptions or quality control to reduce chargebacks.`;
    } else if (totalRefundedAmt > 50000) {
        aiAdvice = `Cashflow Warning: Rs ${totalRefundedAmt.toLocaleString()} has left your accounts via refunds. Ensure you maintain adequate cash reserves.`;
    } else if (returnRate > 0 && returnRate <= 5) {
        aiAdvice = `Healthy: Your return rate is a very healthy ${returnRate}%. Customer satisfaction appears high.`;
    }

    return { totalRefundedAmt, totalIssues, returnRate, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. FILTERING ---
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (order.customer_email && order.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "All" ? true : order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // --- 4. PROCESS REFUND / RETURN ---
  const openProcessModal = (order) => {
    setSelectedOrder(order);
    setReturnReason('');
    setRestockInventory(true);
    setActionType('Refunded');
    setIsModalOpen(true);
  };

  const handleProcessAction = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
        // Append return reason to notes
        const newNote = `${selectedOrder.notes || ''}\n[${new Date().toLocaleDateString()} - ${actionType}: ${returnReason} | Restock: ${restockInventory ? 'Yes' : 'No'}]`.trim();
        
        // Update Database Status
        await supabase.from('orders').update({ 
            status: actionType,
            notes: newNote
        }).eq('id', selectedOrder.id);
        
        // Send Email
        if (selectedOrder.customer_email) {
            notifyCustomer(selectedOrder.customer_email, selectedOrder.customer_name, actionType, selectedOrder.id, selectedOrder.amount);
        }
        
        setIsModalOpen(false);
        setSelectedOrder(null);
        fetchData();
    } catch (err) {
        alert("Failed to process return. Please try again.");
    } finally {
        setIsProcessing(false);
    }
  };

  const notifyCustomer = (email, name, status, orderId, amount) => {
    const SERVICE_ID = 'service_vhj9p17'; 
    const TEMPLATE_ID = 'template_pxaejwg'; // Using your standard generic template
    const PUBLIC_KEY = 'ODyxxyexpPCAxROL4';

    const companyName = storeSettings?.store_name || 'Technosoft';
    const actionText = status === 'Refunded' 
      ? `We have successfully processed a refund of Rs ${Number(amount).toLocaleString()} for your order.` 
      : `We have confirmed the return of your items for your order. No refund was issued per your request or policy.`;

    const templateParams = {
      to_email: email,
      to_name: name,
      subject: `Update on Order #${orderId.slice(0, 8).toUpperCase()} - ${companyName}`,
      message: `Hi ${name},\n\n${actionText}\n\nReason recorded: ${returnReason || 'Standard return processing'}.\n\nIf you have any questions, please reply to this email.\n\nThank you,\n${companyName}`
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY).catch(err => console.error("Email failed:", err));
  };

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Returns & Refunds</h1>
          <p className="text-slate-500 text-sm mt-1">Manage reverse logistics, issue refunds, and track customer satisfaction.</p>
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
              <h2 className="text-lg font-medium text-white leading-tight">Reverse Logistics</h2>
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
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><RotateCcw size={12}/> Total Return Rate</p>
            <p className="text-2xl font-bold text-white">{insights.returnRate}%</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><AlertTriangle size={12}/> Total Items Returned</p>
            <p className="text-2xl font-bold text-amber-200">{insights.totalIssues} Orders</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><TrendingDown size={12}/> Revenue Lost to Refunds</p>
            <p className="text-2xl font-bold text-white">Rs {insights.totalRefundedAmt.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by customer, email, or order ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm shadow-sm" 
          />
        </div>
        
        <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-sm text-slate-700 outline-none focus:border-[#1774b5] rounded-sm shadow-sm cursor-pointer"
        >
            <option value="All">All Order Statuses</option>
            <option value="Refunded">Refunded Only</option>
            <option value="Returned">Returned Only</option>
            <option value="Paid">Paid (Eligible for Return)</option>
            <option value="Delivered">Delivered (Eligible for Return)</option>
        </select>
      </div>

      {/* ORDERS DATA TABLE */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100 w-1/4">Order Details</th>
                <th className="py-4 px-6 border-r border-slate-100 w-1/4">Customer</th>
                <th className="py-4 px-6 border-r border-slate-100 w-1/4">Items & Amount</th>
                <th className="py-4 px-6 text-center">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading orders ledger...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No orders match your search or filter.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className={`transition-colors ${order.status === 'Refunded' || order.status === 'Returned' ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
                    
                    {/* Order Details */}
                    <td className="py-4 px-6 border-r border-slate-100 align-top">
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileText size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-900 font-mono text-xs">#{order.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5"><RotateCcw size={10}/> {new Date(order.created_at).toLocaleDateString()}</p>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-6 border-r border-slate-100 align-top">
                      <p className="font-semibold text-slate-800 mb-1">{order.customer_name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5"><Mail size={12}/> {order.customer_email || 'No email provided'}</p>
                    </td>

                    {/* Financials & Items */}
                    <td className="py-4 px-6 border-r border-slate-100 align-top">
                      <p className="font-bold text-slate-900 mb-2">{order.currency || 'Rs'} {Number(order.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2 border border-slate-100 rounded-sm">
                        {order.items?.length > 0 ? (
                            order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="flex justify-between truncate">
                                    <span>{item.quantity}x {item.name}</span>
                                </div>
                            ))
                        ) : (
                            <span className="italic text-slate-400">Custom Order</span>
                        )}
                        {order.items?.length > 2 && <div className="text-[10px] text-[#1774b5] font-medium">+ {order.items.length - 2} more items</div>}
                      </div>
                    </td>

                    {/* Actions & Status */}
                    <td className="py-4 px-6 align-top text-center">
                      <div className="flex flex-col items-center gap-3 h-full justify-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border rounded-sm ${
                          order.status === 'Refunded' ? 'bg-red-50 text-red-700 border-red-200' :
                          order.status === 'Returned' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          order.status === 'Paid' || order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {order.status}
                        </span>
                        
                        {order.status !== 'Refunded' && order.status !== 'Returned' && (
                            <button 
                                onClick={() => openProcessModal(order)}
                                className="text-xs font-semibold text-[#1774b5] bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors py-1.5 px-3 rounded-sm flex items-center gap-1.5 w-full justify-center"
                            >
                                <RotateCcw size={12} /> Process Issue
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PROCESS RETURN MODAL --- */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg shadow-2xl flex flex-col rounded-md border border-slate-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md">
              <h2 className="text-lg font-semibold text-slate-800">Resolve Order Issue</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="px-6 py-4 bg-blue-50/40 border-b border-blue-100">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Customer</p>
                        <p className="font-semibold text-slate-900">{selectedOrder.customer_name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Value</p>
                        <p className="font-bold text-[#1774b5]">{selectedOrder.currency || 'Rs'} {Number(selectedOrder.amount).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 custom-scrollbar max-h-[60vh] overflow-y-auto">
              <form id="resolveForm" onSubmit={handleProcessAction} className="space-y-5">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Resolution Action *</label>
                  <select 
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm cursor-pointer"
                  >
                    <option value="Refunded">Issue Full Refund (Return Funds to Customer)</option>
                    <option value="Returned">Accept Items Only (No Refund Issued)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Reason for Return *</label>
                  <textarea 
                    required
                    rows="3"
                    placeholder="e.g. Product damaged during shipping, customer changed mind..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm resize-y"
                  />
                </div>

                <div className="border border-slate-200 p-4 rounded-sm bg-slate-50 flex items-start gap-3">
                    <input 
                        type="checkbox" 
                        id="restock"
                        checked={restockInventory}
                        onChange={(e) => setRestockInventory(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#1774b5]"
                    />
                    <div>
                        <label htmlFor="restock" className="text-sm font-semibold text-slate-800 cursor-pointer block">Restock Inventory</label>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Check this box if the returned items are in good condition and should be added back to your active stock count.</p>
                    </div>
                </div>

                {actionType === 'Refunded' && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-sm flex items-start gap-2 text-sm text-red-800">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                    <p>This action will mark the invoice as Refunded. <strong>You must manually transfer the funds back to the customer via their original payment method.</strong></p>
                    </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-all rounded-sm">
                Cancel
              </button>
              <button type="submit" form="resolveForm" disabled={isProcessing} className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-all shadow-sm rounded-sm flex items-center gap-2 disabled:opacity-70">
                {isProcessing ? 'Processing...' : 'Confirm & Send Email'} <ArrowRight size={16}/>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Returns;