import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';
import { Package, Truck, Printer, Search, ArrowRight, MapPin, Check, Box } from 'lucide-react';

const Fulfillment = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("Technosoft Store");
  const [searchTerm, setSearchTerm] = useState("");

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
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .neq('status', 'Cancelled')
        .order('created_at', { ascending: true }); 
      
      if (orderData) setOrders(orderData);
    }
    setLoading(false);
  };

  // --- 2. ACTIONS ---
  const updateStatus = async (orderId, newStatus, customerEmail, customerName) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchData();
    if (customerEmail) {
        notifyCustomer(customerEmail, customerName, newStatus, orderId);
    }
  };

  const notifyCustomer = (email, name, status, orderId) => {
   const SERVICE_ID = 'service_vhj9p17'; 
    const TEMPLATE_ID = 'template_22jd7wg';
    const PUBLIC_KEY = 'ODyxxyexpPCAxROL4';
    const templateParams = { 
        to_email: email, 
        to_name: name, 
        order_status: status, 
        order_id: orderId.slice(0, 8).toUpperCase(), 
        company_name: companyName 
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY).catch(err => console.error("Email failed:", err));
  };

  // --- 3. PRINT PACKING SLIP (Cleaned up design) ---
  const printPackingSlip = (order) => {
    const slipWindow = window.open('', '_blank');
    const itemsHtml = order.items?.map(i => `
        <tr>
            <td style="padding:12px 10px; border-bottom:1px dashed #e2e8f0; text-align:center;"><strong>${i.quantity}x</strong></td>
            <td style="padding:12px 10px; border-bottom:1px dashed #e2e8f0; color:#334155;">${i.name}</td>
        </tr>
    `).join('') || '<tr><td colspan="2" style="padding:10px; text-align:center;">No items found</td></tr>';
    
    slipWindow.document.write(`
      <html>
        <head>
          <title>Packing Slip #${order.id.slice(0,8).toUpperCase()}</title>
          <style>body{font-family:'Helvetica Neue', Helvetica, sans-serif; padding: 40px; color:#1e293b; max-width: 800px; margin: 0 auto;}</style>
        </head>
        <body>
          <div style="border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 30px;">
            <h2 style="margin-bottom: 0; color:#0f172a; letter-spacing:1px;">PACKING SLIP</h2>
            <p style="margin-top: 5px; color:#64748b; font-size:14px;">Order #${order.id.slice(0,8).toUpperCase()} &bull; Date: ${new Date(order.created_at).toLocaleDateString()}</p>
          </div>
          
          <div style="display:flex; justify-content:space-between; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 8px;">
            <div style="width: 45%;">
              <p style="text-transform:uppercase; font-size:11px; color:#64748b; font-weight:bold; margin-top:0;">Ship To</p>
              <p style="font-size: 15px; margin: 5px 0;"><strong>${order.customer_name}</strong><br/>${order.shipping_address}<br/>${order.shipping_city}, ${order.shipping_state || ''}<br/>${order.shipping_country || ''}</p>
              <p style="font-size: 13px; color:#475569; margin-top: 10px;"><strong>Method:</strong> ${order.shipping_method || 'Standard'}</p>
            </div>
            <div style="width: 45%; text-align:right;">
              <p style="text-transform:uppercase; font-size:11px; color:#64748b; font-weight:bold; margin-top:0;">Sender</p>
              <p style="font-size: 15px; margin: 5px 0;"><strong>${companyName}</strong></p>
            </div>
          </div>

          <p style="text-transform:uppercase; font-size:12px; color:#475569; font-weight:bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Items to Pack</p>
          <table style="width:100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tbody>${itemsHtml}</tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    slipWindow.document.close();
  };

  // --- 4. FILTERING ---
  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const processingOrders = filteredOrders.filter(o => o.status === 'Processing');
  const shippedOrders = filteredOrders.filter(o => o.status === 'Shipped');

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fulfillment Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Pick, pack, and ship active orders to your customers.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name or order ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm shadow-sm transition-colors" 
          />
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ========================================= */}
        {/* COLUMN 1: TO PACK (Processing) */}
        {/* ========================================= */}
        <div className="flex-1 w-full min-w-[300px]">
          
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3 border-b-[3px] border-amber-400 mb-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Box size={18} className="text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider">To Pack & Ship</h2>
            </div>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{processingOrders.length}</span>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {loading ? (
                <p className="text-sm text-slate-500 py-4">Loading orders...</p>
            ) : processingOrders.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-md p-8 text-center bg-slate-50">
                    <p className="text-sm text-slate-500">No orders waiting to be packed.</p>
                </div>
            ) : processingOrders.map(order => (
              <div key={order.id} className="bg-white border border-slate-200 rounded-md shadow-sm p-5 hover:shadow-md transition-shadow">
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-[#1774b5] font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                    {order.shipping_method || 'Standard'}
                  </span>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{order.customer_name}</p>
                  <p className="text-xs text-slate-500 flex items-start gap-1.5 leading-relaxed">
                    <MapPin size={14} className="shrink-0 text-slate-400" />
                    <span>{order.shipping_address}, {order.shipping_city}, {order.shipping_country}</span>
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-sm p-3 mb-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Items to Pick:</p>
                  <ul className="text-sm text-slate-700 space-y-1.5">
                    {order.items?.map((item, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">{item.quantity}x</span> 
                        <span className="mt-0.5 leading-tight">{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => printPackingSlip(order)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 rounded-sm transition-colors shadow-sm">
                    <Printer size={14} /> Print Slip
                  </button>
                  <button onClick={() => updateStatus(order.id, 'Shipped', order.customer_email, order.customer_name)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1774b5] border border-[#1774b5] text-white text-xs font-semibold hover:bg-[#135d90] rounded-sm transition-colors shadow-sm">
                    Mark Shipped <ArrowRight size={14} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* ========================================= */}
        {/* COLUMN 2: IN TRANSIT (Shipped) */}
        {/* ========================================= */}
        <div className="flex-1 w-full min-w-[300px]">
          
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3 border-b-[3px] border-[#1774b5] mb-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Truck size={18} className="text-[#1774b5]" />
              <h2 className="text-sm font-bold uppercase tracking-wider">In Transit</h2>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{shippedOrders.length}</span>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {loading ? (
                 <p className="text-sm text-slate-500 py-4">Loading orders...</p>
            ) : shippedOrders.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-md p-8 text-center bg-slate-50">
                    <p className="text-sm text-slate-500">No orders currently in transit.</p>
                </div>
            ) : shippedOrders.map(order => (
              <div key={order.id} className="bg-white border border-slate-200 rounded-md shadow-sm p-5 hover:shadow-md transition-shadow">
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-700 font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{order.customer_name}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 text-[#1774b5] border border-blue-200 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                    Shipped
                  </span>
                </div>

                <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-5">
                  <MapPin size={14} className="text-slate-400" />
                  <span>Destination: {order.shipping_city}, {order.shipping_state || order.shipping_country}</span>
                </p>

                <button onClick={() => updateStatus(order.id, 'Delivered', order.customer_email, order.customer_name)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 rounded-sm transition-colors">
                  <Check size={14} /> Confirm Delivery
                </button>

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Fulfillment;