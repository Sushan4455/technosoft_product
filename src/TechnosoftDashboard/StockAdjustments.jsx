import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Plus, Search, X, ArrowUpRight, ArrowDownRight, Equal, Box, History, Sparkles, BrainCircuit, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

const StockAdjustments = () => {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const initialFormState = {
    product_id: '',
    adjustment_type: 'Add', // 'Add', 'Subtract', 'Set'
    quantity: '',
    reason: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA (Logs & Products) ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:inventory_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      // Fetch Logs
      const { data: logData } = await supabase.from('inventory_logs').select('*').order('created_at', { ascending: false });
      if (logData) setLogs(logData);

      // Fetch Products for the dropdown and insights
      const { data: prodData } = await supabase.from('products').select('id, name, stock_quantity, status').order('name', { ascending: true });
      if (prodData) setProducts(prodData);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ENGINE ---
  const calculateInsights = () => {
    let lowStockCount = 0;
    let totalItemsInStock = 0;
    let recentDeductions = 0;

    products.forEach(p => {
        totalItemsInStock += (p.stock_quantity || 0);
        if (p.stock_quantity > 0 && p.stock_quantity <= 10) lowStockCount++;
    });

    // Calculate deductions from the last 7 days (simplified for demo)
    logs.forEach(log => {
        if (log.adjustment_type === 'Subtract') {
            recentDeductions += Math.abs(log.quantity_changed);
        }
    });

    let aiAdvice = "Your inventory is currently stable. Maintain regular audits.";
    if (lowStockCount > 0) {
        aiAdvice = `Alert: ${lowStockCount} product(s) are running low on stock (under 10 items). Review your catalog to reorder soon.`;
    } else if (recentDeductions > 50) {
        aiAdvice = `Insight: High volume of manual deductions recently (${recentDeductions} items). Ensure these are tied to actual sales or returns.`;
    }

    return { lowStockCount, totalItemsInStock, recentDeductions, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. HANDLE SUBMIT ADJUSTMENT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Find the selected product to get its current stock
    const selectedProduct = products.find(p => p.id === formData.product_id);
    if (!selectedProduct) return alert("Please select a valid product.");

    const currentStock = parseInt(selectedProduct.stock_quantity) || 0;
    const inputQty = parseInt(formData.quantity) || 0;
    
    let newStock = 0;
    let qtyChanged = inputQty;

    // Calculate new stock based on adjustment type
    if (formData.adjustment_type === 'Add') {
      newStock = currentStock + inputQty;
    } else if (formData.adjustment_type === 'Subtract') {
      newStock = currentStock - inputQty;
      qtyChanged = -inputQty; // Make it negative for the log
    } else if (formData.adjustment_type === 'Set') {
      newStock = inputQty;
      qtyChanged = newStock - currentStock; // Actual difference
    }

    if (newStock < 0) return alert("Stock cannot be negative.");

    try {
      // 1. Update the Product Table
      const { error: productError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', selectedProduct.id);
        
      if (productError) throw productError;

      // 2. Insert into the Logs Table
      const { error: logError } = await supabase
        .from('inventory_logs')
        .insert([{
          user_id: currentUser.id,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          adjustment_type: formData.adjustment_type,
          quantity_changed: qtyChanged,
          previous_stock: currentStock,
          new_stock: newStock,
          reason: formData.reason || 'Manual Adjustment'
        }]);

      if (logError) throw logError;

      setIsModalOpen(false);
      setFormData(initialFormState);
      fetchData(); // Refresh to show new log
      
    } catch (error) {
      console.error(error);
      alert("Failed to update stock.");
    }
  };

  // --- 4. FILTERING LOGS ---
  const filteredLogs = logs.filter(log => 
    log.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock Adjustments</h1>
          <p className="text-slate-500 text-sm mt-1">Record manual inventory changes and audit stock levels.</p>
        </div>
        <div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors shadow-sm rounded-sm">
            <Plus size={16} /> New Adjustment
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
              <h2 className="text-lg font-medium text-white leading-tight">Inventory Health</h2>
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
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Box size={12}/> Total Items in Stock</p>
            <p className="text-2xl font-bold text-white">{insights.totalItemsInStock.toLocaleString()} Units</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><AlertTriangle size={12}/> Low Stock Products</p>
            <p className="text-2xl font-bold text-amber-200">{insights.lowStockCount} Products</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><TrendingDown size={12}/> Recent Deductions</p>
            <p className="text-2xl font-bold text-white">{insights.recentDeductions} Items</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search by product name or reason..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#1774b5] shadow-sm transition-colors" 
        />
      </div>

      {/* ADJUSTMENT HISTORY TABLE */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <History size={16} className="text-slate-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Adjustment Log</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100 w-1/4">Date & Time</th>
                <th className="py-4 px-6 border-r border-slate-100 w-1/3">Product</th>
                <th className="py-4 px-6 border-r border-slate-100">Adjustment</th>
                <th className="py-4 px-6 border-r border-slate-100">Stock Change</th>
                <th className="py-4 px-6">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading history...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No adjustments found.</td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    
                    <td className="py-4 px-6 border-r border-slate-100 text-slate-500 text-xs font-medium">
                      {new Date(log.created_at).toLocaleString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                      })}
                    </td>

                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 rounded-sm">
                            <Box size={14} className="text-slate-400" />
                        </div>
                        <span className="font-semibold text-slate-800 leading-tight">{log.product_name}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 border-r border-slate-100">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm ${
                        log.adjustment_type === 'Add' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        log.adjustment_type === 'Subtract' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-blue-50 text-[#1774b5] border-blue-200'
                      }`}>
                        {log.adjustment_type === 'Add' && <ArrowUpRight size={12}/>}
                        {log.adjustment_type === 'Subtract' && <ArrowDownRight size={12}/>}
                        {log.adjustment_type === 'Set' && <Equal size={12}/>}
                        {log.adjustment_type}
                      </span>
                    </td>

                    <td className="py-4 px-6 border-r border-slate-100 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{log.previous_stock}</span> 
                        <span className="text-slate-300">→</span> 
                        <span className="font-bold text-slate-900 text-sm">{log.new_stock}</span>
                      </div>
                      <span className={`text-[10px] font-bold mt-1 inline-block ${log.quantity_changed > 0 ? 'text-emerald-600' : log.quantity_changed < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                         ({log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed})
                      </span>
                    </td>

                    <td className="py-4 px-6 text-slate-600 text-xs italic">
                      {log.reason || <span className="text-slate-400">No reason provided</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD ADJUSTMENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg shadow-2xl flex flex-col rounded-md border border-slate-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">New Stock Adjustment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="p-6 custom-scrollbar">
              <form id="adjustmentForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Select Product */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Select Product *</label>
                  <select 
                    required 
                    value={formData.product_id} 
                    onChange={e => setFormData({...formData, product_id: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5] cursor-pointer"
                  >
                    <option value="" disabled>-- Choose a product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.stock_quantity})</option>
                    ))}
                  </select>
                </div>

                {/* 2. Adjustment Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Adjustment Type *</label>
                  <div className="flex gap-3">
                    {['Add', 'Subtract', 'Set'].map(type => (
                      <label key={type} className={`flex-1 flex flex-col items-center justify-center p-3 border rounded-sm cursor-pointer transition-colors ${
                          formData.adjustment_type === type 
                            ? 'border-[#1774b5] bg-blue-50 text-[#1774b5] shadow-sm' 
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}>
                        <input type="radio" name="adjustment_type" className="hidden" checked={formData.adjustment_type === type} onChange={() => setFormData({...formData, adjustment_type: type})} />
                        <span className="text-xs font-bold uppercase tracking-wider">{type}</span>
                        <span className="text-[10px] text-center mt-1 opacity-70">
                          {type === 'Add' && 'Receive stock'}
                          {type === 'Subtract' && 'Remove stock'}
                          {type === 'Set' && 'Manual count'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 3. Quantity & Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                      {formData.adjustment_type === 'Set' ? 'New Total Stock *' : 'Quantity to ' + formData.adjustment_type + ' *'}
                    </label>
                    <input 
                      required 
                      type="number" 
                      min="0"
                      value={formData.quantity} 
                      onChange={e => setFormData({...formData, quantity: e.target.value})} 
                      className="w-full bg-white border border-slate-200 p-2.5 text-base font-bold rounded-sm outline-none focus:border-[#1774b5] shadow-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Reason (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.reason} 
                      onChange={e => setFormData({...formData, reason: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-[#1774b5]" 
                      placeholder="e.g. Damaged, Restock"
                    />
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-sm transition-colors">Cancel</button>
              <button type="submit" form="adjustmentForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium border border-[#1774b5] hover:bg-[#135d90] rounded-sm transition-colors shadow-sm">
                Update Stock
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StockAdjustments;