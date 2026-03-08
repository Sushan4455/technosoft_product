import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Plus, Search, Receipt, Trash2, Edit, Sparkles, 
  PieChart, AlertCircle, CheckCircle, X, Calendar, CreditCard, Filter,
  UploadCloud, Check, Clock, BrainCircuit, Mail, Building,
  ShieldAlert, ShieldCheck, Repeat, IndianRupee, Landmark,
  Camera, Briefcase, ShoppingCart, Ghost, PackageMinus, TrendingDown
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const Expenses = () => {
  // Master State for the Unified Ledger
  const [unifiedLedger, setUnifiedLedger] = useState([]);
  
  // Specific State for the Modals/Actions
  const [rawExpenses, setRawExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]); // <-- Added suppliers state
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  
  // Modal & UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isCustomVendor, setIsCustomVendor] = useState(false); // <-- Toggle for custom vendor
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState({ text: '', type: '' });
  const [copiedInbox, setCopiedInbox] = useState(false);
  const fileInputRef = useRef(null);

  const CATEGORIES = [
    'Software & IT', 'Rent', 'Payroll', 'Marketing', 
    'Utilities', 'Office Supplies', 'Travel', 'Meals & Ent.', 'Tax & Legal', 'Other'
  ];
  const CURRENCIES = ['NPR', 'USD', 'INR', 'EUR'];

  const initialFormState = {
    vendor_name: '', vendor_pan: '', description: '', category: 'Other', project_tag: '',
    currency: 'NPR', amount: '', vat_amount: '', expense_date: new Date().toISOString().split('T')[0],
    due_date: '', is_recurring: false, status: 'Pending', approval_status: 'Pending'
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH UNIFIED DATA ---
  useEffect(() => {
    fetchData();
    // Listen to all relevant tables
    const expSub = supabase.channel('public:expenses').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData).subscribe();
    const poSub = supabase.channel('public:purchase_orders').on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, fetchData).subscribe();
    const logSub = supabase.channel('public:inventory_logs').on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs' }, fetchData).subscribe();
    const suppSub = supabase.channel('public:suppliers').on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, fetchData).subscribe();
    
    return () => {
        supabase.removeChannel(expSub);
        supabase.removeChannel(poSub);
        supabase.removeChannel(logSub);
        supabase.removeChannel(suppSub);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
      
      // Fetch Suppliers for dropdown
      const { data: suppData } = await supabase.from('suppliers').select('*').eq('user_id', session.user.id).order('name', { ascending: true });
      if (suppData) setSuppliers(suppData);

      // A. Fetch Operating Expenses
      const { data: expData } = await supabase.from('expenses').select('*').eq('user_id', session.user.id);
      if (expData) setRawExpenses(expData);

      // B. Fetch Purchase Orders (Ignore Drafts)
      const { data: poData } = await supabase.from('purchase_orders').select('*').eq('user_id', session.user.id).neq('status', 'Draft');

      // C. Fetch Inventory Logs (To find Damages, Dead Stock Write-offs)
      const { data: logData } = await supabase.from('inventory_logs').select('*').eq('user_id', session.user.id);
      
      // D. Fetch Products (To calculate the lost value of Dead Stock/Damaged goods)
      const { data: prodData } = await supabase.from('products').select('id, cost_price, price').eq('user_id', session.user.id);

      // --- AGGREGATE AND FORMAT ---
      let combined = [];

      // 1. Format Expenses
      if (expData) {
          expData.forEach(exp => {
              combined.push({
                  id: exp.id,
                  type: 'Operating Expense',
                  entity: exp.vendor_name,
                  category: exp.category,
                  date: exp.expense_date,
                  amount: Number(exp.amount),
                  currency: exp.currency,
                  status: exp.status,
                  details: exp.description || 'Bill / Invoice',
                  icon: 'Receipt',
                  rawData: exp // Keep raw data for editing
              });
          });
      }

      // 2. Format Purchase Orders
      if (poData) {
          poData.forEach(po => {
              combined.push({
                  id: po.id,
                  type: 'Inventory Purchase',
                  entity: po.vendor_name,
                  category: 'Cost of Goods Sold (COGS)',
                  date: po.order_date,
                  amount: Number(po.total_amount),
                  currency: po.currency,
                  status: po.status === 'Received' ? 'Paid' : 'Pending', // Simplified for UI
                  details: `PO-${po.id.slice(0,6).toUpperCase()} | ${po.items?.length || 0} items`,
                  icon: 'ShoppingCart',
                  rawData: null // Don't allow editing POs from this screen
              });
          });
      }

      // 3. Format Inventory Losses (Write-offs, Damage, Dead Stock)
      if (logData && prodData) {
          const losses = logData.filter(log => 
              log.reason?.toLowerCase().includes('write-off') || 
              log.reason?.toLowerCase().includes('damage') ||
              log.reason?.toLowerCase().includes('dead stock') ||
              log.adjustment_type === 'Remove'
          );

          losses.forEach(log => {
              const product = prodData.find(p => p.id === log.product_id);
              const estCost = product ? (parseFloat(product.cost_price) || parseFloat(product.price) * 0.5) : 0;
              const lostValue = Math.abs(log.quantity_changed) * estCost;

              combined.push({
                  id: log.id,
                  type: 'Inventory Loss',
                  entity: 'Internal Operations',
                  category: 'Write-off / Damage',
                  date: log.created_at.split('T')[0],
                  amount: lostValue,
                  currency: 'NPR', // Assuming base currency for inventory
                  status: 'Realized Loss',
                  details: `${log.product_name} | ${Math.abs(log.quantity_changed)} units lost`,
                  icon: 'Ghost',
                  rawData: null
              });
          });
      }

      // Sort combined timeline by date descending
      combined.sort((a, b) => new Date(b.date) - new Date(a.date));
      setUnifiedLedger(combined);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ENGINE (Unified) ---
  const calculateInsights = () => {
    let totalOpEx = 0;
    let totalCogs = 0;
    let totalLosses = 0;

    unifiedLedger.forEach(item => {
      let calcAmount = Number(item.amount);
      if (item.currency === 'USD') calcAmount *= 133;
      if (item.currency === 'INR') calcAmount *= 1.6;

      if (item.type === 'Operating Expense') totalOpEx += calcAmount;
      if (item.type === 'Inventory Purchase') totalCogs += calcAmount;
      if (item.type === 'Inventory Loss') totalLosses += calcAmount;
    });

    let aiAdvice = "Financial outflows are well documented. Keep monitoring recurring software costs.";
    if (totalLosses > 10000) {
        aiAdvice = `Critical Alert: You have Rs ${totalLosses.toLocaleString()} in realized inventory losses (Damages/Dead Stock). Review storage and purchasing habits.`;
    } else if (totalCogs > (totalOpEx * 2) && totalOpEx > 0) {
        aiAdvice = "Heavy capital is flowing into inventory (Purchase Orders). Ensure your sales velocity matches this purchasing rate to avoid future dead stock.";
    }

    return { totalOpEx, totalCogs, totalLosses, totalOutflow: totalOpEx + totalCogs + totalLosses, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. AI PDF RECEIPT SCANNER ---
  const triggerFileInput = () => {
    setExtractionMessage({ text: '', type: '' });
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        setExtractionMessage({ text: 'Error: Currently only PDF OCR is supported.', type: 'error' });
        return;
    }

    setIsExtracting(true);
    setExtractionMessage({ text: 'AI OCR engine initializing...', type: 'info' });
    
    try {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const loadingTask = pdfjsLib.getDocument({ data: typedarray });
                const pdf = await loadingTask.promise;
                
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }

                const lowerText = fullText.toLowerCase();
                let extractedData = { ...formData, description: 'Auto-extracted via OCR' };
                let foundTotal = false;

                const keywordMap = {
                    'Software & IT': ['aws', 'amazon', 'google', 'microsoft', 'vercel', 'supabase', 'adobe'],
                    'Marketing': ['facebook', 'meta', 'tiktok', 'linkedin', 'google ads'],
                    'Utilities': ['vianet', 'worldlink', 'ntc', 'ncell', 'electricity', 'nea'],
                    'Travel': ['indrive', 'pathao', 'buddha air', 'hotel'],
                };

                let detectedVendor = '';
                for (const [category, keywords] of Object.entries(keywordMap)) {
                    for (const keyword of keywords) {
                        if (lowerText.includes(keyword)) {
                            extractedData.category = category;
                            detectedVendor = keyword.charAt(0).toUpperCase() + keyword.slice(1);
                            break;
                        }
                    }
                    if (detectedVendor) break;
                }
                if (detectedVendor) {
                    extractedData.vendor_name = detectedVendor;
                    setIsCustomVendor(true); // Auto-extracted names usually aren't in the DB exactly
                }

                if (lowerText.includes('usd') || lowerText.includes('$')) extractedData.currency = 'USD';
                else if (lowerText.includes('inr') || lowerText.includes('₹')) extractedData.currency = 'INR';

                const panMatch = fullText.match(/(?:pan|vat|pan\/vat)[\s:.-]*(\d{9})/i);
                if (panMatch) extractedData.vendor_pan = panMatch[1];

                const totalMatch = fullText.match(/(?:total|amount due|npr|rs|\$)[\s:$-]*([\d,]+\.?\d*)/i);
                if (totalMatch) {
                    const parsedTotal = parseFloat(totalMatch[1].replace(/,/g, ''));
                    if (!isNaN(parsedTotal) && parsedTotal > 0) {
                        extractedData.amount = parsedTotal;
                        foundTotal = true;
                    }
                }

                const dateMatch = fullText.match(/(?:date|billed)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
                if (dateMatch) {
                   try {
                       const d = new Date(dateMatch[1]);
                       if(!isNaN(d)) extractedData.expense_date = d.toISOString().split('T')[0];
                   } catch(e) {}
                }

                setTimeout(() => {
                    setFormData(extractedData);
                    if(foundTotal) setExtractionMessage({ text: `Success! OCR complete. Extracted PAN & Totals.`, type: 'success' });
                    else setExtractionMessage({ text: 'Partial extraction. Please review manually.', type: 'warning' });
                    setIsExtracting(false);
                }, 1000);

            } catch (err) {
                setExtractionMessage({ text: `OCR Failed: Cannot read image-based PDFs yet.`, type: 'error' });
                setIsExtracting(false);
            }
        };
        fileReader.readAsArrayBuffer(file);
    } catch (error) {
        setIsExtracting(false);
        setExtractionMessage({ text: 'System error reading file.', type: 'error' });
    } finally {
        if(fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // --- 4. CRUD LOGIC (For Operating Expenses ONLY) ---
  const openModal = (item = null) => {
    // Only allow editing if it's an Operating Expense
    if (item && item.type !== 'Operating Expense') return; 

    if (item && item.rawData) {
      setEditingId(item.id);
      setFormData({
        ...initialFormState,
        ...item.rawData,
        due_date: item.rawData.due_date || ''
      });
      // Check if vendor exists in suppliers
      const isKnownVendor = suppliers.some(s => s.name === item.rawData.vendor_name);
      setIsCustomVendor(!isKnownVendor && item.rawData.vendor_name !== '');
    } else {
      setEditingId(null);
      setFormData(initialFormState);
      setIsCustomVendor(false);
    }
    setExtractionMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Session expired.");

    const expenseData = { 
      ...formData,
      user_id: currentUser.id,
      amount: parseFloat(formData.amount),
      vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : 0,
      due_date: formData.due_date === '' ? null : formData.due_date
    };
    
    try {
      if (editingId) {
        await supabase.from('expenses').update(expenseData).eq('id', editingId);
      } else {
        await supabase.from('expenses').insert([expenseData]);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert(`Database Error: ${error.message}`);
    }
  };

  const deleteExpense = async (item) => {
    if (item.type !== 'Operating Expense') return alert("Purchase Orders and Inventory Losses must be managed on their respective pages.");
    
    if (window.confirm("Delete this expense permanently?")) {
      await supabase.from('expenses').delete().eq('id', item.id);
      fetchData();
    }
  };

  const copyInboxEmail = () => {
    navigator.clipboard.writeText("bills.yourstore@technosoft.inbox");
    setCopiedInbox(true);
    setTimeout(() => setCopiedInbox(false), 2000);
  };

  // --- FILTERING ---
  const filteredLedger = unifiedLedger.filter(item => {
    const matchesSearch = item.entity.toLowerCase().includes(searchTerm.toLowerCase()) || item.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "All" ? true : item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-regular tracking-tight">Unified Outflow Ledger</h1>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={copyInboxEmail} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors rounded-sm shadow-sm">
              {copiedInbox ? <Check size={16} className="text-emerald-600"/> : <Mail size={16} />} 
              {copiedInbox ? 'Email Copied!' : 'Forward Bills'}
            </button>
            <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors shadow-sm rounded-sm">
              <Plus size={16} /> New Manual Bill
            </button>
        </div>
      </div>

      {/* AI INSIGHTS BANNER (Updated to Brand Blue) */}
      <div className="w-full bg-[#1774b5] text-white p-5 mb-8 shadow-sm rounded-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-blue-400/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-sm">
              <BrainCircuit size={20} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Technosoft Intelligence</p>
              <h2 className="text-lg font-medium text-white leading-tight">Total Capital Outflow Analysis</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-medium text-amber-200 flex items-center md:justify-end gap-2 bg-blue-900/30 p-2 rounded-sm inline-flex">
               <Sparkles size={16} />
               <span className="text-left md:text-right">{insights.aiAdvice}</span>
             </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><TrendingDown size={12}/> Total Tracked Outflow</p>
            <p className="text-xl font-bold text-white">Rs {insights.totalOutflow.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Receipt size={12}/> Operating Expenses</p>
            <p className="text-xl font-bold text-white">Rs {insights.totalOpEx.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><ShoppingCart size={12}/> Inventory POs (COGS)</p>
            <p className="text-xl font-bold text-white">Rs {insights.totalCogs.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><PackageMinus size={12}/> Realized Stock Loss</p>
            <p className={`text-xl font-bold ${insights.totalLosses > 0 ? 'text-amber-200' : 'text-white'}`}>Rs {insights.totalLosses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by vendor, PO number, or item..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm shadow-sm" 
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-sm shadow-sm">
          <Filter size={14} className="text-slate-400"/>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border-none focus:ring-0 outline-none text-slate-700 bg-transparent cursor-pointer font-medium"
          >
            <option value="All">All Ledger Types</option>
            <option value="Operating Expense">Operating Expenses (Bills)</option>
            <option value="Inventory Purchase">Purchase Orders (COGS)</option>
            <option value="Inventory Loss">Write-offs & Damages</option>
          </select>
        </div>
      </div>

      {/* --- MASTER DATA TABLE --- */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100">Payee / Entity</th>
                <th className="py-4 px-6 border-r border-slate-100">Category & Details</th>
                <th className="py-4 px-6 border-r border-slate-100">Financial Impact</th>
                <th className="py-4 px-6 border-r border-slate-100">Type & Status</th>
                <th className="py-4 px-6 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Aggregating master ledger...</td></tr>
              ) : filteredLedger.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No outflow records found.</td></tr>
              ) : (
                filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* ENTITY */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border ${
                            item.type === 'Operating Expense' ? 'bg-blue-50 text-[#1774b5] border-blue-100' :
                            item.type === 'Inventory Purchase' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                            {item.icon === 'Receipt' && <Receipt size={14} />}
                            {item.icon === 'ShoppingCart' && <ShoppingCart size={14} />}
                            {item.icon === 'Ghost' && <Ghost size={14} />}
                        </div>
                        <p className="font-bold text-slate-900 line-clamp-1">{item.entity}</p>
                      </div>
                    </td>

                    {/* DETAILS */}
                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-semibold text-slate-700 text-xs mb-1">{item.category}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 mb-1">{item.details}</p>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Calendar size={10}/> {new Date(item.date).toLocaleDateString()}</span>
                    </td>

                    {/* AMOUNT */}
                    <td className="py-4 px-6 border-r border-slate-100">
                       <p className={`font-black text-base ${item.type === 'Inventory Loss' ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.currency} {Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                       </p>
                    </td>

                    {/* STATUS & TYPE */}
                    <td className="py-4 px-6 border-r border-slate-100">
                        <div className="flex flex-col items-start gap-1.5">
                            <span className={`inline-flex px-1.5 py-0.5 text-[9px] uppercase tracking-widest font-bold border rounded-sm ${
                                item.type === 'Operating Expense' ? 'bg-blue-50 text-[#1774b5] border-blue-200' :
                                item.type === 'Inventory Purchase' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                                {item.type}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase font-bold border rounded-sm ${
                                item.status === 'Paid' || item.status === 'Realized Loss' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {item.status}
                            </span>
                        </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center gap-3">
                        {item.type === 'Operating Expense' ? (
                            <>
                                <button onClick={() => openModal(item)} className="text-slate-400 hover:text-[#1774b5] transition-colors p-1" title="Edit Bill">
                                  <Edit size={16} />
                                </button>
                                <button onClick={() => deleteExpense(item)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Delete Bill">
                                  <Trash2 size={16} />
                                </button>
                            </>
                        ) : (
                            <span className="text-[10px] text-slate-400 italic">Managed in <br/>{item.type === 'Inventory Purchase' ? 'Purchases' : 'Dead Stock'}</span>
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

      {/* --- ADD/EDIT EXPENSE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl shadow-2xl flex flex-col rounded-md border border-slate-200 mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Bill Details' : 'Record New Payable'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            {/* HELPFUL NOTE FOR POs */}
            <div className="px-6 pt-4 shrink-0">
               <div className="bg-blue-50 border border-blue-200 p-3 rounded-sm flex items-start gap-2">
                   <AlertCircle size={16} className="text-[#1774b5] shrink-0 mt-0.5" />
                   <p className="text-xs text-[#1774b5] font-medium leading-relaxed">
                       <strong>Note:</strong> This form is for Operating Expenses (like rent, software, utilities). If you are purchasing physical inventory/stock to sell, please use the <strong>Purchase Orders</strong> module.
                   </p>
               </div>
            </div>

            {/* OCR UPLOAD BANNER */}
            {!editingId && (
              <div className="px-6 py-4 mt-4 bg-[#1774b5]/5 border-y border-blue-100 shrink-0">
                  <div className="flex items-center justify-between">
                      <div>
                          <h3 className="text-xs font-bold text-[#1774b5] flex items-center gap-1.5 uppercase tracking-widest"><Camera size={14}/> Receipt Auto-Capture</h3>
                          <p className="text-[10px] text-slate-500 mt-1">Upload a PDF invoice. AI will extract Vendor, PAN, Date, and Amount.</p>
                      </div>
                      <div className="shrink-0 relative">
                          <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                          <button type="button" onClick={triggerFileInput} disabled={isExtracting} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#1774b5] text-[#1774b5] text-xs font-semibold hover:bg-blue-50 transition-colors rounded-sm disabled:opacity-50 shadow-sm">
                              {isExtracting ? <Clock size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                              {isExtracting ? 'Scanning...' : 'Upload Document'}
                          </button>
                      </div>
                  </div>
                  {extractionMessage.text && (
                      <div className={`mt-3 text-xs font-medium flex items-center gap-1.5 p-2 rounded-sm border ${
                          extractionMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                          extractionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                          {extractionMessage.text}
                      </div>
                  )}
              </div>
            )}

            <div className="p-6 custom-scrollbar">
              <form id="expenseForm" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Core Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 flex gap-4">
                      
                      {/* Vendor Dropdown / Custom Field */}
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Vendor / Payee *</label>
                        {!isCustomVendor ? (
                          <select 
                            required
                            value={formData.vendor_name}
                            onChange={(e) => {
                              if (e.target.value === 'CUSTOM_NEW_VENDOR') {
                                setIsCustomVendor(true);
                                setFormData({ ...formData, vendor_name: '', vendor_pan: '' });
                              } else {
                                const selectedVendor = suppliers.find(s => s.name === e.target.value);
                                setFormData({ 
                                  ...formData, 
                                  vendor_name: selectedVendor?.name || '', 
                                  vendor_pan: selectedVendor?.pan_number || '' 
                                });
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm cursor-pointer"
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
                              className="w-full bg-white border border-[#1774b5] p-2.5 text-sm focus:outline-none rounded-sm shadow-sm" 
                              placeholder="Type new vendor name..." 
                              autoFocus
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                setIsCustomVendor(false);
                                setFormData({ ...formData, vendor_name: '', vendor_pan: '' });
                              }} 
                              className="px-4 bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="w-1/3">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Vendor PAN/VAT</label>
                        <input type="text" value={formData.vendor_pan} onChange={e => setFormData({...formData, vendor_pan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm font-mono" placeholder="Optional" />
                      </div>
                  </div>

                  {/* NEW DESCRIPTION FIELD */}
                  <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Description / Reason for Bill *</label>
                      <textarea 
                          required 
                          rows="2" 
                          value={formData.description} 
                          onChange={e => setFormData({...formData, description: e.target.value})} 
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm resize-y" 
                          placeholder="e.g., Office Wi-Fi bill for March, Facebook Ad Spend..." 
                      />
                  </div>

                  {/* Financials */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm md:col-span-2 grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Currency</label>
                        <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm">
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Total Amount *</label>
                        <input required type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-lg font-bold focus:outline-none focus:border-[#1774b5] rounded-sm" placeholder="0.00" />
                      </div>
                  </div>

                  {/* Classification */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Category *</label>
                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm">
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Project / Client Tag</label>
                    <input type="text" value={formData.project_tag} onChange={e => setFormData({...formData, project_tag: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" placeholder="e.g., ECPAT Project" />
                  </div>

                  {/* Dates & Workflow */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Invoice Date *</label>
                    <input required type="date" value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Payment Due Date</label>
                    <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" />
                  </div>
                  
                  <div className="md:col-span-2 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Manager Approval</label>
                        <select value={formData.approval_status} onChange={e => setFormData({...formData, approval_status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm">
                          <option value="Pending">Needs Approval</option>
                          <option value="Approved">Approved for Payout</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Payment Status</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm">
                          <option value="Pending">Unpaid</option>
                          <option value="Paid">Paid Successfully</option>
                        </select>
                      </div>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 mt-2">
                      <input type="checkbox" id="recurring" checked={formData.is_recurring} onChange={e => setFormData({...formData, is_recurring: e.target.checked})} className="w-4 h-4 accent-[#1774b5]" />
                      <label htmlFor="recurring" className="text-sm font-medium text-slate-700 cursor-pointer">This is a recurring monthly subscription/bill.</label>
                  </div>

                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-all rounded-sm">Cancel</button>
              <button type="submit" form="expenseForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-all shadow-sm rounded-sm">
                {editingId ? 'Update Record' : 'Save to Ledger'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;