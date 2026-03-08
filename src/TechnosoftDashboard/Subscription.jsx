import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Package, CheckCircle2, Download, 
  Zap, Users, HardDrive, Shield, AlertCircle, 
  ArrowRight, Clock, Star, XCircle
} from 'lucide-react';

const SubscriptionBilling = () => {
  const [loading, setLoading] = useState(true);
  const [billingHistory, setBillingHistory] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'

  // Simulated Current Plan Data
  const currentPlan = {
      name: 'Professional',
      status: 'Active',
      price: 2999,
      renewalDate: '2026-04-03',
      cardLast4: '4242',
      cardBrand: 'Visa'
  };

  useEffect(() => {
    // Simulate fetching subscription data from Stripe/Paddle or your database
    setTimeout(() => {
      setBillingHistory([
        { id: 'INV-2026-004', date: '2026-03-03', amount: 2999, status: 'Paid', plan: 'Professional Monthly' },
        { id: 'INV-2026-003', date: '2026-02-03', amount: 2999, status: 'Paid', plan: 'Professional Monthly' },
        { id: 'INV-2026-002', date: '2026-01-03', amount: 2999, status: 'Paid', plan: 'Professional Monthly' },
        { id: 'INV-2025-012', date: '2025-12-03', amount: 999, status: 'Paid', plan: 'Starter Monthly' },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const handleUpgrade = (planName) => {
      alert(`Initiating upgrade to ${planName} plan. Redirecting to secure checkout...`);
  };

  const handleCancel = () => {
      if (window.confirm("Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing cycle.")) {
          alert("Cancellation requested. Your account will downgrade to the Free tier on 2026-04-03.");
      }
  };

  const downloadInvoice = (id) => {
      alert(`Downloading receipt for ${id}...`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500 bg-slate-50/50">
        <CreditCard className="animate-pulse text-[#1774b5] mb-4" size={40} />
        <p className="text-base font-medium">Loading subscription details...</p>
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 border-b border-slate-200/80 pb-4 px-4 sm:px-6 lg:px-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-medium tracking-tight text-slate-800 flex items-center gap-2">
                <CreditCard className="text-[#1774b5]" size={22}/> Subscription & Billing
              </h1>
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-emerald-200">Active</span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Manage your plan, usage limits, and payment methods.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">
            Update Payment Method
          </button>
        </div>
      </div>

      {/* TOP PLAN BANNER */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="w-full bg-[#1774b5] text-white p-6 rounded-lg border border-blue-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 text-white rounded-md shrink-0">
              <Star size={24} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-0.5">Current Plan</p>
              <h2 className="text-2xl font-bold text-white leading-tight">{currentPlan.name} Tier</h2>
              <p className="text-blue-100 text-xs mt-1">Rs {currentPlan.price.toLocaleString()} / month</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-blue-900/30 p-4 rounded-md border border-blue-400/20 w-full md:w-auto">
              <div>
                  <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Next Billing Date</p>
                  <p className="text-sm font-medium text-white flex items-center gap-1.5"><Clock size={14}/> {new Date(currentPlan.renewalDate).toLocaleDateString()}</p>
              </div>
              <div className="hidden sm:block w-px h-8 bg-blue-400/30"></div>
              <div>
                  <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Payment Method</p>
                  <p className="text-sm font-medium text-white flex items-center gap-1.5"><CreditCard size={14}/> {currentPlan.cardBrand} ending in {currentPlan.cardLast4}</p>
              </div>
          </div>
        </div>
      </div>

      {/* USAGE METRICS */}
      <div className="px-4 sm:px-6 lg:px-8 mb-8">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Current Cycle Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white border border-slate-200/80 p-5 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Users size={14} className="text-[#1774b5]"/> Staff Accounts</p>
                      <p className="text-xs font-bold text-slate-900">3 / 5</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1774b5] w-[60%]"></div>
                  </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-5 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Package size={14} className="text-[#1774b5]"/> Products Logged</p>
                      <p className="text-xs font-bold text-slate-900">450 / 1000</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1774b5] w-[45%]"></div>
                  </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-5 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><HardDrive size={14} className="text-[#1774b5]"/> Cloud Storage</p>
                      <p className="text-xs font-bold text-slate-900">2.1 GB / 10 GB</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1774b5] w-[21%]"></div>
                  </div>
              </div>

          </div>
      </div>

      {/* PLAN SELECTOR */}
      <div className="px-4 sm:px-6 lg:px-8 mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
              <div>
                  <h3 className="text-lg font-bold text-slate-800">Available Plans</h3>
                  <p className="text-xs text-slate-500 mt-1">Upgrade your plan to unlock more features and higher limits.</p>
              </div>
              <div className="bg-slate-200/50 p-1 rounded-md flex inline-flex shrink-0">
                  <button 
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${billingCycle === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Monthly
                  </button>
                  <button 
                      onClick={() => setBillingCycle('annual')}
                      className={`px-4 py-1.5 text-xs font-bold rounded transition-colors flex items-center gap-1 ${billingCycle === 'annual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      Annual <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">-20%</span>
                  </button>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Starter Plan */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-6 flex flex-col hover:border-blue-200 transition-colors">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-1">Starter</h4>
                  <p className="text-xs text-slate-500 mb-4 h-8">Perfect for small retail shops getting started.</p>
                  <p className="text-3xl font-black text-slate-900 mb-6">
                      Rs {billingCycle === 'monthly' ? '999' : '9,590'} <span className="text-xs font-medium text-slate-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </p>
                  <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/> 1 Staff Account</li>
                      <li className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/> Up to 200 Products</li>
                      <li className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/> Basic Sales Reporting</li>
                      <li className="flex items-start gap-2 text-sm text-slate-400"><XCircle size={16} className="shrink-0 mt-0.5"/> No AI Recommendations</li>
                  </ul>
                  <button onClick={() => handleUpgrade('Starter')} className="w-full py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-md hover:bg-slate-100 transition-colors">
                      Downgrade
                  </button>
              </div>

              {/* Professional Plan (Current) */}
              <div className="bg-blue-50/30 border-2 border-[#1774b5] rounded-lg p-6 flex flex-col relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1774b5] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                      Current Plan
                  </div>
                  <h4 className="text-sm font-bold text-[#1774b5] uppercase tracking-widest mb-1 mt-2">Professional</h4>
                  <p className="text-xs text-slate-500 mb-4 h-8">For growing businesses needing advanced insights.</p>
                  <p className="text-3xl font-black text-slate-900 mb-6">
                      Rs {billingCycle === 'monthly' ? '2,999' : '28,790'} <span className="text-xs font-medium text-slate-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </p>
                  <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-start gap-2 text-sm text-slate-800 font-medium"><CheckCircle2 size={16} className="text-[#1774b5] shrink-0 mt-0.5"/> 5 Staff Accounts</li>
                      <li className="flex items-start gap-2 text-sm text-slate-800 font-medium"><CheckCircle2 size={16} className="text-[#1774b5] shrink-0 mt-0.5"/> Up to 1,000 Products</li>
                      <li className="flex items-start gap-2 text-sm text-slate-800 font-medium"><CheckCircle2 size={16} className="text-[#1774b5] shrink-0 mt-0.5"/> Advanced BI Dashboard</li>
                      <li className="flex items-start gap-2 text-sm text-slate-800 font-medium"><CheckCircle2 size={16} className="text-[#1774b5] shrink-0 mt-0.5"/> 10 GB Cloud Backup</li>
                  </ul>
                  <button disabled className="w-full py-2.5 bg-slate-200 text-slate-500 text-xs font-bold rounded-md cursor-not-allowed">
                      Active Plan
                  </button>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white border border-slate-200/80 rounded-lg p-6 flex flex-col hover:border-blue-200 transition-colors">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-1">Enterprise</h4>
                  <p className="text-xs text-slate-500 mb-4 h-8">Full power and automation for large operations.</p>
                  <p className="text-3xl font-black text-slate-900 mb-6">
                      Rs {billingCycle === 'monthly' ? '7,999' : '76,790'} <span className="text-xs font-medium text-slate-400">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </p>
                  <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/> Unlimited Staff Accounts</li>
                      <li className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/> Unlimited Products</li>
                      <li className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/> Virtual AI COO (Full Suite)</li>
                      <li className="flex items-start gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5"/> Priority 24/7 Support</li>
                  </ul>
                  <button onClick={() => handleUpgrade('Enterprise')} className="w-full py-2.5 bg-[#1774b5] hover:bg-[#135d90] text-white text-xs font-bold rounded-md transition-colors flex justify-center items-center gap-2">
                      Upgrade to Enterprise <ArrowRight size={14}/>
                  </button>
              </div>

          </div>
      </div>

      {/* BILLING HISTORY */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div>
                    <h3 className="font-semibold text-sm text-slate-800">Billing History</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Download past invoices for your tax records.</p>
                </div>
            </div>
            
            <div className="p-0 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-5">Date</th>
                            <th className="py-3 px-5">Invoice ID</th>
                            <th className="py-3 px-5">Plan</th>
                            <th className="py-3 px-5">Amount</th>
                            <th className="py-3 px-5">Status</th>
                            <th className="py-3 px-5 text-right w-32 pr-6">Receipt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {billingHistory.map((invoice, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-4 px-5 text-slate-600 font-medium">
                                    {new Date(invoice.date).toLocaleDateString()}
                                </td>
                                <td className="py-4 px-5">
                                    <span className="font-mono text-xs text-slate-800">{invoice.id}</span>
                                </td>
                                <td className="py-4 px-5">
                                    <p className="font-medium text-slate-700">{invoice.plan}</p>
                                </td>
                                <td className="py-4 px-5">
                                    <p className="font-bold text-slate-900">Rs {invoice.amount.toLocaleString()}</p>
                                </td>
                                <td className="py-4 px-5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-widest border border-emerald-100 rounded">
                                        <CheckCircle2 size={10}/> {invoice.status}
                                    </span>
                                </td>
                                <td className="py-4 px-5 text-right pr-6">
                                    <button 
                                        onClick={() => downloadInvoice(invoice.id)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#1774b5] hover:border-blue-200 text-[10px] font-bold uppercase tracking-widest rounded transition-all w-full"
                                    >
                                        <Download size={12} /> PDF
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button onClick={handleCancel} className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest px-3 py-1.5 rounded hover:bg-rose-50">
                    Cancel Subscription
                </button>
            </div>

        </div>
      </div>

    </div>
  );
};

export default SubscriptionBilling;