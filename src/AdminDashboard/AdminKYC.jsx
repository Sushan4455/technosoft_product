import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  ShieldCheck, Search, Clock, XCircle, Eye, 
  Check, X, FileText, User, Building, AlertTriangle, 
  ExternalLink, Loader2
} from 'lucide-react';

const AdminKYC = () => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('Pending'); // 'All', 'Pending', 'Verified', 'Rejected'
  
  // Review Modal States
  const [selectedApp, setSelectedApp] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase.rpc('admin_get_kyc_applications');
        if (error) throw error;
        setApplications(data || []);
    } catch (error) {
        console.error("KYC Fetch Error:", error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleApprove = async () => {
      if (!window.confirm("Approve this KYC application? They will gain full platform access.")) return;
      
      setProcessing(true);
      try {
          const { error } = await supabase.rpc('admin_update_kyc_status', {
              target_user_id: selectedApp.user_id,
              new_status: 'Verified',
              new_reason: null
          });
          
          if (error) throw error;
          
          alert("KYC Approved successfully!");
          setIsReviewOpen(false);
          fetchApplications();
      } catch (error) {
          alert(`Error approving KYC: ${error.message}`);
      } finally {
          setProcessing(false);
      }
  };

  const handleReject = async () => {
      if (!rejectionReason.trim()) return alert("Please provide a reason for rejection.");
      
      setProcessing(true);
      try {
          const { error } = await supabase.rpc('admin_update_kyc_status', {
              target_user_id: selectedApp.user_id,
              new_status: 'Rejected',
              new_reason: rejectionReason
          });
          
          if (error) throw error;
          
          alert("KYC Rejected. The user will be notified to upload new documents.");
          setIsRejecting(false);
          setRejectionReason('');
          setIsReviewOpen(false);
          fetchApplications();
      } catch (error) {
          alert(`Error rejecting KYC: ${error.message}`);
      } finally {
          setProcessing(false);
      }
  };

  const filteredApps = applications.filter(app => {
      const matchesSearch = (app.store_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (app.pan_number || '').includes(searchTerm);
      const matchesFilter = filter === 'All' || app.kyc_status === filter;
      return matchesSearch && matchesFilter;
  });

  const pendingCount = applications.filter(a => a.kyc_status === 'Pending').length;

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500 bg-slate-50/50">
              <ShieldCheck className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Loading KYC Applications...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-6 border-b border-slate-200/80 pb-4 px-6 lg:px-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">KYC Verification</h1>
              {pendingCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-amber-200">
                      {pendingCount} Pending
                  </span>
              )}
          </div>
          <p className="text-slate-500 text-sm mt-1">Review business documents, approve accounts, and ensure compliance.</p>
        </div>
      </div>

      <div className="px-6 lg:px-8 max-w-[1600px]">

          {/* CONTROLS */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                  {['Pending', 'Verified', 'Rejected', 'All'].map(f => (
                      <button 
                          key={f}
                          onClick={() => setFilter(f)}
                          className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                              filter === f 
                              ? 'bg-slate-800 text-white shadow-sm' 
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                      >
                          {f}
                      </button>
                  ))}
              </div>
              <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      type="text" placeholder="Search by store name or PAN..." 
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-[#1774b5]" 
                  />
              </div>
          </div>

          {/* KYC TABLE */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-4 px-6">Business / Owner</th>
                              <th className="py-4 px-6">PAN Number</th>
                              <th className="py-4 px-6">Docs Submitted</th>
                              <th className="py-4 px-6">Status</th>
                              <th className="py-4 px-6 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredApps.length === 0 ? (
                              <tr>
                                  <td colSpan="5" className="p-10 text-center text-slate-400">
                                      <ShieldCheck size={32} className="mx-auto mb-3 text-slate-300"/>
                                      <p>No KYC applications found in this category.</p>
                                  </td>
                              </tr>
                          ) : (
                              filteredApps.map((app) => (
                                  <tr key={app.user_id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="py-4 px-6">
                                          <p className="font-bold text-slate-800">{app.store_name || 'Unnamed Store'}</p>
                                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><User size={12}/> {app.owner_name || app.email}</p>
                                      </td>
                                      <td className="py-4 px-6">
                                          <span className="font-mono text-sm font-semibold text-slate-700">{app.pan_number || 'N/A'}</span>
                                      </td>
                                      <td className="py-4 px-6">
                                          <div className="flex gap-2">
                                              {app.company_reg_url && <FileText size={16} className="text-[#1774b5]" title="Company Reg"/>}
                                              {app.business_pan_url && <FileText size={16} className="text-emerald-600" title="PAN Doc"/>}
                                              {app.owner_profile_picture_url && <User size={16} className="text-slate-600" title="Profile Pic"/>}
                                          </div>
                                      </td>
                                      <td className="py-4 px-6">
                                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${
                                              app.kyc_status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                              app.kyc_status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                              'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}>
                                              {app.kyc_status === 'Verified' && <Check size={12} />}
                                              {app.kyc_status === 'Rejected' && <X size={12} />}
                                              {app.kyc_status === 'Pending' && <Clock size={12} />}
                                              {app.kyc_status}
                                          </span>
                                      </td>
                                      <td className="py-4 px-6 text-right">
                                          <button 
                                              onClick={() => { setSelectedApp(app); setIsRejecting(false); setIsReviewOpen(true); }}
                                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-[#1774b5] hover:bg-blue-50 text-xs font-bold rounded shadow-sm transition-colors"
                                          >
                                              <Eye size={14} /> Review
                                          </button>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- KYC REVIEW MODAL --- */}
      {isReviewOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-[#1774b5]" />
                    <h2 className="text-lg font-bold text-slate-800">KYC Review: {selectedApp.store_name}</h2>
                </div>
                <button onClick={() => setIsReviewOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white p-1 rounded-md border border-slate-200 shadow-sm"><X size={18}/></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                
                {/* Left Side: Data Panel */}
                <div className="w-full lg:w-1/3 bg-slate-50/50 border-r border-slate-200 p-6 overflow-y-auto custom-scrollbar">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Application Details</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Owner Name</p>
                            <p className="font-semibold text-slate-800">{selectedApp.owner_name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Business PAN</p>
                            <p className="font-mono font-bold text-lg text-slate-900 bg-white border border-slate-200 p-2 rounded mt-1 inline-block">{selectedApp.pan_number || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Contact Email</p>
                            <p className="font-medium text-slate-700">{selectedApp.email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Contact Phone</p>
                            <p className="font-medium text-slate-700">{selectedApp.phone || 'N/A'}</p>
                        </div>
                        
                        {selectedApp.kyc_status === 'Rejected' && (
                            <div className="bg-rose-50 border border-rose-200 p-3 rounded mt-4">
                                <p className="text-[10px] text-rose-600 uppercase tracking-widest font-bold mb-1">Previous Rejection Reason</p>
                                <p className="text-xs font-medium text-rose-800">{selectedApp.rejection_reason}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Document Viewer */}
                <div className="w-full lg:w-2/3 p-6 overflow-y-auto custom-scrollbar bg-slate-100/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Submitted Documents</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Profile Picture */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><User size={14} className="text-[#1774b5]"/> Owner Photo</p>
                                {selectedApp.owner_profile_picture_url && <a href={selectedApp.owner_profile_picture_url} target="_blank" rel="noreferrer" className="text-[#1774b5] hover:underline text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">Open <ExternalLink size={10}/></a>}
                            </div>
                            <div className="h-40 bg-slate-50 rounded border border-slate-100 flex items-center justify-center overflow-hidden">
                                {selectedApp.owner_profile_picture_url ? (
                                    <img src={selectedApp.owner_profile_picture_url} alt="Profile" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <p className="text-xs text-slate-400">Not Uploaded</p>
                                )}
                            </div>
                        </div>

                        {/* PAN Document */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><FileText size={14} className="text-emerald-600"/> PAN Certificate</p>
                                {selectedApp.business_pan_url && <a href={selectedApp.business_pan_url} target="_blank" rel="noreferrer" className="text-[#1774b5] hover:underline text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">Open <ExternalLink size={10}/></a>}
                            </div>
                            <div className="h-40 bg-slate-50 rounded border border-slate-100 flex items-center justify-center overflow-hidden p-2">
                                {selectedApp.business_pan_url ? (
                                    selectedApp.business_pan_url.toLowerCase().endsWith('.pdf') ? 
                                    <div className="text-center"><FileText size={32} className="mx-auto text-emerald-500 mb-2"/><p className="text-xs font-bold">PDF Document</p></div> :
                                    <img src={selectedApp.business_pan_url} alt="PAN" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <p className="text-xs text-slate-400">Not Uploaded</p>
                                )}
                            </div>
                        </div>

                        {/* Company Registration */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm md:col-span-2">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Building size={14} className="text-[#1774b5]"/> Company Registration</p>
                                {selectedApp.company_reg_url && <a href={selectedApp.company_reg_url} target="_blank" rel="noreferrer" className="text-[#1774b5] hover:underline text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">Open Full Size <ExternalLink size={10}/></a>}
                            </div>
                            <div className="h-64 bg-slate-50 rounded border border-slate-100 flex items-center justify-center overflow-hidden p-2">
                                {selectedApp.company_reg_url ? (
                                    selectedApp.company_reg_url.toLowerCase().endsWith('.pdf') ? 
                                    <iframe src={selectedApp.company_reg_url} className="w-full h-full rounded" title="Company Reg PDF"></iframe> :
                                    <img src={selectedApp.company_reg_url} alt="Company Reg" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <p className="text-xs text-slate-400">Not Uploaded</p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

            </div>
            
            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-200 bg-white shrink-0">
                {isRejecting ? (
                    <div className="flex items-center gap-3 w-full bg-rose-50 p-3 rounded-lg border border-rose-200">
                        <input 
                            type="text" 
                            placeholder="Reason for rejection (e.g. Blurry PAN image)..." 
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="flex-1 bg-white border border-rose-300 py-2 px-3 text-sm rounded outline-none focus:border-rose-500"
                        />
                        <button onClick={() => setIsRejecting(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                        <button onClick={handleReject} disabled={processing} className="px-6 py-2 bg-rose-600 text-white text-xs font-bold rounded shadow-sm hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2">
                            {processing ? <Loader2 size={14} className="animate-spin"/> : <XCircle size={14}/>} Confirm Rejection
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-between items-center w-full">
                        {selectedApp.kyc_status === 'Pending' ? (
                            <p className="text-xs font-medium text-slate-500 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-500"/> Please verify all documents match the PAN provided.</p>
                        ) : (
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Status: {selectedApp.kyc_status}</p>
                        )}
                        <div className="flex gap-3">
                            {selectedApp.kyc_status !== 'Verified' && (
                                <button onClick={() => setIsRejecting(true)} className="px-6 py-2.5 bg-white border border-rose-200 text-rose-600 text-xs font-bold rounded hover:bg-rose-50 transition-colors">
                                    Reject Application
                                </button>
                            )}
                            <button onClick={handleApprove} disabled={processing || selectedApp.kyc_status === 'Verified'} className="px-8 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                {processing ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} 
                                {selectedApp.kyc_status === 'Verified' ? 'Already Verified' : 'Approve KYC'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminKYC;