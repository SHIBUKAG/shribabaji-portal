import { useState, useEffect } from 'react';
import { Plus, Users, FileText, Trash2, Download, Printer, X, Edit, Wallet, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabaseClient';

export default function Billing() {
  // Data States
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState(null);

  // Form States
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', gstin: '', address: '' });
  const [billForm, setBillForm] = useState({
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    customerPhone: '',
    customerName: '',
    customerAddress: '',
    customerGstin: '',
    items: [{ id: 1, productId: '', manualName: '', quantity: 1, rate: 0, soldPrice: 0, gstRate: '9' }]
  });
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    mode: 'Cash',
    reference: '',
    billId: '',
    invoiceNo: '',
    customerId: '',
    dueAmount: 0
  });

  // Derived State
  const [calculatedAmounts, setCalculatedAmounts] = useState({ cgst: 0, sgst: 0, baseTotal: 0, total: 0, totalDiscount: 0 });

  // Persistence (Supabase)
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [custRes, billsRes, prodRes, payRes] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('sales_bills').select('*').order('date', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('customer_payments').select('*')
    ]);

    if (!custRes.error) setCustomers(custRes.data);
    if (!prodRes.error) setProducts(prodRes.data);
    if (!billsRes.error) setBills(billsRes.data.map(b => ({
      ...b,
      invoiceNo: b.invoice_no,
      customerId: b.customer_id,
      baseTotal: Number(b.base_total),
      cgstAmount: Number(b.cgst_amount),
      sgstAmount: Number(b.sgst_amount),
      totalAmount: Number(b.total_amount)
    })));
    if (!payRes.error) setCustomerPayments(payRes.data.map(p => ({
      ...p,
      entityId: p.entity_id,
      amount: Number(p.amount)
    })));
    setIsLoading(false);
  };

  // Recalculate bill structure totals dynamically
  useEffect(() => {
    let cgst = 0;
    let sgst = 0;
    let baseTotal = 0;
    let totalDiscount = 0;

    billForm.items.forEach(item => {
      const lineBase = (parseFloat(item.quantity) || 0) * (parseFloat(item.soldPrice) || 0);
      const rate = parseFloat(item.gstRate) || 0;
      
      const tax = lineBase * (rate / 100);
      cgst += tax;
      sgst += tax;
      baseTotal += lineBase;

      const diff = (parseFloat(item.rate) || 0) - (parseFloat(item.soldPrice) || 0);
      if (diff > 0) {
          totalDiscount += diff * (parseFloat(item.quantity) || 0);
      }
    });

    setCalculatedAmounts({
      cgst,
      sgst,
      baseTotal,
      total: baseTotal + cgst + sgst,
      totalDiscount
    });
  }, [billForm.items]);

  // Auto-fill customer details when phone changes
  useEffect(() => {
     if (isBillModalOpen && billForm.customerPhone && billForm.customerPhone.length >= 10 && !editingBillId) {
         const existingCustomer = customers.find(c => c.phone === billForm.customerPhone);
         if (existingCustomer && !billForm.customerName) {
             setBillForm(prev => ({
                 ...prev,
                 customerName: existingCustomer.name || prev.customerName,
                 customerAddress: existingCustomer.address || prev.customerAddress,
                 customerGstin: existingCustomer.gstin || prev.customerGstin
             }));
         }
     }
  }, [billForm.customerPhone, isBillModalOpen, customers, editingBillId]);

  // Form Handlers
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const newId = `CST-${String(customers.length + 1).padStart(3, '0')}`;
    const payload = { id: newId, ...customerForm };
    
    const { error } = await supabase.from('customers').insert([payload]);
    if (!error) {
      fetchData();
      setIsCustomerModalOpen(false);
      setCustomerForm({ name: '', phone: '', gstin: '', address: '' });
    } else {
      alert('Error saving customer: ' + error.message);
    }
  };

  const handleBillSubmit = async (e) => {
    e.preventDefault();
    if (!billForm.customerPhone || !billForm.customerName) {
        alert("Please enter a Client Name and Phone number.");
        return;
    }

    const hasInvalidItem = billForm.items.some(item => !item.quantity || !item.rate || parseFloat(item.rate) <= 0);
    if (hasInvalidItem) {
        alert("Please ensure all items have valid quantities and rates.");
        return;
    }

    // Auto-create customer if phone is new
    let resolvedCustomer = customers.find(c => c.phone === billForm.customerPhone);
    let customerId = resolvedCustomer?.id;
    
    if (!resolvedCustomer) {
        customerId = `CST-${String(customers.length + 1).padStart(3, '0')}`;
        const newCustomer = {
            id: customerId,
            name: billForm.customerName,
            phone: billForm.customerPhone,
            address: billForm.customerAddress,
            gstin: billForm.customerGstin
        };
        await supabase.from('customers').insert([newCustomer]);
        fetchData(); // Sync the new customer
    }

    const invoiceNoStr = editingBillId ? bills.find(b => b.id === editingBillId)?.invoiceNo : `INV-${String(bills.length + 1).padStart(4, '0')}`;
    const targetId = editingBillId || invoiceNoStr;

    const payload = {
        id: targetId,
        invoice_no: invoiceNoStr,
        date: billForm.date,
        customer_id: customerId,
        items: billForm.items.map(i => ({...i, lineBase: (i.quantity * i.soldPrice)})),
        base_total: calculatedAmounts.baseTotal,
        cgst_amount: calculatedAmounts.cgst,
        sgst_amount: calculatedAmounts.sgst,
        total_amount: calculatedAmounts.total
    };

    if (editingBillId) {
        const { error } = await supabase.from('sales_bills').update(payload).eq('id', editingBillId);
        if (!error) fetchData();
        else alert('Error updating bill: ' + error.message);
    } else {
        const { error } = await supabase.from('sales_bills').insert([payload]);
        if (!error) fetchData();
        else alert('Error creating bill: ' + error.message);
    }

    closeBillModal();
  };

  const closeBillModal = () => {
      setIsBillModalOpen(false);
      setEditingBillId(null);
      setBillForm({
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'Cash',
        customerPhone: '',
        customerName: '',
        customerAddress: '',
        customerGstin: '',
        items: [{ id: 1, productId: '', manualName: '', quantity: 1, rate: 0, soldPrice: 0, gstRate: '9' }]
      });
  };

  const openEditBill = (bill) => {
      setEditingBillId(bill.id);
      const customer = customers.find(c => c.id === bill.customerId);
      setBillForm({
          date: bill.date,
          paymentMode: bill.paymentMode || 'Cash',
          customerPhone: customer?.phone || '',
          customerName: customer?.name || '',
          customerAddress: customer?.address || '',
          customerGstin: customer?.gstin || '',
          items: bill.items.map(i => ({...i, soldPrice: i.soldPrice !== undefined ? i.soldPrice : i.rate}))
      });
      setIsBillModalOpen(true);
  };
  
  const openNewBillForCustomer = (customer) => {
      setEditingBillId(null);
      setBillForm({
          date: new Date().toISOString().split('T')[0],
          paymentMode: 'Cash',
          customerPhone: customer.phone || '',
          customerName: customer.name || '',
          customerAddress: customer.address || '',
          customerGstin: customer.gstin || '',
          items: [{ id: 1, productId: '', manualName: '', quantity: 1, rate: 0, soldPrice: 0, gstRate: '9' }]
      });
      setIsBillModalOpen(true);
  };

  const deleteBill = async (id) => {
      if (window.confirm("Delete this sales bill? Payment records tied to it might be orphaned.")) {
          const { error } = await supabase.from('sales_bills').delete().eq('id', id);
          if (!error) fetchData();
          else alert('Error deleting bill');
      }
  };

  // Payment Handlers
  const openPaymentModal = (bill, dueAmount) => {
      setPaymentForm({
          date: new Date().toISOString().split('T')[0],
          amount: dueAmount.toFixed(2),
          mode: 'Cash',
          reference: `Payment for ${bill.invoiceNo}`,
          billId: bill.id,
          invoiceNo: bill.invoiceNo,
          customerId: bill.customerId,
          dueAmount: dueAmount
      });
      setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
      e.preventDefault();
      const amountParsed = parseFloat(paymentForm.amount);
      if (amountParsed <= 0 || amountParsed > paymentForm.dueAmount) {
          alert(`Please enter a valid amount (Max: ${formatINR(paymentForm.dueAmount)})`);
          return;
      }
      
      const payload = {
          id: `PAY-${Date.now()}`,
          entity_id: paymentForm.customerId,
          date: paymentForm.date,
          amount: amountParsed,
          mode: paymentForm.mode,
          reference: paymentForm.reference
      };
      
      const { error } = await supabase.from('customer_payments').insert([payload]);
      if (!error) {
        fetchData();
        setIsPaymentModalOpen(false);
      } else {
        alert('Error recording payment: ' + error.message);
      }
  };

  // Taxable Rows array mutations
  const addItemRow = () => {
    setBillForm(prev => ({
        ...prev,
        items: [...prev.items, { id: Date.now(), productId: '', manualName: '', quantity: 1, rate: 0, soldPrice: 0, gstRate: '9' }]
    }));
  };

  const removeItemRow = (id) => {
    if (billForm.items.length === 1) return;
    setBillForm(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateItemRow = (id, field, value) => {
    setBillForm(prev => {
        let items = prev.items.map(item => item.id === id ? { ...item, [field]: value } : item);
        
        // Auto-fill rate if selecting a product and user hasn't overridden
        if (field === 'productId') {
            const prod = products.find(p => p.id === value);
            if (prod) {
                // Since price is numeric in Supabase
                const numRate = parseFloat(prod.price) || 0;
                items = items.map(item => item.id === id ? { ...item, rate: numRate, soldPrice: numRate, manualName: prod.name } : item);
            }
        }
        
        return { ...prev, items };
    });
  };

  // Number to words utility
  const numberToWords = (num) => {
      const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
      const b = ['', '', 'Twenty ','Thirty ','Forty ','Fifty ', 'Sixty ','Seventy ','Eighty ','Ninety '];
      if ((num = num.toString()).length > 9) return '';
      const n = ('000000000' + num).substring(('000000000' + num).length - 9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return '';
      let str = '';
      str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
      str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
      str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
      str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) + 'Hundred ' : '';
      str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) + 'Only' : ((str != '') ? 'Only' : 'Zero');
      return str;
  };

  // Sales PDF Export / Formatted Invoice Generation
  const exportFormalInvoice = (bill, printMode = false) => {
      try {
          const doc = new jsPDF();
          const customer = customers.find(c => c.id === bill.customerId);
          
          const formatAmt = (amt) => 'Rs. ' + new Intl.NumberFormat('en-IN').format(amt);

          // Formal GST Legal Frame
          doc.setDrawColor(0);
          doc.setLineWidth(0.4);
          doc.rect(10, 10, 190, 277); // Outer boundary

          // Header Text
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(20);
          doc.text("TAX INVOICE", 105, 18, { align: 'center' });
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100);
          doc.text("(Original for Recipient)", 105, 23, { align: 'center' });
          
          doc.setDrawColor(60);
          doc.line(10, 26, 200, 26);
          doc.line(105, 26, 105, 62); // Vertical Split

          // Supplier 
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(230, 92, 0); // Orange Branding
          doc.text("Shree Babaji Welding Works", 14, 34);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(40);
          doc.text("GSTIN/UIN:", 14, 44);
          doc.setFont('helvetica', 'normal');
          doc.text("23XXXXXXXXXXXXX", 38, 44);
          
          doc.setFont('helvetica', 'bold');
          doc.text("State Name:", 14, 50);
          doc.setFont('helvetica', 'normal');
          doc.text("Madhya Pradesh, Code: 23", 38, 50);

          // Invoice Details
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`Invoice No:`, 108, 34);
          doc.setFont('helvetica', 'normal');
          doc.text(bill.invoiceNo, 145, 34);

          doc.setFont('helvetica', 'bold');
          doc.text(`Dated:`, 108, 42);
          doc.setFont('helvetica', 'normal');
          doc.text(new Date(bill.date).toLocaleDateString(), 145, 42);
          
          doc.line(10, 62, 200, 62);

          // Buyer Details Full Width
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(80);
          doc.text("BILLED TO:", 14, 70);
          doc.setFontSize(11);
          doc.setTextColor(20);
          doc.text(customer?.name || 'Unknown Client', 14, 76);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          let bY = 82;
          if (customer?.address) { doc.text(`Address: ${customer.address}`, 14, bY); bY += 6; }
          if (customer?.phone) { doc.text(`Contact: ${customer.phone}`, 14, bY); bY += 6; }
          if (customer?.gstin) { doc.setFont('helvetica', 'bold'); doc.text(`GSTIN/UIN: ${customer.gstin}`, 14, bY); doc.setFont('helvetica', 'normal'); bY += 6; }

          // Table Items Mapping
          const tableHead = [["S.N.", "Description of Goods", "Qty", "Rate (₹)", "Taxable Value", "CGST Rate/Amt", "SGST Rate/Amt", "Total (₹)"]];
          const tableRows = bill.items.map((item, idx) => {
              const cgstPercent = parseFloat(item.gstRate) || 0;
              const unitTaxable = item.lineBase;
              const cgstAmt = unitTaxable * (cgstPercent / 100);
              const sgstAmt = unitTaxable * (cgstPercent / 100);
              const rowTotal = unitTaxable + cgstAmt + sgstAmt;
              const mrpToDisplay = (item.soldPrice > item.rate) ? item.soldPrice : item.rate;

              return [
                  idx + 1,
                  item.manualName || 'Miscellaneous Line Item',
                  item.quantity,
                  formatAmt(mrpToDisplay),
                  formatAmt(unitTaxable),
                  cgstPercent > 0 ? `${cgstPercent}%\n${formatAmt(cgstAmt)}` : '-',
                  cgstPercent > 0 ? `${cgstPercent}%\n${formatAmt(sgstAmt)}` : '-',
                  formatAmt(rowTotal)
              ];
          });

          autoTable(doc, {
              head: tableHead,
              body: tableRows,
              startY: bY + 2,
              theme: 'grid',
              styles: { fontSize: 8, cellPadding: 3, textColor: 40 },
              headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 },
              bodyStyles: { lineWidth: 0.1, lineColor: 0 },
              margin: { left: 12, right: 12 }
          });

          // Calculations Block
          let finalY = doc.lastAutoTable.finalY + 8;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text("Total Taxable Value:", 120, finalY);
          doc.text(formatAmt(bill.baseTotal), 190, finalY, { align: 'right' });

          doc.text("Total CGST:", 120, finalY + 6);
          doc.text(formatAmt(bill.cgstAmount), 190, finalY + 6, { align: 'right' });
          
          doc.text("Total SGST:", 120, finalY + 12);
          doc.text(formatAmt(bill.sgstAmount), 190, finalY + 12, { align: 'right' });

          doc.setLineWidth(0.4);
          doc.line(120, finalY + 16, 190, finalY + 16);

          doc.setFontSize(12);
          doc.text("Grand Total:", 120, finalY + 24);
          doc.text(formatAmt(bill.totalAmount), 190, finalY + 24, { align: 'right' });
          
          const billPayments = customerPayments.filter(p => p.reference?.includes(bill.invoiceNo)); // Note: payment ref stores invoiceNo
          const paidAmount = billPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const dueAmount = Math.max(0, bill.totalAmount - paidAmount);

          doc.setFontSize(10);
          doc.setTextColor(40);
          doc.text("Amount Paid:", 120, finalY + 32);
          doc.text(formatAmt(paidAmount), 190, finalY + 32, { align: 'right' });

          doc.setFontSize(11);
          if (dueAmount === 0) {
              doc.setTextColor(16, 185, 129);
              doc.text("Balance Due:", 120, finalY + 40);
              doc.text("NO DUES", 190, finalY + 40, { align: 'right' });
          } else {
              doc.setTextColor(239, 68, 68);
              doc.text("Balance Due:", 120, finalY + 40);
              doc.text(formatAmt(dueAmount), 190, finalY + 40, { align: 'right' });
          }

          // Discount Tracker
          if (bill.totalDiscount > 0) {
              doc.setFontSize(9);
              doc.setTextColor(16, 185, 129); // Green
              doc.text(`Total Savings / Discount Issued: ${formatAmt(bill.totalDiscount)} on MRP.`, 120, finalY + 48);
          }

          // Amount in Words
          finalY += 50;
          doc.setTextColor(40);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text("Amount Chargeable (in words):", 12, finalY);
          doc.setFont('helvetica', 'italic');
          doc.text(`INR ${numberToWords(Math.round(bill.totalAmount))}`, 12, finalY + 6);
          
          // Terms & Conditions Block
          finalY += 16;
          doc.setTextColor(40);
          doc.setFont('helvetica', 'bold');
          doc.text("Terms & Conditions:", 12, finalY);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(80);
          doc.text("1. Goods once sold will not be taken back or exchanged.", 12, finalY + 6);
          doc.text("2. Interest @18% p.a. applies if payment is delayed beyond 30 days.", 12, finalY + 11);
          doc.text("3. Subject to local Madhya Pradesh Jurisdiction only.", 12, finalY + 16);
          doc.text("4. E.&O.E.", 12, finalY + 21);

          // Footer Signatures
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(20);
          doc.setFontSize(10);
          doc.text("For Shree Babaji Welding Works", 190, 263, { align: 'right' });
          doc.setDrawColor(0);
          doc.setLineWidth(0.4);
          doc.line(130, 276, 190, 276);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text("Authorized Signatory", 190, 280, { align: 'right' });

          if (printMode) {
             doc.autoPrint();
             window.open(doc.output('bloburl'), '_blank');
          } else {
             doc.save(`Sales_Invoice_${bill.invoiceNo}.pdf`);
          }

      } catch (e) {
          console.error("PDF generation failed:", e);
      }
  };

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Sales Billings
          </h1>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            Generate and manage client invoices and track payments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => setIsCustomerModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--clr-bg-2)', color: 'var(--clr-text)', border: '1px solid var(--clr-card-border)', 
              padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
            }}
          >
            <Users size={16} /> Manage Customers
          </button>
          
          <button 
            onClick={() => { setEditingBillId(null); setIsBillModalOpen(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))',
              color: '#fff', border: 'none', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
            }}
          >
            <Plus size={16} /> Generate Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>Total Sales (Gross)</h3>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>
            {formatINR(bills.reduce((acc, curr) => acc + curr.totalAmount, 0))}
          </div>
        </div>
      </div>

      {/* Bill Log Table */}
      <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--clr-card-border)', display: 'flex', alignItems: 'center', justifyItems: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--clr-text)' }}>Master Invoice Ledger</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Invoice # & Date</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Client</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Billed Total</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Paid</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Due (Left)</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                  <Loader2 size={24} className="spin" style={{ margin: '0 auto', display: 'block', marginBottom: '1rem' }} />
                  Loading invoices from database...
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                  No invoices generated yet.
                </td>
              </tr>
            ) : bills.map((b, i) => {
              const customer = customers.find(c => c.id === b.customerId);
              
              // Calculate specific bill payments based on customer ID and invoice reference
              // Our ledger saves reference as `Payment for ${bill.invoiceNo}`
              const billPayments = customerPayments.filter(p => p.entityId === b.customerId && p.reference?.includes(b.invoiceNo));
              const paidAmount = billPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
              const dueAmount = Math.max(0, b.totalAmount - paidAmount);

              return (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--clr-card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--clr-text)' }}>{b.invoiceNo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{b.date}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--clr-text)' }}>{customer?.name || 'Unknown'}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{formatINR(b.totalAmount)}</td>
                  <td style={{ padding: '1rem 1.5rem', color: '#10b981' }}>{formatINR(paidAmount)}</td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: dueAmount > 0 ? '#ef4444' : 'var(--clr-text-muted)' }}>
                    {dueAmount === 0 ? 'Settled' : formatINR(dueAmount)}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                      
                      {dueAmount > 0 ? (
                        <button 
                          onClick={() => openPaymentModal(b, dueAmount)} 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#10b981', color: 'white', border: 'none', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, marginRight: '0.5rem' }} 
                          title="Receive Payment"
                        >
                          <Wallet size={14} /> Pay
                        </button>
                      ) : (
                         <span 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, marginRight: '0.5rem' }} 
                          title="Fully Paid"
                        >
                          No Dues
                        </span>
                      )}

                      <button onClick={() => exportFormalInvoice(b, true)} style={{ background: 'none', border: 'none', color: 'var(--clr-text)', cursor: 'pointer' }} title="Print Invoice">
                        <Printer size={16} />
                      </button>
                      <button onClick={() => exportFormalInvoice(b)} style={{ background: 'none', border: 'none', color: 'var(--clr-text)', cursor: 'pointer' }} title="Download Invoice">
                        <Download size={16} />
                      </button>
                      <button onClick={() => openEditBill(b)} style={{ background: 'none', border: 'none', color: 'var(--clr-primary-light)', cursor: 'pointer' }} title="Edit">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => deleteBill(b.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}

      {/* Payment Receive Modal */}
      {isPaymentModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', padding: '2rem', animation: 'fadeInUp 0.3s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--clr-text)' }}>
                Receive Payment
              </h2>
              <button onClick={() => setIsPaymentModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '1.5rem' }}>
              Recording payment for <strong>{paymentForm.invoiceNo}</strong>. Amount Due: <strong style={{color: '#ef4444'}}>{formatINR(paymentForm.dueAmount)}</strong>
            </p>
            
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Date</label>
                <input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Amount Received (₹)</label>
                <input type="number" step="0.01" min="0.01" max={paymentForm.dueAmount} value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} placeholder="0.00" />
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

              <button type="submit" style={{ 
                background: '#10b981', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 'var(--radius-full)', 
                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' 
              }}>
                Save Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Modal UI */}
      {isCustomerModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyItems: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'var(--clr-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--clr-text)' }}>New Client</h2>
              <button onClick={() => setIsCustomerModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCustomerSubmit}>
              <input required value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="Client Name" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', background: 'var(--clr-bg)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
              <input value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} placeholder="Phone Number" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', background: 'var(--clr-bg)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
              <input value={customerForm.gstin} onChange={e => setCustomerForm({...customerForm, gstin: e.target.value.toUpperCase()})} placeholder="GSTIN (Optional)" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', background: 'var(--clr-bg)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
              <input value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} placeholder="Address / Location" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', background: 'var(--clr-bg)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--clr-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}>Register Client</button>
            </form>
          </div>
        </div>
      )}

      {/* Bill Generator Modal */}
      {isBillModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyItems: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'var(--clr-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--clr-text)' }}>{editingBillId ? 'Edit Sales Invoice' : 'Generate Sales Invoice'}</h2>
              <button onClick={closeBillModal} style={{ background: 'none', border: 'none', color: 'var(--clr-text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleBillSubmit}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'var(--clr-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div>
                   <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>Client Phone Number (Auto-Lookups)</label>
                   <input required type="tel" value={billForm.customerPhone} onChange={e => setBillForm({...billForm, customerPhone: e.target.value})} placeholder="Phone number..." style={{ width: '100%', padding: '0.75rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>Client Name</label>
                   <input required type="text" value={billForm.customerName} onChange={e => setBillForm({...billForm, customerName: e.target.value})} placeholder="Name..." style={{ width: '100%', padding: '0.75rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>Address (Location)</label>
                   <input type="text" value={billForm.customerAddress} onChange={e => setBillForm({...billForm, customerAddress: e.target.value})} placeholder="Location..." style={{ width: '100%', padding: '0.75rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                       <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>GSTIN (Optional)</label>
                       <input type="text" value={billForm.customerGstin} onChange={e => setBillForm({...billForm, customerGstin: e.target.value.toUpperCase()})} placeholder="GSTIN..." style={{ width: '100%', padding: '0.75rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                       <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>Invoice Date</label>
                       <input required type="date" value={billForm.date} onChange={e => setBillForm({...billForm, date: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                    </div>
                </div>
              </div>

              {/* Items Array */}
              <div style={{ marginBottom: '1.5rem', background: 'var(--clr-bg)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--clr-text)' }}>Line Items</h3>
                {billForm.items.map((item, idx) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.5fr) minmax(120px, 1.5fr) 80px 100px 100px 120px auto', gap: '0.5rem', alignItems: 'end', marginBottom: '1rem' }}>
                    
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Inventory Product</label>
                      <select value={item.productId} onChange={e => updateItemRow(item.id, 'productId', e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }}>
                        <option value="">Custom...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Description / Variant Name</label>
                      <input required value={item.manualName} onChange={e => updateItemRow(item.id, 'manualName', e.target.value)} type="text" placeholder="Item Name" disabled={!!item.productId} style={{ width: '100%', padding: '0.65rem', background: item.productId ? 'rgba(255,255,255,0.05)' : 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Quantity</label>
                      <input required min="1" value={item.quantity} onChange={e => updateItemRow(item.id, 'quantity', e.target.value)} type="number" style={{ width: '100%', padding: '0.65rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Actual / MRP</label>
                      <input required step="0.01" min="0" value={item.rate} onChange={e => updateItemRow(item.id, 'rate', e.target.value)} type="number" style={{ width: '100%', padding: '0.65rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Sold At</label>
                      <input required step="0.01" min="0" value={item.soldPrice} onChange={e => updateItemRow(item.id, 'soldPrice', e.target.value)} type="number" style={{ width: '100%', padding: '0.65rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>Tax Block</label>
                      <select required value={item.gstRate} onChange={e => updateItemRow(item.id, 'gstRate', e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', borderRadius: 'var(--radius-sm)' }}>
                        <option value="9">18% GST</option>
                        <option value="6">12% GST</option>
                        <option value="2.5">5% GST</option>
                        <option value="0">0% GST</option>
                      </select>
                    </div>

                    <button type="button" onClick={() => removeItemRow(item.id)} style={{ padding: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid transparent', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }} title="Remove Item"><Trash2 size={16}/></button>

                  </div>
                ))}
                
                <button type="button" onClick={addItemRow} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px dashed var(--clr-primary)', color: 'var(--clr-primary-light)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Add Line Item
                </button>

              </div>

              {/* Totals Preview */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--clr-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', minWidth: '300px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                        <span>Subtotal:</span>
                        <span>{formatINR(calculatedAmounts.baseTotal)}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                        <span>Est. SGST:</span>
                        <span>{formatINR(calculatedAmounts.sgst)}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                        <span>Est. CGST:</span>
                        <span>{formatINR(calculatedAmounts.cgst)}</span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--clr-card-border)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-text)' }}>
                        <span>Grand Total:</span>
                        <span style={{ color: '#10b981'}}>{formatINR(calculatedAmounts.total)}</span>
                     </div>
                  </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '0.85rem', background: 'var(--clr-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
                 {editingBillId ? 'Save Edits' : 'Commit Invoice'}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
