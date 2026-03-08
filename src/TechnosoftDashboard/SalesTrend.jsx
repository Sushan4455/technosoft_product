import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  TrendingUp, TrendingDown, Activity, AlertOctagon, 
  Users, Box, ShoppingCart, ShieldCheck, BrainCircuit,
  Zap, ArrowUpRight, ArrowDownRight, BarChart3, AlertCircle, Sparkles
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler, BarElement
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const SalesTrend = () => {
  const [loading, setLoading] = useState(true);
  const [dataAgeMonths, setDataAgeMonths] = useState(0);
  
  // Intelligence States
  const [healthScore, setHealthScore] = useState(0);
  const [intelligenceFeed, setIntelligenceFeed] = useState([]);
  const [kpis, setKpis] = useState({});
  const [chartData, setChartData] = useState(null);
  
  // Breakdown States
  const [productTrends, setProductTrends] = useState({ top: [], declining: [] });
  const [cohortData, setCohortData] = useState([]);

  useEffect(() => {
    fetchAndAnalyzeAll();
  }, []);

  const fetchAndAnalyzeAll = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: orders } = await supabase.from('orders').select('*').eq('user_id', session.user.id).neq('status', 'Cancelled').order('created_at', { ascending: true });
    const { data: expenses } = await supabase.from('expenses').select('*').eq('user_id', session.user.id);
    const { data: products } = await supabase.from('products').select('*').eq('user_id', session.user.id);

    if (!orders || orders.length === 0) {
      setLoading(false);
      return;
    }

    analyzeTrends(orders, expenses, products);
  };

  const analyzeTrends = (orders, expenses, products) => {
    const intelligence = [];
    
    // --- 1. TIME SERIES AGGREGATION (Daily & Monthly) ---
    const dailyData = {};
    const monthlyData = {};
    let totalRevenue = 0;
    
    orders.forEach(o => {
        const day = o.created_at.substring(0, 10);
        const month = o.created_at.substring(0, 7);
        const amt = Number(o.amount);
        
        totalRevenue += amt;

        if (!dailyData[day]) dailyData[day] = { date: day, revenue: 0, orderCount: 0 };
        if (!monthlyData[month]) monthlyData[month] = { month, revenue: 0, customers: new Set() };
        
        dailyData[day].revenue += amt;
        dailyData[day].orderCount += 1;
        monthlyData[month].revenue += amt;
        monthlyData[month].customers.add(o.customer_name?.toLowerCase() || 'unknown');
    });

    const dailyArray = Object.values(dailyData).sort((a,b) => a.date.localeCompare(b.date));
    const monthlyArray = Object.values(monthlyData).sort((a,b) => a.month.localeCompare(b.month));
    setDataAgeMonths(monthlyArray.length);

    // --- 2. CALCULATE MOVING AVERAGES (7-Day) ---
    for (let i = 0; i < dailyArray.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - 6); j <= i; j++) {
            sum += dailyArray[j].revenue;
            count++;
        }
        dailyArray[i].ma7 = sum / count;
    }

    // --- 3. TREND ACCELERATION & ANOMALY DETECTION ---
    const currentMonth = monthlyArray[monthlyArray.length - 1];
    const prevMonth = monthlyArray.length > 1 ? monthlyArray[monthlyArray.length - 2] : null;
    let momGrowth = 0;

    if (prevMonth && prevMonth.revenue > 0) {
        momGrowth = ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;
        if (momGrowth > 10) {
            intelligence.push({ type: 'positive', text: `Sales growth rate accelerated! Increased by ${momGrowth.toFixed(1)}% compared to last month.`});
        } else if (momGrowth < -10) {
            intelligence.push({ type: 'negative', text: `Revenue contraction detected. Sales are down by ${Math.abs(momGrowth).toFixed(1)}% Month-over-Month.`});
        }
    }

    if (dailyArray.length > 7) {
        const lastDay = dailyArray[dailyArray.length - 1];
        const prevMA = dailyArray[dailyArray.length - 2].ma7;
        if (lastDay.revenue > prevMA * 2.5 && lastDay.revenue > 5000) {
            intelligence.push({ type: 'anomaly', text: `Sudden Spike Detected: Yesterday's revenue (Rs ${lastDay.revenue.toLocaleString()}) was over 2.5x higher than the 7-day average.`});
        }
        if (lastDay.orderCount > 20 && lastDay.revenue < (prevMA * 0.5)) {
             intelligence.push({ type: 'warning', text: `Anomaly Detection: High volume of micro-transactions today. Verify orders for potential bot/fraud activity.`});
        }
    }

    // --- 4. CUSTOMER TRENDS (New vs Returning, AOV) ---
    const customerHistory = {};
    let returningRevenue = 0;
    let newRevenue = 0;
    
    orders.forEach(o => {
        const cName = o.customer_name?.toLowerCase() || 'walk-in';
        if (!customerHistory[cName]) {
            customerHistory[cName] = { firstOrder: o.created_at, totalSpent: 0, count: 0 };
            newRevenue += Number(o.amount);
        } else {
            returningRevenue += Number(o.amount);
        }
        customerHistory[cName].totalSpent += Number(o.amount);
        customerHistory[cName].count++;
    });

    const aov = orders.length > 0 ? totalRevenue / orders.length : 0;
    const totalUniqueCustomers = Object.keys(customerHistory).length;
    const clv = totalUniqueCustomers > 0 ? totalRevenue / totalUniqueCustomers : 0;

    // --- 5. COHORT RETENTION (Jan vs Feb) ---
    const cohortArr = [];
    if (monthlyArray.length >= 2) {
        const m1 = monthlyArray[monthlyArray.length - 2];
        const m2 = monthlyArray[monthlyArray.length - 1];
        let retained = 0;
        m1.customers.forEach(c => { if(m2.customers.has(c)) retained++; });
        const retentionRate = m1.customers.size > 0 ? (retained / m1.customers.size) * 100 : 0;
        
        cohortArr.push({ month: m1.month, acquired: m1.customers.size, retainedNextMonth: retained, rate: retentionRate });
        
        if (retentionRate < 10) {
            intelligence.push({ type: 'warning', text: `High Churn Risk: Only ${retentionRate.toFixed(1)}% of customers from ${m1.month} returned this month.`});
        }
    }

    // --- 6. PRODUCT INTELLIGENCE ---
    const prodVelocity = {};
    orders.forEach(o => {
        o.items?.forEach(i => {
            if (!prodVelocity[i.name]) prodVelocity[i.name] = { name: i.name, qty: 0, revenue: 0 };
            prodVelocity[i.name].qty += Number(i.quantity);
            prodVelocity[i.name].revenue += (Number(i.quantity) * Number(i.price));
        });
    });

    const sortedProds = Object.values(prodVelocity).sort((a,b) => b.qty - a.qty);
    const topProducts = sortedProds.slice(0, 3);
    const decliningProducts = sortedProds.slice(-3).filter(p => p.qty > 0); 

    if (decliningProducts.length > 0) {
        intelligence.push({ type: 'negative', text: `Product Decline: "${decliningProducts[0].name}" is experiencing severe sales stagnation.`});
    }

    if (intelligence.length === 0) {
        intelligence.push({ type: 'positive', text: `Operations are stable. No significant anomalies or extreme deviations detected in the current period.`});
    }

    // --- 7. BUSINESS HEALTH SCORE CALCULATOR (Out of 100) ---
    let score = 50; 
    
    if (momGrowth > 5) score += 20;
    else if (momGrowth > 0) score += 10;
    else if (momGrowth < -5) score -= 15;

    const currRetention = cohortArr.length > 0 ? cohortArr[0].rate : 20;
    if (currRetention >= 30) score += 20;
    else if (currRetention >= 15) score += 10;
    else score -= 10;

    if (aov > 1000) score += 10;

    score = Math.max(10, Math.min(100, score));

    setHealthScore(Math.round(score));
    setIntelligenceFeed(intelligence);
    
    setKpis({
        totalRevenue, aov, clv, momGrowth,
        newRevRatio: totalRevenue > 0 ? (newRevenue / totalRevenue) * 100 : 0,
        retRevRatio: totalRevenue > 0 ? (returningRevenue / totalRevenue) * 100 : 0
    });

    setProductTrends({ top: topProducts, declining: decliningProducts });
    setCohortData(cohortArr);

    // Chart Data Setup
    const recentDays = dailyArray.slice(-14); // Last 14 active days
    setChartData({
        labels: recentDays.map(d => d.date.substring(5)), // MM-DD
        datasets: [
            {
                label: 'Daily Revenue',
                data: recentDays.map(d => d.revenue),
                backgroundColor: 'rgba(23, 116, 181, 0.08)',
                borderColor: '#1774b5',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: '#ffffff'
            },
            {
                label: '7-Day Moving Avg',
                data: recentDays.map(d => d.ma7),
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderDash: [4, 4],
                tension: 0.4,
                pointRadius: 0
            }
        ]
    });

    setLoading(false);
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <BrainCircuit className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Synthesizing Business Intelligence...</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6 pt-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-medium tracking-tight text-slate-800 flex items-center gap-2">
                <BarChart3 className="text-[#1774b5]" size={22}/> Sales Trend & Intelligence
              </h1>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-indigo-200">Advanced BI</span>
          </div>
          <p className="text-slate-500 text-sm">Automated trend acceleration, anomaly detection, and cohort analysis.</p>
        </div>
      </div>

      {/* TOP AI BANNER (Consistent with other pages) */}
      <div className="w-full bg-[#1774b5] text-white p-5 mb-5 rounded-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-blue-400/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-md">
              <BrainCircuit size={20} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-medium uppercase tracking-widest mb-0.5">Macro Intelligence</p>
              <h2 className="text-lg font-medium text-white leading-tight">Global Business Health</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full flex items-center md:justify-end gap-3">
             <span className="text-sm font-light text-blue-100">Calculated Score</span>
             <div className="w-12 h-12 relative flex items-center justify-center bg-white/10 rounded-full border border-white/20">
                <span className="text-lg font-bold text-white leading-none">{healthScore}</span>
             </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className={`p-3.5 rounded-md border ${kpis.momGrowth > 0 ? 'bg-emerald-900/30 border-emerald-400/30 text-emerald-100' : kpis.momGrowth < 0 ? 'bg-rose-900/30 border-rose-400/30 text-rose-100' : 'bg-white/10 border-white/20 text-blue-100'}`}>
            <p className="text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">
                {kpis.momGrowth > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>} MoM Growth
            </p>
            <p className="text-xl font-semibold mt-1">{Math.abs(kpis.momGrowth).toFixed(1)}%</p>
          </div>
          <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">Avg Order Value</p>
            <p className="text-xl font-semibold text-white mt-1">Rs {kpis.aov.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">Est. Customer LTV</p>
            <p className="text-xl font-semibold text-white mt-1">Rs {kpis.clv.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
        </div>
      </div>

      {/* DISCLAIMER NOTICE (Flat) */}
      <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 bg-white ${dataAgeMonths < 2 ? 'border-amber-200/80' : 'border-slate-200/80'}`}>
          <AlertCircle size={18} className={`shrink-0 mt-0.5 ${dataAgeMonths < 2 ? 'text-amber-500' : 'text-[#1774b5]'}`} />
          <div>
              <p className="text-sm font-medium mb-1 text-slate-800">Intelligence Context</p>
              <p className="text-xs leading-relaxed text-slate-500">
                  Business Health Scores and Trend Anomalies rely heavily on historical transaction volume. 
                  Calculations normalize standard deviations against your 7-day and 30-day moving averages.
                  {dataAgeMonths < 2 && <span className="text-amber-600 block mt-1"> The system requires at least 2 full months of data to detect true Month-over-Month acceleration and cohort retention.</span>} 
              </p>
          </div>
      </div>

      {/* MIDDLE: CHART & INTELLIGENCE FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-lg flex flex-col h-[350px]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2"><Activity size={16} className="text-[#1774b5]"/> Daily Revenue vs 7-Day Moving Avg</h3>
              </div>
              <div className="p-5 flex-1 w-full relative">
                  {chartData && <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels:{usePointStyle:true, boxWidth:6, font: {family: 'Inter', size: 11}} }, tooltip: { padding: 10, titleFont: {weight:'normal'}, bodyFont: {size: 12} } }, scales: { x: { grid: { display: false, drawBorder: false }, ticks: { font: {size: 10}, color: '#64748b'} }, y: { grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: {size: 10}, color: '#64748b'}, beginAtZero: true } } }} />}
              </div>
          </div>

          {/* AI Intelligence Feed */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-lg flex flex-col h-[350px]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><Zap size={14} className="text-amber-500"/> Live Anomaly Detection</h3>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-slate-50/30">
                  {intelligenceFeed.map((insight, idx) => (
                      <div key={idx} className={`p-3 rounded-md border flex items-start gap-2.5 ${
                          insight.type === 'positive' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' :
                          insight.type === 'negative' ? 'bg-rose-50/50 border-rose-200 text-rose-800' :
                          insight.type === 'anomaly' ? 'bg-indigo-50/50 border-indigo-200 text-indigo-800' :
                          'bg-amber-50/50 border-amber-200 text-amber-800'
                      }`}>
                          {insight.type === 'positive' && <TrendingUp size={14} className="shrink-0 mt-0.5 text-emerald-600" />}
                          {insight.type === 'negative' && <TrendingDown size={14} className="shrink-0 mt-0.5 text-rose-600" />}
                          {insight.type === 'anomaly' && <Sparkles size={14} className="shrink-0 mt-0.5 text-indigo-600" />}
                          {insight.type === 'warning' && <AlertOctagon size={14} className="shrink-0 mt-0.5 text-amber-600" />}
                          <p className="text-xs leading-relaxed font-medium">{insight.text}</p>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* BOTTOM: 3 COLUMN BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Customer Origin Trend */}
          <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><Users size={14} className="text-[#1774b5]"/> Customer Dependency</h3>
              </div>
              <div className="p-5 flex-1">
                  <div className="mb-6">
                      <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-2">
                          <span>New Acquisition ({kpis.newRevRatio.toFixed(1)}%)</span>
                          <span>Retention ({kpis.retRevRatio.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full flex overflow-hidden">
                          <div className="h-full bg-emerald-400" style={{ width: `${kpis.newRevRatio}%` }}></div>
                          <div className="h-full bg-[#1774b5]" style={{ width: `${kpis.retRevRatio}%` }}></div>
                      </div>
                  </div>

                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Cohort Retention Matrix</h4>
                  {cohortData.length === 0 ? (
                      <p className="text-xs text-slate-500">Awaiting multi-month data.</p>
                  ) : (
                      <table className="w-full text-left text-xs">
                          <tbody>
                              {cohortData.map((c, idx) => (
                                  <tr key={idx} className="border-b border-slate-50 last:border-0">
                                      <td className="py-2 text-slate-600">{c.month} Cohort</td>
                                      <td className="py-2 text-right font-medium">
                                          <span className={`px-2 py-0.5 rounded text-[10px] ${c.rate >= 20 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                              {c.rate.toFixed(1)}% Retained
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
              </div>
          </div>

          {/* Product Trend */}
          <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><Box size={14} className="text-[#1774b5]"/> Product Velocity</h3>
              </div>
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                          <tr className="text-[9px] text-slate-500 uppercase tracking-wider border-b border-slate-100">
                              <th className="py-2.5 px-4 font-medium">Item Name</th>
                              <th className="py-2.5 px-4 text-right font-medium">Trend</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          <tr><td colSpan="2" className="bg-emerald-50/30 py-1.5 px-4 text-[9px] font-medium text-emerald-600 uppercase tracking-widest">Top Movers</td></tr>
                          {productTrends.top.map((p, idx) => (
                              <tr key={`top-${idx}`}>
                                  <td className="py-2.5 px-4 text-slate-700 truncate max-w-[150px]">{p.name}</td>
                                  <td className="py-2.5 px-4 text-right text-emerald-600 font-medium">{p.qty} sold</td>
                              </tr>
                          ))}
                          <tr><td colSpan="2" className="bg-rose-50/30 py-1.5 px-4 text-[9px] font-medium text-rose-600 uppercase tracking-widest">Declining Momentum</td></tr>
                          {productTrends.declining.map((p, idx) => (
                              <tr key={`dec-${idx}`}>
                                  <td className="py-2.5 px-4 text-slate-700 truncate max-w-[150px]">{p.name}</td>
                                  <td className="py-2.5 px-4 text-right text-rose-500 font-medium">Stagnant</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Operational Trend */}
          <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><ShoppingCart size={14} className="text-[#1774b5]"/> Operational Insight</h3>
              </div>
              <div className="p-6 text-center flex flex-col justify-center items-center h-full">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mb-3">
                      <ShieldCheck size={24} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-800 mb-1">Channel Stability is Optimal</p>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
                      Revenue distribution is balanced across standard payment channels without critical disruption.
                  </p>
              </div>
          </div>

      </div>

    </div>
  );
};

export default SalesTrend;