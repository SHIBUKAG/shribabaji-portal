import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const result = login(username, password);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--clr-bg)' }}>
      {/* Back to Home Button */}
      <button 
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: '1.5rem', left: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'none', border: 'none', color: 'var(--clr-text-muted)',
          cursor: 'pointer', fontSize: '0.9rem', transition: 'var(--trans-base)'
        }}
      >
        <ArrowLeft size={18} /> Back to Website
      </button>

      {/* Login Box */}
      <div style={{
        margin: 'auto',
        width: '100%',
        maxWidth: '400px',
        background: 'var(--clr-card)',
        border: '1px solid var(--clr-card-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '56px', height: '56px', margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-secondary))',
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Lock size={28} color="#fff" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: 'var(--clr-text)', marginBottom: '0.5rem' }}>
            Owner Login
          </h2>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            Access the Shree Babaji dashboard
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(230, 0, 0, 0.1)',
            border: '1px solid rgba(230, 0, 0, 0.3)',
            color: '#ff4d4d',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)',
                padding: '0.75rem 1rem', outline: 'none', transition: 'var(--trans-base)'
              }}
              placeholder="e.g. admin"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--clr-text)',
                padding: '0.75rem 1rem', outline: 'none', transition: 'var(--trans-base)'
              }}
              placeholder="••••••••"
            />
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-dim)', textAlign: 'right', marginTop: '-0.5rem' }}>
            Forgot password? Contact IT.
          </p>

          <button 
            type="submit" 
            style={{
              width: '100%', background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))',
              color: '#fff', border: 'none', padding: '0.95rem', borderRadius: 'var(--radius-full)',
              fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)',
              cursor: 'pointer', transition: 'var(--trans-spring)', marginTop: '0.5rem'
            }}
          >
            Access Dashboard
          </button>
          <div style={{color: 'var(--clr-primary-light)', fontSize: '0.75rem', textAlign: 'center'}}>Hint: admin / admin123</div>
        </form>
      </div>
    </div>
  );
}
