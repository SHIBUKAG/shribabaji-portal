import { useState, useEffect, useRef } from 'react';
import { Plus, Building2, FileText, X, Trash2, Download, Users, Upload, Edit, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';

export default function Purchases() {
  // Data State
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isViewSuppliersModalOpen, setIsViewSuppliersModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);

  // Filter State
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  // Form State
  const [supplierForm, setSupplierForm] = useState({ name: '', gstin: '' });
  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    invoiceNo: '',
    supplierId: '',
    items: [{ id: 1, amount: '', gstRate: '9' }] // Default 1 row (9% rate = 18% GST total)
  });

  // Derived State for UI calculations
  const [calculatedAmounts, setCalculatedAmounts] = useState({ cgst: 0, sgst: 0, total: 0, baseTotal: 0 });
  const [selectedSupplierGstin, setSelectedSupplierGstin] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [supRes, purRes] = await Promise.all([
      supabase.from('suppliers').select('*'),
      supabase.from('purchases_v2').select('*').order('date', { ascending: false })
    ]);
    
    if (!supRes.error) setSuppliers(supRes.data);
    if (!purRes.error) {
      const mappedPurchases = purRes.data.map(p => ({
        id: p.id,
        date: p.date,
        invoiceNo: p.invoice_no,
        supplierId: p.supplier_id,
        items: p.items,
        baseTotal: Number(p.base_total),
        cgstAmount: Number(p.cgst_amount),
        sgstAmount: Number(p.sgst_amount),
        totalAmount: Number(p.total_amount)
      }));
      setPurchases(mappedPurchases);
    }
    setIsLoading(false);
  };

  // Recalculate amounts whenever items change
  useEffect(() => {
    let cgst = 0;
    let sgst = 0;
    let baseTotal = 0;

    purchaseForm.items.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      const rate = parseFloat(item.gstRate) || 0;
      
      const tax = amt * (rate / 100);
      cgst += tax;
      sgst += tax;
      baseTotal += amt;
    });

    setCalculatedAmounts({
      cgst,
      sgst,
      baseTotal,
      total: baseTotal + cgst + sgst
    });
  }, [purchaseForm.items]);

  // File Upload Ref
  const fileInputRef = useRef(null);

  // Update GSTIN display when supplier changes
  useEffect(() => {
    const supplier = suppliers.find(s => s.id === purchaseForm.supplierId);
    setSelectedSupplierGstin(supplier ? supplier.gstin : '');
  }, [purchaseForm.supplierId, suppliers]);

  // Handle Excel Upload
  const handleBulkUploadSuppliers = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const newSuppliers = [];
      let nextIdNumber = suppliers.length + 1;
      let duplicatesFound = 0;
      
      data.forEach(row => {
        const nameKey = Object.keys(row).find(k => String(k).toLowerCase().includes('name') || String(k).toLowerCase().includes('supplier'));
        const gstKey = Object.keys(row).find(k => String(k).toLowerCase().includes('gst'));
        
        if (nameKey && row[nameKey]) {
          const parsedGstin = gstKey && row[gstKey] ? String(row[gstKey]).toUpperCase().trim() : 'NOT PROVIDED';
          
          if (parsedGstin !== 'NOT PROVIDED') {
            const existsInDb = suppliers.some(s => s.gstin === parsedGstin);
            const existsInUploadBuffer = newSuppliers.some(s => s.gstin === parsedGstin);
            
            if (existsInDb || existsInUploadBuffer) {
              duplicatesFound++;
              return; // Skip duplicate
            }
          }

          newSuppliers.push({
            id: `SUP-${String(nextIdNumber++).padStart(3, '0')}`,
            name: String(row[nameKey]).trim(),
            gstin: parsedGstin
          });
        }
      });

      if (newSuppliers.length > 0) {
        const { error } = await supabase.from('suppliers').insert(newSuppliers);
        if (!error) {
          fetchData();
          alert(`Successfully imported ${newSuppliers.length} suppliers!${duplicatesFound > 0 ? ` Skipped ${duplicatesFound} duplicate GST entries.` : ''}`);
        } else {
          alert('Error importing suppliers: ' + error.message);
        }
      } else if (duplicatesFound > 0) {
        alert(`No new suppliers imported. Found ${duplicatesFound} duplicate GST entries that were skipped.`);
      } else {
        alert('Could not detect any valid rows in the Excel file. Please ensure it has a "Name" and "GSTIN" column.');
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // Handlers for Supplier
  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    const newId = `SUP-${String(suppliers.length + 1).padStart(3, '0')}`;
    const payload = { id: newId, ...supplierForm };
    
    const { error } = await supabase.from('suppliers').insert([payload]);
    if (!error) {
      fetchData();
      setIsSupplierModalOpen(false);
      setSupplierForm({ name: '', gstin: '' });
    } else {
      alert('Error creating supplier: ' + error.message);
    }
  };

  const deleteSupplier = async (id) => {
    // Check if supplier is used in any bill
    const isUsed = purchases.some(p => p.supplierId === id);
    if (isUsed) {
      alert("Cannot delete this supplier because there are purchase bills associated with it.");
      return;
    }
    if (window.confirm('Delete this supplier?')) {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (!error) fetchData();
      else alert('Error deleting supplier');
    }
  };

  // Handlers for Items Array
  const addTaxableRow = () => {
    setPurchaseForm(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), amount: '', gstRate: '2.5' }] // Default new row to 5% GST
    }));
  };

  const removeTaxableRow = (id) => {
    if (purchaseForm.items.length === 1) return; // Need at least one row
    setPurchaseForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateTaxableRow = (id, field, value) => {
    setPurchaseForm(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  // Handlers for Purchase Bill
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.supplierId) {
      alert("Please select a supplier. If none exists, create one first.");
      return;
    }

    // Check if amounts are valid
    const hasInvalidAmount = purchaseForm.items.some(item => !item.amount || parseFloat(item.amount) <= 0);
    if (hasInvalidAmount) {
      alert("Please enter a valid amount for all taxable rows.");
      return;
    }

    const targetId = editingPurchaseId || `BIL-${String(purchases.length + 1).padStart(3, '0')}`;
    
    const payload = {
      id: targetId,
      date: purchaseForm.date,
      invoice_no: purchaseForm.invoiceNo,
      supplier_id: purchaseForm.supplierId,
      items: purchaseForm.items,
      base_total: calculatedAmounts.baseTotal,
      cgst_amount: calculatedAmounts.cgst,
      sgst_amount: calculatedAmounts.sgst,
      total_amount: calculatedAmounts.total
    };
    
    if (editingPurchaseId) {
      const { error } = await supabase.from('purchases_v2').update(payload).eq('id', editingPurchaseId);
      if (!error) fetchData();
      else alert('Error updating purchase: ' + error.message);
    } else {
      const { error } = await supabase.from('purchases_v2').insert([payload]);
      if (!error) fetchData();
      else alert('Error creating purchase: ' + error.message);
    }

    closePurchaseModal();
  };

  const editPurchase = (bill) => {
    setEditingPurchaseId(bill.id);
    setPurchaseForm({
      date: bill.date,
      invoiceNo: bill.invoiceNo,
      supplierId: bill.supplierId,
      items: bill.items.length > 0 ? bill.items : [{ id: 1, amount: '', gstRate: '9' }]
    });
    setIsPurchaseModalOpen(true);
  };

  const closePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    setEditingPurchaseId(null);
    setPurchaseForm({
      date: new Date().toISOString().split('T')[0],
      invoiceNo: '',
      supplierId: '',
      items: [{ id: 1, amount: '', gstRate: '9' }]
    });
  };

  const deletePurchase = async (id) => {
    if (window.confirm('Delete this purchase record?')) {
      const { error } = await supabase.from('purchases_v2').delete().eq('id', id);
      if (!error) fetchData();
      else alert('Error deleting purchase');
    }
  };

  // Helper to format currency
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  // Export to PDF Feature
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      const safeFormat = (amt) => {
        return 'Rs. ' + amountFormat(amt);
      };
      const amountFormat = (amt) => new Intl.NumberFormat('en-IN').format(amt);
      
      doc.setFontSize(22);
      doc.setTextColor(230, 92, 0);
      doc.text('Shree Babaji Welding Works', 14, 22);
      
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text('Purchase Master Log', 14, 30);
    
      doc.setFontSize(11);
      doc.setTextColor(100);
      
      let subtitle = `Generated on: ${new Date().toLocaleDateString()}`;
      if (filterFromDate || filterToDate) {
         subtitle += ` | Period: ${filterFromDate || 'Start'} to ${filterToDate || 'End'}`;
      }
      doc.text(subtitle, 14, 38);
    
    const tableColumn = ["Sr. No.", "Date", "Invoice No", "Supplier & GST", "Tax Slabs (Base Amounts)", "Taxes (CGST + SGST)", "Total Value"];
    const tableRows = [];

    const filteredPurchasesForPDF = purchases.filter(bill => {
      let valid = true;
      if (filterFromDate && new Date(bill.date) < new Date(filterFromDate)) valid = false;
      if (filterToDate && new Date(bill.date) > new Date(filterToDate)) valid = false;
      return valid;
    });

    filteredPurchasesForPDF.forEach((bill, index) => {
      const supplier = suppliers.find(s => s.id === bill.supplierId);
      const supplierName = supplier ? supplier.name : 'Unknown';
      const supplierGst = supplier ? supplier.gstin : 'N/A';
      
      const slabDetails = bill.items.map(item => `${item.gstRate * 2}% GST: ${safeFormat(parseFloat(item.amount) || 0)}`).join('\n');

      const billData = [
        `${index + 1}`,
        bill.date,
        bill.invoiceNo,
        `${supplierName}\nGST: ${supplierGst}`,
        slabDetails,
        `${safeFormat(bill.cgstAmount)}\n+ ${safeFormat(bill.sgstAmount)}`,
        `${safeFormat(bill.totalAmount)}`
      ];
      tableRows.push(billData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 46,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [230, 92, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40 }
    });
    
    const totalVolume = filteredPurchasesForPDF.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalCGST = filteredPurchasesForPDF.reduce((acc, curr) => acc + curr.cgstAmount, 0);
    const totalSGST = filteredPurchasesForPDF.reduce((acc, curr) => acc + curr.sgstAmount, 0);
    
    let finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Report Summary', 14, finalY);
    
    doc.setFontSize(10);
    doc.text(`Total Purchases: ${filteredPurchasesForPDF.length} invoices`, 14, finalY + 8);
    doc.text(`Total CGST Paid: ${safeFormat(totalCGST)}`, 14, finalY + 14);
    doc.text(`Total SGST Paid: ${safeFormat(totalSGST)}`, 14, finalY + 20);
    doc.text(`Total Gross Volume: ${safeFormat(totalVolume)}`, 14, finalY + 26);

    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text('For Shree Babaji Welding Works', pageWidth - 14, finalY + 12, { align: 'right' });
    
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 70, finalY + 28, pageWidth - 14, finalY + 28);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Authorized Signatory', pageWidth - 14, finalY + 34, { align: 'right' });

    doc.save('Shree_Babaji_Purchase_Report.pdf');
    } catch(e) {
      console.error("PDF Export failed:", e);
      alert("Failed to export PDF. Check console for details.");
    }
  };

  const filteredPurchases = purchases.filter(bill => {
      let valid = true;
      if (filterFromDate && new Date(bill.date) < new Date(filterFromDate)) valid = false;
      if (filterToDate && new Date(bill.date) > new Date(filterToDate)) valid = false;
      return valid;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Purchase Reports
          </h1>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            Log inbound shipments and export data conditionally using date ranges.
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
          {/* Duration Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--clr-bg-2)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--clr-card-border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-text-dim)', textTransform: 'uppercase', marginRight: '0.25rem' }}>Filter:</span>
            <input 
               type="date" 
               value={filterFromDate}
               onChange={(e) => setFilterFromDate(e.target.value)}
               title="From Date"
               style={{ background: 'transparent', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', fontSize: '0.75rem', outline: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>—</span>
            <input 
               type="date" 
               value={filterToDate}
               onChange={(e) => setFilterToDate(e.target.value)}
               title="To Date"
               style={{ background: 'transparent', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', fontSize: '0.75rem', outline: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setIsViewSuppliersModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--clr-bg-2)', color: 'var(--clr-text)', border: '1px solid var(--clr-card-border)', 
              padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
            }}
          >
            <Users size={16} /> Manage Suppliers
          </button>
          
          <button 
            onClick={async () => {
              if (window.confirm('WARNING: Are you sure you want to delete ALL purchase bills and suppliers? This action cannot be undone!')) {
                setIsLoading(true);
                await supabase.from('purchases_v2').delete().neq('id', '');
                await supabase.from('suppliers').delete().neq('id', '');
                fetchData();
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', 
              padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
            }}
          >
            <Trash2 size={16} /> Wipe All Data
          </button>
          
          <button 
            onClick={handleExportPDF}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', 
              padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
            }}
          >
            <Download size={16} /> Export PDF
          </button>
          
          <button 
            onClick={() => {
              setEditingPurchaseId(null);
              setPurchaseForm({
                date: new Date().toISOString().split('T')[0],
                invoiceNo: '',
                supplierId: '',
                items: [{ id: 1, amount: '', gstRate: '9' }]
              });
              setIsPurchaseModalOpen(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))',
              color: '#fff', border: 'none', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
            }}
          >
            <Plus size={16} /> Log Purchase Bill
          </button>
        </div>
        </div>
      </div>

      {/* Overview Stats for Purchases */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>Total Purchase Volume</h3>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--clr-text)' }}>
            {formatINR(filteredPurchases.reduce((acc, curr) => acc + curr.totalAmount, 0))}
          </div>
        </div>
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>Total CGST Paid</h3>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--clr-text)' }}>
            {formatINR(filteredPurchases.reduce((acc, curr) => acc + curr.cgstAmount, 0))}
          </div>
        </div>
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 500, marginBottom: '0.5rem' }}>Total SGST Paid</h3>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--clr-text)' }}>
            {formatINR(filteredPurchases.reduce((acc, curr) => acc + curr.sgstAmount, 0))}
          </div>
        </div>
      </div>

      {/* Bill Log Table */}
      <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--clr-card-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={20} color="var(--clr-primary-light)" />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--clr-text)' }}>Purchase Master Log</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Date & Inv #</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Supplier</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Multi-Tax Breakdown</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Taxes (CGST + SGST)</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Total Value</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                  <Loader2 size={24} className="spin" style={{ margin: '0 auto', display: 'block', marginBottom: '1rem' }} />
                  Loading purchases from database...
                </td>
              </tr>
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                  No bills recorded yet. Add a supplier, then log a bill.
                </td>
              </tr>
            ) : filteredPurchases.map((bill, i) => {
              const supplier = suppliers.find(s => s.id === bill.supplierId);
              return (
                <tr key={bill.id} style={{ borderBottom: '1px solid var(--clr-card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--clr-text)' }}>{bill.invoiceNo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{bill.date}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--clr-text)' }}>{supplier?.name || 'Unknown'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>GSTIN: {supplier?.gstin || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {bill.items.map((item, id) => (
                         <div key={id} style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                            <span style={{color: 'var(--clr-primary-light)'}}>{item.gstRate * 2}% GST</span>: {formatINR(parseFloat(item.amount) || 0)} Base
                         </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-dim)' }}>
                    {formatINR(bill.cgstAmount)} + {formatINR(bill.sgstAmount)}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#10b981' }}>
                    {formatINR(bill.totalAmount)}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => editPurchase(bill)} style={{ background: 'none', border: 'none', color: 'var(--clr-primary-light)', cursor: 'pointer', transition: 'var(--trans-base)' }} title="Edit">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => deletePurchase(bill.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', transition: 'var(--trans-base)' }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* View Suppliers Modal */}
      {isViewSuppliersModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', padding: '2rem', animation: 'fadeInUp 0.3s ease both', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={24} color="var(--clr-primary)" />
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--clr-text)' }}>Manage Suppliers</h2>
              </div>
              <button onClick={() => setIsViewSuppliersModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.75rem' }}>
              <input type="file" accept=".xlsx, .xls, .csv" hidden ref={fileInputRef} onChange={handleBulkUploadSuppliers} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--clr-bg-2)', color: 'var(--clr-text)', border: '1px solid var(--clr-card-border)', 
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
                }}
              >
                <Upload size={16} /> Bulk Upload (.xlsx)
              </button>
               <button 
                onClick={() => { setIsViewSuppliersModalOpen(false); setIsSupplierModalOpen(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'transparent', color: 'var(--clr-primary-light)', border: '1px dashed var(--clr-primary)', 
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                <Plus size={16} /> Create New Supplier
              </button>
            </div>

            <div style={{ border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Supplier Name</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>GSTIN</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((sup, i) => (
                    <tr key={sup.id} style={{ borderBottom: '1px solid var(--clr-card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--clr-text)', fontWeight: 500 }}>{sup.name}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--clr-text-muted)' }}>{sup.gstin}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button onClick={() => deleteSupplier(sup.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete Supplier">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr><td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>No suppliers defined.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Form Modal */}
      {isSupplierModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', padding: '2rem', animation: 'fadeInUp 0.3s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--clr-text)' }}>Add Supplier Entity</h2>
              <button 
                onClick={() => { setIsSupplierModalOpen(false); setIsViewSuppliersModalOpen(true); }} 
                style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSupplierSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Supplier Name</label>
                <input type="text" value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} placeholder="e.g. Balaji Steels" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Supplier GSTIN</label>
                <input type="text" value={supplierForm.gstin} onChange={(e) => setSupplierForm({...supplierForm, gstin: e.target.value.toUpperCase()})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} placeholder="22AAAAA0000A1Z5" />
              </div>
              <button type="submit" style={{ background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 'var(--radius-full)', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' }}>Save Supplier</button>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Bill Modal */}
      {isPurchaseModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '600px', padding: '2rem', animation: 'fadeInUp 0.3s ease both', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--clr-text)' }}>Log Purchase Bill</h2>
              <button onClick={() => setIsPurchaseModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handlePurchaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Invoice Date</label>
                  <input type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm({...purchaseForm, date: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Invoice Number</label>
                  <input type="text" value={purchaseForm.invoiceNo} onChange={(e) => setPurchaseForm({...purchaseForm, invoiceNo: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Select Supplier</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    value={purchaseForm.supplierId} 
                    onChange={(e) => setPurchaseForm({...purchaseForm, supplierId: e.target.value})} 
                    required 
                    style={{ flex: 1, background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }}
                  >
                    <option value="" disabled>Choose Supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.gstin})</option>
                    ))}
                  </select>
                </div>
                {selectedSupplierGstin && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-primary-light)', marginTop: '0.25rem' }}>
                    Selected GSTIN: {selectedSupplierGstin}
                  </div>
                )}
              </div>

              {/* Dynamic Items (Tax Slabs) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Taxable Amounts (Base Price)</label>
                  <button type="button" onClick={addTaxableRow} style={{ background: 'transparent', color: 'var(--clr-primary-light)', border: 'none', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Plus size={14} /> Add Slab
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {purchaseForm.items.map((item, index) => (
                    <div key={item.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Amount (e.g. 5000)" 
                          value={item.amount} 
                          onChange={(e) => updateTaxableRow(item.id, 'amount', e.target.value)}
                          required
                          style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none', width: '100%' }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <select 
                          value={item.gstRate} 
                          onChange={(e) => updateTaxableRow(item.id, 'gstRate', e.target.value)}
                          style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none', width: '100%' }}
                        >
                          <option value="2.5">5% (2.5+2.5)</option>
                          <option value="6">12% (6+6)</option>
                          <option value="9">18% (9+9)</option>
                          <option value="14">28% (14+14)</option>
                        </select>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeTaxableRow(item.id)}
                        disabled={purchaseForm.items.length === 1}
                        style={{ padding: '0.75rem', background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: purchaseForm.items.length === 1 ? 'var(--clr-text-dim)' : '#ef4444', cursor: purchaseForm.items.length === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculated Summary */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--clr-card-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                  <span>Total Base Amount:</span>
                  <span>{formatINR(calculatedAmounts.baseTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                  <span>Total CGST:</span>
                  <span>{formatINR(calculatedAmounts.cgst)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                  <span>Total SGST:</span>
                  <span>{formatINR(calculatedAmounts.sgst)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--clr-card-border)', fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
                  <span>Grand Total:</span>
                  <span>{formatINR(calculatedAmounts.total)}</span>
                </div>
              </div>

              <button type="submit" style={{ background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 'var(--radius-full)', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}>
                {editingPurchaseId ? 'Update Purchase Bill' : 'Log Purchase Bill'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
