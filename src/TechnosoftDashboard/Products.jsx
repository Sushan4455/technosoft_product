import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Download, Trash2, Search, Edit, Box, RefreshCw, 
  X, Tag, Check, AlertTriangle, Sparkles, BrainCircuit, 
  Package, Wallet, AlertCircle
} from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dynamic Categories State
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormState = {
    name: '', sku: '', category: 'Uncategorized', description: '',
    price: '', cost_price: '', vat_applicable: true, vat_rate: 13.00,
    stock_quantity: 0, status: 'Active'
  };
  const [formData, setFormData] = useState(initialFormState);

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
      
      const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (prodData) setProducts(prodData);

      const { data: catData } = await supabase.from('categories').select('name').eq('user_id', session.user.id).order('name', { ascending: true });
      if (catData) setCategoryOptions(catData.map(c => c.name));
    }
    setLoading(false);
  };

  // --- 2. CALCULATE KPIs & INSIGHTS ---
  const calculateKPIs = () => {
    let totalProducts = products.length;
    let totalValue = 0;
    let lowStock = 0;

    products.forEach(p => {
        totalValue += (Number(p.price) * Number(p.stock_quantity));
        if (Number(p.stock_quantity) > 0 && Number(p.stock_quantity) < 10) lowStock++;
        if (Number(p.stock_quantity) === 0 && p.status !== 'Out of Stock') lowStock++; // Count absolute zeroes too
    });

    let aiAdvice = "Your inventory is fully stocked and healthy. Ready for sales.";
    if (lowStock > 0) {
        aiAdvice = `Restock Alert: You have ${lowStock} product(s) running dangerously low on stock or completely depleted.`;
    }

    return { totalProducts, totalValue, lowStock, aiAdvice };
  };

  const kpis = calculateKPIs();

  // --- 3. AUTO-GENERATE SKU ---
  const handleGenerateSKU = () => {
    if (!formData.name) return alert("Please enter a product name first.");
    
    const activeCategory = isAddingCustomCategory && customCategoryName.trim() !== '' 
      ? customCategoryName 
      : formData.category;

    const catPrefix = (activeCategory || 'UNC').substring(0, 3).toUpperCase();
    const namePrefix = formData.name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    
    const newSku = `${catPrefix}-${namePrefix}-${randomNum}`;
    setFormData({ ...formData, sku: newSku });
  };

  // --- 4. ACTIONS ---
  const openModal = (productToEdit = null) => {
    setIsAddingCustomCategory(false);
    setCustomCategoryName("");

    if (productToEdit) {
      setEditingId(productToEdit.id);
      setFormData(productToEdit);
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let finalCategory = formData.category || 'Uncategorized';

    if (isAddingCustomCategory && customCategoryName.trim() !== '') {
      finalCategory = customCategoryName.trim();
      const slug = finalCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      await supabase.from('categories').insert([{ user_id: currentUser.id, name: finalCategory, slug: slug }]);
    }

    const productData = {
      user_id: currentUser.id,
      name: formData.name,
      sku: formData.sku,
      category: finalCategory,
      description: formData.description,
      price: parseFloat(formData.price) || 0,
      cost_price: parseFloat(formData.cost_price) || 0,
      vat_applicable: formData.vat_applicable,
      vat_rate: formData.vat_applicable ? 13.00 : 0.00,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      status: parseInt(formData.stock_quantity) === 0 ? 'Out of Stock' : formData.status // Auto status logic
    };

    if (editingId) {
      await supabase.from('products').update(productData).eq('id', editingId);
    } else {
      await supabase.from('products').insert([productData]);
    }

    setIsModalOpen(false);
    setFormData(initialFormState);
    setIsAddingCustomCategory(false);
    setCustomCategoryName("");
    fetchData(); 
  };

  const deleteProduct = async (id) => {
    if (window.confirm("Delete this product permanently?")) {
      await supabase.from('products').delete().eq('id', id);
      fetchData();
    }
  };

  // --- 5. EXPORT TO CSV ---
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Product Name,SKU,Category,Price (Rs),Stock,Status\n";
    
    products.forEach(p => {
        csvContent += `"${p.name}","${p.sku}","${p.category}",${p.price},${p.stock_quantity},${p.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Product_Catalog.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FILTERING ---
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 pb-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-800 flex items-center gap-2">
                <Box className="text-[#1774b5]" size={24}/> Product Catalog
              </h1>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-slate-200">Inventory</span>
          </div>
          <p className="text-slate-500 text-sm">Manage your SKUs, monitor stock levels, and control pricing.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/80 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm shadow-slate-200/50">
            <Download size={16} className="text-slate-500" /> Export CSV
          </button>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors rounded-lg shadow-sm shadow-blue-900/20">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* BRAND CONSISTENT AI BANNER */}
      <div className="w-full bg-[#1774b5] text-white p-6 mb-8 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 pb-6 border-b border-blue-400/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 text-white rounded-md">
              <BrainCircuit size={24} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Technosoft AI Insight</p>
              <h2 className="text-xl font-bold text-white leading-tight">Inventory Health</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-medium text-blue-50 bg-blue-900/40 p-3 rounded-md inline-flex items-start gap-2 border border-blue-400/20 text-left">
               <Sparkles size={16} className="shrink-0 text-amber-300 mt-0.5" />
               <span>{kpis.aiAdvice}</span>
             </p>
          </div>
        </div>
        
        {/* KPIs INTEGRATED INTO BANNER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Package size={14}/> Active SKUs</p>
            <p className="text-3xl font-black text-white">{kpis.totalProducts}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest"><Wallet size={14}/> Est. Inventory Value</p>
            <p className="text-2xl font-bold text-white mt-1">Rs {kpis.totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className={`p-4 rounded-md border ${kpis.lowStock > 0 ? 'bg-amber-500/20 border-amber-400/40' : 'bg-white/10 border-white/20'}`}>
            <p className={`${kpis.lowStock > 0 ? 'text-amber-200' : 'text-blue-100'} text-[11px] mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest`}>
                <AlertCircle size={14}/> Low Stock Items
            </p>
            <p className={`text-2xl font-bold mt-1 ${kpis.lowStock > 0 ? 'text-amber-400' : 'text-emerald-300'}`}>{kpis.lowStock}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="mb-6 relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
            type="text" 
            placeholder="Search by product name, SKU, or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-lg text-sm focus:outline-none focus:border-[#1774b5] transition-colors shadow-sm shadow-slate-200/50" 
        />
      </div>

      {/* DATA TABLE (Flat, Clean) */}
      <div className="bg-white border border-slate-200/60 w-full rounded-lg overflow-hidden shadow-sm shadow-slate-200/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100 pl-6">Product & SKU</th>
                <th className="py-4 px-6 border-r border-slate-100">Category & Stock</th>
                <th className="py-4 px-6 border-r border-slate-100">Pricing (Rs)</th>
                <th className="py-4 px-6 border-r border-slate-100">Status</th>
                <th className="py-4 px-6 text-center w-24 pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400">Loading catalog...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-slate-400">No products found.</td></tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Details */}
                    <td className="py-4 px-6 pl-6 border-r border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 rounded-md">
                          <Box size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-tight">{product.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Tag size={10} className="text-slate-400" />
                            <span className="text-[11px] font-mono text-slate-500 tracking-wide">{product.sku}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category & Stock */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <span className="inline-block bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded-sm mb-1.5">
                        {product.category}
                      </span>
                      <p className={`text-xs font-bold flex items-center gap-1.5 ${product.stock_quantity > 10 ? 'text-emerald-600' : product.stock_quantity > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {product.stock_quantity > 10 ? <Check size={12}/> : <AlertTriangle size={12}/>}
                        {product.stock_quantity} in stock
                      </p>
                    </td>

                    {/* Pricing */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-bold text-slate-900 mb-1">Rs {Number(product.price).toLocaleString()}</p>
                      {product.vat_applicable ? (
                        <span className="text-[9px] font-bold text-[#1774b5] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-sm">13% VAT</span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-sm">NO VAT</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase border rounded-full ${
                        product.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        product.status === 'Draft' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {product.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 pr-6">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => openModal(product)} className="text-slate-400 hover:text-[#1774b5] transition-colors p-1.5 bg-slate-50 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteProduct(product.id)} className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 bg-slate-50 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200" title="Delete">
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

      {/* --- ADD/EDIT MODAL (Flat UI) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-3xl shadow-2xl rounded-xl border border-slate-200 flex flex-col mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-xl shrink-0">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Product Details' : 'Add New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-6 custom-scrollbar">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. General Info */}
                <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-[#1774b5] uppercase tracking-wide mb-4">1. General Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Product Name *</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="e.g. Premium Leather Bag" />
                    </div>
                    
                    {/* DYNAMIC CATEGORY DROPDOWN */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Category</label>
                      {!isAddingCustomCategory ? (
                        <select 
                          value={formData.category} 
                          onChange={e => {
                            if (e.target.value === 'ADD_CUSTOM') {
                              setIsAddingCustomCategory(true);
                              setFormData({...formData, category: ''});
                            } else {
                              setFormData({...formData, category: e.target.value});
                            }
                          }} 
                          className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] cursor-pointer transition-colors"
                        >
                          <option value="Uncategorized">Uncategorized</option>
                          {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          <option value="ADD_CUSTOM" className="font-bold text-[#1774b5]">+ Add Custom Category...</option>
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Enter new category name" 
                            value={customCategoryName} 
                            onChange={e => setCustomCategoryName(e.target.value)} 
                            className="w-full bg-white border border-[#1774b5] p-2.5 text-sm rounded-md outline-none shadow-sm" 
                            autoFocus 
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsAddingCustomCategory(false);
                              setCustomCategoryName("");
                              setFormData({...formData, category: 'Uncategorized'});
                            }} 
                            className="px-4 bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">SKU (Stock Keeping Unit) *</label>
                      <div className="flex gap-2">
                        <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm font-mono rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="e.g. BAG-LEA-01" />
                        <button type="button" onClick={handleGenerateSKU} className="px-3 border border-[#1774b5] text-[#1774b5] bg-blue-50 hover:bg-[#1774b5] hover:text-white rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors whitespace-nowrap">
                          <RefreshCw size={12} /> Auto
                        </button>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Description</label>
                      <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] resize-y transition-colors" placeholder="Brief details about the product..." />
                    </div>
                  </div>
                </div>

                {/* 2. Pricing & Tax */}
                <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-[#1774b5] uppercase tracking-wide mb-4">2. Pricing & Tax</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Selling Price (Rs) *</label>
                      <input required type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-base font-bold rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Cost Price (Rs)</label>
                      <input type="number" min="0" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] transition-colors" placeholder="For profit tracking" />
                    </div>
                    
                    <div className="flex items-end pb-1.5">
                      <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 w-full transition-colors">
                        <input type="checkbox" className="w-4 h-4 accent-[#1774b5]" checked={formData.vat_applicable} onChange={e => setFormData({...formData, vat_applicable: e.target.checked})} />
                        <span className="text-sm font-medium text-slate-800 select-none">Apply 13% VAT</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Inventory & Status */}
                <div className="bg-slate-50/50 p-5 rounded-lg border border-slate-100">
                  <h3 className="text-sm font-bold text-[#1774b5] uppercase tracking-wide mb-4">3. Inventory & Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Available Stock Quantity</label>
                      <input type="number" min="0" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm font-bold rounded-md outline-none focus:border-[#1774b5] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-widest">Listing Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm rounded-md outline-none focus:border-[#1774b5] cursor-pointer font-medium transition-colors">
                        <option value="Active">Active (Visible)</option>
                        <option value="Draft">Draft (Hidden)</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-xl shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="productForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-bold hover:bg-[#135d90] rounded-lg shadow-sm shadow-blue-900/20 transition-colors">
                {editingId ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Products;