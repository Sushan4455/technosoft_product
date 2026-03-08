import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Users, PieChart, TrendingUp, AlertTriangle, 
  Clock, ShieldAlert, Award, Filter, Download, Info, Heart
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const CustomerSegments = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [segmentStats, setSegmentStats] = useState({});
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [systemInsight, setSystemInsight] = useState("");

  useEffect(() => {
    fetchAndAnalyzeData();
  }, []);

  const fetchAndAnalyzeData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Fetch base customers
    const { data: custData } = await supabase.from('customers').select('*').eq('user_id', session.user.id);
    // Fetch all orders to analyze purchasing behavior
    const { data: orderData } = await supabase.from('orders').select('customer_name, amount, created_at, status').eq('user_id', session.user.id).neq('status', 'Cancelled');

    if (!custData) {
        setLoading(false);
        return;
    }

    // 1. Group Orders by Customer Name (Case Insensitive)
    const customerPurchases = {};
    if (orderData) {
        orderData.forEach(order => {
            const name = order.customer_name?.toLowerCase().trim();
            if (!name) return;
            
            if (!customerPurchases[name]) {
                customerPurchases[name] = { totalSpent: 0, orderCount: 0, lastOrderDate: new Date(0) };
            }
            customerPurchases[name].totalSpent += Number(order.amount);
            customerPurchases[name].orderCount += 1;
            
            const orderDate = new Date(order.created_at);
            if (orderDate > customerPurchases[name].lastOrderDate) {
                customerPurchases[name].lastOrderDate = orderDate;
            }
        });
    }

    const now = new Date();
    const processedCustomers = [];
    const stats = { 'VIP Champions': 0, 'Loyal Regulars': 0, 'Recent Buyers': 0, 'At Risk (Sleeping)': 0, 'High Debt Risk': 0, 'Inactive / No Data': 0 };

    // 2. RFM & Risk Segmentation Engine
    custData.forEach(customer => {
        const nameKey = customer.name.toLowerCase().trim();
        const purchaseData = customerPurchases[nameKey] || { totalSpent: 0, orderCount: 0, lastOrderDate: null };
        
        const limit = Number(customer.credit_limit) || 0;
        const debt = Number(customer.outstanding_balance) || 0;
        const debtRatio = limit > 0 ? (debt / limit) : 0;
        
        const daysSinceLastOrder = purchaseData.lastOrderDate 
            ? Math.floor((now - purchaseData.lastOrderDate) / (1000 * 60 * 60 * 24)) 
            : 999;

        let segment = 'Inactive / No Data';
        let segmentColor = 'bg-slate-50 text-slate-600 border-slate-200';

        // Categorization Logic (Priority Based)
        if (debt > 0 && debtRatio >= 0.8) {
            segment = 'High Debt Risk';
            segmentColor = 'bg-rose-50 text-rose-700 border-rose-200';
        } else if (purchaseData.orderCount >= 3 && purchaseData.totalSpent > 10000 && daysSinceLastOrder <= 30) {
            segment = 'VIP Champions';
            segmentColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
        } else if (purchaseData.orderCount > 1 && daysSinceLastOrder <= 60) {
            segment = 'Loyal Regulars';
            segmentColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (purchaseData.orderCount === 1 && daysSinceLastOrder <= 30) {
            segment = 'Recent Buyers';
            segmentColor = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (purchaseData.orderCount > 0 && daysSinceLastOrder > 60) {
            segment = 'At Risk (Sleeping)';
            segmentColor = 'bg-amber-50 text-amber-700 border-amber-200';
        }

        stats[segment] += 1;

        processedCustomers.push({
            ...customer,
            ...purchaseData,
            daysSinceLastOrder,
            segment,
            segmentColor
        });
    });

    // Generate System Insight
    if (stats['High Debt Risk'] > 3) {
        setSystemInsight(`Critical Warning: You have ${stats['High Debt Risk']} customers near their maximum credit limit. Focus on debt collection before approving new orders.`);
    } else if (stats['At Risk (Sleeping)'] > stats['VIP Champions']) {
        setSystemInsight(`Retention Alert: More customers are sleeping than actively buying. Consider running a targeted re-engagement campaign for the "At Risk" segment.`);
    } else {
        setSystemInsight(`Healthy Distribution. Your VIP and Regular clients are driving stable revenue. Look for cross-selling opportunities for your "Recent Buyers".`);
    }

    setSegmentStats(stats);
    setCustomers(processedCustomers.sort((a, b) => b.totalSpent - a.totalSpent));
    setLoading(false);
  };

  const chartData = {
    labels: ['VIP Champions', 'Loyal Regulars', 'Recent Buyers', 'At Risk', 'High Debt Risk'],
    datasets: [
      {
        data: [
            segmentStats['VIP Champions'], 
            segmentStats['Loyal Regulars'], 
            segmentStats['Recent Buyers'], 
            segmentStats['At Risk (Sleeping)'], 
            segmentStats['High Debt Risk']
        ],
        backgroundColor: [
            '#4f46e5', // Indigo (VIP)
            '#10b981', // Emerald (Loyal)
            '#3b82f6', // Blue (Recent)
            '#f59e0b', // Amber (At Risk)
            '#f43f5e'  // Rose (Debt)
        ],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
          legend: { position: 'right', labels: { usePointStyle: true, padding: 15, font: { family: 'Inter, sans-serif', size: 11 } } }
      }
  };

  const filteredCustomers = activeFilter === 'All' ? customers : customers.filter(c => c.segment === activeFilter);

  const exportToCSV = () => {
    if (filteredCustomers.length === 0) return;
    const headers = ["Customer Name", "Company", "Segment", "Total Spent", "Orders", "Last Order (Days Ago)", "Outstanding Debt"];
    const csvRows = [headers.join(',')];
    
    filteredCustomers.forEach(c => {
      csvRows.push(`"${c.name}","${c.company_name || ''}",${c.segment},${c.totalSpent},${c.orderCount},${c.daysSinceLastOrder === 999 ? 'N/A' : c.daysSinceLastOrder},${c.outstanding_balance || 0}`);
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Customer_Segments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <PieChart className="animate-pulse text-[#1774b5] mb-4" size={48} />
              <p className="font-medium text-lg">Loading segmentation data...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">


      {/* SYSTEM INSIGHT BANNER (Flat UI matching Revenue Forecast) */}
      <div className="mb-6 p-4 mt-10 rounded-sm border flex items-start gap-3 bg-blue-50 border-blue-200 text-[#1774b5]">
          <Info size={18} className="shrink-0 mt-0.5" />
          <div>
              <p className="text-sm font-bold mb-0.5">System Insight</p>
              <p className="text-xs leading-relaxed text-slate-700 font-medium">{systemInsight}</p>
          </div>
      </div>

      {/* TOP DASHBOARD (Chart & Filter Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          
          {/* Chart Widget */}
          <div className="lg:col-span-1 bg-white p-5 rounded-sm border border-slate-200 flex flex-col h-[280px]">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Audience Distribution</h3>
              <div className="flex-1 relative flex justify-center items-center pb-2">
                  {customers.length === 0 ? (
                      <p className="text-slate-400 text-sm">No customer data available.</p>
                  ) : (
                      <Doughnut data={chartData} options={chartOptions} />
                  )}
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-32">
                      <p className="text-3xl font-black text-slate-800">{customers.length}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                  </div>
              </div>
          </div>

          {/* Quick Filter Cards (Strictly Flat & Uniform) */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
              
              <button 
                  onClick={() => setActiveFilter('All')} 
                  className={`p-4 rounded-sm border relative overflow-hidden text-left transition-colors ${activeFilter === 'All' ? 'bg-slate-50 border-slate-400' : 'bg-white border-slate-200 hover:border-slate-300'}`}
              >
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Users size={12}/> All Customers</p>
                  <p className="text-2xl font-black text-slate-800">{customers.length}</p>
              </button>

              <button 
                  onClick={() => setActiveFilter('VIP Champions')} 
                  className={`p-4 rounded-sm border relative overflow-hidden text-left transition-colors ${activeFilter === 'VIP Champions' ? 'bg-indigo-50/50 border-indigo-400' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
              >
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Award size={12} className="text-indigo-500"/> VIP Champions</p>
                  <p className="text-2xl font-black text-slate-800">{segmentStats['VIP Champions'] || 0}</p>
              </button>

              <button 
                  onClick={() => setActiveFilter('Loyal Regulars')} 
                  className={`p-4 rounded-sm border relative overflow-hidden text-left transition-colors ${activeFilter === 'Loyal Regulars' ? 'bg-emerald-50/50 border-emerald-400' : 'bg-white border-slate-200 hover:border-emerald-200'}`}
              >
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Heart size={12} className="text-emerald-500"/> Loyal Regulars</p>
                  <p className="text-2xl font-black text-slate-800">{segmentStats['Loyal Regulars'] || 0}</p>
              </button>

              <button 
                  onClick={() => setActiveFilter('Recent Buyers')} 
                  className={`p-4 rounded-sm border relative overflow-hidden text-left transition-colors ${activeFilter === 'Recent Buyers' ? 'bg-blue-50/50 border-blue-400' : 'bg-white border-slate-200 hover:border-blue-200'}`}
              >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1.5"><TrendingUp size={12} className="text-blue-500"/> Recent Buyers</p>
                  <p className="text-2xl font-black text-slate-800">{segmentStats['Recent Buyers'] || 0}</p>
              </button>

              <button 
                  onClick={() => setActiveFilter('At Risk (Sleeping)')} 
                  className={`p-4 rounded-sm border relative overflow-hidden text-left transition-colors ${activeFilter === 'At Risk (Sleeping)' ? 'bg-amber-50/50 border-amber-400' : 'bg-white border-slate-200 hover:border-amber-200'}`}
              >
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1.5"><Clock size={12} className="text-amber-500"/> At Risk (Sleeping)</p>
                  <p className="text-2xl font-black text-slate-800">{segmentStats['At Risk (Sleeping)'] || 0}</p>
              </button>

              <button 
                  onClick={() => setActiveFilter('High Debt Risk')} 
                  className={`p-4 rounded-sm border relative overflow-hidden text-left transition-colors ${activeFilter === 'High Debt Risk' ? 'bg-rose-50/50 border-rose-400' : 'bg-white border-slate-200 hover:border-rose-200'}`}
              >
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 flex items-center gap-1.5"><ShieldAlert size={12} className="text-rose-500"/> High Debt Risk</p>
                  <p className="text-2xl font-black text-slate-800">{segmentStats['High Debt Risk'] || 0}</p>
              </button>

          </div>
      </div>

      {/* DATA TABLE (Flat, Clean) */}
      <div className="bg-white border border-slate-200 rounded-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Filter size={16} className="text-slate-400"/> 
                  {activeFilter === 'All' ? 'All Segmented Customers' : `${activeFilter} Segment`}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-200/50 border border-slate-200 px-2 py-1 rounded-sm">{filteredCustomers.length} Records</span>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-white border-b border-slate-200">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-6">Customer Profile</th>
                          <th className="py-3 px-6">Segment</th>
                          <th className="py-3 px-6 text-right">Lifetime Spend</th>
                          <th className="py-3 px-6 text-center">Total Orders</th>
                          <th className="py-3 px-6 text-right">Recency</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-slate-400">No customers found in this segment.</td></tr>
                      ) : (
                          filteredCustomers.map(c => (
                              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-6">
                                      <p className="font-semibold text-slate-800">{c.name}</p>
                                      {c.company_name && <p className="text-[11px] text-slate-500 mt-0.5">{c.company_name}</p>}
                                  </td>
                                  <td className="py-3 px-6">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest border ${c.segmentColor}`}>
                                          {c.segment}
                                      </span>
                                  </td>
                                  <td className="py-3 px-6 text-right">
                                      <p className="font-bold text-slate-800">Rs {c.totalSpent.toLocaleString()}</p>
                                      {Number(c.outstanding_balance) > 0 && (
                                          <p className="text-[10px] text-rose-500 font-medium mt-1 flex items-center justify-end gap-1"><AlertTriangle size={10}/> Due: Rs {Number(c.outstanding_balance).toLocaleString()}</p>
                                      )}
                                  </td>
                                  <td className="py-3 px-6 text-center">
                                      <p className="font-medium text-slate-600">{c.orderCount}</p>
                                  </td>
                                  <td className="py-3 px-6 text-right">
                                      {c.daysSinceLastOrder === 999 ? (
                                          <span className="text-[11px] text-slate-400">No purchases</span>
                                      ) : (
                                          <p className="text-[11px] font-medium text-slate-600">{c.daysSinceLastOrder} days ago</p>
                                      )}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default CustomerSegments;