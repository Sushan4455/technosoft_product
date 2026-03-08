import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Wallet, TrendingDown, AlertOctagon, Scissors, Download, 
  Activity, Calendar, LineChart as LineChartIcon, 
  BrainCircuit, Sparkles, AlertCircle, ArrowDownRight, ShieldAlert
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

const CashFlowForecast = () => {
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState([]);
  const [dataAgeMonths, setDataAgeMonths] = useState(0);
  
  const [kpi, setKpi] = useState({
      currentCash: 0,
      monthlyBurnRate: 0,
      netCashFlow: 0,
      runwayMonths: 'Calculating...',
  });

  const [aiInsight, setAiInsight] = useState("");
  const [anomalies, setAnomalies] = useState([]);
  const [cutSuggestions, setCutSuggestions] = useState([]);

  useEffect(() => {
    fetchAndAnalyzeCashFlow();
  }, []);

  const fetchAndAnalyzeCashFlow = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1. Fetch Data
    const { data: accounts } = await supabase.from('chart_of_accounts').select('balance, account_type').eq('user_id', session.user.id).eq('account_type', 'Asset');
    const { data: orders } = await supabase.from('orders').select('created_at, amount, status').eq('user_id', session.user.id).neq('status', 'Cancelled');
    const { data: expenses } = await supabase.from('expenses').select('expense_date, amount, vendor_name').eq('user_id', session.user.id);
    const { data: pos } = await supabase.from('purchase_orders').select('order_date, total_amount').eq('user_id', session.user.id).neq('status', 'Draft');

    // Calculate Starting Liquid Cash (Sum of Asset Accounts)
    let currentLiquidCash = 0;
    if (accounts) {
        accounts.forEach(acc => currentLiquidCash += Number(acc.balance) || 0);
    }

    // --- 2. MONTHLY CASH TIMELINE ---
    const monthlyLedger = {};
    const addToLedger = (dateString, amount, type) => {
        if (!dateString) return;
        const month = dateString.substring(0, 7); 
        if (!monthlyLedger[month]) {
            monthlyLedger[month] = { month, inflow: 0, outflow: 0, net: 0, projectedBalance: 0, isForecast: false };
        }
        if (type === 'inflow') monthlyLedger[month].inflow += Number(amount);
        if (type === 'outflow') monthlyLedger[month].outflow += Number(amount);
        monthlyLedger[month].net = monthlyLedger[month].inflow - monthlyLedger[month].outflow;
    };

    if (orders) orders.forEach(o => addToLedger(o.created_at, o.amount, 'inflow'));
    if (expenses) expenses.forEach(e => addToLedger(e.expense_date, e.amount, 'outflow'));
    if (pos) pos.forEach(p => addToLedger(p.order_date, p.total_amount, 'outflow'));

    const history = Object.values(monthlyLedger).sort((a, b) => a.month.localeCompare(b.month));
    const numMonths = Math.max(1, history.length);
    setDataAgeMonths(history.length);

    // --- 3. FORECASTING & RUNWAY CALCULATION ---
    const recentHistory = history.slice(-3); // Last 3 months for velocity
    let avgInflow = 0, avgOutflow = 0;

    recentHistory.forEach(h => {
        avgInflow += h.inflow;
        avgOutflow += h.outflow;
    });

    avgInflow = recentHistory.length > 0 ? avgInflow / recentHistory.length : 0;
    avgOutflow = recentHistory.length > 0 ? avgOutflow / recentHistory.length : 0;
    const netMonthlyCashFlow = avgInflow - avgOutflow;

    let runway = "Infinite (Profitable)";
    let shortageMonth = null;

    if (netMonthlyCashFlow < 0 && currentLiquidCash > 0) {
        const monthsLeft = Math.abs(currentLiquidCash / netMonthlyCashFlow);
        runway = `${monthsLeft.toFixed(1)} Months`;
    } else if (currentLiquidCash <= 0 && netMonthlyCashFlow < 0) {
        runway = "Immediate Shortage";
        shortageMonth = "Currently Negative";
    }

    // Generate 6-Month Projection Array
    const projections = [];
    let rollingBalance = currentLiquidCash;
    let projectedDate = new Date();

    for (let i = 1; i <= 6; i++) {
        projectedDate.setMonth(projectedDate.getMonth() + 1);
        const nextMonthStr = projectedDate.toISOString().substring(0, 7);
        
        rollingBalance += netMonthlyCashFlow;
        
        if (rollingBalance < 0 && !shortageMonth) {
            shortageMonth = nextMonthStr;
        }

        projections.push({
            month: nextMonthStr,
            inflow: avgInflow,
            outflow: avgOutflow,
            net: netMonthlyCashFlow,
            projectedBalance: rollingBalance,
            isForecast: true
        });
    }

    // --- 4. EXPENSE INTELLIGENCE (Anomalies & Cuts) ---
    const vendorStats = {};
    const currentMonthStr = new Date().toISOString().substring(0, 7);

    if (expenses) {
        expenses.forEach(e => {
            const vName = e.vendor_name?.trim() || 'Uncategorized Expense';
            const m = e.expense_date.substring(0, 7);
            const amt = Number(e.amount);

            if (!vendorStats[vName]) vendorStats[vName] = { name: vName, total: 0, monthsActive: new Set(), currentMonth: 0 };
            
            vendorStats[vName].total += amt;
            vendorStats[vName].monthsActive.add(m);
            if (m === currentMonthStr) vendorStats[vName].currentMonth += amt;
        });
    }

    const detectedAnomalies = [];
    const suggestedCuts = [];

    Object.values(vendorStats).forEach(v => {
        const historicMonths = v.monthsActive.size > 1 ? v.monthsActive.size - (v.monthsActive.has(currentMonthStr) ? 1 : 0) : 1;
        const historicSpend = v.total - v.currentMonth;
        const avgMonthlySpend = historicSpend / historicMonths;

        // Anomaly: Spend is 50% higher than average and over Rs 1,000
        if (v.currentMonth > (avgMonthlySpend * 1.5) && v.currentMonth > 1000 && avgMonthlySpend > 0) {
            detectedAnomalies.push({
                name: v.name,
                spend: v.currentMonth,
                avg: avgMonthlySpend,
                spike: ((v.currentMonth - avgMonthlySpend) / avgMonthlySpend) * 100
            });
        }

        // Cut Suggestions: Top expenses we can realistically reduce by 20%
        if (avgMonthlySpend > 5000) {
            suggestedCuts.push({
                name: v.name,
                avgSpend: avgMonthlySpend,
                potentialSaving: avgMonthlySpend * 0.20 // Suggest 20% cut
            });
        }
    });

    // --- 5. SET STATE & INSIGHTS ---
    setAnomalies(detectedAnomalies.sort((a, b) => b.spike - a.spike));
    setCutSuggestions(suggestedCuts.sort((a, b) => b.potentialSaving - a.potentialSaving).slice(0, 4));

    setKpi({
        currentCash: currentLiquidCash,
        monthlyBurnRate: avgOutflow,
        netCashFlow: netMonthlyCashFlow,
        runwayMonths: runway
    });

    if (shortageMonth) {
        setAiInsight(`Critical Warning: At your current burn rate, the system predicts a complete cash shortage by ${formatMonth(shortageMonth)}. Immediate expense reduction is required.`);
    } else if (detectedAnomalies.length > 0) {
        setAiInsight(`Cash flow is stable, but we detected ${detectedAnomalies.length} unusual spending spikes this month. Review the anomalies below.`);
    } else {
        setAiInsight(`Healthy Liquidity. Cash reserves are growing or maintaining a safe baseline. No immediate shortage risks detected.`);
    }

    setTimelineData([...history, ...projections]);
    setLoading(false);
  };

  const formatMonth = (yyyy_mm) => {
      if(!yyyy_mm) return '';
      const [year, month] = yyyy_mm.split('-');
      const date = new Date(year, month - 1);
      return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // --- CHART CONFIGURATION ---
  const chartDataConfig = {
    labels: timelineData.map(d => formatMonth(d.month) + (d.isForecast ? ' (Est)' : '')),
    datasets: [
      {
        label: 'Projected Cash Balance',
        data: timelineData.map(d => d.isForecast ? d.projectedBalance : null), // Only show lines for future, or calculate backwards if needed. Actually let's just plot the Net Cash Flow for the whole timeline.
        borderColor: '#1774b5', 
        backgroundColor: 'rgba(23, 116, 181, 0.05)', 
        borderWidth: 2, tension: 0.4, fill: true,   
        pointBackgroundColor: '#ffffff', pointBorderColor: '#1774b5', pointRadius: 3,
      },
      {
        label: 'Net Monthly Cash Flow',
        data: timelineData.map(d => d.net),
        borderColor: '#10b981', 
        backgroundColor: 'transparent',
        borderWidth: 2, borderDash: [4, 4], tension: 0.4,
        pointBackgroundColor: '#ffffff', pointBorderColor: '#10b981', pointRadius: 3,
        segment: {
            borderColor: ctx => ctx.p1.parsed.y < 0 ? '#f43f5e' : '#10b981', // Turn line red if net cash is negative
        }
      }
    ],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, font: { family: 'Inter, sans-serif', size: 11 } } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 12, weight: 'normal' }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 4,
          callbacks: { label: function(context) { return context.dataset.label + ': Rs ' + context.parsed.y.toLocaleString(undefined, {maximumFractionDigits: 0}); } }
      }
    },
    scales: {
      x: { grid: { display: false, drawBorder: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
      y: { grid: { color: '#f1f5f9', drawBorder: false },
        ticks: { font: { size: 11 }, color: '#64748b',
            callback: function(value) { if (Math.abs(value) >= 1000000) return 'Rs ' + (value / 1000000).toFixed(1) + 'M'; if (Math.abs(value) >= 1000) return 'Rs ' + (value / 1000).toFixed(1) + 'K'; return 'Rs ' + value; }
        }
      },
    },
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <Wallet className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Auditing Cash Liquidity & Runway...</p>
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
                Cash Flow & Runway Forecast
              </h1>
              <span className="bg-indigo-50 text-indigo-600 text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-indigo-200">AI Analytics</span>
          </div>
          <p className="text-slate-500 text-sm">Predicts cash shortages, identifies spending anomalies, and suggests expense cuts.</p>
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
              <p className="text-blue-100 text-[10px] font-medium uppercase tracking-widest mb-0.5">Liquidity Insight</p>
              <h2 className="text-lg font-medium text-white leading-tight">Runway Trajectory</h2>
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
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">Liquid Cash (Assets)</p>
            <p className="text-2xl font-semibold text-white">Rs {kpi.currentCash.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white/10 p-3.5 rounded-md border border-white/20">
            <p className="text-blue-100 text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">Avg Monthly Burn</p>
            <p className="text-xl font-semibold text-white mt-1">Rs {kpi.monthlyBurnRate.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className={`p-3.5 rounded-md border ${kpi.netCashFlow > 0 ? 'bg-emerald-900/30 border-emerald-400/30 text-emerald-100' : 'bg-rose-900/30 border-rose-400/30 text-rose-100'}`}>
            <p className="text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">Net Cash Flow (MoM)</p>
            <p className="text-xl font-semibold mt-1">{kpi.netCashFlow > 0 ? '+' : ''} Rs {kpi.netCashFlow.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className={`p-3.5 rounded-md border ${kpi.runwayMonths.includes('Infinite') ? 'bg-white/10 border-white/20 text-blue-100' : 'bg-rose-500/20 border-rose-400/40 text-rose-100'}`}>
            <p className="text-[10px] mb-1 flex items-center gap-1.5 uppercase tracking-widest">Calculated Runway</p>
            <p className={`text-xl font-semibold mt-1 ${kpi.runwayMonths.includes('Infinite') ? 'text-white' : 'text-rose-300'}`}>{kpi.runwayMonths}</p>
          </div>
        </div>
      </div>

      {/* DISCLAIMER NOTICE */}
      <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 bg-white ${dataAgeMonths < 3 ? 'border-amber-200/80' : 'border-slate-200/80'}`}>
          <AlertCircle size={18} className={`shrink-0 mt-0.5 ${dataAgeMonths < 3 ? 'text-amber-500' : 'text-[#1774b5]'}`} />
          <div>
              <p className="text-sm font-medium mb-1 text-slate-800">Prediction Context</p>
              <p className="text-xs leading-relaxed text-slate-500">
                  This forecast assumes your average monthly burn rate and inflows remain constant. It pulls starting liquidity directly from your Chart of Accounts (Asset balances). 
                  {dataAgeMonths < 3 && <span className="text-amber-600 font-medium ml-1">Requires 3+ months of data for optimal accuracy.</span>}
              </p>
          </div>
      </div>

      {/* VISUAL CHART */}
      <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col h-[350px] mb-6">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-medium text-slate-800 flex items-center gap-2"><LineChartIcon size={16} className="text-[#1774b5]"/> 6-Month Cash Trajectory</h3>
          </div>
          <div className="p-5 flex-1 w-full relative">
              <Line data={chartDataConfig} options={chartOptions} />
          </div>
      </div>

      {/* --- NEW SECTION: EXPENSE AUDITING & PRESERVATION --- */}
      <div className="mb-6 pt-6 border-t border-slate-200/80">
        <h2 className="text-lg font-medium tracking-tight text-slate-800 flex items-center gap-2 mb-1">
             Cash Preservation & Auditing
        </h2>
        <p className="text-slate-500 text-sm mb-5">AI analysis of your vendor spending habits to identify waste and extend runway.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Unusual Spending Anomalies */}
            <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden flex flex-col h-[350px]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><AlertOctagon size={14} className="text-rose-500"/> Unusual Spending Spikes</h3>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                          <tr className="text-[9px] text-slate-500 uppercase tracking-wider">
                              <th className="py-2.5 px-4 font-medium">Vendor / Category</th>
                              <th className="py-2.5 px-4 text-right font-medium">Avg Spend</th>
                              <th className="py-2.5 px-4 text-right text-rose-600 font-medium">This Month</th>
                              <th className="py-2.5 px-4 text-right font-medium">Spike %</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {anomalies.length === 0 ? (
                              <tr><td colSpan="4" className="p-6 text-center text-xs text-slate-400">No unusual spending detected this month. Expenses are within historical norms.</td></tr>
                          ) : (
                              anomalies.map((a, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-[150px]">{a.name}</td>
                                      <td className="py-3 px-4 text-right text-slate-500 text-xs">Rs {a.avg.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                      <td className="py-3 px-4 text-right font-semibold text-rose-600">Rs {a.spend.toLocaleString()}</td>
                                      <td className="py-3 px-4 text-right">
                                          <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px] border border-rose-200 whitespace-nowrap">
                                              +{a.spike.toFixed(0)}%
                                          </span>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
            </div>

            {/* Recommended Expense Cuts */}
            <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden flex flex-col h-[350px]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/50">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><ArrowDownRight size={14} className="text-emerald-600"/> Recommended Expense Cuts (20% Target)</h3>
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                          <tr className="text-[9px] text-slate-500 uppercase tracking-wider">
                              <th className="py-2.5 px-4 font-medium">Vendor / Category</th>
                              <th className="py-2.5 px-4 text-right font-medium">Current Spend</th>
                              <th className="py-2.5 px-4 text-right text-emerald-600 font-medium">Potential Savings</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {cutSuggestions.length === 0 ? (
                              <tr><td colSpan="3" className="p-6 text-center text-xs text-slate-400">Not enough expense data to generate reduction targets.</td></tr>
                          ) : (
                              cutSuggestions.map((c, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                      <td className="py-3 px-4 text-slate-800 font-medium truncate max-w-[180px]">{c.name}</td>
                                      <td className="py-3 px-4 text-right text-slate-500 text-xs">Rs {c.avgSpend.toLocaleString(undefined, {maximumFractionDigits:0})} /mo</td>
                                      <td className="py-3 px-4 text-right">
                                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-200 flex items-center justify-end gap-1 w-fit ml-auto">
                                              Save Rs {c.potentialSaving.toLocaleString(undefined, {maximumFractionDigits:0})}
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

export default CashFlowForecast;