import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, User, Lock } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'seller') {
        navigate('/seller/dashboard');
      }
    } catch (err) {
      const errorMsg = err?.message || err?.toString() || 'Login xatosi yuz berdi. Iltimos qaytadan urining.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg"></div>
      <div className="login-card animate-scaleIn">
        <div className="login-logo animate-float">
          <img src="/logo.svg" alt="YEC Gilam" className="login-logo-img" />
        </div>
        <p className="login-subtitle">Buyurtma Boshqaruv Tizimi</p>

        {error && <div className="error-message animate-shake">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">
              <User size={16} /> Email
            </label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={16} /> Parol
            </label>
            <div className="input-wrapper">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolingizni kiriting"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Yuklanmoqda...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Kirish
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}