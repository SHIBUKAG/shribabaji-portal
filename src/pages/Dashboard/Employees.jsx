import { useState, useEffect } from 'react';
import { Plus, Users, CalendarCheck, IndianRupee, Trash2, Edit, X, Save, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function Employees() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('directory'); // 'directory', 'attendance', 'payroll'
  
  // Data State
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [attendance, setAttendance] = useState(() => {
    const saved = localStorage.getItem('sbbj_attendance');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [advances, setAdvances] = useState(() => {
    const saved = localStorage.getItem('sbbj_advances');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal & Form States
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [empForm, setEmpForm] = useState({ name: '', role: '', monthlySalary: '', phone: '' });

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ employeeId: '', date: new Date().toISOString().split('T')[0], amount: '', notes: '' });

  // Filters
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summaryMonth, setSummaryMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // --- PERSISTENCE ---
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      const mapped = data.map(emp => ({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        monthlySalary: emp.salary,
        phone: emp.phone
      }));
      setEmployees(mapped);
    } else {
      console.error('Error fetching employees:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    localStorage.setItem('sbbj_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('sbbj_advances', JSON.stringify(advances));
  }, [advances]);

  // --- HANDLERS: DIRECTORY ---
  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      name: empForm.name,
      role: empForm.role,
      salary: parseFloat(empForm.monthlySalary) || 0,
      phone: empForm.phone,
      department: 'Workshop',
      join_date: new Date().toISOString().split('T')[0]
    };

    if (editingEmpId) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingEmpId);
      if (!error) fetchEmployees();
      else alert('Error updating employee');
    } else {
      const { error } = await supabase.from('employees').insert([payload]);
      if (!error) fetchEmployees();
      else alert('Error adding employee');
    }
    
    setIsEmpModalOpen(false);
    setEmpForm({ name: '', role: '', monthlySalary: '', phone: '' });
    setEditingEmpId(null);
  };

  const deleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (!error) {
        setEmployees(employees.filter(emp => emp.id !== id));
      } else {
        alert('Error deleting employee');
      }
    }
  };

  const openEditEmp = (emp) => {
    setEditingEmpId(emp.id);
    setEmpForm({ name: emp.name, role: emp.role, monthlySalary: emp.monthlySalary.toString(), phone: emp.phone });
    setIsEmpModalOpen(true);
  };

  // --- HANDLERS: ATTENDANCE ---
  const handleAttendanceChange = (empId, status) => {
    const existingIndex = attendance.findIndex(a => a.date === attendanceDate && a.employeeId === empId);
    
    if (existingIndex >= 0) {
      const newAtt = [...attendance];
      newAtt[existingIndex].status = status;
      setAttendance(newAtt);
    } else {
      setAttendance([...attendance, { id: Date.now() + Math.random(), date: attendanceDate, employeeId: empId, status }]);
    }
  };

  const getAttendanceStatus = (empId) => {
    const record = attendance.find(a => a.date === attendanceDate && a.employeeId === empId);
    return record ? record.status : 'None';
  };

  // --- HANDLERS: PAYROLL & ADVANCES ---
  const handleAdvanceSubmit = (e) => {
    e.preventDefault();
    setAdvances([...advances, { id: `ADV-${Date.now()}`, ...advanceForm, amount: parseFloat(advanceForm.amount) }]);
    setIsAdvanceModalOpen(false);
    setAdvanceForm({ employeeId: '', date: new Date().toISOString().split('T')[0], amount: '', notes: '' });
  };

  const calculatePayroll = () => {
    const [year, month] = payrollMonth.split('-');
    const totalDaysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    
    return employees.map(emp => {
      // Calculate Days Absent
      const empAttendanceThisMonth = attendance.filter(a => 
        a.employeeId === emp.id && 
        a.date.startsWith(payrollMonth)
      );
      
      let daysAbsent = 0;
      empAttendanceThisMonth.forEach(a => {
        if (a.status === 'Absent') daysAbsent += 1;
        if (a.status === 'Half-Day') daysAbsent += 0.5;
      });

      // Calculate Advances
      const empAdvancesThisMonth = advances.filter(a => 
        a.employeeId === emp.id && 
        a.date.startsWith(payrollMonth)
      );
      const totalAdvances = empAdvancesThisMonth.reduce((sum, a) => sum + a.amount, 0);

      // Total Salary
      const perDaySalary = emp.monthlySalary / totalDaysInMonth;
      const chargeableAbsences = Math.max(0, daysAbsent - 4);
      const salaryDeduction = perDaySalary * chargeableAbsences;
      const totalEarnings = emp.monthlySalary - salaryDeduction;
      
      const netPayable = totalEarnings - totalAdvances;

      return {
        ...emp,
        daysAbsent,
        chargeableAbsences,
        totalAdvances,
        totalEarnings,
        netPayable
      };
    });
  };

  const payrollData = calculatePayroll();

  const calculateSummary = () => {
    const [year, month] = summaryMonth.split('-');
    const totalDaysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    
    return employees.map(emp => {
      const empAtt = attendance.filter(a => a.employeeId === emp.id && a.date.startsWith(summaryMonth));
      let present = 0, halfDay = 0, absent = 0;
      empAtt.forEach(a => {
        if (a.status === 'Present') present++;
        else if (a.status === 'Half-Day') halfDay++;
        else if (a.status === 'Absent') absent++;
      });
      const unmarked = totalDaysInMonth - present - halfDay - absent;
      
      return {
        ...emp,
        present,
        halfDay,
        absent,
        unmarked
      };
    });
  };
  const summaryData = calculateSummary();

  // Helper
  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Employees & Payroll
          </h1>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            Manage staff, track daily attendance, and process monthly wages.
          </p>
        </div>
        
        {/* Action Buttons based on Tab */}
        <div>
          {activeTab === 'directory' && (
            <button 
              onClick={() => { setEditingEmpId(null); setEmpForm({ name: '', role: '', monthlySalary: '', phone: '' }); setIsEmpModalOpen(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))',
                color: '#fff', border: 'none', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
              }}
            >
              <Plus size={16} /> Add Employee
            </button>
          )}
          {activeTab === 'payroll' && (
            <button 
              onClick={() => setIsAdvanceModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--clr-bg-2)', color: 'var(--clr-text)', border: '1px solid var(--clr-card-border)',
                padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
              }}
            >
              <IndianRupee size={16} /> Record Advance
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--clr-card-border)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem', whiteSpace: 'nowrap' }}>
        {[
          { id: 'directory', label: 'Directory', icon: Users },
          { id: 'attendance', label: 'Daily Log', icon: CalendarCheck },
          { id: 'summary', label: 'Summary', icon: FileText },
          { id: 'payroll', label: 'Payroll & Advances', icon: IndianRupee }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none',
              padding: '0.75rem 1rem', cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--clr-primary-light)' : 'var(--clr-text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--clr-primary)' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 500,
              fontSize: '0.9rem', transition: 'var(--trans-base)'
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT: DIRECTORY --- */}
      {activeTab === 'directory' && (
        <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Employee Name</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Monthly Salary</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Phone</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto', display: 'block', marginBottom: '1rem' }} />
                    Loading employees from database...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                    No employees added yet.
                  </td>
                </tr>
              ) : (
                employees.map((emp, i) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--clr-card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--clr-text)' }}>{emp.name}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-muted)' }}>{emp.role}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-muted)' }}>{formatINR(emp.monthlySalary)}/mo</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-muted)' }}>{emp.phone}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button onClick={() => openEditEmp(emp)} style={{ background: 'none', border: 'none', color: 'var(--clr-primary-light)', cursor: 'pointer' }}><Edit size={16} /></button>
                        <button onClick={() => deleteEmployee(emp.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- TAB CONTENT: ATTENDANCE --- */}
      {activeTab === 'attendance' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'var(--clr-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-card-border)' }}>
            <span style={{ fontWeight: 600, color: 'var(--clr-text)' }}>Select Date:</span>
            <input 
              type="date" 
              value={attendanceDate} 
              onChange={(e) => setAttendanceDate(e.target.value)}
              style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {employees.map(emp => {
              const status = getAttendanceStatus(emp.id);
              return (
                <div key={emp.id} style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--clr-text)' }}>{emp.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-dim)' }}>{emp.role}</span>
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px',
                      background: status === 'Present' ? 'rgba(16, 185, 129, 0.1)' : status === 'Absent' ? 'rgba(239, 68, 68, 0.1)' : status === 'Half-Day' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: status === 'Present' ? '#10b981' : status === 'Absent' ? '#ef4444' : status === 'Half-Day' ? '#f59e0b' : 'var(--clr-text-dim)'
                    }}>
                      {status}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleAttendanceChange(emp.id, 'Present')}
                      style={{ flex: 1, padding: '0.5rem', background: status === 'Present' ? '#10b981' : 'var(--clr-bg-2)', color: status === 'Present' ? '#fff' : 'var(--clr-text)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >Present</button>
                    <button 
                      onClick={() => handleAttendanceChange(emp.id, 'Half-Day')}
                      style={{ flex: 1, padding: '0.5rem', background: status === 'Half-Day' ? '#f59e0b' : 'var(--clr-bg-2)', color: status === 'Half-Day' ? '#fff' : 'var(--clr-text)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >Half</button>
                    <button 
                      onClick={() => handleAttendanceChange(emp.id, 'Absent')}
                      style={{ flex: 1, padding: '0.5rem', background: status === 'Absent' ? '#ef4444' : 'var(--clr-bg-2)', color: status === 'Absent' ? '#fff' : 'var(--clr-text)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >Absent</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: SUMMARY --- */}
      {activeTab === 'summary' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'var(--clr-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-card-border)' }}>
            <span style={{ fontWeight: 600, color: 'var(--clr-text)' }}>Summary Month:</span>
            <input 
              type="month" 
              value={summaryMonth} 
              onChange={(e) => setSummaryMonth(e.target.value)}
              style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', outline: 'none' }}
            />
          </div>

          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Present</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Half-Day</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Absent</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Unmarked (Assumed Present)</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                      No data available for this month.
                    </td>
                  </tr>
                )}
                {summaryData.map((data, i) => (
                  <tr key={data.id} style={{ borderBottom: '1px solid var(--clr-card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--clr-text)' }}>{data.name}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#10b981', fontWeight: 600 }}>{data.present}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#f59e0b', fontWeight: 600 }}>{data.halfDay}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#ef4444', fontWeight: 600 }}>{data.absent}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-muted)' }}>{data.unmarked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: PAYROLL --- */}
      {activeTab === 'payroll' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'var(--clr-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--clr-card-border)' }}>
            <span style={{ fontWeight: 600, color: 'var(--clr-text)' }}>Payroll Month:</span>
            <input 
              type="month" 
              value={payrollMonth} 
              onChange={(e) => setPayrollMonth(e.target.value)}
              style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', color: 'var(--clr-text)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', outline: 'none' }}
            />
          </div>

          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Monthly Salary</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Days Absent</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }} title="Absences beyond 4 free holidays">Chargeable</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Total Earnings</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Advances</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Net Payable</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                      No data available for this month.
                    </td>
                  </tr>
                )}
                {payrollData.map((data, i) => (
                  <tr key={data.id} style={{ borderBottom: '1px solid var(--clr-card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--clr-text)' }}>{data.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{data.role}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-muted)' }}>{formatINR(data.monthlySalary)}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--clr-text-muted)' }}>{data.daysAbsent}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: data.chargeableAbsences > 0 ? '#ef4444' : 'var(--clr-text-dim)' }}>{data.chargeableAbsences}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text)' }}>{formatINR(data.totalEarnings)}</td>
                    <td style={{ padding: '1rem 1.5rem', color: '#ef4444' }}>- {formatINR(data.totalAdvances)}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>{formatINR(data.netPayable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Employee Modal */}
      {isEmpModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', padding: '2rem', animation: 'fadeInUp 0.3s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--clr-text)' }}>{editingEmpId ? 'Edit' : 'Add'} Employee</h2>
              <button onClick={() => setIsEmpModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEmpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                <input type="text" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Role</label>
                <input type="text" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} placeholder="e.g. Welder" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Monthly Salary (₹)</label>
                <input type="number" value={empForm.monthlySalary} onChange={e => setEmpForm({...empForm, monthlySalary: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Phone Number</label>
                <input type="tel" value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
              </div>
              <button type="submit" style={{ background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: 'var(--radius-full)', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem' }}>Save Employee</button>
            </form>
          </div>
        </div>
      )}

      {/* Advance Payment Modal */}
      {isAdvanceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', padding: '2rem', animation: 'fadeInUp 0.3s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--clr-text)' }}>Record Advance Payment</h2>
              <button onClick={() => setIsAdvanceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdvanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Select Employee</label>
                <select value={advanceForm.employeeId} onChange={e => setAdvanceForm({...advanceForm, employeeId: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }}>
                  <option value="" disabled>Choose an employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Date</label>
                <input type="date" value={advanceForm.date} onChange={e => setAdvanceForm({...advanceForm, date: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Amount (₹)</label>
                <input type="number" value={advanceForm.amount} onChange={e => setAdvanceForm({...advanceForm, amount: e.target.value})} required style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Notes (Optional)</label>
                <input type="text" value={advanceForm.notes} onChange={e => setAdvanceForm({...advanceForm, notes: e.target.value})} style={{ background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)', padding: '0.75rem', outline: 'none' }} placeholder="e.g. Festival advance" />
              </div>
              <button type="submit" style={{ background: 'var(--clr-bg-2)', color: 'var(--clr-text)', border: '1px solid var(--clr-card-border)', padding: '0.85rem', borderRadius: 'var(--radius-full)', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem', transition: 'var(--trans-base)' }}>Save Advance</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
