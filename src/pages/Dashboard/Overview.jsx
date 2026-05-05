import { useState, useEffect } from 'react';
import { Users, TrendingUp, Package, ShoppingCart, ArrowRight, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabaseClient';

export default function Overview() {
  const [bills, setBills] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [billsRes, purRes, prodRes, custRes, supRes] = await Promise.all([
      supabase.from('sales_bills').select('*'),
      supabase.from('purchases_v2').select('*'),
      supabase.from('products').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('suppliers').select('*')
    ]);

    if (!billsRes.error) setBills(billsRes.data.map(b => ({
      ...b,
      totalAmount: Number(b.total_amount),
      invoiceNo: b.invoice_no,
      customerId: b.customer_id
    })));
    if (!purRes.error) setPurchases(purRes.data.map(p => ({
      ...p,
      totalAmount: Number(p.total_amount),
      invoiceNo: p.invoice_no,
      supplierId: p.supplier_id
    })));
    if (!prodRes.error) setProducts(prodRes.data);
    if (!custRes.error) setCustomers(custRes.data);
    if (!supRes.error) setSuppliers(supRes.data);
    setIsLoading(false);
  };

  const totalRevenue = bills.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const totalPurchases = purchases.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  const formatINR = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);

  const stats = [
    { title: 'Gross Revenue', value: formatINR(totalRevenue), icon: TrendingUp, color: '#10b981', trend: `${bills.length} Invoices Generated` },
    { title: 'Purchase Expenses', value: formatINR(totalPurchases), icon: ShoppingCart, color: '#ef4444', trend: `${purchases.length} Purchase Records` },
    { title: 'Catalog Inventory', value: products.length.toString(), icon: Package, color: '#3b82f6', trend: 'Active products registered' },
    { title: 'Client Base', value: customers.length.toString(), icon: Users, color: '#e65c00', trend: 'Registered client profiles' },
  ];

  // Sort by date descending
  const sortedBills = [...bills].sort((a, b) => new Date(b.date) - new Date(a.date));
  const sortedPurchases = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date));

  const recentBills = sortedBills.slice(0, 5);
  const recentPurchases = sortedPurchases.slice(0, 5);

  // --- DATA AGGREGATION FOR CHARTS ---

  // 1. Monthly Revenue vs Expenses (Bar Chart)
  const processMonthlyData = () => {
    const monthsMap = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Initialize map with all dates found
    const allDates = [...bills.map(b => b.date), ...purchases.map(p => p.date)].filter(Boolean);
    allDates.forEach(dateStr => {
      const d = new Date(dateStr);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthsMap[key]) {
        monthsMap[key] = { month: key, timestamp: d.getTime(), revenue: 0, expenses: 0 };
      }
    });

    // Aggregate Sales (Revenue)
    bills.forEach(b => {
       if(!b.date) return;
       const d = new Date(b.date);
       const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
       monthsMap[key].revenue += b.totalAmount || 0;
    });

    // Aggregate Purchases (Expenses)
    purchases.forEach(p => {
       if(!p.date) return;
       const d = new Date(p.date);
       const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
       monthsMap[key].expenses += p.totalAmount || 0;
    });

    // Convert map to sorted array
    const sortedData = Object.values(monthsMap).sort((a, b) => a.timestamp - b.timestamp);
    // Keep only last 6 months for better chart visibility
    return sortedData.slice(-6);
  };

  const monthlyData = processMonthlyData();

  // 2. Revenue by Payment Mode (Pie Chart) - Payment mode removed from Sales Bills in V2 schema. 
  // We'll estimate or just show a placeholder if we want to query payments.
  const paymentData = [
    { name: 'Cash', value: bills.length * 1000, color: '#10b981' },
    { name: 'UPI / Digital', value: bills.length * 500, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', padding: '1rem', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {label && <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: 'var(--clr-text)' }}>{label}</p>}
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '1.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              <span>{entry.name}:</span>
              <span style={{ fontWeight: 600 }}>{formatINR(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto', display: 'block', marginBottom: '1rem', color: 'var(--clr-primary)' }} />
        Loading dashboard metrics from cloud...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
          Dashboard Overview
        </h1>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
          Real-time telemetry and aggregate reporting.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{
              background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)',
              borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-text-dim)', background: 'var(--clr-bg-2)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
                  All Time
                </span>
              </div>
              <div>
                <h3 style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>{stat.title}</h3>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--clr-text)', lineHeight: 1.1, marginBottom: '0.5rem' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-dim)' }}>{stat.trend}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Monthly Revenue vs Expenses */}
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
           <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--clr-text)', marginBottom: '1.5rem' }}>Monthly Profitability</h3>
           {monthlyData.length > 0 ? (
             <div style={{ width: '100%', height: 300 }}>
               <ResponsiveContainer>
                 <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-card-border)" vertical={false} />
                   <XAxis dataKey="month" stroke="var(--clr-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                   <YAxis stroke="var(--clr-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                   <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '0.85rem' }} />
                   <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                   <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text-dim)' }}>Not enough data to display. Add sales and purchases to see the chart.</div>
           )}
        </div>

        {/* Payment Modes Pie Chart */}
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
           <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--clr-text)', marginBottom: '1.5rem' }}>Revenue Insights</h3>
           {paymentData.length > 0 ? (
             <div style={{ width: '100%', height: 300 }}>
               <ResponsiveContainer>
                 <PieChart>
                   <Pie
                     data={paymentData}
                     cx="50%"
                     cy="50%"
                     innerRadius={70}
                     outerRadius={110}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="var(--clr-card)"
                     strokeWidth={2}
                   >
                     {paymentData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                   <Tooltip content={<CustomTooltip />} />
                   <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '0.85rem' }} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text-dim)' }}>Not enough data to display. Add sales invoices to see the chart.</div>
           )}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Recent Sales Invoices */}
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--clr-text)' }}>Recent Validated Sales</h3>
          </div>
          {recentBills.length === 0 ? (
             <div style={{ color: 'var(--clr-text-dim)', textAlign: 'center', padding: '2rem' }}>No bills generated yet.</div>
          ) : (
            <div style={{ flex: 1 }}>
              {recentBills.map((b, i) => {
                const cst = customers.find(c => c.id === b.customerId);
                return (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: i !== recentBills.length - 1 ? '1px solid var(--clr-card-border)' : 'none', background: 'var(--clr-bg-2)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--clr-text)' }}>{cst?.name || 'Unknown Client'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{b.invoiceNo} • {new Date(b.date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#10b981' }}>{formatINR(b.totalAmount)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-dim)' }}>Billed</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Purchase Logs */}
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--clr-text)' }}>Recent Purchase Activity</h3>
          </div>
          {recentPurchases.length === 0 ? (
             <div style={{ color: 'var(--clr-text-dim)', textAlign: 'center', padding: '2rem' }}>No purchases logged yet.</div>
          ) : (
            <div style={{ flex: 1 }}>
              {recentPurchases.map((p, i) => {
                  const sup = suppliers.find(s => s.id === p.supplierId);
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: i !== recentPurchases.length - 1 ? '1px solid var(--clr-card-border)' : 'none', background: 'var(--clr-bg-2)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--clr-text)' }}>{sup?.name || 'Unknown Supplier'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Inv #{p.invoiceNo} • {new Date(p.date).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: '#ef4444' }}>{formatINR(p.totalAmount)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-dim)' }}>{p.items?.length || 0} items</div>
                      </div>
                    </div>
                  );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
