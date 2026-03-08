import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  UserMinus, AlertCircle, Download, BrainCircuit, 
  Mail, ShieldAlert, PhoneCall, TrendingDown, Target
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  Title, Tooltip, Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ChurnRisk = () => {
  const [loading, setLoading] = useState(true);
  const [churnData, setChurnData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [kpi, setKpi] = useState({
      highRiskCount: 0,
      revenueAtRisk: 0,
      avgBuyingCycle: 0,
      totalAnalyzed: 0
  });
  
  const [aiInsight, setAiInsight] = useState("");

  useEffect(() => {
    fetchAndAnalyzeChurn();
  }, []);

  const fetchAndAnalyzeData = async () => {
    fetchAndAnalyzeChurn();
  };

  const fetchAndAnalyzeChurn = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Fetch Customers and Orders
    const { data: customers } = await supabase.from('customers').select('*').eq('user_id', session.user.id);
    const { data: orders } = await supabase.from('orders').select('customer_name, amount, created_at, status').eq('user_id', session.user.id).neq('status', 'Cancelled');

    if (!customers || !orders || orders.length === 0) {
        setLoading(false);
        return;
    }

    // 1. Map Orders to Customers
    const orderMap = {};
    orders.forEach(order => {
        const name = order.customer_name?.toLowerCase().trim();
        if (!name) return;
        if (!orderMap[name]) orderMap[name] = [];
        orderMap[name].push({ date: new Date(order.created_at), amount: Number(order.amount) });
    });

    const now = new Date();
    const analyzedProfiles = [];
    let highRisk = 0;
    let revAtRisk = 0;
    let totalCycleDays = 0;
    let cycleCount = 0;

    // 2. The Predictive Churn Engine
    customers.forEach(customer => {
        const nameKey = customer.name.toLowerCase().trim();
        const history = orderMap[nameKey];

        if (!history || history.length === 0) return; // Skip if no orders

        // Sort orders oldest to newest
        history.sort((a, b) => a.date - b.date);
        
        const lastOrderDate = history[history.length - 1].date;
        const daysSinceLastOrder = Math.max(0, Math.floor((now - lastOrderDate) / (1000 * 60 * 60 * 24)));
        
        let avgCycle = 0;
        let expectedOrderValue = history.reduce((sum, h) => sum + h.amount, 0) / history.length;

        // Calculate Average Buying Cycle (if they have > 1 order)
        if (history.length > 1) {
            const firstOrderDate = history[0].date;
            const totalLifespanDays = Math.floor((lastOrderDate - firstOrderDate) / (1000 * 60 * 60 * 24));
            avgCycle = Math.max(1, totalLifespanDays / (history.length - 1)); // Avg days between orders
            
            totalCycleDays += avgCycle;
            cycleCount++;
        }

        // Calculate Churn Probability %
        let churnProb = 0;
        if (avgCycle > 0) {
            // Formula: How many cycles have they missed?
            // If they usually buy every 15 days, and it's been 30 days (Ratio = 2.0). 
            // A ratio of 2.5 means 90% chance of churn.
            const missedCyclesRatio = daysSinceLastOrder / avgCycle;
            churnProb = Math.min(99, Math.max(5, (missedCyclesRatio / 2.5) * 100));
        } else {
            // Single-order customers: Assume generic 60-day patience window
            churnProb = Math.min(95, (daysSinceLastOrder / 60) * 100);
        }

        const riskTier = churnProb >= 75 ? 'High' : churnProb >= 45 ? 'Medium' : 'Low';

        if (riskTier === 'High' || riskTier === 'Medium') {
            revAtRisk += expectedOrderValue; // The amount we lose if they don't place their next expected order
        }
        if (riskTier === 'High') highRisk++;

        analyzedProfiles.push({
            ...customer,
            lastOrderDate,
            daysSinceLastOrder,
            avgCycle: Math.round(avgCycle),
            expectedOrderValue,
            churnProb: Math.round(churnProb),
            riskTier
        });
    });

    // 3. Generate KPI & Insights
    setKpi({
        highRiskCount: highRisk,
        revenueAtRisk: revAtRisk,
        avgBuyingCycle: cycleCount > 0 ? Math.round(totalCycleDays / cycleCount) : 0,
        totalAnalyzed: analyzedProfiles.length
    });

    if (highRisk > 0) {
        setAiInsight(`Action Required: ${highRisk} active customers are showing critical signs of abandonment. We estimate Rs ${revAtRisk.toLocaleString(undefined, {maximumFractionDigits:0})} in expected revenue will be lost if immediate re-engagement is not performed.`);
    } else {
        setAiInsight(`Healthy Retention: Customer purchase velocity aligns with historical expectations. Keep monitoring new data to maintain retention.`);
    }

    // Sort by Highest Risk First
    setChurnData(analyzedProfiles.sort((a, b) => b.churnProb - a.churnProb));
    setLoading(false);
  };

  // --- CHART CONFIGURATION ---
  const riskDistribution = {
      High: churnData.filter(c => c.riskTier === 'High').length,
      Medium: churnData.filter(c => c.riskTier === 'Medium').length,
      Low: churnData.filter(c => c.riskTier === 'Low').length,
  };

  const chartDataConfig = {
    labels: ['High Risk (>75%)', 'Medium Risk (45-74%)', 'Safe (<45%)'],
    datasets: [
      {
        label: 'Number of Customers',
        data: [riskDistribution.High, riskDistribution.Medium, riskDistribution.Low],
        backgroundColor: [
            '#f43f5e', // Rose
            '#f59e0b', // Amber
            '#10b981'  // Emerald
        ],
        borderRadius: 4,
        barThickness: 40,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Horizontal bar chart
    plugins: {
      legend: { display: false },
      tooltip: { padding: 12, cornerRadius: 4, titleFont: { family: 'Inter, sans-serif' }, bodyFont: { family: 'Inter, sans-serif' } }
    },
    scales: {
      x: { grid: { color: '#f1f5f9', drawBorder: false }, ticks: { font: { family: 'Inter, sans-serif' }, stepSize: 1 } },
      y: { grid: { display: false, drawBorder: false }, ticks: { font: { family: 'Inter, sans-serif', weight: 'bold' } } }
    }
  };

  const filteredData = churnData.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ["Customer Name", "Company", "Risk Tier", "Churn Prob %", "Avg Cycle (Days)", "Days Since Last Order", "Value at Risk"];
    const csvRows = [headers.join(',')];
    
    filteredData.forEach(c => {
      csvRows.push(`"${c.name}","${c.company_name || ''}",${c.riskTier},${c.churnProb}%,${c.avgCycle || 'N/A'},${c.daysSinceLastOrder},${c.expectedOrderValue.toFixed(2)}`);
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Predictive_Churn_Risk_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <UserMinus className="animate-pulse text-[#1774b5] mb-4" size={48} />
              <p className="font-medium text-lg">Calculating Behavioral Churn Risk...</p>
              <p className="text-sm mt-1">Analyzing historical purchase frequencies.</p>
          </div>
      );
  }

  return (
    <div className="font-sans text-slate-900 pb-12 w-full px-4 sm:px-6 lg:px-8 mx-auto h-full bg-slate-50/50">


      {/* DISCLAIMER NOTICE (Flat & Elegant) */}
      <div className="mb-6 p-5  mt-10 rounded-lg border flex items-start gap-3 bg-blue-50/40 border-blue-200/50 text-blue-900">
          <BrainCircuit size={20} className="shrink-0 mt-0.5 text-[#1774b5]" />
          <div>
              <p className="text-sm font-semibold mb-1">How the AI Prediction Works</p>
              <p className="text-xs leading-relaxed opacity-90">
                  The engine evaluates a customer's individual <strong>Average Buying Cycle</strong> against the time elapsed since their last purchase. 
                  If a client normally buys every 14 days, but it has been 35 days, their Churn Probability will spike to 90%+. 
                  The "Revenue at Risk" calculates the amount of money you are losing by missing their expected regular order.
              </p>
          </div>
      </div>

      {/* TOP LEVEL KPIs (Clean, Flat UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-slate-200/60 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
              <p className="text-slate-500 text-xs mb-2 font-medium flex items-center gap-1.5"><ShieldAlert size={14}/> High Risk Accounts</p>
              <p className="text-3xl font-black text-rose-600">{kpi.highRiskCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200/60 flex flex-col justify-center">
              <p className="text-slate-500 text-xs mb-2 font-medium flex items-center gap-1.5"><TrendingDown size={14}/> Revenue at Risk</p>
              <p className="text-2xl font-bold text-slate-800">Rs {kpi.revenueAtRisk.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200/60 flex flex-col justify-center">
              <p className="text-slate-500 text-xs mb-2 font-medium flex items-center gap-1.5"><Target size={14}/> Global Avg Buying Cycle</p>
              <p className="text-2xl font-bold text-[#1774b5]">{kpi.avgBuyingCycle} <span className="text-sm font-medium text-slate-500">Days</span></p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200/60 flex flex-col justify-center">
              <p className="text-slate-500 text-xs mb-2 font-medium">Total Clients Analyzed</p>
              <p className="text-2xl font-bold text-slate-700">{kpi.totalAnalyzed}</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* --- AI ACTION TEXT --- */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg border border-slate-200/60 flex flex-col h-full">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Strategic Recommendation</h3>
              <div className="flex-1 flex items-center justify-center p-4 bg-rose-50/50 border border-rose-100 rounded-lg text-rose-900 text-sm leading-relaxed text-center font-medium">
                  {aiInsight}
              </div>
          </div>

          {/* --- HORIZONTAL BAR CHART --- */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200/60 flex flex-col h-[250px]">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Churn Risk Distribution</h3>
              <div className="flex-1 w-full relative">
                  <Bar data={chartDataConfig} options={chartOptions} />
              </div>
          </div>
      </div>

      {/* DATA TABLE (Flat & Clean) */}
      <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <AlertCircle size={16} className="text-[#1774b5]"/> Account Retention Matrix
              </h3>
              <input 
                  type="text" 
                  placeholder="Search customer..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-[#1774b5] transition-colors" 
              />
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-4 px-6 pl-6">Customer Profile</th>
                          <th className="py-4 px-6">Buying Behavior</th>
                          <th className="py-4 px-6 w-48">AI Churn Probability</th>
                          <th className="py-4 px-6 text-right">Revenue at Risk</th>
                          <th className="py-4 px-6 text-center pr-6">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {filteredData.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-slate-400">No customer data available for prediction.</td></tr>
                      ) : (
                          filteredData.map(c => {
                              // Color coding logic
                              let barColor = 'bg-emerald-500';
                              let textColor = 'text-emerald-600';
                              if (c.churnProb >= 75) { barColor = 'bg-rose-500'; textColor = 'text-rose-600'; }
                              else if (c.churnProb >= 45) { barColor = 'bg-amber-400'; textColor = 'text-amber-600'; }

                              return (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6 pl-6">
                                        <p className="font-medium text-slate-800">{c.name}</p>
                                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-mono">
                                            {c.email && <a href={`mailto:${c.email}`} className="hover:text-[#1774b5] flex items-center gap-1"><Mail size={10}/> {c.email}</a>}
                                            {c.phone && <span className="flex items-center gap-1"><PhoneCall size={10}/> {c.phone}</span>}
                                        </div>
                                    </td>
                                    
                                    <td className="py-4 px-6">
                                        <p className="text-xs text-slate-600"><span className="font-semibold text-slate-800">{c.daysSinceLastOrder}</span> days since last order</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Average Cycle: {c.avgCycle > 0 ? `${c.avgCycle} days` : 'N/A (1 Order)'}</p>
                                    </td>
                                    
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${textColor}`}>{c.riskTier} Risk</span>
                                            <span className="text-xs font-bold text-slate-700">{c.churnProb}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${c.churnProb}%` }}></div>
                                        </div>
                                    </td>
                                    
                                    <td className="py-4 px-6 text-right">
                                        <p className={`font-semibold ${(c.riskTier === 'High' || c.riskTier === 'Medium') ? 'text-rose-600' : 'text-slate-800'}`}>
                                            Rs {c.expectedOrderValue.toLocaleString(undefined, {maximumFractionDigits:0})}
                                        </p>
                                        <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Expected Order</p>
                                    </td>

                                    <td className="py-4 px-6 text-center pr-6">
                                        <a 
                                            href={`mailto:${c.email}?subject=We miss you at Technosoft!&body=Hi ${c.name},%0D%0A%0D%0AIt has been a while since your last order. We wanted to reach out and offer you a special discount...`}
                                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-200/80 text-slate-600 text-[11px] font-bold uppercase tracking-widest rounded-md hover:bg-slate-50 hover:text-[#1774b5] hover:border-blue-200 transition-all"
                                        >
                                            <Mail size={12}/> Re-engage
                                        </a>
                                    </td>
                                </tr>
                              )
                          })
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default ChurnRisk;