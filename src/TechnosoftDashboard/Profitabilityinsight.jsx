import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, 
  BarChart3, BrainCircuit, Sparkles, AlertCircle, 
  Download, Target, Percent, Scissors, Crosshair, Users
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const ProfitabilityInsights = () => {
  const [loading, setLoading] = useState(true);
  
  // High-Level KPIs
  const [kpis, setKpis] = useState({
      revenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
      opex: 0, netProfit: 0, netMargin: 0, breakEvenPoint: 0
  });

  // AI & Forecasting
  const [aiInsight, setAiInsight] = useState("");
  const [leakageAlerts, setLeakageAlerts] = useState([]);
  const [forecast, setForecast] = useState({ day30: 0, day60: 0, day90: 0 });

  // Granular Data
  const [chartData, setChartData] = useState(null);
  const [productProfitability, setProductProfitability] = useState([]);
  const [customerProfitability, setCustomerProfitability] = useState([]);
  const [categoryMargins, setCategoryMargins] = useState([]);
  const [marketingRoi, setMarketingRoi] = useState(0);

  useEffect(() => {
    fetchAndAnalyzeProfitability();
  }, []);

  const fetchAndAnalyzeProfitability = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1. Fetch Core Data
    const { data: orders } = await supabase.from('orders').select('amount, created_at, customer_name, items, status').eq('user_id', session.user.id).neq('status', 'Cancelled');
    const { data: expenses } = await supabase.from('expenses').select('amount, expense_date, category').eq('user_id', session.user.id);
    const { data: products } = await supabase.from('products').select('name, cost_price, price, category').eq('user_id', session.user.id);

    // Build Product Cost Lookup Map
    const productCostMap = {};
    const productCategoryMap = {};
    if (products) {
        products.forEach(p => {
            productCostMap[p.name] = Number(p.cost_price) || (Number(p.price) * 0.6); // Fallback: Assume 60% COGS if cost not set
            productCategoryMap[p.name] = p.category || 'Uncategorized';
        });
    }

    // --- 2. MACRO FINANCIALS & COST STRUCTURE ---
    let totalRevenue = 0, totalCOGS = 0, totalOpEx = 0, marketingSpend = 0;
    const monthlyLedger = {};
    const productStats = {};
    const customerStats = {};
    const categoryStats = {};

    // Process Expenses (OpEx)
    if (expenses) {
        expenses.forEach(e => {
            const amt = Number(e.amount);
            const month = e.expense_date.substring(0, 7);
            const cat = e.category?.toLowerCase() || '';

            totalOpEx += amt;
            if (cat.includes('marketing') || cat.includes('ad')) marketingSpend += amt;

            if (!monthlyLedger[month]) monthlyLedger[month] = { rev: 0, cogs: 0, opex: 0 };
            monthlyLedger[month].opex += amt;
        });
    }

    // Process Orders (Revenue, COGS, Products, Customers)
    if (orders) {
        orders.forEach(o => {
            const rev = Number(o.amount);
            const month = o.created_at.substring(0, 7);
            const cName = o.customer_name?.trim() || 'Walk-in';

            totalRevenue += rev;
            if (!monthlyLedger[month]) monthlyLedger[month] = { rev: 0, cogs: 0, opex: 0 };
            monthlyLedger[month].rev += rev;

            let orderCOGS = 0;
            
            // Item Level Processing
            o.items?.forEach(item => {
                const qty = Number(item.quantity) || 1;
                const unitRev = Number(item.price) || 0;
                const lineRev = qty * unitRev;
                const unitCost = productCostMap[item.name] || (unitRev * 0.6); // Baseline assumption
                const lineCost = qty * unitCost;
                
                orderCOGS += lineCost;
                const cat = productCategoryMap[item.name] || 'Uncategorized';

                // Product Profitability
                if (!productStats[item.name]) productStats[item.name] = { name: item.name, rev: 0, cogs: 0, qty: 0 };
                productStats[item.name].rev += lineRev;
                productStats[item.name].cogs += lineCost;
                productStats[item.name].qty += qty;

                // Category Profitability
                if (!categoryStats[cat]) categoryStats[cat] = { name: cat, rev: 0, cogs: 0 };
                categoryStats[cat].rev += lineRev;
                categoryStats[cat].cogs += lineCost;
            });

            totalCOGS += orderCOGS;
            monthlyLedger[month].cogs += orderCOGS;

            // Customer Profitability
            if (!customerStats[cName]) customerStats[cName] = { name: cName, rev: 0, cogs: 0, orders: 0 };
            customerStats[cName].rev += rev;
            customerStats[cName].cogs += orderCOGS;
            customerStats[cName].orders += 1;
        });
    }

    // --- 3. CALCULATE CORE METRICS ---
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit - totalOpEx;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Break-Even Point 
    const cmRatio = totalRevenue > 0 ? (grossProfit / totalRevenue) : 0;
    const breakEvenRevenue = cmRatio > 0 ? (totalOpEx / cmRatio) : 0;

    // ROI Tracking 
    const mRoi = marketingSpend > 0 ? ((grossProfit - marketingSpend) / marketingSpend) * 100 : 0;

    // --- 4. FORECASTING & TRENDS ---
    const history = Object.entries(monthlyLedger).sort((a,b) => a[0].localeCompare(b[0])).map(([m, data]) => ({
        month: m, ...data, gp: data.rev - data.cogs, np: (data.rev - data.cogs) - data.opex, margin: data.rev > 0 ? (((data.rev - data.cogs) - data.opex) / data.rev) * 100 : 0
    }));

    const recentMonths = history.slice(-3);
    const avgNetProfit = recentMonths.length > 0 ? recentMonths.reduce((sum, h) => sum + h.np, 0) / recentMonths.length : 0;

    setForecast({
        day30: avgNetProfit,
        day60: avgNetProfit * 2,
        day90: avgNetProfit * 3
    });

    // --- 5. PROFIT LEAKAGE & ANOMALIES ---
    const leakages = [];
    if (netMargin < 10 && grossMargin > 40) {
        leakages.push("OpEx bloat detected: High gross margin but poor net margin indicates operating expenses are consuming profits.");
    }
    if (history.length >= 2) {
        const lastM = history[history.length - 1];
        const prevM = history[history.length - 2];
        if (lastM.opex > prevM.opex * 1.2 && lastM.rev <= prevM.rev) {
            leakages.push("Profit Leakage: Operating expenses grew by >20% last month while revenue stagnated or declined.");
        }
    }

    // --- 6. ARRAYS FORMATTING ---
    const productArr = Object.values(productStats).map(p => {
        const gp = p.rev - p.cogs;
        const margin = p.rev > 0 ? (gp / p.rev) * 100 : 0;
        return { ...p, gp, margin };
    }).sort((a,b) => b.gp - a.gp); 

    const customerArr = Object.values(customerStats).map(c => {
        const gp = c.rev - c.cogs;
        return { ...c, gp, margin: c.rev > 0 ? (gp / c.rev) * 100 : 0 };
    }).sort((a,b) => b.gp - a.gp);

    const catArr = Object.values(categoryStats).map(c => {
        const gp = c.rev - c.cogs;
        return { ...c, gp, margin: c.rev > 0 ? (gp / c.rev) * 100 : 0 };
    }).sort((a,b) => b.margin - a.margin);

    // --- 7. AI INSIGHT GENERATION ---
    if (netProfit < 0) {
        setAiInsight("Business is operating at a Net Loss. Focus entirely on reducing OpEx and reaching your Break-Even Revenue target.");
    } else if (grossMargin < 20) {
        setAiInsight("Critically low Gross Margin. Your Cost of Goods Sold (COGS) is too high relative to your pricing. Review supplier costs or raise prices.");
    } else if (leakages.length > 0) {
        setAiInsight("Profitability is leaking. Read the leakage alerts below to identify structural inefficiencies.");
    } else {
        setAiInsight(`Healthy profitability detected. Current Net Margin is ${netMargin.toFixed(1)}%. Continue optimizing high-margin products.`);
    }

    // --- CHART.JS CONFIGURATION (Fixed Legend Spacing) ---
    setChartData({
        labels: history.map(h => {
            const d = new Date(h.month + '-01'); return d.toLocaleString('default', { month: 'short', year: '2-digit' });
        }),
        datasets: [
            {
                type: 'line', 
                label: ' Net Margin (%)', 
                data: history.map(h => h.margin),
                borderColor: '#1774b5', 
                backgroundColor: '#1774b5',
                borderWidth: 2, 
                tension: 0.4, 
                yAxisID: 'y1',
                pointBackgroundColor: '#fff', 
                pointRadius: 4,
                pointHoverRadius: 6
            },
            {
                type: 'bar', 
                label: ' Gross Profit', 
                data: history.map(h => h.gp),
                backgroundColor: '#10b981', 
                borderRadius: 4, 
                maxBarThickness: 48, 
                yAxisID: 'y',
            },
            {
                type: 'bar', 
                label: ' Operating Expenses', 
                data: history.map(h => h.opex),
                backgroundColor: '#f43f5e', 
                borderRadius: 4, 
                maxBarThickness: 48, 
                yAxisID: 'y',
            }
        ]
    });

    setKpis({ revenue: totalRevenue, cogs: totalCOGS, grossProfit, grossMargin, opex: totalOpEx, netProfit, netMargin, breakEvenPoint: breakEvenRevenue });
    setLeakageAlerts(leakages);
    setProductProfitability(productArr);
    setCustomerProfitability(customerArr);
    setCategoryMargins(catArr);
    setMarketingRoi(mRoi);
    setLoading(false);
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <PieChart className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Calculating Margins & Cost Structures...</p>
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
                <PieChart className="text-[#1774b5]" size={22}/> Profitability Insights
              </h1>
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-emerald-200">Financial MRI</span>
          </div>
          <p className="text-slate-500 text-sm">Deep analysis of profit margins, unit economics, cost structures, and profit leakage.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors">
            <Download size={14} className="text-[#1774b5]" /> Export P&L
        </button>
      </div>

      {/* TOP AI BANNER (Net Profit Focus) */}
      <div className="w-full bg-[#1774b5] text-white p-6 mb-6 rounded-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-blue-400/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 text-white rounded-md">
              <BrainCircuit size={24} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-medium uppercase tracking-widest mb-0.5">Bottom Line Intelligence</p>
              <h2 className="text-xl font-medium text-white leading-tight">Net Margin Health</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm font-light text-blue-50 bg-blue-900/40 p-3 rounded-md inline-flex items-start gap-2 border border-blue-400/20 text-left">
               <Sparkles size={16} className="shrink-0 text-amber-300 mt-0.5" />
               <span className="leading-relaxed">{aiInsight}</span>
             </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest"><DollarSign size={12}/> Global Net Profit</p>
            <p className={`text-2xl font-semibold ${kpis.netProfit < 0 ? 'text-rose-300' : 'text-white'}`}>Rs {kpis.netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest"><Percent size={12}/> Net Profit Margin</p>
            <p className={`text-xl font-semibold mt-1 ${kpis.netMargin >= 15 ? 'text-emerald-300' : kpis.netMargin > 0 ? 'text-white' : 'text-rose-300'}`}>{kpis.netMargin.toFixed(1)}%</p>
          </div>
          <div className="bg-white/10 p-4 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest"><Target size={12}/> Break-Even Revenue</p>
            <p className="text-xl font-semibold text-white mt-1">Rs {kpis.breakEvenPoint.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className={`p-4 rounded-md border ${leakageAlerts.length > 0 ? 'bg-rose-900/30 border-rose-400/30 text-rose-100' : 'bg-emerald-900/30 border-emerald-400/30 text-emerald-100'}`}>
            <p className="text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">
                <Scissors size={12}/> Leakage Status
            </p>
            <p className="text-sm font-semibold mt-1">{leakageAlerts.length > 0 ? `${leakageAlerts.length} Alerts Detected` : 'Airtight Operations'}</p>
          </div>
        </div>
      </div>

      {/* LEAKAGE ALERTS */}
      {leakageAlerts.length > 0 && (
          <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-500"/> Profit Leakage Detections
              </h3>
              <div className="space-y-2">
                  {leakageAlerts.map((alert, i) => (
                      <div key={i} className="bg-rose-50/50 border border-rose-200 p-3 rounded-md flex items-start gap-3 text-rose-800">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <p className="text-sm font-medium">{alert}</p>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* DISCLAIMER NOTICE (Flat & Clean) */}
      <div className="mb-6 p-4 rounded-lg border flex items-start gap-3 bg-white border-slate-200/80">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-[#1774b5]" />
          <div>
              <p className="text-sm font-medium mb-1 text-slate-800">Profitability Context</p>
              <p className="text-xs leading-relaxed text-slate-500">
                  This analysis relies on accurate Cost of Goods Sold (COGS) data assigned to your products. If a product lacks a specific cost price in the inventory, the system assumes a baseline 60% COGS to prevent heavily skewed margins. Keep your product catalog updated for precise net profit tracking.
              </p>
          </div>
      </div>

      {/* MIDDLE: COST STRUCTURE & CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          
          {/* Flattened Cost Structure List */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-lg p-5 flex flex-col">
              <h3 className="text-sm font-medium text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <DollarSign size={16} className="text-[#1774b5]"/> Cost Structure (All Time)
              </h3>
              
              <div className="space-y-5">
                  <div className="flex justify-between items-end border-b border-slate-50 pb-3">
                      <div>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
                          <p className="text-lg font-semibold text-slate-800">Rs {kpis.revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                      </div>
                  </div>
                  
                  <div className="flex justify-between items-end border-b border-slate-50 pb-3">
                      <div>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">COGS (Direct Cost)</p>
                          <p className="text-base font-medium text-amber-600">Rs {kpis.cogs.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">{(kpis.revenue > 0 ? (kpis.cogs/kpis.revenue)*100 : 0).toFixed(1)}%</span>
                  </div>
                  
                  <div className="flex justify-between items-end border-b border-slate-50 pb-3">
                      <div>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Gross Profit (Margin)</p>
                          <p className="text-base font-medium text-emerald-600">Rs {kpis.grossProfit.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{kpis.grossMargin.toFixed(1)}%</span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                      <div>
                          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">OpEx (Fixed Costs)</p>
                          <p className="text-base font-medium text-rose-600">Rs {kpis.opex.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">{(kpis.revenue > 0 ? (kpis.opex/kpis.revenue)*100 : 0).toFixed(1)}%</span>
                  </div>
              </div>
          </div>

          {/* Fixed Chart Legend Spacing */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 p-5 rounded-lg flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2"><BarChart3 size={16} className="text-[#1774b5]"/> Profit Margin & Expenditure Trend</h3>
              </div>
              <div className="flex-1 w-full relative">
                  {chartData && <Bar 
                      data={chartData} 
                      options={{ 
                          responsive: true, 
                          maintainAspectRatio: false, 
                          interaction: { mode: 'index', intersect: false },
                          plugins: { 
                              legend: { 
                                  position: 'top', 
                                  labels: { 
                                      usePointStyle: true, 
                                      boxWidth: 8, 
                                      padding: 24, // Fixes the missing gap between legend items
                                      font: { family: 'Inter, sans-serif', size: 12 } 
                                  } 
                              }, 
                              tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 10, bodyFont: { size: 12, family: 'Inter, sans-serif' }, titleFont: { weight: 'normal', family: 'Inter, sans-serif' } } 
                          }, 
                          scales: { 
                              x: { grid: { display: false, drawBorder: false }, ticks: { font: { size: 11, family: 'Inter, sans-serif' }, color: '#64748b' } }, 
                              y: { grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { size: 11, family: 'Inter, sans-serif' }, color: '#64748b', callback: function(value) { if (value >= 1000) return (value/1000).toFixed(0) + 'k'; return value; } }, beginAtZero: true }, 
                              y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + '%', font: { size: 11, family: 'Inter, sans-serif' }, color: '#1774b5' } } 
                          } 
                      }} 
                  />}
              </div>
          </div>
      </div>

      {/* BOTTOM: PROFITABILITY MATRICES */}
      <h3 className="text-sm font-medium text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-200/80 pb-2">Unit Economics & Segmentation</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Product Profitability */}
          <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col h-[350px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><Target size={14} className="text-[#1774b5]"/> Product Profitability</h3>
              </div>
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-100">
                              <th className="py-2.5 px-4 font-medium">Item</th>
                              <th className="py-2.5 px-4 text-right font-medium">Gross Profit</th>
                              <th className="py-2.5 px-4 text-right font-medium">Margin</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {productProfitability.length === 0 ? (
                              <tr><td colSpan="3" className="p-6 text-center text-xs text-slate-400">No product data available.</td></tr>
                          ) : productProfitability.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-4 text-slate-700 truncate max-w-[120px] font-medium">{p.name}</td>
                                  <td className="py-3 px-4 text-right text-emerald-600">Rs {p.gp.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                  <td className="py-3 px-4 text-right">
                                      <span className={`px-2 py-1 rounded text-[10px] font-medium ${p.margin >= 40 ? 'bg-emerald-50 text-emerald-700' : p.margin >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                          {p.margin.toFixed(0)}%
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Customer Profitability */}
          <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col h-[350px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><Users size={14} className="text-[#1774b5]"/> Most Profitable Clients</h3>
              </div>
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-100">
                              <th className="py-2.5 px-4 font-medium">Client</th>
                              <th className="py-2.5 px-4 text-right font-medium">Net Profit Value</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {customerProfitability.length === 0 ? (
                              <tr><td colSpan="2" className="p-6 text-center text-xs text-slate-400">No customer data available.</td></tr>
                          ) : customerProfitability.slice(0, 15).map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-4 text-slate-700 truncate max-w-[150px] font-medium">{c.name}</td>
                                  <td className="py-3 px-4 text-right text-emerald-600">Rs {c.gp.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Category Margins & Forecast */}
          <div className="flex flex-col gap-6">
              
              <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col flex-1 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                      <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><Crosshair size={14} className="text-[#1774b5]"/> Category Margins</h3>
                  </div>
                  <div className="p-0 overflow-y-auto custom-scrollbar h-[120px]">
                      <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-slate-50">
                              {categoryMargins.map((c, idx) => (
                                  <tr key={idx}>
                                      <td className="py-3 px-4 text-slate-600 truncate max-w-[120px]">{c.name}</td>
                                      <td className="py-3 px-4 text-right font-medium text-slate-800">{c.margin.toFixed(1)}%</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg text-indigo-900">
                  <h3 className="font-medium text-sm flex items-center gap-2 mb-4 uppercase tracking-widest"><TrendingUp size={14}/> Net Profit Forecast</h3>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm border-b border-indigo-100 pb-2">
                          <span className="text-indigo-700 font-medium">30 Days</span>
                          <span className="font-medium">Rs {forecast.day30.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-indigo-100 pb-2">
                          <span className="text-indigo-700 font-medium">60 Days</span>
                          <span className="font-medium">Rs {forecast.day60.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-indigo-700 font-medium">90 Days</span>
                          <span className="font-semibold text-[#1774b5]">Rs {forecast.day90.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                      </div>
                  </div>
              </div>

          </div>

      </div>

    </div>
  );
};

export default ProfitabilityInsights;