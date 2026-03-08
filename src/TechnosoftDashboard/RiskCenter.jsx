import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  ShieldAlert, AlertTriangle, AlertOctagon, TrendingDown, 
  PackageX, Users, Wallet, BrainCircuit, Sparkles, 
  Download, ArrowRight, Activity, Sliders, Truck, DollarSign, FileWarning
} from 'lucide-react';

const RiskCenter = () => {
  const [loading, setLoading] = useState(true);
  
  // Base Risk Intelligence States
  const [baseRiskScore, setBaseRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState("Analyzing...");
  const [smartAlerts, setSmartAlerts] = useState([]);
  
  // Metric Breakdown States
  const [metrics, setMetrics] = useState({
      salesGrowth: 0,
      cashRunway: 0, 
      liquidCash: 0,
      baseInflow: 0,
      baseOutflow: 0,
      stockOutCount: 0,
      overstockCount: 0,
      maxCustomerDependency: 0,
      topCustomerName: '',
      supplierDependency: 0,
      topSupplierName: '',
      overduePayments: 0
  });

  // What-If Simulation States
  const [simSalesDrop, setSimSalesDrop] = useState(0);
  const [simExpenseIncrease, setSimExpenseIncrease] = useState(0);

  const [aiInsight, setAiInsight] = useState("");

  useEffect(() => {
    fetchAndAnalyzeRisks();
  }, []);

  const fetchAndAnalyzeRisks = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: orders } = await supabase.from('orders').select('amount, created_at, customer_name, status').eq('user_id', session.user.id).neq('status', 'Cancelled');
    const { data: expenses } = await supabase.from('expenses').select('amount, expense_date, vendor_name').eq('user_id', session.user.id);
    const { data: products } = await supabase.from('products').select('name, stock_quantity, status').eq('user_id', session.user.id);
    const { data: accounts } = await supabase.from('chart_of_accounts').select('balance').eq('user_id', session.user.id).eq('account_type', 'Asset');
    const { data: customers } = await supabase.from('customers').select('name, outstanding_balance').eq('user_id', session.user.id);

    const alerts = [];
    let calculatedRisk = 10; 

    const now = new Date();
    const currentMonthPrefix = now.toISOString().substring(0, 7);
    const lastMonth = new Date(); lastMonth.setMonth(now.getMonth() - 1);
    const lastMonthPrefix = lastMonth.toISOString().substring(0, 7);

    // --- SALES & CUSTOMER RISK ---
    let thisMonthRev = 0, lastMonthRev = 0, totalRev = 0;
    const customerRevenue = {};
    let suspiciousFound = false;

    if (orders) {
        let avgOrderValue = orders.length > 0 ? (orders.reduce((sum, o) => sum + Number(o.amount), 0) / orders.length) : 0;
        
        orders.forEach(o => {
            const amt = Number(o.amount) || 0;
            const month = o.created_at.substring(0, 7);
            const cName = o.customer_name?.trim() || 'Unknown';

            totalRev += amt;
            if (month === currentMonthPrefix) thisMonthRev += amt;
            if (month === lastMonthPrefix) lastMonthRev += amt;

            if (!customerRevenue[cName]) customerRevenue[cName] = 0;
            customerRevenue[cName] += amt;

            if (amt > (avgOrderValue * 5) && avgOrderValue > 1000 && !suspiciousFound && month === currentMonthPrefix) {
                alerts.push({ level: 'medium', icon: FileWarning, title: 'Suspicious Transaction Detected', desc: `An order from ${cName} was 5x higher than average.`, action: 'Audit Transaction' });
                calculatedRisk += 10;
                suspiciousFound = true;
            }
        });
    }

    let momGrowth = 0;
    if (lastMonthRev > 0) {
        momGrowth = ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100;
        if (momGrowth <= -15) {
            alerts.push({ level: 'high', icon: TrendingDown, title: 'Severe Revenue Contraction', desc: `Sales dropped by ${Math.abs(momGrowth).toFixed(1)}% MoM.`, action: 'Review Strategy' });
            calculatedRisk += 20;
        }
    }

    let maxCustDependency = 0;
    let topClient = '';
    if (totalRev > 0) {
        Object.entries(customerRevenue).forEach(([name, rev]) => {
            const pct = (rev / totalRev) * 100;
            if (pct > maxCustDependency) { maxCustDependency = pct; topClient = name; }
        });

        if (maxCustDependency >= 30) {
            alerts.push({ level: 'high', icon: Users, title: 'Customer Concentration Risk', desc: `${topClient} drives ${maxCustDependency.toFixed(1)}% of total revenue.`, action: 'Diversify Client Base' });
            calculatedRisk += 15;
        }
    }

    let totalOverdue = 0;
    if (customers) {
        customers.forEach(c => totalOverdue += Number(c.outstanding_balance || 0));
        if (totalOverdue > (totalRev * 0.1) && totalRev > 0) {
            alerts.push({ level: 'high', icon: DollarSign, title: 'High Overdue Receivables', desc: `Rs ${totalOverdue.toLocaleString()} is locked in unpaid client debt.`, action: 'Initiate Collections' });
            calculatedRisk += 15;
        }
    }

    // --- OPERATIONAL / SUPPLIER RISK ---
    const vendorSpend = {};
    let totalSpend = 0;
    if (expenses) {
        expenses.forEach(e => {
            const amt = Number(e.amount);
            const vName = e.vendor_name?.trim() || 'General';
            totalSpend += amt;
            if (!vendorSpend[vName]) vendorSpend[vName] = 0;
            vendorSpend[vName] += amt;
        });
    }
    
    let maxSuppDependency = 0;
    let topSupplier = '';
    if (totalSpend > 0) {
        Object.entries(vendorSpend).forEach(([name, amt]) => {
            const pct = (amt / totalSpend) * 100;
            if (pct > maxSuppDependency && name !== 'General') { maxSuppDependency = pct; topSupplier = name; }
        });
        if (maxSuppDependency >= 40) {
            alerts.push({ level: 'medium', icon: Truck, title: 'Single Supplier Dependency', desc: `You rely on ${topSupplier} for ${maxSuppDependency.toFixed(0)}% of expenses.`, action: 'Find Backup Vendors' });
            calculatedRisk += 10;
        }
    }

    // --- INVENTORY RISK ---
    let stockOuts = 0, overstocks = 0;
    if (products) {
        products.forEach(p => {
            const sq = Number(p.stock_quantity);
            if (sq <= 0 && p.status !== 'Draft') stockOuts++;
            if (sq > 500) overstocks++; 
        });
        if (stockOuts > 3) {
            alerts.push({ level: 'medium', icon: PackageX, title: 'Stock-out Warning', desc: `${stockOuts} active products are fully depleted.`, action: 'Restock Now' });
            calculatedRisk += 10;
        }
        if (overstocks > 5) {
            alerts.push({ level: 'medium', icon: AlertOctagon, title: 'Capital Trapped in Overstock', desc: `${overstocks} products have excessive inventory levels.`, action: 'Run Liquidation Sale' });
            calculatedRisk += 5;
        }
    }

    // --- FINANCIAL / CASH FLOW RISK ---
    let liquidCash = 0;
    if (accounts) accounts.forEach(a => liquidCash += Number(a.balance) || 0);

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutOffDate = thirtyDaysAgo.toISOString();

    let recentInflow = 0, recentOutflow = 0;
    if (orders) orders.filter(o => o.created_at >= cutOffDate).forEach(o => recentInflow += Number(o.amount));
    if (expenses) expenses.filter(e => e.expense_date >= cutOffDate).forEach(e => recentOutflow += Number(e.amount));

    const netCashFlow = recentInflow - recentOutflow;
    let baseRunway = 999; 

    if (netCashFlow < 0) {
        baseRunway = liquidCash <= 0 ? 0 : Math.abs(liquidCash / netCashFlow);
        if (baseRunway < 3) {
            alerts.push({ level: 'high', icon: Wallet, title: 'Cash Flow Shortage Alert', desc: `At current burn, cash will deplete in ${baseRunway.toFixed(1)} months.`, action: 'Cut Expenses' });
            calculatedRisk += 25;
        }
    }

    // --- FINALIZE RISK SCORE ---
    calculatedRisk = Math.max(0, Math.min(100, calculatedRisk));
    let level = calculatedRisk >= 70 ? "Critical Danger" : calculatedRisk >= 40 ? "Elevated Risk" : "Stable & Low Risk";

    if (calculatedRisk >= 70) setAiInsight("Immediate action required. High-severity threats detected across liquidity and concentration.");
    else if (calculatedRisk >= 40) setAiInsight("Vulnerabilities detected. Review supplier dependencies and pending receivables.");
    else {
        setAiInsight("Business systems are healthy. No imminent threats to runway or operations detected.");
        if (alerts.length === 0) alerts.push({ level: 'safe', icon: ShieldAlert, title: 'All Systems Optimal', desc: 'No significant risks detected.', action: 'Continue Operations' });
    }

    setBaseRiskScore(Math.round(calculatedRisk));
    setRiskLevel(level);
    setSmartAlerts(alerts.sort((a,b) => a.level === 'high' ? -1 : 1));
    
    setMetrics({
        salesGrowth: momGrowth, cashRunway: baseRunway, liquidCash, baseInflow: recentInflow, baseOutflow: recentOutflow,
        stockOutCount: stockOuts, overstockCount: overstocks,
        maxCustomerDependency: maxCustDependency, topCustomerName: topClient,
        supplierDependency: maxSuppDependency, topSupplierName: topSupplier, overduePayments: totalOverdue
    });

    setLoading(false);
  };

  // --- BUTTON CLICK HANDLER ---
  const handleAlertAction = (actionTitle) => {
      // In a real app, you would use React Router's useNavigate() here.
      // For now, we trigger a clear alert to prove interactivity is functioning.
      alert(`System Action Triggered: [${actionTitle}]\n\nRedirecting you to the appropriate module to resolve this risk...`);
  };

  // --- WHAT-IF SIMULATION LOGIC ---
  const simulatedInflow = metrics.baseInflow * (1 - (simSalesDrop / 100));
  const simulatedOutflow = metrics.baseOutflow * (1 + (simExpenseIncrease / 100));
  const simulatedNet = simulatedInflow - simulatedOutflow;
  
  let simulatedRunway = "Infinite";
  let simulatedScore = baseRiskScore;

  if (simulatedNet < 0) {
      const months = metrics.liquidCash / Math.abs(simulatedNet);
      simulatedRunway = `${months.toFixed(1)} Months`;
      if (months < 3) simulatedScore += 20;
      else if (months < 6) simulatedScore += 10;
  }
  if (simSalesDrop >= 20) simulatedScore += 15;
  simulatedScore = Math.min(100, simulatedScore);

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <ShieldAlert className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Scanning System for Multi-Vector Risks...</p>
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
                <AlertOctagon className="text-rose-600" size={22}/> Command Risk Center
              </h1>
              <span className="bg-rose-50 text-rose-600 text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-rose-200">System Audit</span>
          </div>
          <p className="text-slate-500 text-sm">Automated threat detection, cash shortage alerts, and operational stress-testing.</p>
        </div>
      </div>

      {/* TOP AI BANNER (Risk Score) */}
      <div className={`w-full text-white p-6 mb-6 rounded-lg ${baseRiskScore >= 70 ? 'bg-rose-600' : baseRiskScore >= 40 ? 'bg-amber-500' : 'bg-[#1774b5]'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-5 pb-5 border-b border-white/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 text-white rounded-md">
              <BrainCircuit size={24} />
            </div>
            <div>
              <p className="text-white/80 text-[10px] font-medium uppercase tracking-widest mb-0.5">AI Threat Assessment</p>
              <h2 className="text-xl font-bold text-white leading-tight">{riskLevel}</h2>
            </div>
          </div>
          <div className="flex-1 md:text-right w-full flex items-center md:justify-end gap-4">
             <span className="text-sm font-medium text-white/90">Overall Risk Score</span>
             <div className="w-14 h-14 relative flex items-center justify-center bg-white/10 rounded-full border-2 border-white/30">
                <span className="text-xl font-bold text-white leading-none">{baseRiskScore}</span>
             </div>
          </div>
        </div>
        
        <div>
             <p className="text-sm font-medium text-white/90 bg-black/10 p-3 rounded-md inline-flex items-start gap-2 border border-white/10 w-full">
               <Sparkles size={16} className="shrink-0 text-white/80 mt-0.5" />
               <span className="leading-relaxed">{aiInsight}</span>
             </p>
        </div>
      </div>

      {/* SMART ALERTS PANEL (Full Width, 2 Columns) */}
      <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={16} className="text-[#1774b5]"/> Active Smart Alerts
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {smartAlerts.map((alert, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                      alert.level === 'high' ? 'bg-rose-50/50 border-rose-200' : 
                      alert.level === 'medium' ? 'bg-amber-50/50 border-amber-200' : 
                      'bg-emerald-50/50 border-emerald-200'
                  }`}>
                      <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-md ${alert.level === 'high' ? 'bg-rose-100 text-rose-700' : alert.level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              <alert.icon size={18} />
                          </div>
                          <div>
                              <p className={`text-sm font-bold ${alert.level === 'high' ? 'text-rose-800' : alert.level === 'medium' ? 'text-amber-800' : 'text-emerald-800'}`}>{alert.title}</p>
                              <p className={`text-xs mt-0.5 font-medium ${alert.level === 'high' ? 'text-rose-600/80' : alert.level === 'medium' ? 'text-amber-700/80' : 'text-emerald-600/80'}`}>{alert.desc}</p>
                          </div>
                      </div>
                      {alert.level !== 'safe' && (
                          <button 
                              onClick={() => handleAlertAction(alert.action)}
                              className={`shrink-0 px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                              alert.level === 'high' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}>
                              {alert.action} <ArrowRight size={12}/>
                          </button>
                      )}
                  </div>
              ))}
          </div>
      </div>

      {/* WHAT-IF SIMULATION (Full Width, Light/Flat UI) */}
      <div className="bg-white border border-slate-200/80 rounded-lg mb-8 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Sliders size={16} className="text-[#1774b5]" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">What-If Disaster Simulation</h3>
          </div>
          <div className="p-6">
              <p className="text-sm text-slate-500 mb-6 font-medium">Stress-test your business. Move the sliders to simulate disaster scenarios and see how it impacts your survival runway and risk score.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center">
                  
                  {/* Slider 1 */}
                  <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-600 uppercase tracking-widest">Sales Decline</span>
                          <span className="text-rose-600">-{simSalesDrop}%</span>
                      </div>
                      <input type="range" min="0" max="80" step="5" value={simSalesDrop} onChange={(e)=>setSimSalesDrop(Number(e.target.value))} className="w-full accent-rose-500" />
                  </div>

                  {/* Slider 2 */}
                  <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-600 uppercase tracking-widest">Expense Surge</span>
                          <span className="text-amber-500">+{simExpenseIncrease}%</span>
                      </div>
                      <input type="range" min="0" max="50" step="5" value={simExpenseIncrease} onChange={(e)=>setSimExpenseIncrease(Number(e.target.value))} className="w-full accent-amber-500" />
                  </div>

                  {/* Result 1 */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center transition-colors">
                      <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Simulated Score</span>
                      <span className={`text-xl font-black ${simulatedScore >= 70 ? 'text-rose-600' : 'text-amber-500'}`}>{simulatedScore} / 100</span>
                  </div>

                  {/* Result 2 */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center transition-colors">
                      <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Sim. Runway</span>
                      <span className={`text-lg font-black ${simulatedRunway.includes('Months') && parseFloat(simulatedRunway) < 3 ? 'text-rose-600' : 'text-emerald-500'}`}>{simulatedRunway}</span>
                  </div>

              </div>
          </div>
      </div>

      {/* RISK PILLARS BREAKDOWN (6 Metrics) */}
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-200/80 pb-2">
          Core Risk Pillars Matrix
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Sales Risk */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                  <TrendingDown size={14} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revenue Growth Risk</p>
              </div>
              <p className={`text-2xl font-bold mt-auto ${metrics.salesGrowth < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {metrics.salesGrowth > 0 ? '+' : ''}{metrics.salesGrowth.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Month-over-Month</p>
          </div>

          {/* Cash Flow Risk */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                  <Wallet size={14} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Liquidity Shortage</p>
              </div>
              <p className={`text-xl font-bold mt-auto ${metrics.cashRunway < 3 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {metrics.cashRunway === 999 ? 'Infinite' : `${metrics.cashRunway.toFixed(1)} Months`}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Current Runway</p>
          </div>

          {/* Overdue Payments Risk */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={14} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Receivables Risk</p>
              </div>
              <p className={`text-xl font-bold mt-auto ${metrics.overduePayments > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  Rs {metrics.overduePayments.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Unpaid Client Debt</p>
          </div>

          {/* Customer Risk */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                  <Users size={14} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client Concentration</p>
              </div>
              <p className={`text-2xl font-bold mt-auto ${metrics.maxCustomerDependency >= 30 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {metrics.maxCustomerDependency.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest truncate">Dependency: {metrics.topCustomerName || 'N/A'}</p>
          </div>

          {/* Supplier Risk */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                  <Truck size={14} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supplier Dependency</p>
              </div>
              <p className={`text-2xl font-bold mt-auto ${metrics.supplierDependency >= 40 ? 'text-amber-500' : 'text-slate-800'}`}>
                  {metrics.supplierDependency.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest truncate">Vendor: {metrics.topSupplierName || 'N/A'}</p>
          </div>

          {/* Inventory Risk */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-lg flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                  <PackageX size={14} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stock Health</p>
              </div>
              <p className={`text-2xl font-bold mt-auto ${metrics.stockOutCount > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
                  {metrics.stockOutCount} <span className="text-sm font-medium text-slate-500">Out</span> / {metrics.overstockCount} <span className="text-sm font-medium text-slate-500">Over</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Products Flagged</p>
          </div>

      </div>

    </div>
  );
};

export default RiskCenter;