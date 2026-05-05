import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Package, MessageSquare, Settings, LogOut, Search, Bell, Menu, FileText, Receipt, Users, BookOpen } from 'lucide-react';
import { useState } from 'react';

export default function DashboardLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Billing', path: '/dashboard/billing', icon: Receipt },
    { name: 'Products', path: '/dashboard/products', icon: Package },
    { name: 'Purchases', path: '/dashboard/purchases', icon: FileText },
    { name: 'Employees', path: '/dashboard/employees', icon: Users },
    { name: 'Ledger', path: '/dashboard/ledger', icon: BookOpen },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--clr-bg-2)' }}>
      
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '260px' : '80px',
        background: 'var(--clr-card)',
        borderRight: '1px solid var(--clr-card-border)',
        transition: 'var(--trans-base)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 10
      }}>
        {/* Logo Area */}
        <div style={{
          padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
          borderBottom: '1px solid var(--clr-card-border)', height: '73px'
        }}>
          <div style={{
            width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-secondary))',
            borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <span style={{ fontSize: '1.2rem' }}>🔩</span>
          </div>
          {sidebarOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--clr-text)', whiteSpace: 'nowrap' }}>Shree Babaji</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--clr-primary-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Manager</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ padding: '1.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <NavLink
                to={item.path}
                key={item.name}
                end={item.path === '/dashboard'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none', transition: 'var(--trans-base)',
                  background: isActive ? 'rgba(230, 92, 0, 0.1)' : 'transparent',
                  color: isActive ? 'var(--clr-primary-light)' : 'var(--clr-text-muted)',
                  borderLeft: isActive ? '3px solid var(--clr-primary)' : '3px solid transparent'
                }}
                title={!sidebarOpen ? item.name : ''}
              >
                <Icon size={20} />
                {sidebarOpen && <span style={{ fontWeight: isActive ? 600 : 500, fontSize: '0.9rem' }}>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--clr-card-border)' }}>
          <button 
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem', width: '100%',
              padding: '0.85rem 1rem', background: 'transparent', border: 'none',
              color: '#ff4d4d', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
              transition: 'var(--trans-base)'
            }}
          >
            <LogOut size={20} />
            {sidebarOpen && <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Top Header */}
        <header style={{
          height: '73px', background: 'var(--clr-bg)', borderBottom: '1px solid var(--clr-card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem',
          position: 'sticky', top: 0, zIndex: 5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', color: 'var(--clr-text)', cursor: 'pointer' }}
            >
              <Menu size={24} />
            </button>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} color="var(--clr-text-dim)" style={{ position: 'absolute', left: '1rem' }} />
              <input 
                type="text" 
                placeholder="Search products..." 
                style={{
                  background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)',
                  color: 'var(--clr-text)', borderRadius: 'var(--radius-full)',
                  padding: '0.5rem 1rem 0.5rem 2.8rem', outline: 'none', width: '300px', fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', position: 'relative' }}>
              <Bell size={20} />
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px',
                background: 'var(--clr-primary)', borderRadius: '50%'
              }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text)', lineHeight: 1.2 }}>Admin User</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-dim)' }}>Owner</div>
              </div>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', background: 'var(--clr-primary-dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700
              }}>
                A
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
      </main>

    </div>
  );
}
