import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, AlertTriangle, AlertOctagon, ShoppingCart, 
  Sparkles, BrainCircuit, Box, ArrowRight, X, PackageX, CheckCircle
} from 'lucide-react';

const ReorderAlerts = () => {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State for Quick PO Drafting
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    vendor_name: '',
    quantity: 10, // Default reorder amount
    unit_cost: 0
  });

  const STOCK_THRESHOLD = 15; // Items with stock <= this number will trigger an alert

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      // Fetch products that are running low
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .lte('stock_quantity', STOCK_THRESHOLD)
        .eq('user_id', session.user.id)
        .order('stock_quantity', { ascending: true });
        
      if (prodData) setLowStockProducts(prodData);

      // Fetch suppliers for the Quick PO dropdown
      const { data: suppData } = await supabase
        .from('suppliers')
        .select('name')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true });
        
      if (suppData) setSuppliers(suppData);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ---
  const calculateInsights = () => {
    let outOfStock = 0;
    let criticalStock = 0; // 1 to 5 items

    lowStockProducts.forEach(p => {
      if (p.stock_quantity <= 0) outOfStock++;
      else if (p.stock_quantity <= 5) criticalStock++;
    });

    let aiAdvice = "Inventory levels are healthy. No immediate restocks needed.";
    if (outOfStock > 0) {
        aiAdvice = `Critical Alert: You have ${outOfStock} items completely out of stock. You are actively losing potential sales!`;
    } else if (criticalStock > 0) {
        aiAdvice = `Warning: ${criticalStock} items are dangerously low (under 5 units). Draft Purchase Orders now to account for vendor lead times.`;
    } else if (lowStockProducts.length > 0) {
        aiAdvice = "Keep an eye on these items. Consider restocking them soon before they hit critical levels.";
    }

    return { outOfStock, criticalStock, totalAlerts: lowStockProducts.length, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. QUICK DRAFT PO ACTIONS ---
  const openPoModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      vendor_name: '',
      quantity: 10,
      unit_cost: product.cost_price || 0
    });
    setIsModalOpen(true);
  };

  const handleDraftPO = async (e) => {
    e.preventDefault();
    if (!currentUser || !selectedProduct) return;

    const subtotal = parseFloat(formData.unit_cost) * parseInt(formData.quantity);
    const vat_amount = selectedProduct.vat_applicable ? subtotal * 0.13 : 0;
    const total_amount = subtotal + vat_amount;

    const payload = {
      user_id: currentUser.id,
      vendor_name: formData.vendor_name,
      order_date: new Date().toISOString().split('T')[0],
      currency: 'NPR',
      status: 'Draft',
      notes: `Auto-drafted from Reorder Alerts for low stock item: ${selectedProduct.name}`,
      subtotal: subtotal,
      vat_amount: vat_amount,
      total_amount: total_amount,
      items: [{ 
          name: selectedProduct.name, 
          quantity: parseInt(formData.quantity), 
          price: parseFloat(formData.unit_cost) 
      }]
    };

    try {
      const { error } = await supabase.from('purchase_orders').insert([payload]);
      if (error) throw error;
      
      alert(`Draft PO created for ${selectedProduct.name}! Go to the Purchase Orders page to send it to the vendor.`);
      setIsModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error(error);
      alert(`Failed to draft PO: ${error.message}`);
    }
  };

  // --- FILTERING ---
  const filteredProducts = lowStockProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-rose-700 flex items-center gap-2">
            <AlertTriangle size={24} /> Reorder Alerts
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitor low inventory and quickly generate purchase orders to prevent lost sales.</p>
        </div>
      </div>

      {/* AI INSIGHTS BANNER (Red/Rose Theme for Alerts) */}
      <div className="w-full bg-rose-700 text-white p-5 mb-8 shadow-sm rounded-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-rose-500/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-rose-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">TechnosoftAI Insight</p>
              <h2 className="text-base font-medium text-white leading-tight">Stock Depletion Analysis</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-medium text-rose-100 flex items-center md:justify-end gap-2 bg-rose-900/40 p-2 rounded-sm inline-flex">
               <BrainCircuit size={16} className="shrink-0" />
               <span className="text-left md:text-right">{insights.aiAdvice}</span>
             </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-rose-200 text-xs mb-1 flex items-center gap-1.5"><Box size={12}/> Total Items on Alert</p>
            <p className="text-2xl font-bold text-white">{insights.totalAlerts}</p>
          </div>
          <div>
            <p className="text-rose-200 text-xs mb-1 flex items-center gap-1.5"><AlertOctagon size={12}/> Critical (1-5 units)</p>
            <p className="text-2xl font-bold text-amber-300">{insights.criticalStock}</p>
          </div>
          <div>
            <p className="text-rose-200 text-xs mb-1 flex items-center gap-1.5"><PackageX size={12}/> Completely Out of Stock</p>
            <p className="text-2xl font-bold text-white">{insights.outOfStock}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search low stock items by name or SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-rose-500 shadow-sm transition-colors" 
        />
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100">Product & SKU</th>
                <th className="py-4 px-6 border-r border-slate-100">Current Stock</th>
                <th className="py-4 px-6 border-r border-slate-100">Urgency Level</th>
                <th className="py-4 px-6 text-center w-40">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Scanning inventory levels...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                    <td colSpan="4" className="p-12 text-center text-slate-500">
                        <CheckCircle size={32} className="mx-auto text-emerald-500 mb-3" />
                        <p className="font-medium text-slate-800">All Clear!</p>
                        <p className="text-sm font-light mt-1">You have no products running low on stock right now.</p>
                    </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isZero = product.stock_quantity <= 0;
                  const isCritical = product.stock_quantity > 0 && product.stock_quantity <= 5;
                  
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      
                      {/* Product Details */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 border flex items-center justify-center shrink-0 rounded-sm ${isZero ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                            <Box size={18} className={isZero ? 'text-rose-500' : 'text-amber-500'} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight mb-1">{product.name}</p>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm inline-block">SKU: {product.sku}</span>
                          </div>
                        </div>
                      </td>

                      {/* Stock Info */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <p className={`text-lg font-black ${isZero ? 'text-rose-600' : 'text-amber-600'}`}>
                          {product.stock_quantity}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Units Left</p>
                      </td>

                      {/* Urgency */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase border rounded-sm ${
                          isZero ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          isCritical ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isZero && <PackageX size={12}/>}
                          {isCritical && <AlertOctagon size={12}/>}
                          {!isZero && !isCritical && <AlertTriangle size={12}/>}
                          
                          {isZero ? 'Out of Stock' : isCritical ? 'Critical Low' : 'Running Low'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <button 
                            onClick={() => openPoModal(product)} 
                            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-sm transition-colors shadow-sm uppercase tracking-wider"
                        >
                          <ShoppingCart size={14} /> Draft PO
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- QUICK DRAFT PO MODAL --- */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-16 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg shadow-2xl rounded-md border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">Quick Draft Purchase Order</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="px-6 py-4 bg-amber-50/50 border-b border-amber-100 shrink-0 flex items-start gap-3">
                <Box size={24} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-slate-800 leading-tight">Restocking: {selectedProduct.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Current Stock: <strong className={selectedProduct.stock_quantity <= 0 ? 'text-rose-600' : 'text-amber-600'}>{selectedProduct.stock_quantity}</strong></p>
                </div>
            </div>

            <div className="p-6">
              <form id="draftPoForm" onSubmit={handleDraftPO} className="space-y-5">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Select Supplier *</label>
                  <select 
                    required
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-slate-800 cursor-pointer"
                  >
                    <option value="" disabled>-- Choose a vendor to order from --</option>
                    {suppliers.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Quantity to Order *</label>
                    <input 
                        required 
                        type="number" 
                        min="1" 
                        value={formData.quantity} 
                        onChange={e => setFormData({...formData, quantity: e.target.value})} 
                        className="w-full bg-white border border-slate-200 p-2.5 text-base font-bold rounded-sm outline-none focus:border-slate-800" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Estimated Unit Cost *</label>
                    <input 
                        required 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={formData.unit_cost} 
                        onChange={e => setFormData({...formData, unit_cost: e.target.value})} 
                        className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-sm outline-none focus:border-slate-800" 
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm mt-2 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">Estimated Total Cost:</span>
                    <span className="text-lg font-black text-slate-900">
                        NPR {(parseFloat(formData.unit_cost || 0) * parseInt(formData.quantity || 0)).toLocaleString()}
                    </span>
                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors rounded-sm">Cancel</button>
              <button type="submit" form="draftPoForm" className="px-6 py-2.5 bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm rounded-sm flex items-center gap-2">
                Draft PO <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ReorderAlerts;