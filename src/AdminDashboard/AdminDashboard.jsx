import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, CreditCard, Activity, 
  ArrowUpRight, ArrowDownRight, Server, CheckCircle2,
  Building, AlertTriangle, Zap, DollarSign
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  
  // Simulated SaaS Platform Metrics
  const [metrics, setMetrics] = useState({
      mrr: 145000,          // Monthly Recurring Revenue
      arr: 1740000,         // Annual Recurring Revenue
      activeTenants: 124,   // Number of active businesses
      churnRate: 1.2,       // Percentage of users leaving
      platformProfit: 98000, // Net profit after server costs
      failedPayments: 3     // Users whose cards failed
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    // Simulate loading data from global admin tables
    setTimeout(() => {
        setRecentActivity([
            { id: 1, type: 'signup', user: 'Kathmandu Mart', date: 'Just now', amount: 2999, plan: 'Professional' },
            { id: 2, type: 'payment', user: 'Everest Tech', date: '2 hours ago', amount: 7999, plan: 'Enterprise' },
            { id: 3, type: 'upgrade', user: 'Lalitpur Traders', date: '5 hours ago', amount: 2999, plan: 'Professional' },
            { id: 4, type: 'churn', user: 'Himalayan Coffee', date: '1 day ago', amount: 0, plan: 'Cancelled' },
        ]);

        setChartData({
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            datasets: [{
                label: 'MRR (Rs)',
                data: [95000, 105000, 112000, 128000, 135000, 145000],
                backgroundColor: '#1774b5',
                borderRadius: 4,
                maxBarThickness: 40
            }]
        });

        setLoading(false);
    }, 600);
  }, []);

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500 bg-slate-50/50">
              <Server className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Loading SaaS Platform Metrics...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full h-full bg-slate-50/50 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-6 border-b border-slate-200/80 pb-4 px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Platform Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Global metrics across all tenants and subscriptions.</p>
        </div>
        <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-50 transition-colors">
              Platform Settings
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1774b5] text-white text-xs font-bold hover:bg-[#135d90] transition-colors rounded-md">
              <Zap size={14} /> Add Tenant Manually
            </button>
        </div>
      </div>

      <div className="px-6 lg:px-8 max-w-[1600px]">
          
          {/* PRIMARY KPI GRID (SaaS Core Metrics) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
              <div className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monthly Recurring Rev (MRR)</p>
                      <div className="p-1.5 bg-blue-50 text-[#1774b5] rounded"><TrendingUp size={16}/></div>
                  </div>
                  <p className="text-3xl font-black text-slate-800">Rs {metrics.mrr.toLocaleString()}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <ArrowUpRight size={14}/> +7.4% <span className="text-slate-400 font-medium">vs last month</span>
                  </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Annual Run Rate (ARR)</p>
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded"><DollarSign size={16}/></div>
                  </div>
                  <p className="text-3xl font-black text-slate-800">Rs {metrics.arr.toLocaleString()}</p>
                  <p className="mt-3 text-xs font-medium text-slate-500">Projected yearly revenue</p>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Tenants</p>
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded"><Building size={16}/></div>
                  </div>
                  <p className="text-3xl font-black text-slate-800">{metrics.activeTenants}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <ArrowUpRight size={14}/> +12 <span className="text-slate-400 font-medium">new this month</span>
                  </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">User Churn Rate</p>
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded"><Users size={16}/></div>
                  </div>
                  <p className="text-3xl font-black text-slate-800">{metrics.churnRate}%</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <ArrowDownRight size={14}/> -0.3% <span className="text-slate-400 font-medium">improvement</span>
                  </div>
              </div>
          </div>

          {/* SECONDARY HEALTH METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center justify-between">
                  <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Net Platform Profit</p>
                      <p className="text-xl font-bold text-emerald-600">Rs {metrics.platformProfit.toLocaleString()}</p>
                  </div>
                  <Activity size={28} className="text-emerald-200" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-lg flex items-center justify-between">
                  <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Database Health</p>
                      <p className="text-xl font-bold text-[#1774b5]">Operational</p>
                  </div>
                  <Server size={28} className="text-blue-200" />
              </div>
              <div className={`border p-4 rounded-lg flex items-center justify-between ${metrics.failedPayments > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                  <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${metrics.failedPayments > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Failed Payments</p>
                      <p className={`text-xl font-bold ${metrics.failedPayments > 0 ? 'text-rose-700' : 'text-slate-800'}`}>{metrics.failedPayments} Action Required</p>
                  </div>
                  <AlertTriangle size={28} className={metrics.failedPayments > 0 ? 'text-rose-300' : 'text-slate-200'} />
              </div>
          </div>

          {/* BOTTOM SECTION: CHARTS & ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* MRR Chart */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg flex flex-col h-[420px]">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-[#1774b5]"/> MRR Growth (6 Months)</h3>
                  </div>
                  <div className="p-5 flex-1 w-full relative">
                      {chartData && <Bar 
                          data={chartData} 
                          options={{ 
                              responsive: true, maintainAspectRatio: false, 
                              plugins: { legend: { display: false }, tooltip: { padding: 12, bodyFont: {size: 13} } }, 
                              scales: { 
                                  x: { grid: { display: false, drawBorder: false }, ticks: { font: {size: 12}, color: '#64748b'} }, 
                                  y: { grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: {size: 12}, color: '#64748b', callback: (val) => val >= 1000 ? (val/1000)+'k' : val }, beginAtZero: true } 
                              } 
                          }} 
                      />}
                  </div>
              </div>

              {/* Global Feed */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-lg flex flex-col h-[420px]">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">Live Tenant Activity</h3>
                  </div>
                  <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="divide-y divide-slate-100">
                          {recentActivity.map((act) => (
                              <div key={act.id} className="p-5 hover:bg-slate-50/80 transition-colors">
                                  <div className="flex justify-between items-start mb-1">
                                      <p className="text-sm font-bold text-slate-800">{act.user}</p>
                                      <span className="text-[10px] text-slate-400 font-medium">{act.date}</span>
                                  </div>
                                  <div className="flex justify-between items-center mt-2">
                                      <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border ${
                                          act.type === 'signup' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          act.type === 'upgrade' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          act.type === 'payment' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                          'bg-rose-50 text-rose-700 border-rose-200'
                                      }`}>
                                          {act.type}
                                      </span>
                                      {act.amount > 0 && <span className="text-xs font-bold text-slate-700">+ Rs {act.amount}</span>}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default AdminDashboard;