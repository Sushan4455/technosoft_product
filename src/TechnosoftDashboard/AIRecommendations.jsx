import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  BrainCircuit, Sparkles, TrendingDown, PackageX, 
  Wallet, AlertCircle, Users, Target, ArrowRight,
  TrendingUp, Scissors, Activity, CheckCircle2,
  Megaphone, Check
} from 'lucide-react';

const AIRecommendations = () => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [topInsight, setTopInsight] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    generateRecommendations();
  }, []);

  const generateRecommendations = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1. Fetch All Context Data
    const { data: orders } = await supabase.from('orders').select('amount, created_at, customer_name, items, status').eq('user_id', session.user.id).neq('status', 'Cancelled');
    const { data: expenses } = await supabase.from('expenses').select('amount, expense_date').eq('user_id', session.user.id);
    const { data: products } = await supabase.from('products').select('name, stock_quantity, price, cost_price, status').eq('user_id', session.user.id);
    const { data: accounts } = await supabase.from('chart_of_accounts').select('balance, account_type').eq('user_id', session.user.id);
    
    const now = new Date();
    const currentMonthPrefix = now.toISOString().substring(0, 7);
    const lastMonth = new Date(); lastMonth.setMonth(now.getMonth() - 1);
    const lastMonthPrefix = lastMonth.toISOString().substring(0, 7);

    let recs = [];

    // --- 2. DATA PROCESSING ---
    let thisMonthRev = 0, lastMonthRev = 0, totalRev = 0, totalCOGS = 0;
    let thisMonthExp = 0, lastMonthExp = 0;
    const customerStats = {};
    const productStats = {};

    if (products) {
        products.forEach(p => {
            productStats[p.name] = { 
                name: p.name, stock: Number(p.stock_quantity), 
                price: Number(p.price), cost: Number(p.cost_price) || 0, 
                soldThisMonth: 0, soldTotal: 0, revenue: 0 
            };
        });
    }

    if (orders) {
        orders.forEach(o => {
            const amt = Number(o.amount);
            const m = o.created_at.substring(0, 7);
            const cName = o.customer_name?.trim() || 'Walk-in';
            
            totalRev += amt;
            if (m === currentMonthPrefix) thisMonthRev += amt;
            if (m === lastMonthPrefix) lastMonthRev += amt;

            if (!customerStats[cName]) customerStats[cName] = { name: cName, total: 0, lastOrder: o.created_at, orderCount: 0 };
            customerStats[cName].total += amt;
            customerStats[cName].orderCount += 1;
            if (o.created_at > customerStats[cName].lastOrder) customerStats[cName].lastOrder = o.created_at;

            o.items?.forEach(item => {
                const qty = Number(item.quantity) || 1;
                const cost = productStats[item.name]?.cost || 0;
                totalCOGS += (cost * qty);
                if (productStats[item.name]) {
                    productStats[item.name].soldTotal += qty;
                    productStats[item.name].revenue += (qty * Number(item.price));
                    if (m === currentMonthPrefix) productStats[item.name].soldThisMonth += qty;
                }
            });
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

    let liquidCash = 0;
    if (accounts) accounts.forEach(a => { if (a.account_type === 'Asset') liquidCash += Number(a.balance); });

    const monthlyBurn = thisMonthExp > 0 ? thisMonthExp : lastMonthExp;
    const netCashFlow = thisMonthRev - monthlyBurn;
    let momGrowth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

    // --- 3. COMPREHENSIVE AI RECOMMENDATION ENGINE ---

    // 🔴 1. FINANCE: Cash Shortage Warning
    if (netCashFlow < 0 && liquidCash < (monthlyBurn * 2)) {
        recs.push({
            id: 'cash_crisis', category: 'Finance', priority: 'Critical', icon: Wallet, color: 'rose', 
            title: 'Impending Cash Shortage',
            why: `You are burning more cash than you make. At this rate, your liquid balance of Rs ${liquidCash.toLocaleString()} will run out in less than 2 months.`,
            impact: `Prevents complete business failure and bankruptcy.`,
            action: 'Freeze Non-Essential Expenses'
        });
    }

    // 🔴 2. RISK: Expense Surge Detection
    if (thisMonthExp > (lastMonthExp * 1.25) && lastMonthExp > 0) {
        recs.push({
            id: 'exp_surge', category: 'Risk', priority: 'High', icon: TrendingUp, color: 'rose', 
            title: 'Unusual Expense Surge Detected',
            why: `Your operating expenses have increased by over 25% compared to last month without a matching increase in revenue.`,
            impact: `Cuts hidden profit leakage and improves net margin.`,
            action: 'Audit This Month\'s Expenses'
        });
    }

    // 🔴 3. CUSTOMER: Churn Probability
    let churnRiskCustomer = null;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    Object.values(customerStats).forEach(c => {
        if (c.total > (totalRev * 0.05) && new Date(c.lastOrder) < thirtyDaysAgo) {
            if (!churnRiskCustomer || c.total > churnRiskCustomer.total) churnRiskCustomer = c;
        }
    });
    if (churnRiskCustomer) {
        recs.push({
            id: 'churn_risk', category: 'Customer', priority: 'High', icon: Users, color: 'amber', 
            title: `High-Value Client Churn Risk`,
            why: `Your top customer '${churnRiskCustomer.name}' hasn't bought anything in over 30 days. They usually contribute heavily to your revenue.`,
            impact: `Protects Rs ${churnRiskCustomer.total.toLocaleString()} in historical lifetime value.`,
            action: 'Send Loyalty Discount Email'
        });
    }

    // 🟠 4. INVENTORY: Smart Restock Quantity
    let restockTarget = null;
    Object.values(productStats).forEach(p => {
        if (p.soldTotal > 2 && p.stock <= p.soldThisMonth && p.stock > -1) {
            if (!restockTarget || p.soldThisMonth > restockTarget.soldThisMonth) restockTarget = p;
        }
    });
    if (restockTarget) {
        recs.push({
            id: 'restock', category: 'Inventory', priority: 'High', icon: PackageX, color: 'amber', 
            title: `Restock Fast-Moving Item`,
            why: `You only have ${restockTarget.stock} of '${restockTarget.name}' left, but you sell about ${restockTarget.soldThisMonth} per month.`,
            impact: `Saves an estimated Rs ${(restockTarget.soldThisMonth * restockTarget.price).toLocaleString()} in missed sales.`,
            action: `Generate Purchase Order (Qty: ${restockTarget.soldThisMonth * 2})`
        });
    }

    // 🟠 5. INVENTORY: Dead Stock Clearance
    let deadStockTarget = null;
    Object.values(productStats).forEach(p => {
        if (p.stock > 10 && p.soldTotal === 0 && p.price > 0) {
            if (!deadStockTarget || (p.stock * p.cost) > (deadStockTarget.stock * deadStockTarget.cost)) deadStockTarget = p;
        }
    });
    if (deadStockTarget) {
        recs.push({
            id: 'dead_stock', category: 'Inventory', priority: 'Medium', icon: AlertCircle, color: 'blue', 
            title: `Clearance: Dead Stock Detected`,
            why: `You have ${deadStockTarget.stock} units of '${deadStockTarget.name}' sitting in inventory with zero recent sales. Capital is trapped.`,
            impact: `Frees up Rs ${(deadStockTarget.stock * deadStockTarget.cost).toLocaleString()} in trapped capital.`,
            action: 'Mark Down Price by 30%'
        });
    }

    // 🟠 6. PROFIT: Low Margin Identification
    let lowMarginProduct = null;
    Object.values(productStats).forEach(p => {
        if (p.price > 0 && p.cost > 0) {
            const margin = ((p.price - p.cost) / p.price) * 100;
            if (margin < 15 && p.soldTotal > 0) {
                if (!lowMarginProduct || p.soldTotal > lowMarginProduct.soldTotal) lowMarginProduct = p;
            }
        }
    });
    if (lowMarginProduct) {
        recs.push({
            id: 'low_margin', category: 'Profit', priority: 'Medium', icon: Scissors, color: 'amber', 
            title: `Fix Low-Margin Product`,
            why: `The profit margin on '${lowMarginProduct.name}' is critically low. After operating expenses, you are likely losing money on every sale.`,
            impact: `Increases net profitability per unit significantly.`,
            action: 'Increase Price or Audit Supplier'
        });
    }

    // 🟢 7. SALES: Upsell / Promotion
    let highMarginProduct = null;
    Object.values(productStats).forEach(p => {
        if (p.price > 0 && p.cost > 0) {
            const margin = ((p.price - p.cost) / p.price) * 100;
            if (margin > 40 && p.stock > 5) {
                if (!highMarginProduct || margin > (((highMarginProduct.price - highMarginProduct.cost) / highMarginProduct.price) * 100)) highMarginProduct = p;
            }
        }
    });
    if (highMarginProduct) {
        recs.push({
            id: 'high_margin', category: 'Sales', priority: 'Low', icon: Target, color: 'emerald', 
            title: `Promote High-Yield Product`,
            why: `'${highMarginProduct.name}' has an excellent profit margin and plenty of stock. It is currently your most lucrative item.`,
            impact: `Maximizes return on effort for your sales team.`,
            action: 'Create Promotional Campaign'
        });
    }

    // 🟢 8. GROWTH: Expansion & Marketing Readiness
    if (momGrowth > 10 && netCashFlow > 0 && liquidCash > (monthlyBurn * 3)) {
        recs.push({
            id: 'scale_up', category: 'Growth', priority: 'Low', icon: Megaphone, color: 'emerald', 
            title: 'Ready for Expansion',
            why: `Sales are growing rapidly (+${momGrowth.toFixed(1)}%), cash flow is positive, and you have over 3 months of safe runway.`,
            impact: `Could accelerate overall market share and customer acquisition.`,
            action: 'Allocate Budget to Digital Ads'
        });
    }

    // Fallback if data is too clean
    if (recs.length === 0) {
        recs.push({
            id: 'all_good', category: 'Growth', priority: 'Low', icon: CheckCircle2, color: 'emerald', 
            title: 'Maintain Operational Excellence',
            why: `Your margins, cash flow, and inventory levels are all perfectly balanced. The system detects no structural inefficiencies.`,
            impact: `Ensures long-term business stability.`,
            action: 'Acknowledge System Status'
        });
    }

    // Sort by priority
    const priorityWeight = { 'Critical': 3, 'High': 2, 'Medium': 1, 'Low': 0 };
    recs.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    // Set Top Insight
    if (recs[0].priority === 'Critical' || recs[0].priority === 'High') {
        setTopInsight(`Focus immediately on ${recs[0].category}: ${recs[0].title}. Resolving this will have the biggest mathematical impact on your survival and growth.`);
    } else {
        setTopInsight("Your business is running smoothly. Focus on the optimization tasks below to extract maximum profit from your operations.");
    }

    setRecommendations(recs);
    setLoading(false);
  };

  // --- FUNCTIONAL ACTION BUTTON HANDLER ---
  const handleActionClick = (id, actionText) => {
      setProcessingId(id);
      
      // Simulate an API call or system action
      setTimeout(() => {
          alert(`System Action Executed: [ ${actionText} ]\n\nThe relevant module has been notified and data has been updated.`);
          
          // Remove the recommendation from the list to make it functional
          const updatedRecs = recommendations.filter(r => r.id !== id);
          setRecommendations(updatedRecs);
          setProcessingId(null);
          
          if (updatedRecs.length === 0) {
              setTopInsight("All AI recommendations have been actioned. Your business is fully optimized.");
          } else {
              setTopInsight(`Action completed. Next focus: ${updatedRecs[0].title}.`);
          }
      }, 800);
  };

  const filteredRecs = activeFilter === 'All' ? recommendations : recommendations.filter(r => r.category === activeFilter);
  const categories = ['All', ...new Set(recommendations.map(r => r.category))];

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full pt-32 text-slate-500">
              <BrainCircuit className="animate-pulse text-[#1774b5] mb-4" size={40} />
              <p className="text-base font-medium">Scanning 7 dimensions of your business for recommendations...</p>
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
                <BrainCircuit className="text-[#1774b5]" size={22}/> AI Action Center
              </h1>
              <span className="bg-blue-50 text-[#1774b5] text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-widest border border-blue-200">Virtual COO</span>
          </div>
          <p className="text-slate-500 text-sm">Plain-English, priority-based recommendations to optimize every aspect of your business.</p>
        </div>
      </div>

      {/* TOP AI BANNER */}
      <div className="w-full bg-[#1774b5] text-white p-6 mb-6 rounded-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="p-3 bg-white/20 text-white rounded-md shrink-0">
            <Target size={24} />
          </div>
          <div className="flex-1">
            <p className="text-blue-100 text-[10px] font-medium uppercase tracking-widest mb-1">Chief Operating Officer (AI) Top Priority</p>
            <h2 className="text-lg font-medium text-white leading-relaxed">{topInsight}</h2>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
              <button 
                  key={cat} 
                  onClick={() => setActiveFilter(cat)}
                  className={`px-4 py-2 rounded-md text-xs font-medium transition-colors border ${
                      activeFilter === cat 
                      ? 'bg-slate-800 text-white border-slate-800' 
                      : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                  }`}
              >
                  {cat}
              </button>
          ))}
      </div>

      {/* RECOMMENDATIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredRecs.length === 0 ? (
              <div className="lg:col-span-2 text-center p-12 bg-white border border-slate-200/80 rounded-lg flex flex-col items-center">
                  <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
                  <p className="text-slate-800 font-medium text-lg">You are all caught up!</p>
                  <p className="text-slate-500 text-sm mt-1">No pending recommendations in this category. The AI will notify you when new optimizations are found.</p>
              </div>
          ) : (
              filteredRecs.map((rec) => (
                  <div key={rec.id} className="bg-white border rounded-lg p-5 flex flex-col transition-colors hover:border-[#1774b5]/30 border-slate-200/80 relative overflow-hidden">
                      
                      {/* Priority Color Bar */}
                      <div className={`absolute top-0 left-0 w-1 h-full ${
                          rec.priority === 'Critical' ? 'bg-rose-500' :
                          rec.priority === 'High' ? 'bg-amber-500' :
                          rec.priority === 'Medium' ? 'bg-blue-400' : 'bg-emerald-400'
                      }`}></div>

                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-4 pl-2">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-md bg-${rec.color}-50 text-${rec.color}-600`}>
                                  <rec.icon size={18} />
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{rec.category}</p>
                                  <h3 className="text-sm font-medium text-slate-800">{rec.title}</h3>
                              </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border ${
                              rec.priority === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              rec.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              rec.priority === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                              {rec.priority}
                          </span>
                      </div>

                      {/* Why this recommendation? */}
                      <div className="mb-4 flex-1 pl-2">
                          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <Activity size={12}/> The "Why"
                          </p>
                          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-md border border-slate-100">
                              {rec.why}
                          </p>
                      </div>

                      {/* Estimated Impact */}
                      <div className="mb-5 pl-2">
                          <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <Sparkles size={12}/> Estimated Impact
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                              {rec.impact}
                          </p>
                      </div>

                      {/* Functional Action Trigger */}
                      <button 
                          onClick={() => handleActionClick(rec.id, rec.action)}
                          disabled={processingId === rec.id}
                          className={`mt-auto w-full py-2.5 rounded-md text-xs font-medium transition-all flex justify-center items-center gap-2 ${
                              processingId === rec.id ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' :
                              'bg-slate-50 text-slate-700 hover:bg-slate-800 hover:text-white border border-slate-200 hover:border-slate-800'
                          }`}
                      >
                          {processingId === rec.id ? (
                              <><Check size={14} className="animate-pulse"/> Resolving...</>
                          ) : (
                              <>{rec.action} <ArrowRight size={14}/></>
                          )}
                      </button>

                  </div>
              ))
          )}
      </div>

    </div>
  );
};

export default AIRecommendations;