import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import './Layout.css';

export default function Layout({ children, navItems }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogoClick = () => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/seller/dashboard');
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="logo-section" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <img src="/logo.svg" alt="YEC Gilam" className="header-logo" />
          </div>
          <nav className={`nav ${menuOpen ? 'open' : ''}`}>
            {navItems && navItems.map(item => (
              <Link key={item.path} to={item.path} className="nav-link">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="user-section">
            <span className="user-name">{user?.name}</span>
            <button onClick={handleLogout} className="logout-btn" title="Chiqish">
              <LogOut size={20} />
            </button>
            <button 
              className="menu-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
