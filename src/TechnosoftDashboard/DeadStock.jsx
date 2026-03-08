import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, PackageMinus, TrendingDown, Sparkles, BrainCircuit, 
  Tag, Trash2, ArrowRight, X, AlertCircle, Ghost, DollarSign, ArchiveX, Clock 
} from 'lucide-react'; // <-- Added Clock here!

const DeadStock = () => {
  const [deadItems, setDeadItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals State
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [newPrice, setNewPrice] = useState("");

  // --- 1. FETCH & CALCULATE DEAD STOCK ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      // 1. Fetch all products that actually have stock
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', session.user.id)
        .gt('stock_quantity', 0);

      // 2. Fetch orders from the last 90 days to see what IS selling
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data: ordersData } = await supabase
        .from('orders')
        .select('items')
        .eq('user_id', session.user.id)
        .gte('created_at', ninetyDaysAgo.toISOString());

      // 3. Extract the names of products that sold recently
      const recentlySoldNames = new Set();
      if (ordersData) {
        ordersData.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => recentlySoldNames.add(item.name.toLowerCase()));
          }
        });
      }

      // 4. Filter for Dead Stock (Has stock, but NOT in recently sold list)
      if (productsData) {
        const stagnantProducts = productsData.filter(p => !recentlySoldNames.has(p.name.toLowerCase()));
        
        // Calculate days since creation (as a proxy for how long it's been sitting)
        const enrichedItems = stagnantProducts.map(p => {
            const daysSitting = Math.floor((new Date() - new Date(p.created_at)) / (1000 * 60 * 60 * 24));
            return { ...p, daysSitting };
        }).sort((a, b) => b.daysSitting - a.daysSitting); // Oldest first

        setDeadItems(enrichedItems);
      }
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ---
  const calculateInsights = () => {
    let lockedCapital = 0;
    let totalItems = 0;

    deadItems.forEach(p => {
      const cost = parseFloat(p.cost_price) || parseFloat(p.price) * 0.5; // Estimate cost if missing
      lockedCapital += (cost * p.stock_quantity);
      totalItems += p.stock_quantity;
    });

    let aiAdvice = "Your inventory turnover is excellent. No dead stock detected.";
    if (lockedCapital > 50000) {
        aiAdvice = `Critical Inefficiency: You have Rs ${lockedCapital.toLocaleString()} tied up in non-moving inventory. Consider flash sales or bundles to free up cash.`;
    } else if (deadItems.length > 0) {
        aiAdvice = `You have ${deadItems.length} stagnant products. Try marking down their prices by 20% to stimulate movement.`;
    }

    return { lockedCapital, totalItems, uniqueProducts: deadItems.length, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. ACTIONS: DISCOUNT ---
  const openDiscountModal = (product) => {
    setSelectedProduct(product);
    setNewPrice((parseFloat(product.price) * 0.8).toFixed(2)); // Suggest 20% off
    setDiscountModalOpen(true);
  };

  const handleDiscountSubmit = async (e) => {
    e.preventDefault();
    try {
      await supabase
        .from('products')
        .update({ price: parseFloat(newPrice) })
        .eq('id', selectedProduct.id);
        
      alert(`Successfully discounted ${selectedProduct.name} to Rs ${newPrice}!`);
      setDiscountModalOpen(false);
      fetchData(); // Refresh list
    } catch (error) {
      alert("Failed to update price.");
    }
  };

  // --- 4. ACTIONS: WRITE-OFF ---
  const openWriteOffModal = (product) => {
    setSelectedProduct(product);
    setWriteOffModalOpen(true);
  };

  const handleWriteOffSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Zero out the product stock
      await supabase.from('products').update({ stock_quantity: 0 }).eq('id', selectedProduct.id);

      // 2. Log it in inventory history
      await supabase.from('inventory_logs').insert([{
         user_id: currentUser.id,
         product_id: selectedProduct.id,
         product_name: selectedProduct.name,
         adjustment_type: 'Set',
         quantity_changed: -selectedProduct.stock_quantity,
         previous_stock: selectedProduct.stock_quantity,
         new_stock: 0,
         reason: 'Dead Stock Write-off (Disposal/Donation)'
      }]);

      alert(`${selectedProduct.name} has been written off and removed from active stock.`);
      setWriteOffModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Failed to write off item.");
    }
  };

  // --- FILTERING ---
  const filteredItems = deadItems.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 flex items-center gap-2">
            <Ghost size={24} className="text-slate-400" /> Dead Stock Analysis
          </h1>
          <p className="text-slate-500 text-sm mt-1">Identify items with zero sales in the last 90 days and recover locked capital.</p>
        </div>
      </div>

      {/* AI INSIGHTS BANNER (Purple/Indigo Theme for Analytics) */}
      <div className="w-full bg-[#4f46e5] text-white p-5 mb-8 shadow-sm rounded-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-indigo-400/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">TechnosoftAI Insight</p>
              <h2 className="text-base font-medium text-white leading-tight">Capital Efficiency</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-medium text-indigo-100 flex items-center md:justify-end gap-2 bg-indigo-900/40 p-2 rounded-sm inline-flex">
               <BrainCircuit size={16} className="shrink-0" />
               <span className="text-left md:text-right">{insights.aiAdvice}</span>
             </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-indigo-200 text-xs mb-1 flex items-center gap-1.5"><DollarSign size={12}/> Locked Capital</p>
            <p className="text-2xl font-bold text-amber-300">Rs {insights.lockedCapital.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs mb-1 flex items-center gap-1.5"><ArchiveX size={12}/> Stagnant Products</p>
            <p className="text-2xl font-bold text-white">{insights.uniqueProducts} Models</p>
          </div>
          <div>
            <p className="text-indigo-200 text-xs mb-1 flex items-center gap-1.5"><PackageMinus size={12}/> Total Dead Units</p>
            <p className="text-2xl font-bold text-white">{insights.totalItems} Items</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search dead stock by name or SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#4f46e5] shadow-sm transition-colors" 
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
                <th className="py-4 px-6 border-r border-slate-100">Locked Capital (Est)</th>
                <th className="py-4 px-6 border-r border-slate-100">Status</th>
                <th className="py-4 px-6 text-center w-64">Actions (Clear Stock)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Analyzing 90-day sales history...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500">
                        <TrendingDown size={32} className="mx-auto text-emerald-500 mb-3" />
                        <p className="font-medium text-slate-800">Excellent Inventory Health!</p>
                        <p className="text-sm font-light mt-1">All your products have had sales movement in the last 90 days.</p>
                    </td>
                </tr>
              ) : (
                filteredItems.map((product) => {
                  const estCost = parseFloat(product.cost_price) || parseFloat(product.price) * 0.5;
                  const lockedValue = estCost * product.stock_quantity;
                  
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      
                      {/* Product Details */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <p className="font-semibold text-slate-800 leading-tight mb-1">{product.name}</p>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm inline-block">SKU: {product.sku}</span>
                      </td>

                      {/* Stock Info */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <p className="text-base font-bold text-slate-700">{product.stock_quantity} Units</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1"><Clock size={10}/> Sitting for {product.daysSitting} days</p>
                      </td>

                      {/* Locked Value */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <p className="text-sm font-bold text-amber-600">Rs {lockedValue.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Based on Cost Price</p>
                      </td>

                      {/* Selling Price */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <p className="text-sm text-slate-700 font-medium">Rs {Number(product.price).toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Current Price</p>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => openDiscountModal(product)} 
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#4f46e5] bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-sm transition-colors uppercase tracking-wider"
                            >
                            <Tag size={12} /> Liquidate / Discount
                            </button>
                            <button 
                                onClick={() => openWriteOffModal(product)} 
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 hover:text-red-600 px-3 py-1.5 rounded-sm transition-colors uppercase tracking-wider"
                            >
                            <Trash2 size={12} /> Write-Off (Zero Stock)
                            </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- LIQUIDATE / DISCOUNT MODAL --- */}
      {discountModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-20 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md shadow-2xl rounded-md border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Tag size={18} className="text-[#4f46e5]"/> Mark Down Price</h2>
              <button onClick={() => setDiscountModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">Lower the price of <strong>{selectedProduct.name}</strong> to encourage sales and clear out the remaining {selectedProduct.stock_quantity} units.</p>
              
              <form id="discountForm" onSubmit={handleDiscountSubmit} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm mb-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Current Selling Price</p>
                    <p className="text-lg font-bold text-slate-800 line-through decoration-rose-500">Rs {Number(selectedProduct.price).toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">New Liquidation Price *</label>
                  <input 
                      required 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={newPrice} 
                      onChange={e => setNewPrice(e.target.value)} 
                      className="w-full bg-white border border-[#4f46e5] p-3 text-lg font-bold text-[#4f46e5] rounded-sm outline-none shadow-sm" 
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">Tip: We automatically suggested a 20% discount.</p>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button type="button" onClick={() => setDiscountModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors rounded-sm">Cancel</button>
              <button type="submit" form="discountForm" className="px-6 py-2 bg-[#4f46e5] text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm rounded-sm">
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- WRITE OFF MODAL --- */}
      {writeOffModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-20 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md shadow-2xl rounded-md border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-rose-100 flex justify-between items-center bg-rose-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-rose-800 flex items-center gap-2"><AlertCircle size={18}/> Write-Off Inventory</h2>
              <button onClick={() => setWriteOffModalOpen(false)} className="text-rose-400 hover:text-rose-800"><X size={20}/></button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                You are about to completely write off <strong>{selectedProduct.stock_quantity} units</strong> of <strong>{selectedProduct.name}</strong>.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 rounded-sm">
                 <strong className="block mb-1">What happens next?</strong>
                 <ul className="list-disc pl-4 space-y-1 text-xs">
                     <li>Stock quantity will be permanently set to 0.</li>
                     <li>A record will be added to your Inventory Logs.</li>
                     <li>This action cannot be undone automatically.</li>
                 </ul>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button type="button" onClick={() => setWriteOffModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors rounded-sm">Cancel</button>
              <button onClick={handleWriteOffSubmit} className="px-6 py-2 bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors shadow-sm rounded-sm">
                Confirm Write-Off
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DeadStock;