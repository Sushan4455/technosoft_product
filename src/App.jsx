import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// --- 1. IMPORT LANDING PAGE COMPONENTS ---
import Navbar from './Component/Navbar';
import Hero from './Component/Hero';

// --- 2. IMPORT AUTH & DASHBOARD COMPONENTS ---
import AuthPage from './Component/Login';
import Dashboard from './TechnosoftDashboard/Dashboard';
import AllOrders from './TechnosoftDashboard/AllOrder';
import Fulfillment from './TechnosoftDashboard/Fullfillment';
import Returns from './TechnosoftDashboard/Returns';
import Products from './TechnosoftDashboard/Products';
import Categories from './TechnosoftDashboard/Categories';
import StockAdjustments from './TechnosoftDashboard/StockAdjustments';
import AllInvoices from './TechnosoftDashboard/Allinvoices';
import StoreSetup from './TechnosoftDashboard/StoreSetup';
import Estimates from './TechnosoftDashboard/Estimates';
import Expenses from './TechnosoftDashboard/Expenses';
import PaymentLinks from './TechnosoftDashboard/PaymentLinks';
import Checkout from './TechnosoftDashboard/Checkout';

// IMPORT THE NEW COMING SOON COMPONENT
import ComingSoon from './TechnosoftDashboard/ComingSoon';
import TaxManagement from './TechnosoftDashboard/TaxManagement';
import ProfitAndLoss from './TechnosoftDashboard/Profitandloss';
import Warehouses from './TechnosoftDashboard/Warehouses';
import PurchaseOrders from './TechnosoftDashboard/PurchasesOrder';
import ChartOfAccounts from './TechnosoftDashboard/ChartofAccount';
import Suppliers from './TechnosoftDashboard/Suppliers';
import ReorderAlerts from './TechnosoftDashboard/ReorderAlerts';
import DeadStock from './TechnosoftDashboard/DeadStock';
import Customers from './TechnosoftDashboard/Customerdirectory';
import BankReconciliation from './TechnosoftDashboard/BankReconcilation';
import CreditManagement from './TechnosoftDashboard/CreditManagement';
import RevenueForecast from './TechnosoftDashboard/RevenueForcast';
import CustomerLedger from './TechnosoftDashboard/CustomerLedger';
import CustomerSegments from './TechnosoftDashboard/CustomerSegments';
import ChurnRisk from './TechnosoftDashboard/ChurnRisk';
import PaymentHistory from './TechnosoftDashboard/PaymentHistory';
import JournalEntries from './TechnosoftDashboard/Journal';
import CashFlowForecast from './TechnosoftDashboard/CashflowForcast';
import SalesTrend from './TechnosoftDashboard/SalesTrend';
import RiskCenter from './TechnosoftDashboard/RiskCenter';
import ProfitabilityInsights from './TechnosoftDashboard/Profitabilityinsight';
import BusinessHealthScore from './TechnosoftDashboard/BusinessHealthScore';
import AIRecommendations from './TechnosoftDashboard/AIRecommendations';
import ExecutiveDashboard from './TechnosoftDashboard/Overview';
import DataBackup from './TechnosoftDashboard/DataBackup';
import SubscriptionBilling from './TechnosoftDashboard/Subscription';

// --- 3. IMPORT SUPER ADMIN COMPONENTS ---
import AdminSidebar from './AdminDashboard/AdminSidebar';
import AdminDashboard from './AdminDashboard/AdminDashboard';
import AdminUsers from './AdminDashboard/User';
import AdminKYC from './AdminDashboard/AdminKYC';
import FeatureHeader from './Component/FeatureHeader';
import FeaturesGrid from './Component/FeatureGrid';
import ImpactSection from './Component/ImpactSection';
import Banner from './Component/Banner';
import AIFeatures from './Component/AIFeatures';
import HelpSection from './Component/HelpSection';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <Routes>

          {/* --- PUBLIC ROUTES --- */}
          <Route path="/" element={
            <>
              <Navbar />
              <Hero />
              <FeatureHeader />
              <FeaturesGrid />
              <ImpactSection />
              <Banner />
              <AIFeatures />
              <HelpSection />
            </>
          } />

          {/* Login Route */}
          <Route path="/login" element={<AuthPage />} />

          {/* PUBLIC CHECKOUT ROUTE */}
          <Route path="/pay/:hash" element={<Checkout />} />

          {/* --- SUPER ADMIN ROUTES (Platform Mission Control) --- */}
          <Route path="/admin" element={
            <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
              <AdminSidebar />
              <div className="flex-1 flex flex-col h-screen overflow-y-auto">
                <Outlet /> {/* This renders the nested admin routes below */}
              </div>
            </div>
          }>
            {/* Default Admin Dashboard */}
            <Route index element={<AdminDashboard />} />
            
            {/* Admin Sub-Pages (Pointed to ComingSoon for now) */}
            <Route path="users" element={<AdminUsers />} />
            <Route path="billing" element={<ComingSoon />} />
            <Route path="financials" element={<ComingSoon />} />
            <Route path="staff" element={<ComingSoon />} />
            <Route path="health" element={<ComingSoon />} />
            <Route path="support" element={<ComingSoon />} />
            <Route path="settings" element={<ComingSoon />} />
            <Route path="kyc" element={<AdminKYC />} />

            {/* Admin Catch-All */}
            <Route path="*" element={<ComingSoon />} />
          </Route>


          {/* --- THE SAAS TENANT ROUTES (Client Dashboard) --- */}
          <Route path="/app" element={<Dashboard />}>

            {/* Defined Routes */}
            <Route path="dashboard" element={<ExecutiveDashboard />} />
            <Route path="orders" element={<AllOrders />} />
            <Route path="orders/fulfillment" element={<Fulfillment />} />
            <Route path="orders/returns" element={<Returns />} />
            <Route path="catalog/products" element={<Products />} />
            <Route path="catalog/categories" element={<Categories />} />
            <Route path="catalog/inventory" element={<StockAdjustments />} />
            <Route path="customers" element={<Customers />} />
            <Route path="accounting/invoices" element={<AllInvoices />} />
            <Route path="settings/store" element={<StoreSetup />} />
            <Route path="accounting/estimates" element={<Estimates />} />
            <Route path="accounting/expenses" element={<Expenses />} />
            <Route path="accounting/links" element={<PaymentLinks />} />
            <Route path="accounting/tax" element={<TaxManagement />} />
            <Route path="accounting/pnl" element={<ProfitAndLoss />} />
            <Route path="inventory/warehouses" element={<Warehouses />} />
            <Route path="inventory/purchase-orders" element={<PurchaseOrders />} />
            <Route path="accounting/accounts" element={<ChartOfAccounts />} />
            <Route path="inventory/suppliers" element={<Suppliers />} />
            <Route path="inventory/alerts" element={<ReorderAlerts />} />
            <Route path="inventory/dead-stock" element={<DeadStock />} />
            <Route path="customers/directory" element={<Customers />} />
            <Route path="accounting/reconciliation" element={<BankReconciliation />} />
            <Route path="customers/credit" element={<CreditManagement />} />
            <Route path="bi/revenue" element={<RevenueForecast />} />
            <Route path="customers/ledger" element={<CustomerLedger />} />
            <Route path="customers/segments" element={<CustomerSegments />} />
            <Route path="customers/churn" element={<ChurnRisk />} />
            <Route path="customers/payments" element={<PaymentHistory />} />
            <Route path="accounting/journal" element={<JournalEntries />} />
            <Route path="bi/cash-flow" element={<CashFlowForecast />} />
            <Route path="bi/sales-trend" element={<SalesTrend />} />
            <Route path="bi/risk-center" element={<RiskCenter />} />
            <Route path="bi/profitability" element={<ProfitabilityInsights />} />
            <Route path="bi/health" element={<BusinessHealthScore />} />
            <Route path="bi/ai-recommendations" element={<AIRecommendations />} />
            <Route path="settings/backup" element={<DataBackup />} />
            <Route path="settings/billing" element={<SubscriptionBilling />} />

            {/* Default Redirect to Dashboard */}
            <Route index element={<Navigate to="/app/dashboard" replace />} />

            {/* NEW CATCH-ALL ROUTE FOR UNBUILT PAGES */}
            <Route path="*" element={<ComingSoon />} />

          </Route>

          {/* Catch-all for the entire app (e.g. typed completely wrong URL) */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;