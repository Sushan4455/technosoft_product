import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase'; 
import { 
  CreditCard, CheckCircle, AlertTriangle, Lock, ShieldCheck, Loader2,
  Landmark, Wallet, Copy, Check
} from 'lucide-react';

const Checkout = () => {
  const { hash } = useParams();
  
  const [paymentData, setPaymentData] = useState(null);
  const [merchantData, setMerchantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  useEffect(() => {
    const fetchCheckoutDetails = async () => {
      try {
        // 1. Fetch Payment Link Details
        const { data: linkData, error: linkError } = await supabase
          .from('payment_links')
          .select('*')
          .eq('link_hash', hash)
          .single();

        if (linkError || !linkData) throw new Error("We couldn't find this payment link.");
        
        // Check if expired
        if (new Date(linkData.expires_at) < new Date() && linkData.status === 'Active') {
           throw new Error("This payment link has expired.");
        }

        setPaymentData(linkData);

        // 2. Fetch Merchant Store Settings (for Bank/eSewa info and Logo)
        if (linkData.user_id) {
          const { data: storeData } = await supabase
            .from('store_settings')
            .select('*')
            .eq('user_id', linkData.user_id)
            .single();
            
          if (storeData) setMerchantData(storeData);
        }

      } catch (err) {
        setError(err.message || "Invalid payment link.");
      } finally {
        setLoading(false);
      }
    };

    if (hash) fetchCheckoutDetails();
  }, [hash]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Simulate a payment gateway / marking as paid
  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      const { error } = await supabase.from('payment_links').update({ status: 'Paid' }).eq('link_hash', hash);
      if (error) throw error;
      
      setPaymentData({...paymentData, status: 'Paid'});
      setPaymentSuccess(true);
    } catch (err) {
      alert("Failed to update status. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 1. Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans text-[#1774b5]">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-medium">Loading secure checkout...</p>
      </div>
    );
  }

  // --- 2. Error / Expired State ---
  if (error || (paymentData && paymentData.status === 'Revoked')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center border border-slate-200">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Link Unavailable</h2>
          <p className="text-slate-600 mb-6">{error || "This payment link has been revoked by the merchant."}</p>
          <p className="text-sm text-slate-400">Please contact the merchant for a new link.</p>
        </div>
      </div>
    );
  }

  // --- 3. Success State ---
  if (paymentSuccess || paymentData?.status === 'Paid') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center border border-slate-200">
          <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
          <p className="text-slate-600 mb-6">Thank you, {paymentData.customer_name}. The payment of {paymentData.currency} {Number(paymentData.amount).toLocaleString()} has been marked as completed.</p>
          <div className="bg-slate-50 rounded p-4 text-sm text-slate-500 border border-slate-100">
            <p>Receipt ID: {paymentData.link_hash}</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    );
  }

  // --- 4. Active Checkout State ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-10 px-4 font-sans">
      
      {/* Brand Header */}
      <div className="mb-8 text-center">
        {merchantData?.logo_url ? (
          <img src={merchantData.logo_url} alt="Store Logo" className="h-16 object-contain mx-auto mb-3 drop-shadow-sm rounded-md" />
        ) : (
          <div className="w-16 h-16 bg-[#1774b5] text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <ShieldCheck size={32} />
          </div>
        )}
        <h1 className="text-xl font-bold text-slate-900">{merchantData?.store_name || "Technosoft International"}</h1>
        <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-1">
          <Lock size={12} /> Secure Checkout
        </p>
      </div>

      {/* Checkout Card */}
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        
        {/* Amount Banner */}
        <div className="p-6 md:p-8 bg-slate-900 text-white text-center">
          <p className="text-slate-400 text-sm mb-1 uppercase tracking-widest font-semibold">Amount Due</p>
          <h2 className="text-4xl font-black flex items-center justify-center gap-2">
            <span className="text-xl text-slate-400 font-medium">{paymentData.currency}</span> 
            {Number(paymentData.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
          </h2>
        </div>

        <div className="p-6 md:p-8">
          {/* Bill Details */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500 text-sm">Billed To</span>
              <span className="font-semibold text-slate-900 text-sm text-right">{paymentData.customer_name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500 text-sm">Description</span>
              <span className="font-semibold text-slate-900 text-sm text-right max-w-[200px] truncate" title={paymentData.description}>
                {paymentData.description}
              </span>
            </div>
          </div>

          {/* --- MERCHANT PAYMENT DETAILS --- */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Options</h3>
            
            <div className="space-y-3">
              
              {/* Bank Details */}
              {merchantData?.bank_name && merchantData?.account_number && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 border-b border-blue-100 pb-2">
                    <Landmark size={16} className="text-[#1774b5]" />
                    <span className="font-semibold text-slate-800 text-sm">Bank Transfer</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <p className="flex justify-between"><span className="text-slate-500">Bank:</span> <span className="font-medium text-slate-900">{merchantData.bank_name}</span></p>
                    <p className="flex justify-between"><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900">{merchantData.account_name}</span></p>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">A/C No:</span> 
                      <button onClick={() => handleCopy(merchantData.account_number)} className="flex items-center gap-1.5 font-mono font-bold text-[#1774b5] hover:bg-blue-100 px-2 py-0.5 rounded transition-colors">
                        {merchantData.account_number}
                        {copiedText === merchantData.account_number ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
                      </button>
                    </div>
                    {merchantData.branch_name && <p className="flex justify-between"><span className="text-slate-500">Branch:</span> <span className="font-medium text-slate-900">{merchantData.branch_name}</span></p>}
                  </div>
                </div>
              )}

              {/* eSewa Details */}
              {merchantData?.esewa_id && (
                <div className="bg-green-50/50 border border-green-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3 border-b border-green-100 pb-2">
                    <Wallet size={16} className="text-[#60b52c]" />
                    <span className="font-semibold text-slate-800 text-sm">eSewa Transfer</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">eSewa ID:</span> 
                    <button onClick={() => handleCopy(merchantData.esewa_id)} className="flex items-center gap-1.5 font-mono font-bold text-[#60b52c] hover:bg-green-100 px-2 py-0.5 rounded transition-colors">
                      {merchantData.esewa_id}
                      {copiedText === merchantData.esewa_id ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>
              )}

              {/* Fallback if no payment details are set up */}
              {(!merchantData?.bank_name && !merchantData?.esewa_id) && (
                <p className="text-sm text-slate-500 text-center py-2 italic border border-dashed border-slate-200 rounded">
                  No manual payment instructions provided by the merchant.
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-[#1774b5] text-white text-base font-bold rounded-lg hover:bg-[#135d90] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
            {isProcessing ? 'Updating...' : 'I have completed the payment'}
          </button>
          
          <p className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
            <Lock size={10} /> Verify account details carefully before transferring.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Checkout;