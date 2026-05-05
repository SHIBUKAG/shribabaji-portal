import { useState, useEffect } from 'react';
import { BookOpen, Users, Building2, Search, ArrowUpRight, ArrowDownLeft, X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function Ledger() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('customers'); // 'customers', 'suppliers'
  const [isLoading, setIsLoading] = useState(true);
  
  // Data Sources (Read-only for base entities/bills)
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [salesBills, setSalesBills] = useState([]);
  const [purchaseBills, setPurchaseBills] = useState([]);

  // Transaction Sources (Read/Write)
  const [customerPayments, setCustomerPayments] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);

  // Modal & Form State
  const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'customer'|'supplier', id, name, ... }
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    mode: 'Cash',
    reference: ''
  });

  // --- PERSISTENCE & LOADING ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [custRes, supRes, salesRes, purRes, custPayRes, supPayRes] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('sales_bills').select('*'),
      supabase.from('purchases_v2').select('*'),
      supabase.from('customer_payments').select('*'),
      supabase.from('supplier_payments').select('*')
    ]);

    if (!custRes.error) setCustomers(custRes.data);
    if (!supRes.error) setSuppliers(supRes.data);
    
    // Map snake_case back to camelCase as expected by the frontend
    if (!salesRes.error) setSalesBills(salesRes.data.map(b => ({
      ...b,
      customerId: b.customer_id,
      totalAmount: Number(b.total_amount),
      invoiceNo: b.invoice_no
    })));
    
    if (!purRes.error) setPurchaseBills(purRes.data.map(b => ({
      ...b,
      supplierId: b.supplier_id,
      totalAmount: Number(b.total_amount),
      invoiceNo: b.invoice_no
    })));

    if (!custPayRes.error) setCustomerPayments(custPayRes.data.map(p => ({
      ...p,
      entityId: p.entity_id,
      amount: Number(p.amount)
    })));
    
    if (!supPayRes.error) setSupplierPayments(supPayRes.data.map(p => ({
      ...p,
      entityId: p.entity_id,
      amount: Number(p.amount)
    })));

    setIsLoading(false);
  };

  // --- LOGIC ---
  
  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  // Calculate Customer Balances
  const customerLedgers = customers.map(c => {
    const cBills = salesBills.filter(b => b.customerId === c.id);
    const totalBilled = cBills.reduce((sum, b) => sum + b.totalAmount, 0);
    
    const cPayments = customerPayments.filter(p => p.entityId === c.id);
    const totalPaid = cPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    return {
      ...c,
      totalBilled,
      totalPaid,
      balance: totalBilled - totalPaid // Positive means they owe us
    };
  });

  // Calculate Supplier Balances
  const supplierLedgers = suppliers.map(s => {
    const sBills = purchaseBills.filter(b => b.supplierId === s.id);
    const totalBilled = sBills.reduce((sum, b) => sum + b.totalAmount, 0);
    
    const sPayments = supplierPayments.filter(p => p.entityId === s.id);
    const totalPaid = sPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    return {
      ...s,
      totalBilled,
      totalPaid,
      balance: totalBilled - totalPaid // Positive means we owe them
    };
  });

  // Handle Payment Submit
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEntity || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return;

    const payload = {
      id: `PAY-${Date.now()}`,
      entity_id: selectedEntity.id,
      date: paymentForm.date,
      amount: parseFloat(paymentForm.amount),
      mode: paymentForm.mode,
      reference: paymentForm.reference
    };

    if (selectedEntity.type === 'customer') {
      const { error } = await supabase.from('customer_payments').insert([payload]);
      if (!error) fetchData();
      else alert('Error saving payment');
    } else {
      const { error } = await supabase.from('supplier_payments').insert([payload]);
      if (!error) fetchData();
      else alert('Error saving payment');
    }

    setIsPaymentModalOpen(false);
    setPaymentForm({ date: new Date().toISOString().split('T')[0], amount: '', mode: 'Cash', reference: '' });
  };

  // Get Statement for Selected Entity
  const getStatement = () => {
    if (!selectedEntity) return [];

    let transactions = [];
    let runningBalance = 0;

    if (selectedEntity.type === 'customer') {
      const bills = salesBills.filter(b => b.customerId === selectedEntity.id).map(b => ({
        id: b.id,
        date: b.date,
        type: 'Invoice',
        ref: b.invoiceNo,
        debit: b.totalAmount, // Increases what they owe
        credit: 0
      }));
      const payments = customerPayments.filter(p => p.entityId === selectedEntity.id).map(p => ({
        id: p.id,
        date: p.date,
        type: 'Payment Received',
        ref: `${p.mode} ${p.reference ? '- ' + p.reference : ''}`,
        debit: 0,
        credit: p.amount // Decreases what they owe
      }));
      transactions = [...bills, ...payments];
    } else {
      const bills = purchaseBills.filter(b => b.supplierId === selectedEntity.id).map(b => ({
        id: b.id,
        date: b.date,
        type: 'Purchase Bill',
        ref: b.invoiceNo,
        credit: b.totalAmount, // Increases what we owe them
        debit: 0
      }));
      const payments = supplierPayments.filter(p => p.entityId === selectedEntity.id).map(p => ({
        id: p.id,
        date: p.date,
        type: 'Payment Made',
        ref: `${p.mode} ${p.reference ? '- ' + p.reference : ''}`,
        credit: 0,
        debit: p.amount // Decreases what we owe them
      }));
      transactions = [...bills, ...payments];
    }

    // Sort by date chronologically
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate Running Balance
    return transactions.map(t => {
      if (selectedEntity.type === 'customer') {
        runningBalance += (t.debit - t.credit);
      } else {
        runningBalance += (t.credit - t.debit);
      }
      return { ...t, runningBalance };
    });
  };

  const statement = getStatement();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Financial Ledger
          </h1>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            Track Accounts Receivable (Customers) and Accounts Payable (Suppliers).
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto', display: 'block', marginBottom: '1rem', color: 'var(--clr-primary)' }} />
          Loading ledgers from database...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedEntity ? '1fr 1fr' : '1fr', gap: '1.5rem', transition: 'all 0.3s ease' }}>
          
          {/* Left Column: Entity List */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--clr-card-border)', marginBottom: '1.5rem' }}>
              <button
                onClick={() => { setActiveTab('customers'); setSelectedEntity(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
                  padding: '0.75rem 1rem', cursor: 'pointer',
                  color: activeTab === 'customers' ? 'var(--clr-primary-light)' : 'var(--clr-text-muted)',
                  borderBottom: activeTab === 'customers' ? '2px solid var(--clr-primary)' : '2px solid transparent',
                  fontWeight: activeTab === 'customers' ? 600 : 500, fontSize: '0.95rem'
                }}
              >
                <Users size={18} /> Customers (Receivables)
              </button>
              <button
                onClick={() => { setActiveTab('suppliers'); setSelectedEntity(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
                  padding: '0.75rem 1rem', cursor: 'pointer',
                  color: activeTab === 'suppliers' ? '#10b981' : 'var(--clr-text-muted)',
                  borderBottom: activeTab === 'suppliers' ? '2px solid #10b981' : '2px solid transparent',
                  fontWeight: activeTab === 'suppliers' ? 600 : 500, fontSize: '0.95rem'
                }}
              >
                <Building2 size={18} /> Suppliers (Payables)
              </button>
            </div>

            {/* List */}
            <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {activeTab === 'customers' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
                      <th style={{ padding: '1rem', fontWeight: 600 }}>Customer Name</th>
                      <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerLedgers.map((c, i) => (
                      <tr 
                        key={c.id} 
                        onClick={() => setSelectedEntity({ type: 'customer', ...c })}
                        style={{ 
                          borderBottom: '1px solid var(--clr-card-border)', 
                          background: selectedEntity?.id === c.id ? 'rgba(230, 92, 0, 0.05)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'),
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--clr-text)' }}>
                          {c.name} <br/>
                          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 400 }}>{c.phone}</span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: c.balance > 0 ? '#ef4444' : (c.balance < 0 ? '#10b981' : 'var(--clr-text-muted)') }}>
                          {formatINR(c.balance)}
                        </td>
                      </tr>
                    ))}
                    {customerLedgers.length === 0 && (
                      <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>No customers found. Go to Billing to add one.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
                      <th style={{ padding: '1rem', fontWeight: 600 }}>Supplier Name</th>
                      <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierLedgers.map((s, i) => (
                      <tr 
                        key={s.id} 
                        onClick={() => setSelectedEntity({ type: 'supplier', ...s })}
                        style={{ 
                          borderBottom: '1px solid var(--clr-card-border)', 
                          background: selectedEntity?.id === s.id ? 'rgba(16, 185, 129, 0.05)' : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'),
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--clr-text)' }}>
                          {s.name} <br/>
                          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 400 }}>{s.gstin}</span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: s.balance > 0 ? '#ef4444' : (s.balance < 0 ? '#10b981' : 'var(--clr-text-muted)') }}>
                          {formatINR(s.balance)}
                        </td>
                      </tr>
                    ))}
                    {supplierLedgers.length === 0 && (
                      <tr><td colSpan="2" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>No suppliers found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Statement Details */}
          {selectedEntity && (
            <div style={{ animation: 'fadeInUp 0.3s ease' }}>
              <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', position: 'sticky', top: '90px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', color: 'var(--clr-text)', marginBottom: '0.25rem' }}>{selectedEntity.name}</h2>
                    <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.8rem' }}>
                      {selectedEntity.type === 'customer' ? 'Customer Statement' : 'Supplier Statement'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-dim)' }}>Current Balance</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: selectedEntity.balance > 0 ? '#ef4444' : (selectedEntity.balance < 0 ? '#10b981' : 'var(--clr-text)') }}>
                      {formatINR(selectedEntity.balance)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => setIsPaymentModalOpen(true)}
                    style={{
                      flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                      background: selectedEntity.type === 'customer' ? 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))' : '#10b981',
                      color: '#fff', border: 'none', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> 
                    {selectedEntity.type === 'customer' ? 'Record Payment Received' : 'Record Payment Made'}
                  </button>
                </div>

                <div style={{ border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
                          <th style={{ padding: '0.75rem' }}>Date</th>
                          <th style={{ padding: '0.75rem' }}>Details</th>
                          {selectedEntity.type === 'customer' ? (
                            <>
                              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Billed (Dr)</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Paid (Cr)</th>
                            </>
                          ) : (
                            <>
                              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Billed (Cr)</th>
                              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Paid (Dr)</th>
                            </>
                          )}
                          <th style={{ padding: '0.75rem', textAlign: 'right' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.length === 0 && (
                          <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>No transactions yet.</td></tr>
                        )}
                        {statement.map((t, i) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid var(--clr-card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', color: 'var(--clr-text-muted)' }}>{t.date}</td>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ fontWeight: 500, color: 'var(--clr-text)' }}>{t.type}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-dim)' }}>{t.ref}</div>
                            </td>
                            {selectedEntity.type === 'customer' ? (
                              <>
                                <td style={{ padding: '0.75rem', textAlign: 'right', color: t.debit > 0 ? '#ef4444' : 'inherit' }}>{t.debit > 0 ? formatINR(t.debit) : '-'}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', color: t.credit > 0 ? '#10b981' : 'inherit' }}>{t.credit > 0 ? formatINR(t.credit) : '-'}</td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '0.75rem', textAlign: 'right', color: t.credit > 0 ? '#ef4444' : 'inherit' }}>{t.credit > 0 ? formatINR(t.credit) : '-'}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'right', color: t.debit > 0 ? '#10b981' : 'inherit' }}>{t.debit > 0 ? formatINR(t.debit) : '-'}</td>
                              </>
                            )}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--clr-text)' }}>{formatINR(t.runningBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedEntity && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', padding: '2rem', animation: 'fadeInUp 0.3s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--clr-text)' }}>
                {selectedEntity.type === 'customer' ? 'Receive Payment' : 'Make Payment'}
              </h2>
              <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '1.5rem' }}>
              Recording payment for <strong>{selectedEntity.name}</strong>. Current outstanding: {formatINR(selectedEntity.balance)}
            </p>
            
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Date</label>
                <input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Amount (₹)</label>
                <input type="number" step="0.01" min="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} placeholder="0.00" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Payment Mode</label>
                <select value={paymentForm.mode} onChange={(e) => setPaymentForm({...paymentForm, mode: e.target.value})} style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / PhonePe / GPay</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Reference / Notes (Optional)</label>
                <input type="text" value={paymentForm.reference} onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})} style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} placeholder="Transaction ID or Check No." />
              </div>

              <button type="submit" style={{ 
                background: selectedEntity.type === 'customer' ? 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))' : '#10b981', 
                color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 'var(--radius-full)', 
                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' 
              }}>
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
