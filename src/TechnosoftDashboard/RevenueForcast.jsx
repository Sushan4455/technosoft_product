import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Activity, Calendar, TrendingUp, TrendingDown, 
  AlertCircle, Download, LineChart as LineChartIcon,
  Sparkles, BrainCircuit, Target, DollarSign,
  Package, ShoppingCart, AlertTriangle
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler
);

const RevenueForecast = () => {
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [dataAgeMonths, setDataAgeMonths] = useState(0);
  
  // Product AI States
  const [productInsights, setProductInsights] = useState({
      topProduct: null,
      worstProduct: null,
      discontinueCandidates: [],
      restockSuggestions: [],
      trendingProducts: []
  });

  const [kpi, setKpi] = useState({
      currentRevenue: 0,
      predictedRevenue: 0,
      avgMargin: 0,
      growthVelocity: 0,
  });

  const [aiInsight, setAiInsight] = useState("");

  useEffect(() => {
    fetchAndAnalyzeData();
  }, []);

  const fetchAndAnalyzeData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Fetch Financials & Products
    const { data: orders } = await supabase.from('orders').select('created_at, amount, status, items').eq('user_id', session.user.id).neq('status', 'Cancelled');
    const { data: expenses } = await supabase.from('expenses').select('expense_date, amount').eq('user_id', session.user.id);
    const { data: pos } = await supabase.from('purchase_orders').select('order_date, total_amount').eq('user_id', session.user.id).neq('status', 'Draft');
    const { data: products } = await supabase.from('products').select('name, stock_quantity, price').eq('user_id', session.user.id);

    // --- 1. PROCESS FINANCIAL LEDGER ---
    const monthlyLedger = {};
    const addToLedger = (dateString, amount, type) => {
        if (!dateString) return;
        const month = dateString.substring(0, 7); 
        if (!monthlyLedger[month]) {
            monthlyLedger[month] = { month, revenue: 0, outflow: 0, profit: 0 };
        }
        if (type === 'revenue') monthlyLedger[month].revenue += Number(amount);
        if (type === 'outflow') monthlyLedger[month].outflow += Number(amount);
        monthlyLedger[month].profit = monthlyLedger[month].revenue - monthlyLedger[month].outflow;
    };

    if (orders) orders.forEach(o => addToLedger(o.created_at, o.amount, 'revenue'));
    if (expenses) expenses.forEach(e => addToLedger(e.expense_date, e.amount, 'outflow'));
    if (pos) pos.forEach(p => addToLedger(p.order_date, p.total_amount, 'outflow'));

    const sortedHistory = Object.values(monthlyLedger).sort((a, b) => a.month.localeCompare(b.month));
    const numMonthsAnalyzed = Math.max(1, sortedHistory.length);

    // --- 2. PROCESS PRODUCT INTELLIGENCE ---
    const productStats = {};
    
    if (products) {
        products.forEach(p => {
            productStats[p.name] = { 
                name: p.name, currentStock: Number(p.stock_quantity) || 0, price: Number(p.price) || 0,
                totalSold: 0, revenue: 0, monthlySales: {} 
            };
        });
    }

    if (orders) {
        orders.forEach(o => {
            const month = o.created_at.substring(0, 7);
            o.items?.forEach(item => {
                if(!productStats[item.name]) {
                    productStats[item.name] = { name: item.name, currentStock: 0, price: Number(item.price) || 0, totalSold: 0, revenue: 0, monthlySales: {} };
                }
                const qty = Number(item.quantity) || 0;
                productStats[item.name].totalSold += qty;
                productStats[item.name].revenue += (qty * (Number(item.price) || 0));
                productStats[item.name].monthlySales[month] = (productStats[item.name].monthlySales[month] || 0) + qty;
            });
        });
    }

    let topProduct = null;
    let worstProduct = null;
    let discontinue = [];
    let restock = [];
    let trending = [];

    const currentMonthPrefix = new Date().toISOString().substring(0, 7);

    Object.values(productStats).forEach(p => {
        p.monthlyVelocity = p.totalSold / numMonthsAnalyzed;
        
        const currentMonthSales = p.monthlySales[currentMonthPrefix] || 0;
        if (numMonthsAnalyzed >= 2 && p.monthlyVelocity > 0) {
            if (currentMonthSales >= (p.monthlyVelocity * 2) && currentMonthSales > 5) {
                trending.push(p);
            }
        }

        const idealStock = Math.ceil(p.monthlyVelocity * 2); 
        if (p.currentStock <= (p.monthlyVelocity * 0.5) && p.monthlyVelocity >= 1) {
            restock.push({ ...p, suggestRestock: idealStock > 0 ? idealStock : 10 });
        }

        if (numMonthsAnalyzed >= 2 && p.monthlyVelocity <= 0.5 && p.currentStock > 0) {
            discontinue.push(p);
        }
    });

    const sortedBySold = Object.values(productStats).sort((a,b) => b.totalSold - a.totalSold);
    if (sortedBySold.length > 0) {
        topProduct = sortedBySold[0];
        worstProduct = [...sortedBySold].reverse().find(p => p.currentStock > 0 && !discontinue.includes(p));
    }

    setProductInsights({
        topProduct, worstProduct, 
        discontinueCandidates: discontinue.sort((a,b) => b.currentStock - a.currentStock), 
        restockSuggestions: restock.sort((a,b) => b.monthlyVelocity - a.monthlyVelocity),
        trendingProducts: trending
    });

    if (sortedHistory.length > 0) {
        setDataAgeMonths(sortedHistory.length);
        generateForecast(sortedHistory);
    } else {
        setLoading(false);
    }
  };

  const generateForecast = (history) => {
      const recentHistory = history.slice(-6); 
      let totalRev = 0, totalOutflow = 0;
      let revGrowthRates = [], outGrowthRates = [];

      for (let i = 0; i < recentHistory.length; i++) {
          totalRev += recentHistory[i].revenue;
          totalOutflow += recentHistory[i].outflow;
          if (i > 0) {
              const prevRev = recentHistory[i-1].revenue;
              const currRev = recentHistory[i].revenue;
              if (prevRev > 0) revGrowthRates.push((currRev - prevRev) / prevRev);

              const prevOut = recentHistory[i-1].outflow;
              const currOut = recentHistory[i].outflow;
              if (prevOut > 0) outGrowthRates.push((currOut - prevOut) / prevOut);
          }
      }

      let revVelocity = revGrowthRates.length > 0 ? (revGrowthRates.reduce((a,b)=>a+b, 0) / revGrowthRates.length) : 0;
      revVelocity = Math.max(-0.25, Math.min(0.25, revVelocity)); 

      let outVelocity = outGrowthRates.length > 0 ? (outGrowthRates.reduce((a,b)=>a+b, 0) / outGrowthRates.length) : 0;
      outVelocity = Math.max(-0.20, Math.min(0.20, outVelocity));

      const currentMonth = history[history.length - 1];
      const avgMargin = totalRev > 0 ? ((totalRev - totalOutflow) / totalRev) * 100 : 0;

      setKpi({
          currentRevenue: currentMonth.revenue,
          predictedRevenue: currentMonth.revenue * (1 + revVelocity),
          avgMargin: avgMargin,
          growthVelocity: revVelocity * 100
      });

      const projections = [];
      let lastDate = new Date(currentMonth.month + '-01');
      let projectedRev = currentMonth.revenue;
      let projectedOutflow = currentMonth.outflow || (totalOutflow / recentHistory.length);

      for (let i = 1; i <= 3; i++) {
          lastDate.setMonth(lastDate.getMonth() + 1);
          const nextMonthStr = lastDate.toISOString().substring(0, 7);
          projectedRev = projectedRev * (1 + revVelocity);
          projectedOutflow = projectedOutflow * (1 + outVelocity);
          
          projections.push({
              month: nextMonthStr,
              revenue: Math.max(0, projectedRev), 
              outflow: Math.max(0, projectedOutflow),
              profit: projectedRev - projectedOutflow
          });
      }
      
      if (history.length < 2) {
          setAiInsight("Baseline established. The system requires at least one more month of data to calculate your growth trajectory accurately.");
      } else if (revVelocity > 0.05) {
          setAiInsight(`Strong Growth Trend: Revenue is accelerating at ${(revVelocity*100).toFixed(1)}% MoM. Ensure your inventory levels can support this upcoming demand.`);
      } else if (revVelocity < -0.05) {
          setAiInsight(`Contraction Warning: Revenue is slowing by ${Math.abs(revVelocity*100).toFixed(1)}% MoM. Consider reviewing pricing strategies or marketing outreach.`);
      } else {
          setAiInsight("Stable Trajectory: Revenue and expenses are maintaining a steady, predictable baseline.");
      }

      setHistoricalData(history);
      setForecastData(projections);
      setLoading(false);
  };

  const formatMonth = (yyyy_mm) => {
      const [year, month] = yyyy_mm.split('-');
      const date = new Date(year, month - 1);
      return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // --- CHART.JS CONFIGURATION ---
  const chartLabels = [...historicalData.map(d => formatMonth(d.month)), ...forecastData.map(d => formatMonth(d.month) + ' (Est)')];

  const chartDataConfig = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Total Revenue',
        data: [...historicalData.map(d => d.revenue), ...forecastData.map(d => d.revenue)],
        borderColor: '#1774b5', 
        backgroundColor: 'rgba(23, 116, 181, 0.08)', 
        borderWidth: 2, tension: 0.4, fill: true,   
        pointBackgroundColor: '#ffffff', pointBorderColor: '#1774b5', pointRadius: 3, pointHoverRadius: 5,
      },
      {
        label: 'Total Expense',
        data: [...historicalData.map(d => d.outflow), ...forecastData.map(d => d.outflow)],
        borderColor: '#94a3b8', backgroundColor: 'transparent',
        borderWidth: 2, borderDash: [4, 4], tension: 0.4,
        pointBackgroundColor: '#ffffff', pointBorderColor: '#94a3b8', pointRadius: 3,
      },
      {
        label: 'Net Profit',
        data: [...historicalData.map(d => d.profit), ...forecastData.map(d => d.profit)],
        borderColor: '#10b981', backgroundColor: 'transparent',
        borderWidth: 2, tension: 0.4,
        pointBackgroundColor: '#ffffff', pointBorderColor: '#10b981', pointRadius: 3,
      }
    ],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, padding: 20, font: { family: 'Inter, sans-serif', size: 12 } } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 12, family: 'Inter, sans-serif', weight: 'normal' }, bodyFont: { size: 12, family: 'Inter, sans-serif' }, padding: 10, cornerRadius: 4,
          callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) label += ': '; if (context.parsed.y !== null) { label += 'Rs ' + context.parsed.y.toLocaleString(undefined, {maximumFractionDigits: 0}); } return label; } }
      }
    },
    scales: {
      x: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter, sans-serif', size: 11 }, color: '#64748b' } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9', drawBorder: false },
        ticks: { font: { family: 'Inter, sans-serif', size: 11 }, color: '#64748b',
            callback: function(value) { if (value >= 1000000) return 'Rs ' + (value / 1000000).toFixed(1) + 'M'; if (value >= 1000) return 'Rs ' + (value / 1000).toFixed(1) + 'K'; return 'Rs ' + value; }
        }
      },
    },
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <Activity className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base">Analyzing System Ledgers & Product Demand...</p>
          </div>
      );
  }

  if (historicalData.length === 0) {
      return (
        <div className="p-8 text-center mt-20">
            <LineChartIcon size={40} className="mx-auto text-slate-300 mb-4" />
            <h2 className="text-lg font-medium text-slate-800">Insufficient Data</h2>
            <p className="text-slate-500 mt-2 text-sm">The system requires at least one completed order or expense to run the financial forecast.</p>
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
                 BI Revenue & Demand Forecast
              </h1>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-indigo-200">Beta Version</span>
          </div>
          <p className="text-slate-500 text-sm">Predictive trajectory of income, expenses, and automated product restocking intelligence.</p>
        </div>
      </div>

      {/* MACRO FINANCIAL DASHBOARD */}
      <div className="w-full bg-[#1774b5] text-white p-5 mb-5 rounded-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-blue-400/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 text-white rounded-md">
              <BrainCircuit size={20} />
            </div>
            <div>
              <p className="text-blue-100 text-[10px] font-medium uppercase tracking-widest mb-0.5">Macro Finance Insight</p>
              <h2 className="text-lg font-medium text-white leading-tight">Financial Trajectory</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full">
             <p className="text-sm text-blue-50 bg-blue-900/40 p-2.5 rounded-md inline-flex items-start gap-2 border border-blue-400/20 text-left">
               <Sparkles size={14} className="shrink-0 text-amber-300 mt-0.5" />
               <span className="font-light">{aiInsight}</span>
             </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest"><DollarSign size={12}/> Current MoM</p>
            <p className="text-2xl font-semibold text-white">Rs {kpi.currentRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest"><Target size={12}/> Est. Next Month</p>
            <p className="text-xl font-semibold text-emerald-300 mt-1">Rs {kpi.predictedRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className={`p-3.5 rounded-md border ${kpi.growthVelocity > 0 ? 'bg-emerald-900/30 border-emerald-400/30 text-emerald-100' : kpi.growthVelocity < 0 ? 'bg-rose-900/30 border-rose-400/30 text-rose-100' : 'bg-white/10 border-white/20 text-blue-100'}`}>
            <p className="text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">
                {kpi.growthVelocity > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} Growth Velocity
            </p>
            <p className="text-xl font-semibold mt-1">{Math.abs(kpi.growthVelocity).toFixed(1)}%</p>
          </div>
          <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">Avg Profit Margin</p>
            <p className="text-xl font-semibold text-white mt-1">{kpi.avgMargin.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* DISCLAIMER NOTICE (Flat & Clean) */}
      <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 bg-white ${dataAgeMonths < 6 ? 'border-amber-200/80' : 'border-slate-200/80'}`}>
          <AlertCircle size={18} className={`shrink-0 mt-0.5 ${dataAgeMonths < 6 ? 'text-amber-500' : 'text-[#1774b5]'}`} />
          <div>
              <p className="text-sm font-medium mb-1 text-slate-800">Forecast Accuracy Notice</p>
              <p className="text-xs leading-relaxed text-slate-500">
                  AI predictions can make mistakes. This analysis projects future revenue based on your historical inputs. 
                  To get highly accurate forecasting results, your business data needs to span more than 6 months. 
                  Currently analyzing {dataAgeMonths} month(s) of data. 
                  {dataAgeMonths < 2 && <span className="text-amber-600 block mt-1"> Because there is only 1 month of data, the system assumes a flat 0% growth baseline until a trend is established. </span>} 
              </p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* CHART.JS VISUALIZATION */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-lg flex flex-col h-[400px]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2"><LineChartIcon size={16} className="text-[#1774b5]"/> Income vs. Expense Trajectory</h3>
              </div>
              <div className="p-5 flex-1 w-full relative">
                  <Line data={chartDataConfig} options={chartOptions} />
              </div>
          </div>

          {/* TABULAR PROJECTIONS */}
          <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col h-[400px]">
              <div className="p-5 border-b border-slate-100 shrink-0">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2"><Calendar size={16} className="text-[#1774b5]"/> Timeline</h3>
              </div>
              <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                              <th className="py-3 pl-5 font-medium">Period</th>
                              <th className="py-3 text-right pr-5 font-medium">Net Profit</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {historicalData.slice().reverse().map(d => (
                              <tr key={d.month} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 pl-5">
                                      <p className="text-slate-800">{formatMonth(d.month)}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">Actual</p>
                                  </td>
                                  <td className="py-3 text-right pr-5">
                                      <p className={d.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}>Rs {d.profit.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">Rev: Rs {d.revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                                  </td>
                              </tr>
                          ))}
                          <tr>
                              <td colSpan="2" className="bg-slate-50 py-2 px-5 text-[10px] text-slate-500 uppercase tracking-widest text-center border-y border-slate-100">
                                  Future Forecast
                              </td>
                          </tr>
                          {forecastData.map(d => (
                              <tr key={d.month} className="bg-blue-50/10 hover:bg-blue-50/30 transition-colors">
                                  <td className="py-3 pl-5">
                                      <p className="text-[#1774b5]">{formatMonth(d.month)}</p>
                                      <p className="text-[10px] text-[#1774b5]/60 mt-0.5">Predicted</p>
                                  </td>
                                  <td className="py-3 text-right pr-5">
                                      <p className={d.profit >= 0 ? 'text-[#1774b5]' : 'text-rose-500'}>Rs {d.profit.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">Rev: Rs {d.revenue.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- NEW SECTION: PRODUCT INTELLIGENCE & DEMAND FORECASTING --- */}
      <div className="mb-6 pt-6 border-t border-slate-200/80">
        <h2 className="text-lg font-medium tracking-tight text-slate-800 flex items-center gap-2 mb-1">
            Product Demand & Restock Intelligence
        </h2>
        <p className="text-slate-500 text-sm mb-5">AI analysis of product-level velocity, seasonal spikes, and dead stock identification.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Top / Worst Performers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200/80 p-4 rounded-lg">
                    <p className="text-[10px] text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1"><TrendingUp size={12}/> Best Seller (Volume)</p>
                    {productInsights.topProduct ? (
                        <>
                            <p className="text-slate-800 text-sm leading-tight mb-1">{productInsights.topProduct.name}</p>
                            <p className="text-[11px] text-slate-500">{productInsights.topProduct.totalSold} Units Sold Total</p>
                        </>
                    ) : <p className="text-xs text-slate-400">Not enough data.</p>}
                </div>
                
                <div className="bg-white border border-slate-200/80 p-4 rounded-lg">
                    <p className="text-[10px] text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1"><TrendingDown size={12}/> Worst Active Seller</p>
                    {productInsights.worstProduct ? (
                        <>
                            <p className="text-slate-800 text-sm leading-tight mb-1">{productInsights.worstProduct.name}</p>
                            <p className="text-[11px] text-slate-500">Only {productInsights.worstProduct.totalSold} Units Sold</p>
                        </>
                    ) : <p className="text-xs text-slate-400">Not enough data.</p>}
                </div>
            </div>

            {/* Seasonal / Trending */}
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-lg">
                <p className="text-[10px] text-indigo-700 uppercase tracking-widest mb-2.5 flex items-center gap-1"><Sparkles size={12}/> Seasonal / Trending Demand Spikes</p>
                {productInsights.trendingProducts.length === 0 ? (
                    <p className="text-xs text-indigo-900/60">No unusual seasonal spikes detected this month.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {productInsights.trendingProducts.map((p, idx) => (
                            <span key={idx} className="bg-white border border-indigo-200 text-indigo-800 text-[11px] px-2 py-1 rounded-md">
                                {p.name} <span className="opacity-60 ml-1">(&gt;200% MoM)</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Actionable Tables: Restock vs Discontinue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Restock Recommendations */}
            <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden flex flex-col h-[300px]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><ShoppingCart size={14} className="text-[#1774b5]"/> Automated Restock Guide</h3>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                          <tr className="text-[9px] text-slate-500 uppercase tracking-wider">
                              <th className="py-2.5 px-4 font-medium">Product Name</th>
                              <th className="py-2.5 px-4 text-center font-medium">Run Rate / Mo</th>
                              <th className="py-2.5 px-4 text-center font-medium">Stock</th>
                              <th className="py-2.5 px-4 text-right text-[#1774b5] font-medium">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {productInsights.restockSuggestions.length === 0 ? (
                              <tr><td colSpan="4" className="p-6 text-center text-xs text-slate-400">Inventory levels are healthy. No immediate restocks needed.</td></tr>
                          ) : (
                              productInsights.restockSuggestions.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="py-3 px-4 text-slate-800 truncate max-w-[180px]">{p.name}</td>
                                      <td className="py-3 px-4 text-center text-slate-500 text-xs">{p.monthlyVelocity.toFixed(1)}/mo</td>
                                      <td className="py-3 px-4 text-center"><span className="text-rose-600">{p.currentStock}</span></td>
                                      <td className="py-3 px-4 text-right">
                                          <span className="bg-blue-50 text-[#1774b5] px-2 py-1 rounded text-[10px] border border-blue-200 whitespace-nowrap">
                                              Order {p.suggestRestock}
                                          </span>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
            </div>

            {/* Discontinue / Dead Stock */}
            <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden flex flex-col h-[300px]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500"/> Dead Stock & Liquidation</h3>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                          <tr className="text-[9px] text-slate-500 uppercase tracking-wider">
                              <th className="py-2.5 px-4 font-medium">Product Name</th>
                              <th className="py-2.5 px-4 text-center font-medium">Run Rate / Mo</th>
                              <th className="py-2.5 px-4 text-center font-medium">Stuck Qty</th>
                              <th className="py-2.5 px-4 text-right text-rose-500 font-medium">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {productInsights.discontinueCandidates.length === 0 ? (
                              <tr><td colSpan="4" className="p-6 text-center text-xs text-slate-400">No dead stock detected. All items have positive momentum.</td></tr>
                          ) : (
                              productInsights.discontinueCandidates.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="py-3 px-4 text-slate-800 truncate max-w-[180px]">{p.name}</td>
                                      <td className="py-3 px-4 text-center text-slate-500 text-xs">{p.monthlyVelocity.toFixed(1)}/mo</td>
                                      <td className="py-3 px-4 text-center"><span className="text-slate-600">{p.currentStock}</span></td>
                                      <td className="py-3 px-4 text-right">
                                          <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] border border-rose-200 flex items-center justify-end gap-1 w-fit ml-auto">
                                              Do Not Restock
                                          </span>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
            </div>

        </div>
      </div>

    </div>
  );
};

export default RevenueForecast;