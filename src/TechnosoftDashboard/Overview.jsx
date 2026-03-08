import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  TrendingUp, DollarSign, Users, 
  Package, AlertTriangle, Activity, 
  CreditCard, Wallet, ArrowUpRight, ArrowDownRight,
  BrainCircuit, Sparkles, Clock, Receipt, LayoutDashboard
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const ExecutiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  
  // Master Metrics State
  const [metrics, setMetrics] = useState({
      totalRevenue: 0,
      totalExpenses: 0,
      netCashFlow: 0,
      receivables: 0,
      liquidCash: 0,
      activeCustomers: 0,
      inventoryValue: 0,
      lowStockCount: 0,
      momGrowth: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [aiInsight, setAiInsight] = useState("");

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
        // Fetch from Core Tables Concurrently for speed
        const [
            { data: orders },
            { data: expenses },
            { data: products },
            { data: customers },
            { data: accounts }
        ] = await Promise.all([
            supabase.from('orders').select('id, amount, created_at, status, customer_name').eq('user_id', session.user.id).neq('status', 'Cancelled'),
            supabase.from('expenses').select('id, amount, expense_date, category').eq('user_id', session.user.id),
            supabase.from('products').select('id, name, stock_quantity, price, cost_price, status').eq('user_id', session.user.id).neq('status', 'Draft'),
            supabase.from('customers').select('id').eq('user_id', session.user.id),
            supabase.from('chart_of_accounts').select('balance, account_type').eq('user_id', session.user.id)
        ]);

        const now = new Date();
        const currentMonthPrefix = now.toISOString().substring(0, 7);
        const lastMonth = new Date(); lastMonth.setMonth(now.getMonth() - 1);
        const lastMonthPrefix = lastMonth.toISOString().substring(0, 7);

        let revTotal = 0, expTotal = 0, recTotal = 0, invValue = 0, stockAlerts = 0, cash = 0;
        let thisMonthRev = 0, lastMonthRev = 0;
        let activityLog = [];

        // --- EXACT 6-MONTH CHART AGGREGATOR ---
        const last6Months = [];
        const chartDataMap = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStr = d.toISOString().substring(0, 7); // YYYY-MM
            const monthLabel = d.toLocaleString('default', { month: 'short' });
            last6Months.push({ label: monthLabel, key: monthStr });
            chartDataMap[monthStr] = { rev: 0, exp: 0 };
        }

        // 1. Process Orders (Sales & Receivables)
        if (orders) {
            orders.forEach(o => {
                const amt = Number(o.amount) || 0;
                const m = o.created_at.substring(0, 7);
                
                revTotal += amt;
                if (o.status === 'Pending' || o.status === 'Processing') recTotal += amt;
                
                if (m === currentMonthPrefix) thisMonthRev += amt;
                if (m === lastMonthPrefix) lastMonthRev += amt;

                // Add to accurate chart data if within last 6 months
                if (chartDataMap[m] !== undefined) {
                    chartDataMap[m].rev += amt;
                }

                activityLog.push({
                    type: 'Sale', date: o.created_at, title: `Invoice ${o.id.slice(0,6).toUpperCase()} to ${o.customer_name}`,
                    amount: amt, status: o.status, icon: DollarSign, color: 'emerald'
                });
            });
        }

        // 2. Process Expenses
        if (expenses) {
            expenses.forEach(e => {
                const amt = Number(e.amount) || 0;
                const m = e.expense_date.substring(0, 7);
                
                expTotal += amt;
                
                // Add to accurate chart data if within last 6 months
                if (chartDataMap[m] !== undefined) {
                    chartDataMap[m].exp += amt;
                }

                activityLog.push({
                    type: 'Expense', date: e.expense_date, title: `Expense: ${e.category || 'General'}`,
                    amount: amt, status: 'Paid', icon: Receipt, color: 'rose'
                });
            });
        }

        // 3. Process Products (Inventory Health)
        if (products) {
            products.forEach(p => {
                const qty = Number(p.stock_quantity) || 0;
                const cost = Number(p.cost_price) || 0; 
                invValue += (qty * cost);
                
                if (qty <= 5) stockAlerts++;
            });
        }

        // 4. Process Accounts (Liquidity)
        if (accounts) {
            accounts.forEach(a => {
                if (a.account_type === 'Asset') cash += Number(a.balance) || 0;
            });
        }

        // Calculate Growth & Cash Flow
        const netFlow = revTotal - expTotal;
        const growth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

        // Sort Activity Log (Newest First, limit to 6)
        activityLog.sort((a, b) => new Date(b.date) - new Date(a.date));
        const topActivity = activityLog.slice(0, 6);

        // Generate AI Executive Summary
        let insight = "";
        if (netFlow < 0) insight = "CRITICAL: The business is currently operating at a net negative cash flow. Immediate expense reduction is required.";
        else if (growth > 10) insight = `STRONG: Revenue is growing beautifully (+${growth.toFixed(1)}% MoM). Inventory value is healthy and cash reserves are stable.`;
        else insight = "STABLE: Operations are maintaining standard volume. Keep an eye on outstanding receivables to ensure liquidity remains high.";

        // Build Accurate Chart Data
        const labels = last6Months.map(m => m.label);
        const revData = last6Months.map(m => chartDataMap[m.key].rev);
        const expData = last6Months.map(m => chartDataMap[m.key].exp);

        setChartData({
            labels,
            datasets: [
                {
                    type: 'bar', 
                    label: 'Revenue',
                    data: revData,
                    backgroundColor: '#10b981', // Forced Emerald Green
                    borderRadius: 4, 
                    maxBarThickness: 32
                },
                {
                    type: 'bar', 
                    label: 'Expenses',
                    data: expData,
                    backgroundColor: '#f43f5e', // Forced Rose Red
                    borderRadius: 4, 
                    maxBarThickness: 32
                }
            ]
        });

        setMetrics({
            totalRevenue: revTotal, totalExpenses: expTotal, netCashFlow: netFlow,
            receivables: recTotal, liquidCash: cash, activeCustomers: customers?.length || 0,
            inventoryValue: invValue, lowStockCount: stockAlerts, momGrowth: growth
        });

        setRecentActivity(topActivity);
        setAiInsight(insight);

    } catch (error) {
        console.error("Dashboard Aggregation Error:", error);
    } finally {
        setLoading(false);
    }
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500 bg-slate-50/50">
              <LayoutDashboard className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Aggregating data across all system modules...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* Top spacing since we removed the header */}
      <div className="pt-6"></div>

      {/* CONTAINED AI BANNER */}
      <div className="w-full bg-[#1774b5] text-white p-6 mb-6 rounded-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="p-3 bg-white/20 text-white rounded-md shrink-0">
            <BrainCircuit size={24} />
          </div>
          <div className="flex-1">
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Sparkles size={12}/> AI System Status
            </p>
            <h2 className="text-base font-medium text-white leading-relaxed">{aiInsight}</h2>
          </div>
        </div>
      </div>

      {/* PRIMARY KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Revenue</p>
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded"><TrendingUp size={16}/></div>
              </div>
              <p className="text-3xl font-bold text-slate-800">Rs {metrics.totalRevenue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium">
                  {metrics.momGrowth >= 0 ? (
                      <span className="text-emerald-600 flex items-center"><ArrowUpRight size={12}/> +{metrics.momGrowth.toFixed(1)}%</span>
                  ) : (
                      <span className="text-rose-600 flex items-center"><ArrowDownRight size={12}/> {metrics.momGrowth.toFixed(1)}%</span>
                  )}
                  <span className="text-slate-400">vs last month</span>
              </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Net Cash Flow</p>
                  <div className="p-1.5 bg-blue-50 text-[#1774b5] rounded"><Wallet size={16}/></div>
              </div>
              <p className={`text-3xl font-bold ${metrics.netCashFlow < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  Rs {metrics.netCashFlow.toLocaleString(undefined, {maximumFractionDigits:0})}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-500">Revenue minus all expenses</p>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client Base</p>
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded"><Users size={16}/></div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{metrics.activeCustomers}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">Total registered customers</p>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Inventory Asset</p>
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded"><Package size={16}/></div>
              </div>
              <p className="text-3xl font-bold text-slate-800">Rs {metrics.inventoryValue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">Estimated value on hand</p>
          </div>
      </div>

      {/* SECONDARY ACTION METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex items-center justify-between">
              <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Awaiting Payment (AR)</p>
                  <p className="text-xl font-bold text-amber-600">Rs {metrics.receivables.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              </div>
              <CreditCard size={28} className="text-slate-200" />
          </div>
          <div className="bg-white border border-slate-200/80 p-6 rounded-lg flex items-center justify-between">
              <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Liquid Assets (Bank)</p>
                  <p className="text-xl font-bold text-[#1774b5]">Rs {metrics.liquidCash.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
              </div>
              <DollarSign size={28} className="text-slate-200" />
          </div>
          <div className={`border p-6 rounded-lg flex items-center justify-between ${metrics.lowStockCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200/80'}`}>
              <div>
                  <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${metrics.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>Low Stock Alerts</p>
                  <p className={`text-xl font-bold ${metrics.lowStockCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>{metrics.lowStockCount} Items</p>
              </div>
              <AlertTriangle size={28} className={metrics.lowStockCount > 0 ? 'text-rose-300' : 'text-slate-200'} />
          </div>
      </div>

      {/* BOTTOM SECTION: CHARTS & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-lg flex flex-col h-[420px]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2"><Activity size={18} className="text-[#1774b5]"/> Cash Flow Overview (Real-Time 6 Months)</h3>
              </div>
              <div className="p-5 flex-1 w-full relative">
                  {chartData && <Bar 
                      data={chartData} 
                      options={{ 
                          responsive: true, maintainAspectRatio: false, 
                          plugins: { 
                              legend: { 
                                  position: 'top', 
                                  labels: { usePointStyle: true, boxWidth: 8, padding: 20, font: { family: 'Inter, sans-serif', size: 12 } } 
                              }, 
                              tooltip: { padding: 12, bodyFont: {size: 13} } 
                          }, 
                          scales: { 
                              x: { grid: { display: false, drawBorder: false }, ticks: { font: {size: 12}, color: '#64748b'} }, 
                              y: { grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: {size: 12}, color: '#64748b', callback: (val) => val >= 1000 ? (val/1000)+'k' : val }, beginAtZero: true } 
                          } 
                      }} 
                  />}
              </div>
          </div>

          {/* Cross-Module Activity Feed */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-lg flex flex-col h-[420px]">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2"><Clock size={16} className="text-[#1774b5]"/> Cross-Module Activity</h3>
              </div>
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                  {recentActivity.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">No recent activity found.</div>
                  ) : (
                      <div className="divide-y divide-slate-100">
                          {recentActivity.map((act, i) => (
                              <div key={i} className="p-5 hover:bg-slate-50/80 transition-colors flex items-start gap-4">
                                  <div className={`p-2.5 rounded-md bg-${act.color}-50 text-${act.color}-600 shrink-0 mt-0.5`}>
                                      <act.icon size={16} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800 truncate mb-1">{act.title}</p>
                                      <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                                          <span>{new Date(act.date).toLocaleDateString()}</span>
                                          <span className="font-bold text-slate-700">Rs {act.amount.toLocaleString()}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>

      </div>
    </div>
  );
};

export default ExecutiveDashboard;