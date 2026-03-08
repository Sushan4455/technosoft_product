import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';
import { 
  Plus, Search, Trash2, Sparkles, CheckCircle, X, 
  Clock, BrainCircuit, Mail, Link as LinkIcon, Copy, Check,
  ExternalLink, Ban, Wallet
} from 'lucide-react';

const PaymentLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Default expiration is 7 days from today
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);

  const initialFormState = {
    customer_name: '',
    customer_email: '',
    description: '',
    amount: '',
    currency: 'NPR',
    expires_at: defaultExpiry.toISOString().split('T')[0],
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA & REALTIME LISTENER ---
  useEffect(() => {
    // Initial Fetch
    fetchData();

    // Setup Realtime Subscription
    const subscription = supabase
      .channel('public:payment_links')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'payment_links' }, 
        (payload) => {
          console.log("Realtime event received:", payload);
          // Re-fetch data whenever an INSERT, UPDATE, or DELETE happens
          fetchData(); 
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => supabase.removeChannel(subscription);
  }, []);

const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
      
      // THE FIX IS HERE: Added .eq('user_id', session.user.id)
      const { data } = await supabase
        .from('payment_links')
        .select('*')
        .eq('user_id', session.user.id) // <--- Only fetch this user's data!
        .order('created_at', { ascending: false });
      
      if (data) setLinks(data);
    }
    setLoading(false);
  };

  // --- 2. AI INSIGHTS ENGINE ---
  const calculateInsights = () => {
    let totalCollected = 0;
    let pendingVolume = 0;
    let activeLinksCount = 0;
    let paidLinksCount = 0;

    links.forEach(link => {
      const amt = Number(link.amount);
      if (link.status === 'Paid') {
        totalCollected += amt;
        paidLinksCount++;
      } else if (link.status === 'Active') {
        pendingVolume += amt;
        activeLinksCount++;
      }
    });

    const conversionRate = links.length > 0 ? Math.round((paidLinksCount / links.length) * 100) : 0;

    let aiAdvice = "Generate links to start collecting payments instantly.";
    if (pendingVolume > 100000) {
        aiAdvice = `AI Alert: High uncollected volume (Rs ${pendingVolume.toLocaleString()}). Follow up via SMS/WhatsApp, as links convert 40% faster on mobile.`;
    } else if (conversionRate < 30 && links.length > 5) {
        aiAdvice = `AI Strategy: Your link conversion is low (${conversionRate}%). Try sending links on Tuesdays or Thursdays between 10 AM - 12 PM for higher success.`;
    } else if (paidLinksCount > 0) {
        aiAdvice = `AI Analysis: Healthy conversion rate! Clients are paying promptly. Consider offering early-payment discounts to improve cash flow further.`;
    }

    return { totalCollected, pendingVolume, activeLinksCount, conversionRate, aiAdvice };
  };

  const insights = calculateInsights();

  // --- 3. HELPER FUNCTIONS ---
  const generateLinkHash = () => {
    return 'pay-' + Math.random().toString(36).substring(2, 10);
  };

  const handleCopyLink = (hash, id) => {
    // Use window.location.origin to dynamically get http://localhost:5173
    const fullUrl = `${window.location.origin}/pay/${hash}`; 
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- 4. CRUD LOGIC ---
  const openModal = () => {
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Session expired. Please login again.");

    const linkData = { 
      ...formData,
      user_id: currentUser.id,
      amount: parseFloat(formData.amount),
      link_hash: generateLinkHash(),
      status: 'Active'
    };
    
    try {
      const { error } = await supabase.from('payment_links').insert([linkData]);
      if (error) throw error;
      
      setIsModalOpen(false);
      setFormData(initialFormState);
      // Removed fetchData() here because the realtime listener will handle it!
    } catch (error) {
      console.error(error);
      alert(`Database Error: ${error.message}`);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await supabase.from('payment_links').update({ status: newStatus }).eq('id', id);
      // Removed fetchData() here because the realtime listener will handle it!
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLink = async (id) => {
    if (window.confirm("Delete this payment link permanently? This cannot be undone.")) {
      await supabase.from('payment_links').delete().eq('id', id);
      // Removed fetchData() here because the realtime listener will handle it!
    }
  };

  // --- 5. EMAIL LINK LOGIC ---
  const handleSendEmail = async (link) => {
    if (!link.customer_email) return alert("No email address attached to this link.");
    setIsSendingEmail(link.id); 

    const SERVICE_ID = 'service_vhj9p17'; 
    const TEMPLATE_ID = 'template_pxaejwg';
    const PUBLIC_KEY = 'ODyxxyexpPCAxROL4';

    const fullUrl = `${window.location.origin}/pay/${link.link_hash}`;

    const templateParams = {
      to_email: link.customer_email,
      to_name: link.customer_name,
      subject: `Payment Request: ${link.description} (via Technosoft)`,
      message: `Hi ${link.customer_name},\n\nPlease click the secure link below to complete your payment of ${link.currency} ${Number(link.amount).toLocaleString()}.\n\nSecure Payment Link:\n${fullUrl}\n\nNote: This link expires on ${new Date(link.expires_at).toLocaleDateString()}.\n\nThank you!`,
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      alert(`Payment link sent to ${link.customer_email}!`);
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. Check EmailJS configuration.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // --- FILTERING ---
  const filteredLinks = links.filter(link => {
    const term = searchTerm.toLowerCase();
    return (
      link.customer_name.toLowerCase().includes(term) ||
      link.description.toLowerCase().includes(term) ||
      link.link_hash.toLowerCase().includes(term)
    );
  });

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-regular tracking-tight">Payment Links</h1>
        </div>
        <button 
          onClick={openModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-all shadow-sm rounded-sm"
        >
          <Plus size={16} /> Create Link
        </button>
      </div>

      {/* AI INSIGHTS BANNER */}
      <div className="w-full bg-[#1774b5] text-white p-5 mb-8 shadow-sm rounded-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-blue-400/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Technosoft Intelligence</p>
              <h2 className="text-lg font-medium text-white leading-tight">Collection Analytics</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-medium text-amber-200 flex items-center md:justify-end gap-2 bg-blue-900/30 p-2 rounded-sm inline-flex">
               <BrainCircuit size={16} />
               {insights.aiAdvice}
             </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Wallet size={12}/> Collected Volume</p>
            <p className="text-xl font-bold text-white">Rs {insights.totalCollected.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><Clock size={12}/> Pending Volume</p>
            <p className="text-xl font-bold text-amber-200">Rs {insights.pendingVolume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><LinkIcon size={12}/> Active Links</p>
            <p className="text-xl font-bold text-white">{insights.activeLinksCount}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs mb-1 flex items-center gap-1.5"><CheckCircle size={12}/> Conversion Rate</p>
            <p className="text-xl font-bold text-white">{insights.conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search customer or description..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" 
          />
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="bg-white border border-slate-200 shadow-sm w-full rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100">Customer & URL</th>
                <th className="py-4 px-6 border-r border-slate-100">Description</th>
                <th className="py-4 px-6 border-r border-slate-100">Amount & Expiry</th>
                <th className="py-4 px-6 border-r border-slate-100">Status</th>
                <th className="py-4 px-6 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Loading links...</td></tr>
              ) : filteredLinks.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No payment links found.</td></tr>
              ) : (
                filteredLinks.map((link) => {
                  const isExpired = new Date(link.expires_at) < new Date() && link.status === 'Active';
                  const displayStatus = isExpired ? 'Expired' : link.status;

                  return (
                    <tr key={link.id} className={`hover:bg-slate-50 transition-colors ${displayStatus === 'Revoked' || displayStatus === 'Expired' ? 'opacity-60 bg-slate-50' : ''}`}>
                      
                      {/* URL & Customer */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <p className="font-bold text-slate-900 mb-1">
                          {link.customer_name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200 rounded-sm inline-flex items-center gap-1">
                            <LinkIcon size={10} /> {link.link_hash}
                          </span>
                          <button 
                            onClick={() => handleCopyLink(link.link_hash, link.id)}
                            className="text-[#1774b5] hover:text-blue-800 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                          >
                            {copiedId === link.id ? <Check size={12}/> : <Copy size={12}/>}
                            {copiedId === link.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </td>

                      {/* DESCRIPTION */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <p className="text-slate-700 text-xs line-clamp-2">{link.description}</p>
                      </td>

                      {/* AMOUNT & DATE */}
                      <td className="py-4 px-6 border-r border-slate-100">
                         <p className="font-bold text-slate-900 mb-1">
                            {link.currency} {Number(link.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                         </p>
                         <span className={`flex items-center gap-1.5 text-[11px] font-medium ${isExpired ? 'text-red-600' : 'text-slate-500'}`}>
                            <Clock size={10} /> Valid til: {new Date(link.expires_at).toLocaleDateString()}
                         </span>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-6 border-r border-slate-100">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border rounded-sm ${
                          displayStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          displayStatus === 'Active' ? 'bg-blue-50 text-[#1774b5] border-blue-200' :
                          displayStatus === 'Expired' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2">
                          {link.status === 'Active' && !isExpired && (
                            <>
                                <button 
                                  onClick={() => handleSendEmail(link)} 
                                  disabled={isSendingEmail === link.id}
                                  className="w-full py-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-[10px] font-bold uppercase rounded-sm flex justify-center items-center gap-1.5 shadow-sm disabled:opacity-50"
                                >
                                  {isSendingEmail === link.id ? <Clock size={10} className="animate-spin"/> : <Mail size={10} />} Email
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => updateStatus(link.id, 'Paid')} className="flex-1 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors text-[10px] font-bold uppercase rounded-sm flex justify-center items-center gap-1" title="Mark Paid Manually">
                                      <Check size={10} /> Paid
                                    </button>
                                    <button onClick={() => updateStatus(link.id, 'Revoked')} className="flex-1 py-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors text-[10px] font-bold uppercase rounded-sm flex justify-center items-center gap-1" title="Revoke Link">
                                      <Ban size={10} /> Revoke
                                    </button>
                                </div>
                            </>
                          )}
                          {(displayStatus === 'Paid' || displayStatus === 'Revoked' || displayStatus === 'Expired') && (
                            <button onClick={() => deleteLink(link.id)} className="w-full py-1 border border-transparent text-slate-400 hover:text-red-600 transition-colors text-[10px] font-bold uppercase flex justify-center items-center gap-1">
                                <Trash2 size={12} /> Delete Record
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE LINK MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-start pt-10 px-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg shadow-2xl flex flex-col rounded-md border border-slate-200 mb-10">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">Generate Payment Link</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="px-6 py-4 bg-[#1774b5]/5 border-b border-blue-100 shrink-0">
                <p className="text-[11px] font-medium text-[#1774b5] flex items-center gap-1.5">
                   <ExternalLink size={14}/> 
                   Creates a unique, secure URL you can send to clients via SMS, WhatsApp, or Email.
                </p>
            </div>

            <div className="p-6 custom-scrollbar">
              <form id="linkForm" onSubmit={handleSubmit} className="space-y-5">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Customer Name *</label>
                  <input required type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" placeholder="e.g., Jane Doe" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Customer Email (Optional)</label>
                  <input type="email" value={formData.customer_email} onChange={e => setFormData({...formData, customer_email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" placeholder="jane@example.com" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Payment Reason / Description *</label>
                  <textarea required rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm resize-y" placeholder="e.g., Deposit for Website Project" />
                </div>

                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Currency</label>
                    <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm">
                      <option value="NPR">NPR</option>
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Request Amount *</label>
                    <input required type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-white border border-slate-200 p-2.5 text-lg font-bold focus:outline-none focus:border-[#1774b5] rounded-sm text-[#1774b5]" placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Link Expiration Date *</label>
                  <input required type="date" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:outline-none focus:border-[#1774b5] rounded-sm" />
                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-md shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-all rounded-sm">Cancel</button>
              <button type="submit" form="linkForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-all shadow-sm rounded-sm">
                Generate Link
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentLinks;