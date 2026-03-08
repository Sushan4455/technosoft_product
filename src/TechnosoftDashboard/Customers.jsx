import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';
import { 
  Plus, Search, Edit, Trash2, Mail, Phone, 
  MessageSquare, Sparkles, UserCheck, UserPlus, 
  X, Eye, Activity, Calendar, Target, RefreshCw, Loader2, Send, PhoneCall
} from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All"); 
  
  // Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [viewingCustomer, setViewingCustomer] = useState(null); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // In-App Email State
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', message: '' });

  const initialFormState = {
    type: 'Lead', name: '', email: '', phone: '',
    source: 'Website', status: 'New', notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchData();
    const subscription = supabase.channel('public:customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (data) setCustomers(data);
    }
    setLoading(false);
  };

  // --- 2. IMPROVED STRICT AI SCORING LOGIC ---
  const runTechnosoftAI = async (customer) => {
    if (customer.type === 'Customer') return alert("This is already a converted customer!");
    
    setIsAnalyzing(customer.id); 

    setTimeout(async () => {
      let score = 10; 
      let insights = "New lead. Awaiting initial contact.";

      // --- NEW STATUS LOGIC ---
      if (customer.status === 'Fake Lead' || customer.status === 'Lost') {
        score = 0;
        insights = "Lead is marked as fake or lost. Zero probability of conversion.";
      } else if (customer.status === 'Actual Lead') {
        score = 75 + Math.floor(Math.random() * 20); // 75 to 95
        insights = "Verified actual lead. High priority for closing pitch.";
      } else if (customer.status === 'Contact Soon') {
        score = 45 + Math.floor(Math.random() * 20);
        insights = "Warm lead. Needs immediate follow-up to establish intent.";
      } else if (customer.status === 'Converted') {
        score = 100;
        insights = "Deal closed successfully.";
      } else {
        // Fallback for 'New' or other legacy statuses
        score = 20 + Math.floor(Math.random() * 20);
      }

      const notes = (customer.notes || "").toLowerCase();
      
      if (
        notes.includes('not buy') || notes.includes('will not buy') || notes.includes("won't buy") || 
        notes.includes("don't want") || notes.includes('not interested') || notes.includes('expensive') || 
        notes.includes('too high') || notes.includes('no budget') || notes.includes('stop')
      ) {
        score = Math.max(0, score - 40);
        insights = "Negative sentiment detected. Client explicitly stated they will not buy or raised an objection.";
      } 
      else if (notes.includes('buy') || notes.includes('invoice') || notes.includes('contract') || notes.includes('ready') || notes.includes('pay')) {
        score = Math.min(99, score + 45);
        insights = "Extremely high buying intent detected in notes. Send contract or payment link immediately.";
      } 
      else if (notes.includes('pricing') || notes.includes('demo') || notes.includes('meeting') || notes.includes('details')) {
        score = Math.min(85, score + 20);
        insights = "Lead is evaluating options or requested details. Schedule a follow-up meeting.";
      }

      await supabase.from('customers').update({ ai_score: score, ai_insights: insights }).eq('id', customer.id);
      setIsAnalyzing(false);
      
      if (viewingCustomer && viewingCustomer.id === customer.id) {
        setViewingCustomer({ ...customer, ai_score: score, ai_insights: insights });
      }
      fetchData();
    }, 1200); 
  };

  // --- 3. SEND IN-APP EMAIL ---
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!viewingCustomer.email) return alert("This customer has no email address on file.");
    
    setIsSendingEmail(true);

    const SERVICE_ID = 'service_vhj9p17'; 
    const TEMPLATE_ID = 'template_pxaejwg';
    const PUBLIC_KEY = 'ODyxxyexpPCAxROL4';

    const templateParams = {
      to_email: viewingCustomer.email,
      to_name: viewingCustomer.name,
      subject: emailData.subject,
      message: emailData.message,
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

      const dateStr = new Date().toLocaleString();
      const autoLog = `[SYSTEM: Email Sent - ${dateStr}]\nSubject: ${emailData.subject}\nMessage: ${emailData.message}\n\n`;
      const updatedNotes = autoLog + (viewingCustomer.notes || "");

      await supabase.from('customers').update({ notes: updatedNotes }).eq('id', viewingCustomer.id);
      
      setViewingCustomer({ ...viewingCustomer, notes: updatedNotes });
      setShowEmailForm(false);
      setEmailData({ subject: '', message: '' });
      fetchData();
      
      alert("Email sent successfully and logged to profile!");
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. Check EmailJS configuration.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // --- 4. ACTIONS ---
  const openEditModal = (customerToEdit = null) => {
    if (customerToEdit) {
      setEditingId(customerToEdit.id);
      setFormData(customerToEdit);
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const customerData = { user_id: currentUser.id, ...formData };
    if (editingId) await supabase.from('customers').update(customerData).eq('id', editingId);
    else await supabase.from('customers').insert([customerData]);
    setIsEditModalOpen(false);
    setFormData(initialFormState);
    fetchData();
  };

  const deleteCustomer = async (id) => {
    if (window.confirm("Delete this record permanently?")) {
      await supabase.from('customers').delete().eq('id', id);
      if (viewingCustomer?.id === id) setViewingCustomer(null);
      fetchData();
    }
  };

  // --- FILTER LOGIC (Updated for Actual Leads) ---
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesType = false;
    if (filterType === "All") matchesType = true;
    else if (filterType === "Lead") matchesType = c.type === "Lead";
    else if (filterType === "Actual Lead") matchesType = c.type === "Lead" && c.status === "Actual Lead";
    else if (filterType === "Customer") matchesType = c.type === "Customer";

    return matchesSearch && matchesType;
  });

  // Helper for Status Badge Color
  const getStatusColor = (type, status) => {
    if (type === 'Customer') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Fake Lead' || status === 'Lost') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'Actual Lead') return 'bg-blue-50 text-[#1774b5] border-blue-300';
    if (status === 'Contact Soon') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200'; // Default
  };

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers & Leads</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your contacts and score pipeline leads.</p>
        </div>
        <button onClick={() => openEditModal()} className="flex items-center gap-2 px-5 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-all shadow-sm rounded-sm">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-sm" />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-sm w-fit overflow-x-auto custom-scrollbar">
          {["All", "Lead", "Actual Lead", "Customer"].map(type => (
            <button key={type} onClick={() => setFilterType(type)} className={`px-4 sm:px-6 py-1.5 text-xs font-medium transition-all whitespace-nowrap rounded-sm ${filterType === type ? 'bg-white shadow-sm text-[#1774b5]' : 'text-slate-500 hover:text-slate-800'}`}>
              {type}{type !== 'All' ? 's' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* --- MINIMAL DATA TABLE --- */}
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden w-full rounded-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 border-r border-slate-100 w-1/3">Contact Name</th>
                <th className="py-4 px-6 border-r border-slate-100">Type & Status</th>
                <th className="py-4 px-6 border-r border-slate-100">AI Lead Score</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading contacts...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No contacts found.</td></tr>
              ) : (
                filteredCustomers.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 border-r border-slate-100">
                      <p className="font-semibold text-slate-900">{contact.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{contact.email || contact.phone || 'No contact info'}</p>
                    </td>
                    <td className="py-4 px-6 border-r border-slate-100">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-sm ${getStatusColor(contact.type, contact.status)}`}>
                        {contact.type === 'Customer' ? <UserCheck size={12}/> : <UserPlus size={12}/>}
                        {contact.type === 'Customer' ? 'Customer' : contact.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 border-r border-slate-100">
                      {contact.type === 'Customer' ? (
                        <span className="text-xs text-slate-400 font-medium tracking-wide">CONVERTED</span>
                      ) : contact.status === 'Fake Lead' ? (
                        <span className="text-xs text-red-500 font-medium tracking-wide">0% (IGNORED)</span>
                      ) : contact.ai_score !== null ? (
                        <div className="flex items-center gap-3 w-full max-w-[150px]">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${contact.ai_score > 70 ? 'bg-emerald-500' : contact.ai_score > 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${contact.ai_score}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700">{contact.ai_score}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not Analyzed</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => { setViewingCustomer(contact); setShowEmailForm(false); }} className="text-[#1774b5] hover:text-blue-800 transition-colors flex items-center gap-1 text-xs font-medium bg-blue-50 px-3 py-1.5 border border-blue-100 rounded-sm">
                          <Eye size={14} /> View Details
                        </button>
                        <button onClick={() => openEditModal(contact)} className="text-slate-400 hover:text-amber-600 transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteCustomer(contact.id)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
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

      {/* --- DETAILED VIEW MODAL (Right Slide Panel) --- */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end items-start bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <UserCheck size={18} className="text-[#1774b5]" /> Customer Profile
              </h2>
              <button onClick={() => setViewingCustomer(null)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
              
              {/* Core Info & Direct Contact Actions */}
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{viewingCustomer.name}</h1>
                <div className="flex gap-2 mb-4">
                   <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-sm">{viewingCustomer.type}</span>
                   {viewingCustomer.type === 'Lead' && (
                     <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm border ${getStatusColor(viewingCustomer.type, viewingCustomer.status)}`}>
                       {viewingCustomer.status}
                     </span>
                   )}
                </div>
                
                <div className="space-y-1 bg-slate-50 border border-slate-100 text-sm overflow-hidden rounded-sm">
                  
                  {/* DIRECT EMAIL TRIGGER */}
                  <div className="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-100 transition-colors">
                    <p className="flex items-center gap-3 text-slate-700 truncate">
                      <Mail size={16} className="text-slate-400 shrink-0"/> {viewingCustomer.email || 'No email provided'}
                    </p>
                    {viewingCustomer.email && (
                      <button onClick={() => setShowEmailForm(!showEmailForm)} className="text-[#1774b5] hover:text-blue-800 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide border border-blue-100 shrink-0 rounded-sm">
                        {showEmailForm ? 'Cancel' : 'Email'}
                      </button>
                    )}
                  </div>

                  {/* DIRECT CALL TRIGGER */}
                  <div className="flex items-center justify-between p-3 border-b border-slate-100 hover:bg-slate-100 transition-colors">
                    <p className="flex items-center gap-3 text-slate-700">
                      <Phone size={16} className="text-slate-400 shrink-0"/> {viewingCustomer.phone || 'No phone provided'}
                    </p>
                    {viewingCustomer.phone && (
                      <a href={`tel:${viewingCustomer.phone}`} className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide border border-emerald-100 shrink-0 rounded-sm">
                        <PhoneCall size={12} /> Call
                      </a>
                    )}
                  </div>

                  <div className="p-3 border-b border-slate-100"><p className="flex items-center gap-3 text-slate-700"><Target size={16} className="text-slate-400"/> Source: <span className="font-medium">{viewingCustomer.source}</span></p></div>
                  <div className="p-3"><p className="flex items-center gap-3 text-slate-700"><Calendar size={16} className="text-slate-400"/> Added: {new Date(viewingCustomer.created_at).toLocaleDateString()}</p></div>
                </div>
              </div>

              {/* IN-APP EMAIL COMPOSER */}
              {showEmailForm && (
                <div className="border-2 border-blue-100 bg-white p-4 animate-in slide-in-from-top-4 duration-200 rounded-sm">
                  <h3 className="text-xs font-bold text-[#1774b5] uppercase tracking-widest mb-3 flex items-center gap-2"><Send size={14}/> Send Direct Email</h3>
                  <form onSubmit={handleSendEmail} className="space-y-3">
                    <input required type="text" placeholder="Subject line" value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2 text-sm focus:border-[#1774b5] outline-none rounded-sm" />
                    <textarea required rows="5" placeholder={`Write your message to ${viewingCustomer.name}...`} value={emailData.message} onChange={e => setEmailData({...emailData, message: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2 text-sm focus:border-[#1774b5] outline-none resize-y rounded-sm" />
                    <button type="submit" disabled={isSendingEmail} className="w-full flex justify-center items-center gap-2 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors disabled:opacity-70 rounded-sm">
                      {isSendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                      {isSendingEmail ? 'Sending Email...' : 'Send to Customer'}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">This email will be automatically logged in their profile.</p>
                  </form>
                </div>
              )}

              {/* AI Insight Box */}
              {viewingCustomer.type === 'Lead' && !showEmailForm && viewingCustomer.status !== 'Fake Lead' && (
                <div className="border border-orange-200 bg-orange-50/50 p-5 relative overflow-hidden rounded-sm">
                  <div className="flex justify-between items-center mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={14}/> AI Insight</h3>
                      {viewingCustomer.ai_score !== null && (
                        <button onClick={() => runTechnosoftAI(viewingCustomer)} disabled={isAnalyzing === viewingCustomer.id} className="text-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50" title="Update Analysis">
                          <RefreshCw size={12} className={isAnalyzing === viewingCustomer.id ? 'animate-spin' : ''} />
                        </button>
                      )}
                    </div>
                    {viewingCustomer.ai_score !== null && (
                      <span className={`text-lg font-black ${viewingCustomer.ai_score > 70 ? 'text-emerald-600' : viewingCustomer.ai_score > 30 ? 'text-amber-600' : 'text-red-600'}`}>
                        {viewingCustomer.ai_score}% Probability
                      </span>
                    )}
                  </div>
                  {viewingCustomer.ai_score !== null ? (
                    <p className="text-sm text-slate-700 relative z-10 leading-relaxed">{viewingCustomer.ai_insights}</p>
                  ) : (
                    <>
                      <p className="text-sm text-slate-500 italic mb-4">This lead has not been analyzed yet.</p>
                      <button onClick={() => runTechnosoftAI(viewingCustomer)} disabled={isAnalyzing === viewingCustomer.id} className="w-full flex justify-center items-center gap-2 py-2 bg-orange-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-orange-600 transition-colors disabled:opacity-50 relative z-10 rounded-sm">
                        {isAnalyzing === viewingCustomer.id ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} 
                        {isAnalyzing === viewingCustomer.id ? 'Analyzing...' : 'Run Analysis Now'}
                      </button>
                    </>
                  )}
                  <Sparkles size={100} className="absolute -right-6 -bottom-6 text-orange-200 opacity-20" />
                </div>
              )}

              {/* Communication Logs */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                  <MessageSquare size={16} className="text-[#1774b5]" /> Communication Logs
                </h3>
                <div className="bg-white border border-slate-200 p-4 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap min-h-[100px] rounded-sm">
                  {viewingCustomer.notes || <span className="italic text-slate-400">No notes or communications logged yet.</span>}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3 shrink-0">
               <button onClick={() => deleteCustomer(viewingCustomer.id)} className="px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors border border-transparent hover:border-red-200 rounded-sm">Delete Record</button>
               <button onClick={() => { setViewingCustomer(null); openEditModal(viewingCustomer); }} className="px-6 py-2 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-colors rounded-sm">Edit Details</button>
            </div>

          </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col rounded-md">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-md">
              <h2 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Contact' : 'Add New Contact'}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="customerEditForm" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="flex border border-slate-300 w-fit rounded-sm overflow-hidden">
                  <button type="button" onClick={() => setFormData({...formData, type: 'Lead'})} className={`px-6 py-2 text-sm font-medium transition-colors ${formData.type === 'Lead' ? 'bg-[#1774b5] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Lead</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'Customer'})} className={`px-6 py-2 text-sm font-medium transition-colors ${formData.type === 'Customer' ? 'bg-[#1774b5] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Customer</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name / Company Name *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border-b border-slate-300 py-2 text-sm focus:border-[#1774b5] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent border-b border-slate-300 py-2 text-sm focus:border-[#1774b5] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone Number</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-transparent border-b border-slate-300 py-2 text-sm focus:border-[#1774b5] outline-none" />
                  </div>
                </div>

                {formData.type === 'Lead' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Lead Source</label>
                      <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-1 focus:ring-[#1774b5] outline-none cursor-pointer rounded-sm">
                        <option value="Website">Website</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Referral">Referral</option>
                        <option value="Cold Call">Cold Call</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Lead Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 text-sm focus:ring-1 focus:ring-[#1774b5] outline-none cursor-pointer rounded-sm">
                        <option value="New">New</option>
                        <option value="Contact Soon">Contact Soon</option>
                        <option value="Actual Lead">Actual Lead</option>
                        <option value="Fake Lead">Fake Lead</option>
                        <option value="Converted">Converted (Won)</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Communication Logs & Notes</label>
                  <textarea 
                    rows="4" 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Log calls, emails, pricing discussions. The AI reads this to calculate probability."
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-sm focus:ring-1 focus:ring-[#1774b5] outline-none resize-y rounded-sm" 
                  />
                </div>

              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-md">
              <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-all rounded-sm">Cancel</button>
              <button type="submit" form="customerEditForm" className="px-6 py-2.5 bg-[#1774b5] text-white text-sm font-medium hover:bg-[#135d90] transition-all shadow-sm rounded-sm">
                {editingId ? 'Save Changes' : 'Save Contact'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;