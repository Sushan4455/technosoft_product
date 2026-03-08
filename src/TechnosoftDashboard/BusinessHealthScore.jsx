import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  HeartPulse, TrendingUp, TrendingDown, Activity, 
  ShieldCheck, AlertTriangle, Target, BrainCircuit, 
  Sparkles, Download, CheckCircle2, XCircle, ArrowRight,
  LineChart as LineChartIcon
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler, RadialLinearScale
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

const BusinessHealthScore = () => {
  const [loading, setLoading] = useState(true);

  // Health State
  const [healthData, setHealthData] = useState({
      overallScore: 0,
      level: 'Analyzing...',
      trend: 'Stable',
      trendValue: 0,
      scores: { financial: 0, sales: 0, operational: 0, customer: 0, risk: 0 },
      factors: { positive: [], negative: [] },
      forecast: [],
      actions: []
  });

  const [aiInsight, setAiInsight] = useState("");

  useEffect(() => {
    fetchAndCalculateHealth();
  }, []);

  const fetchAndCalculateHealth = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1. Fetch Master Data
    const { data: orders } = await supabase.from('orders').select('amount, created_at, customer_name, status').eq('user_id', session.user.id).neq('status', 'Cancelled');
    const { data: expenses } = await supabase.from('expenses').select('amount, expense_date').eq('user_id', session.user.id);
    const { data: products } = await supabase.from('products').select('name, stock_quantity, status').eq('user_id', session.user.id);
    const { data: accounts } = await supabase.from('chart_of_accounts').select('balance, account_type').eq('user_id', session.user.id);
    
    const now = new Date();
    const currentMonthPrefix = now.toISOString().substring(0, 7);
    const lastMonth = new Date(); lastMonth.setMonth(now.getMonth() - 1);
    const lastMonthPrefix = lastMonth.toISOString().substring(0, 7);

    // --- 2. CALCULATE RAW METRICS ---
    let thisMonthRev = 0, lastMonthRev = 0, totalRev = 0;
    let thisMonthExp = 0, lastMonthExp = 0;
    const customerRev = {};

    if (orders) {
        orders.forEach(o => {
            const amt = Number(o.amount);
            const m = o.created_at.substring(0, 7);
            const cName = o.customer_name?.trim() || 'Walk-in';
            
            totalRev += amt;
            if (m === currentMonthPrefix) thisMonthRev += amt;
            if (m === lastMonthPrefix) lastMonthRev += amt;

            if (!customerRev[cName]) customerRev[cName] = 0;
            customerRev[cName] += amt;
        });
    }

    if (expenses) {
        expenses.forEach(e => {
            const amt = Number(e.amount);
            const m = e.expense_date.substring(0, 7);
            if (m === currentMonthPrefix) thisMonthExp += amt;
            if (m === lastMonthPrefix) lastMonthExp += amt;
        });
    }

    let liquidCash = 0, liabilities = 0;
    if (accounts) {
        accounts.forEach(a => {
            if (a.account_type === 'Asset') liquidCash += Number(a.balance);
            if (a.account_type === 'Liability') liabilities += Number(a.balance);
        });
    }

    let stockOuts = 0, activeProducts = 0;
    if (products) {
        products.forEach(p => {
            if (p.status !== 'Draft') {
                activeProducts++;
                if (Number(p.stock_quantity) <= 0) stockOuts++;
            }
        });
    }

    const currentNetProfit = thisMonthRev - thisMonthExp;

    // --- 3. COMPUTE 5 SIMPLE SUB-SCORES (0-100) ---
    
    // A. Cash & Profits
    let financialScore = 50;
    const currentMargin = thisMonthRev > 0 ? (currentNetProfit / thisMonthRev) * 100 : 0;
    if (currentMargin > 20) financialScore += 25;
    else if (currentMargin > 5) financialScore += 10;
    else if (currentMargin < 0) financialScore -= 20;

    const currentRatio = liabilities > 0 ? liquidCash / liabilities : 2;
    if (currentRatio > 1.5) financialScore += 25;
    else if (currentRatio < 1) financialScore -= 20;
    financialScore = Math.max(10, Math.min(100, financialScore));

    // B. Sales & Growth
    let salesScore = 50;
    let momGrowth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;
    if (momGrowth > 10) salesScore += 30;
    else if (momGrowth > 0) salesScore += 15;
    else if (momGrowth < -10) salesScore -= 25;
    if (thisMonthRev > 10000) salesScore += 20; 
    salesScore = Math.max(10, Math.min(100, salesScore));

    // C. Smooth Operations (Stock and Spending)
    let opsScore = 80; 
    const stockOutRate = activeProducts > 0 ? (stockOuts / activeProducts) * 100 : 0;
    if (stockOutRate > 20) opsScore -= 30;
    else if (stockOutRate > 5) opsScore -= 15;
    if (thisMonthExp > lastMonthExp * 1.2 && thisMonthRev <= lastMonthRev) opsScore -= 20; 
    opsScore = Math.max(10, Math.min(100, opsScore));

    // D. Customer Loyalty
    let custScore = 70;
    let maxCustDependency = 0;
    if (totalRev > 0) {
        Object.values(customerRev).forEach(rev => {
            const pct = (rev / totalRev) * 100;
            if (pct > maxCustDependency) maxCustDependency = pct;
        });
    }
    if (maxCustDependency > 40) custScore -= 40;
    else if (maxCustDependency > 20) custScore -= 20;
    else custScore += 20;
    custScore = Math.max(10, Math.min(100, custScore));

    // E. Safety & Survival
    let riskScore = 100; 
    if (liquidCash < thisMonthExp * 2) riskScore -= 30; 
    if (momGrowth < -20) riskScore -= 20;
    if (maxCustDependency > 50) riskScore -= 20;
    riskScore = Math.max(10, Math.min(100, riskScore));

    // --- 4. OVERALL SCORE & LEVEL ---
    const overallScore = Math.round((financialScore * 0.25) + (salesScore * 0.25) + (opsScore * 0.15) + (custScore * 0.15) + (riskScore * 0.20));
    
    let level = 'Okay';
    if (overallScore >= 80) level = 'Excellent';
    else if (overallScore >= 60) level = 'Good';
    else if (overallScore >= 40) level = 'Needs Help';
    else level = 'In Danger';

    let trend = 'Staying the Same';
    let trendValue = momGrowth > 0 ? 5 : momGrowth < 0 ? -5 : 0; 
    if (trendValue >= 5) trend = 'Getting Better';
    else if (trendValue <= -5) trend = 'Going Down';

    // --- 5. FACTORS & DYNAMIC ACTIONS ---
    const scoreMap = [
        { name: 'Cash & Profits', val: financialScore },
        { name: 'Sales & Growth', val: salesScore },
        { name: 'Smooth Operations', val: opsScore },
        { name: 'Customer Loyalty', val: custScore },
        { name: 'Safety & Survival', val: riskScore }
    ];
    scoreMap.sort((a,b) => b.val - a.val);

    const posFactors = scoreMap.slice(0, 2).map(s => `Your ${s.name} is very strong right now (${s.val}/100)`);
    const negFactors = scoreMap.slice(-2).map(s => `Your ${s.name} is pulling your score down (${s.val}/100)`);

    // DYNAMIC ACTION ENGINE
    const actionList = [];

    // Profit Context
    if (currentNetProfit < 0) {
        actionList.push("Stop the bleeding: You are operating at a loss. Cut non-essential expenses immediately.");
        actionList.push("Review your pricing: You are currently spending more than you are earning.");
    } else if (currentNetProfit > 0 && overallScore >= 80) {
        actionList.push("High Profitability: Consider reinvesting 10-20% of your profits into marketing to grow even faster.");
        actionList.push("Explore scaling: Look into expanding your product line or testing new premium services.");
    }

    // Specific Pillar Contexts
    if (financialScore < 50 && currentNetProfit >= 0) {
        actionList.push("Profit margins are shrinking. Audit your supplier costs and negotiate better rates.");
    }
    if (salesScore < 50) {
        actionList.push("Sales are slowing down. Run a flash sale or email past customers with a special discount.");
    }
    if (opsScore < 60) {
        actionList.push("Inventory issues detected. Check your stock levels and reorder your best-selling items immediately.");
    }
    if (custScore < 60) {
        actionList.push("You are relying too heavily on a few big clients. Focus on finding new customers to balance the risk.");
    }
    if (riskScore < 50) {
        actionList.push("Cash reserves are low. Delay any large equipment purchases until your bank balance increases.");
    }

    // Fallbacks if everything is somewhat normal
    if (actionList.length === 0) {
        actionList.push("Your business is perfectly stable. Keep operations steady.");
        actionList.push("Look for small ways to improve customer experience and build long-term loyalty.");
    }

    // Ensure we only show the top 4 most relevant actions
    const finalActions = actionList.slice(0, 4);

    // --- 6. AI SUMMARY (SIMPLE) ---
    let insight = "";
    if (overallScore >= 80) insight = "Your business is doing amazing! Cash is flowing, sales are going up, and things are running smoothly.";
    else if (overallScore >= 60) insight = "Your business is stable. Things are okay, but you can make a few small changes below to grow even faster.";
    else if (overallScore >= 40) insight = "Warning: Your business is facing some risks. Please look at the 'What to Do Next' section to fix these issues.";
    else insight = "Danger: Your business needs urgent help. Cash or sales are dangerously low. Please take action immediately to save the business.";

    // --- 7. PREDICTIVE FORECAST ---
    const fCast = [
        Math.max(0, overallScore - (trendValue * 2)), 
        Math.max(0, overallScore - trendValue),       
        overallScore,                    
        Math.min(100, overallScore + trendValue), 
        Math.min(100, overallScore + (trendValue * 1.5)) 
    ];

    setHealthData({
        overallScore, level, trend, trendValue,
        scores: { financial: financialScore, sales: salesScore, operational: opsScore, customer: custScore, risk: riskScore },
        factors: { positive: posFactors, negative: negFactors },
        forecast: fCast, actions: finalActions
    });
    
    setAiInsight(insight);
    setLoading(false);
  };

  // --- CHART CONFIGURATIONS ---
  const radarData = {
    labels: ['Cash & Profits', 'Sales & Growth', 'Operations', 'Customer Loyalty', 'Safety'],
    datasets: [{
      label: 'Health Breakdown',
      data: [healthData.scores.financial, healthData.scores.sales, healthData.scores.operational, healthData.scores.customer, healthData.scores.risk],
      backgroundColor: 'rgba(23, 116, 181, 0.2)',
      borderColor: '#1774b5',
      pointBackgroundColor: '#1774b5',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#1774b5',
      borderWidth: 2,
    }]
  };

  const radarOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      r: { angleLines: { color: 'rgba(0, 0, 0, 0.05)' }, grid: { color: 'rgba(0, 0, 0, 0.05)' }, pointLabels: { font: { family: 'Inter', size: 11, weight: '500' }, color: '#64748b' }, suggestedMin: 0, suggestedMax: 100, ticks: { display: false } }
    },
    plugins: { legend: { display: false }, tooltip: { bodyFont: { family: 'Inter' } } }
  };

  const forecastData = {
      labels: ['2 Months Ago', 'Last Month', 'Right Now', 'Next Month', 'In 2 Months'],
      datasets: [{
          label: 'Expected Score',
          data: healthData.forecast,
          borderColor: healthData.trendValue >= 0 ? '#10b981' : '#f43f5e',
          backgroundColor: 'transparent',
          borderWidth: 2, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fff'
      }]
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <HeartPulse className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Calculating your simple health score...</p>
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
                <HeartPulse className="text-[#1774b5]" size={22}/> Business Health Score
              </h1>
              <span className="bg-blue-50 text-[#1774b5] text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-blue-200">Easy Checkup</span>
          </div>
          <p className="text-slate-500 text-sm">A simple 0-100 score showing how safe, profitable, and strong your business is right now.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors">
            <Download size={14} className="text-[#1774b5]" /> Download Report
        </button>
      </div>

      {/* TOP AI BANNER (Master Score) */}
      <div className={`w-full text-white p-6 mb-6 rounded-lg ${
          healthData.level === 'Excellent' ? 'bg-emerald-600' : 
          healthData.level === 'Good' ? 'bg-[#1774b5]' : 
          healthData.level === 'Needs Help' ? 'bg-amber-500' : 'bg-rose-600'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-white/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 text-white rounded-md">
              <BrainCircuit size={24} />
            </div>
            <div>
              <p className="text-white/80 text-[10px] font-medium uppercase tracking-widest mb-0.5">AI Health Check</p>
              <h2 className="text-2xl font-bold text-white leading-tight uppercase tracking-wide">{healthData.level}</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full flex items-center md:justify-end gap-5">
             <div className="text-right">
                 <span className="text-sm font-medium text-white/90 block">Score out of 100</span>
                 <span className="text-[10px] font-medium text-white/70 uppercase tracking-widest flex items-center justify-end gap-1">
                     {healthData.trend === 'Getting Better' ? <TrendingUp size={10}/> : healthData.trend === 'Going Down' ? <TrendingDown size={10}/> : <Activity size={10}/>} 
                     {healthData.trend}
                 </span>
             </div>
             <div className="w-16 h-16 relative flex items-center justify-center bg-white/10 rounded-full border-2 border-white/40">
                <span className="text-2xl font-black text-white leading-none">{healthData.overallScore}</span>
             </div>
          </div>
        </div>
        
        <div>
             <p className="text-sm font-medium text-white/90 bg-black/10 p-3.5 rounded-md inline-flex items-start gap-2 border border-white/10 w-full">
               <Sparkles size={16} className="shrink-0 text-white/80 mt-0.5" />
               <span className="leading-relaxed">{aiInsight}</span>
             </p>
        </div>
      </div>

      {/* 5 SIMPLE SCORE CARDS */}
      <h3 className="text-sm font-medium text-slate-800 uppercase tracking-widest mb-4">Your Scores in Detail</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <ScoreCard title="Cash & Profits" score={healthData.scores.financial} />
          <ScoreCard title="Sales & Growth" score={healthData.scores.sales} />
          <ScoreCard title="Smooth Operations" score={healthData.scores.operational} />
          <ScoreCard title="Customer Loyalty" score={healthData.scores.customer} />
          <ScoreCard title="Safety & Survival" score={healthData.scores.risk} />
      </div>

      {/* LOWER SECTION: RADAR, FACTORS, ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Radar Chart Component Analysis */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-lg p-5 flex flex-col h-[350px]">
              <h3 className="text-sm font-medium text-slate-800 mb-2 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Target size={16} className="text-[#1774b5]"/> Visual Health Breakdown
              </h3>
              <div className="flex-1 w-full relative flex items-center justify-center p-2">
                  <Radar data={radarData} options={radarOptions} />
              </div>
          </div>

          {/* Positive / Negative Factors */}
          <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-lg flex flex-col h-[350px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2">What's going well & What needs work</h3>
              </div>
              <div className="p-5 flex-1 overflow-y-auto space-y-5">
                  <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3 border-b border-emerald-100 pb-1">What You're Doing Great</p>
                      <ul className="space-y-2">
                          {healthData.factors.positive.map((p, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> {p}
                              </li>
                          ))}
                      </ul>
                  </div>
                  <div>
                      <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-3 border-b border-rose-100 pb-1">Where You Can Improve</p>
                      <ul className="space-y-2">
                          {healthData.factors.negative.map((n, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                  <XCircle size={14} className="text-rose-500 shrink-0 mt-0.5" /> {n}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </div>

          {/* Action Plan & Forecast */}
          <div className="lg:col-span-1 flex flex-col gap-6">
              
              <div className="bg-white border border-slate-200/80 rounded-lg flex flex-col flex-1">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                      <h3 className="font-medium text-sm text-slate-800 flex items-center gap-2"><ShieldCheck size={16} className="text-[#1774b5]"/> What To Do Next</h3>
                  </div>
                  <div className="p-4 flex-1 space-y-3">
                      {healthData.actions.map((act, i) => (
                          <div key={i} className="flex items-start gap-2 bg-blue-50/50 border border-blue-100 p-3 rounded-md">
                              <ArrowRight size={14} className="text-[#1774b5] shrink-0 mt-0.5" />
                              <p className="text-xs font-medium text-slate-700 leading-relaxed">{act}</p>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-lg p-4 h-[140px] flex flex-col">
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <LineChartIcon size={12}/> Future Prediction (Next 3 Months)
                  </h3>
                  <div className="flex-1 w-full relative">
                      <Line data={forecastData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { padding: 8, bodyFont: {size:11} } }, scales: { x: { grid: { display: false }, ticks: {font: {size: 9}, color: '#94a3b8'} }, y: { grid: { display: false }, min: 0, max: 100, ticks: {display: false} } } }} />
                  </div>
              </div>

          </div>

      </div>

    </div>
  );
};

// Mini Score Card Component (Simplified Text)
const ScoreCard = ({ title, score }) => {
    let color = 'bg-emerald-500';
    if (score < 40) color = 'bg-rose-500';
    else if (score < 70) color = 'bg-amber-500';

    return (
        <div className="bg-white border border-slate-200/80 p-4 rounded-lg flex flex-col">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 truncate">{title}</p>
            <p className="text-2xl font-black text-slate-800 mb-2 leading-none">{score}</p>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-auto">
                <div className={`h-full ${color}`} style={{ width: `${score}%` }}></div>
            </div>
        </div>
    );
}

export default BusinessHealthScore;