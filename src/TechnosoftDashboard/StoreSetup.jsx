import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import emailjs from '@emailjs/browser';
import { 
  Check, Upload, Loader2, Image as ImageIcon, 
  ShieldCheck, FileText, Store, Landmark, Wallet, 
  User, Briefcase, AlertCircle, Clock, XCircle
} from 'lucide-react';

const StoreSetup = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState(false);

  const [formData, setFormData] = useState({
    // Owner Details
    owner_name: '',
    owner_designation: '',
    owner_profile_picture_url: '',
    // Business Profile
    store_name: '',
    business_type: 'Product-Based',
    industry_category: '',
    establishment_year: '',
    employee_count: '1-5',
    // Contact & Location
    pan_number: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    website_link: '',
    logo_url: '',
    // KYC Docs
    company_reg_url: '',
    business_pan_url: '',
    optional_doc_url: '',
    kyc_status: 'Pending',
    rejection_reason: '', // To show why admin rejected it
    // Payment Fields
    bank_name: '',
    account_name: '',
    account_number: '',
    branch_name: '',
    esewa_id: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setCurrentUser(session.user);
      
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        setFormData({
          owner_name: data.owner_name || '',
          owner_designation: data.owner_designation || '',
          owner_profile_picture_url: data.owner_profile_picture_url || '',
          store_name: data.store_name || '',
          business_type: data.business_type || 'Product-Based',
          industry_category: data.industry_category || '',
          establishment_year: data.establishment_year || '',
          employee_count: data.employee_count || '1-5',
          pan_number: data.pan_number || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          website_link: data.website_link || '',
          logo_url: data.logo_url || '',
          company_reg_url: data.company_reg_url || '',
          business_pan_url: data.business_pan_url || '',
          optional_doc_url: data.optional_doc_url || '',
          kyc_status: data.kyc_status || 'Pending',
          rejection_reason: data.rejection_reason || '',
          bank_name: data.bank_name || '',
          account_name: data.account_name || '',
          account_number: data.account_number || '',
          branch_name: data.branch_name || '',
          esewa_id: data.esewa_id || ''
        });
      }
    }
    setLoading(false);
  };

  const handleFileUpload = async (e, field, bucket) => {
    try {
      setUploadingField(field);
      const file = e.target.files[0];
      if (!file) return;

      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.includes('image/jpeg') || file.type.includes('image/png');
      
      if (bucket === 'store_logos' && !isImage) return alert('Logos and Profile Pictures must be JPG or PNG.');
      if (bucket === 'kyc_documents' && !isImage && !isPDF) return alert('Documents must be PDF, JPG, or PNG.');

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${field}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
      
      // If user uploads a new document after being rejected, reset status to pending for admin re-review
      let newStatus = formData.kyc_status;
      if (formData.kyc_status === 'Rejected') {
          newStatus = 'Pending';
      }

      setFormData({ ...formData, [field]: publicUrl, kyc_status: newStatus });

    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file. Check your storage bucket setup.');
    } finally {
      setUploadingField(null);
    }
  };

  const sendAdminNotification = (updatedData) => {
    const SERVICE_ID = 'service_vhj9p17'; 
    const TEMPLATE_ID = 'template_pxaejwg';
    const PUBLIC_KEY = 'ODyxxyexpPCAxROL4';

    const templateParams = {
      to_email: 'info.technosoftintl@gmail.com', 
      store_name: updatedData.store_name,
      owner_name: updatedData.owner_name,
      business_type: updatedData.business_type,
      email: updatedData.email,
      phone: updatedData.phone,
      pan_number: updatedData.pan_number,
      company_reg_link: updatedData.company_reg_url || 'Not Uploaded',
      business_pan_link: updatedData.business_pan_url || 'Not Uploaded',
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
      .catch(err => console.error("Admin Email failed to send:", err));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.company_reg_url || !formData.business_pan_url || !formData.owner_profile_picture_url) {
      const confirmSave = window.confirm("You have missing mandatory KYC documents (Profile Picture, Company Registration, or PAN). Your account cannot be verified without them. Save anyway?");
      if (!confirmSave) return;
    }

    setSaving(true);
    
    // If they resubmit, force status to pending so Admin can review again
    const finalStatus = formData.kyc_status === 'Rejected' ? 'Pending' : formData.kyc_status;
    
    const settingsData = { 
        user_id: currentUser.id, 
        ...formData, 
        kyc_status: finalStatus,
        updated_at: new Date().toISOString() 
    };

    const { error } = await supabase.from('store_settings').upsert(settingsData, { onConflict: 'user_id' });

    if (error) {
      console.error(error);
      alert(`Failed to save settings: ${error.message}`);
    } else {
      setFormData(prev => ({...prev, kyc_status: finalStatus}));
      setSuccessMessage(true);
      sendAdminNotification(settingsData); 
      setTimeout(() => setSuccessMessage(false), 3000);
    }
    setSaving(false);
  };

  // --- UI HELPERS ---
  const StatusBanner = () => {
      if (formData.kyc_status === 'Verified') {
          return (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md flex items-center gap-3 mb-6">
                  <ShieldCheck size={20} className="text-emerald-600" />
                  <div>
                      <p className="font-bold text-sm">KYC Verified</p>
                      <p className="text-xs">Your business has been verified by the administration. You have full access to all platform features.</p>
                  </div>
              </div>
          );
      }
      if (formData.kyc_status === 'Rejected') {
          return (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-md flex items-start gap-3 mb-6">
                  <XCircle size={20} className="text-rose-600 mt-0.5" />
                  <div>
                      <p className="font-bold text-sm">KYC Rejected</p>
                      <p className="text-xs mb-1">Your document verification was rejected. Please review the reason below, fix the issue, and resubmit.</p>
                      {formData.rejection_reason && (
                          <p className="text-xs font-medium bg-white px-2 py-1 border border-rose-200 rounded inline-block mt-1 text-rose-700">Reason: {formData.rejection_reason}</p>
                      )}
                  </div>
              </div>
          );
      }
      return (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md flex items-center gap-3 mb-6">
              <Clock size={20} className="text-amber-600" />
              <div>
                  <p className="font-bold text-sm">Pending Verification</p>
                  <p className="text-xs">Your profile and documents are awaiting admin review. This usually takes 1-2 business days.</p>
              </div>
          </div>
      );
  };

  if (loading) return <div className="p-8 text-slate-500 font-light flex items-center gap-2"><Loader2 className="animate-spin text-[#1774b5]" size={20}/> Loading store settings...</div>;

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full px-4 sm:px-6 lg:px-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-6 pt-4 border-b border-slate-200 pb-4 gap-4">
        <div>
          <h1 className="text-lg font-regular tracking-tight text-slate-800">Store Setup & KYC</h1>
        </div>
        <div>
            <span className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded border ${
                formData.kyc_status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                formData.kyc_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {formData.kyc_status === 'Verified' && <ShieldCheck size={14} />}
              {formData.kyc_status === 'Rejected' && <XCircle size={14} />}
              {formData.kyc_status === 'Pending' && <Clock size={14} />}
              Status: {formData.kyc_status}
            </span>
        </div>
      </div>

      <StatusBanner />

      {/* FULL WIDTH, SEAMLESS FORM CONTAINER */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg w-full overflow-hidden">
        <form onSubmit={handleSubmit} className="w-full">
          
          <div className="p-6 md:p-8 space-y-10 w-full">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
              
              {/* --- OWNER DETAILS --- */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                <User size={18} className="text-[#1774b5]" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Owner / Representative Details</h3>
              </div>

              {/* Profile Picture Upload */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col sm:flex-row items-center gap-6 pb-2">
                <div className="w-20 h-20 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden relative">
                  {formData.owner_profile_picture_url ? (
                      <img src={formData.owner_profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                      <User size={32} className="text-slate-300" />
                  )}
                  {uploadingField === 'owner_profile_picture_url' && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-[#1774b5]" size={20} /></div>}
                </div>
                <div className="flex-1 w-full text-center sm:text-left">
                  <h4 className="text-sm font-medium text-slate-800 mb-1">Owner Profile Picture <span className="text-red-500">*</span></h4>
                  <p className="text-xs text-slate-500 mb-3">Upload a clear photo of the business owner or main representative for KYC verification.</p>
                  <div className="relative inline-block">
                    <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileUpload(e, 'owner_profile_picture_url', 'kyc_documents')} disabled={uploadingField !== null} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    <button type="button" className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors pointer-events-none">
                      <Upload size={14} /> {uploadingField === 'owner_profile_picture_url' ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name *</label>
                <input required type="text" value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="John Doe" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Designation / Role</label>
                <input type="text" value={formData.owner_designation} onChange={e => setFormData({...formData, owner_designation: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="CEO / Managing Director" />
              </div>

              {/* --- BUSINESS PROFILE --- */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-4 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Briefcase size={18} className="text-[#1774b5]" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Business Profile</h3>
              </div>

              {/* Logo Upload */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col sm:flex-row items-center gap-6 pb-4">
                <div className="w-24 h-24 border border-slate-200 bg-slate-50 rounded-md flex items-center justify-center shrink-0 overflow-hidden relative">
                  {formData.logo_url ? <img src={formData.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" /> : <ImageIcon size={32} className="text-slate-300" />}
                  {uploadingField === 'logo_url' && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-[#1774b5]" size={20} /></div>}
                </div>
                <div className="flex-1 w-full text-center sm:text-left">
                  <h4 className="text-sm font-medium text-slate-800 mb-1">Company Logo</h4>
                  <p className="text-xs text-slate-500 mb-3">Upload your official logo (JPG or PNG) to display on invoices and your portal.</p>
                  <div className="relative inline-block">
                    <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileUpload(e, 'logo_url', 'store_logos')} disabled={uploadingField !== null} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    <button type="button" className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors pointer-events-none">
                      <Upload size={14} /> {uploadingField === 'logo_url' ? 'Uploading...' : 'Upload Logo'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Registered Store / Company Name *</label>
                <input required type="text" value={formData.store_name} onChange={e => setFormData({...formData, store_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="e.g. Technosoft Nepal" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Primary Industry Category *</label>
                <select required value={formData.industry_category} onChange={e => setFormData({...formData, industry_category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors cursor-pointer">
                    <option value="">Select Category</option>
                    <option value="Electronics & Tech">Electronics & Tech</option>
                    <option value="Fashion & Apparel">Fashion & Apparel</option>
                    <option value="FMCG & Groceries">FMCG & Groceries</option>
                    <option value="Software & IT Services">Software & IT Services</option>
                    <option value="Consulting & Agency">Consulting & Agency</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Business Model</label>
                <select value={formData.business_type} onChange={e => setFormData({...formData, business_type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors cursor-pointer">
                    <option value="Product-Based">Product-Based (Retail/Wholesale)</option>
                    <option value="Service-Based">Service-Based</option>
                    <option value="Hybrid">Hybrid (Both)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Establishment Year</label>
                <input type="number" min="1900" max={new Date().getFullYear()} value={formData.establishment_year} onChange={e => setFormData({...formData, establishment_year: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="e.g. 2018" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Total Employees</label>
                <select value={formData.employee_count} onChange={e => setFormData({...formData, employee_count: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors cursor-pointer">
                    <option value="1-5">1 - 5</option>
                    <option value="6-20">6 - 20</option>
                    <option value="21-50">21 - 50</option>
                    <option value="50+">50+</option>
                </select>
              </div>


              {/* --- CONTACT & LOCATION --- */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-4 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Store size={18} className="text-[#1774b5]" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Contact & Location</h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Business Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="contact@company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Business Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="+977 98..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Street Address</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="123 Main Road" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">City / District</label>
                <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="Kathmandu" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Website Link</label>
                <input type="url" value={formData.website_link} onChange={e => setFormData({...formData, website_link: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="https://www.yourdomain.com" />
              </div>


              {/* --- PAYMENT & BANK DETAILS --- */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-6 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Landmark size={18} className="text-[#1774b5]" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Payment & Bank Details</h3>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Bank Name</label>
                <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="e.g. Nabil Bank" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Name</label>
                <input type="text" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="Technosoft Pvt Ltd" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Number</label>
                <input type="text" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors font-mono" placeholder="0123456789" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Branch / Swift Code</label>
                <input type="text" value={formData.branch_name} onChange={e => setFormData({...formData, branch_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors" placeholder="e.g. Kantipath Branch" />
              </div>
              <div className="lg:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
                    <Wallet size={14} className="text-[#60b52c]" /> eSewa ID / Number
                </label>
                <input type="text" value={formData.esewa_id} onChange={e => setFormData({...formData, esewa_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#60b52c] outline-none transition-colors" placeholder="98XXXXXXXX" />
              </div>


              {/* --- KYC & LEGAL DOCUMENTS --- */}
              <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-6 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#1774b5]" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">KYC & Legal Documents</h3>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4 mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Business PAN / VAT Number *</label>
                <input required type="text" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value})} className="w-full max-w-sm bg-slate-50 border border-slate-200 px-3 py-2 text-sm rounded focus:border-[#1774b5] outline-none transition-colors font-mono" placeholder="123456789" />
              </div>

              {/* File Uploads lined up side by side */}
              <div className="col-span-1 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Company Reg */}
                <div className="border border-slate-200 p-4 rounded-md relative group hover:border-[#1774b5] transition-colors">
                  <h4 className="text-sm font-medium text-slate-800 mb-1 flex items-center gap-1.5"><FileText size={14} className="text-[#1774b5]"/> Company Registration <span className="text-red-500">*</span></h4>
                  <p className="text-[10px] text-slate-500 mb-4">Required (PDF/JPG/PNG)</p>
                  
                  {formData.company_reg_url ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600 font-medium flex items-center gap-1"><Check size={14}/> Uploaded</span>
                      <button type="button" onClick={() => setFormData({...formData, company_reg_url: ''})} className="text-slate-400 hover:text-red-600 transition-colors">Remove</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input type="file" accept=".pdf, image/png, image/jpeg" onChange={(e) => handleFileUpload(e, 'company_reg_url', 'kyc_documents')} disabled={uploadingField !== null} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                      <button type="button" className="w-full flex justify-center items-center gap-2 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs hover:bg-slate-100 transition-colors pointer-events-none">
                        {uploadingField === 'company_reg_url' ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14} />} 
                        {uploadingField === 'company_reg_url' ? 'Uploading...' : 'Choose File'}
                      </button>
                    </div>
                  )}
                </div>

                {/* PAN */}
                <div className="border border-slate-200 p-4 rounded-md relative group hover:border-[#1774b5] transition-colors">
                  <h4 className="text-sm font-medium text-slate-800 mb-1 flex items-center gap-1.5"><FileText size={14} className="text-[#1774b5]"/> PAN Certificate <span className="text-red-500">*</span></h4>
                  <p className="text-[10px] text-slate-500 mb-4">Required (PDF/JPG/PNG)</p>
                  
                  {formData.business_pan_url ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600 font-medium flex items-center gap-1"><Check size={14}/> Uploaded</span>
                      <button type="button" onClick={() => setFormData({...formData, business_pan_url: ''})} className="text-slate-400 hover:text-red-600 transition-colors">Remove</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input type="file" accept=".pdf, image/png, image/jpeg" onChange={(e) => handleFileUpload(e, 'business_pan_url', 'kyc_documents')} disabled={uploadingField !== null} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                      <button type="button" className="w-full flex justify-center items-center gap-2 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs hover:bg-slate-100 transition-colors pointer-events-none">
                        {uploadingField === 'business_pan_url' ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14} />} 
                        {uploadingField === 'business_pan_url' ? 'Uploading...' : 'Choose File'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional Doc */}
                <div className="border border-slate-200 p-4 rounded-md relative group hover:border-[#1774b5] transition-colors">
                  <h4 className="text-sm font-medium text-slate-800 mb-1 flex items-center gap-1.5"><FileText size={14} className="text-slate-400"/> Optional Document</h4>
                  <p className="text-[10px] text-slate-500 mb-4">Citizenship/Passport (PDF/JPG/PNG)</p>
                  
                  {formData.optional_doc_url ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600 font-medium flex items-center gap-1"><Check size={14}/> Uploaded</span>
                      <button type="button" onClick={() => setFormData({...formData, optional_doc_url: ''})} className="text-slate-400 hover:text-red-600 transition-colors">Remove</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input type="file" accept=".pdf, image/png, image/jpeg" onChange={(e) => handleFileUpload(e, 'optional_doc_url', 'kyc_documents')} disabled={uploadingField !== null} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                      <button type="button" className="w-full flex justify-center items-center gap-2 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs hover:bg-slate-100 transition-colors pointer-events-none">
                        {uploadingField === 'optional_doc_url' ? <Loader2 className="animate-spin" size={14}/> : <Upload size={14} />} 
                        {uploadingField === 'optional_doc_url' ? 'Uploading...' : 'Choose File'}
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* FULL WIDTH ACTION FOOTER */}
          <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between w-full">
            <div>
              {successMessage && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 animate-in fade-in duration-300">
                  <Check size={16} /> Data saved & Admin notified.
                </span>
              )}
            </div>
            <button 
              type="submit" 
              disabled={saving || uploadingField !== null}
              className="px-8 py-2.5 bg-[#1774b5] text-white text-sm font-bold rounded hover:bg-[#135d90] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save & Submit KYC'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default StoreSetup;