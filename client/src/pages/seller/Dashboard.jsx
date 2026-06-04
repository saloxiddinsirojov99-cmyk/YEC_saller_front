import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { getStatistics } from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import { Plus, Package, ShoppingBag, Clock, DollarSign } from 'lucide-react';
import './Dashboard.css';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayOrders: 0,
    totalAmount: 0,
    pendingAmount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStatistics();
        // Backend seller stats response: data.role === 'seller'
        // data.today.orders_count, data.today.sales_amount, data.today.debt_amount
        setStats({
          todayOrders: data?.today?.orders_count || 0,
          totalAmount: data?.today?.sales_amount || 0,
          pendingAmount: data?.today?.debt_amount || 0
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const navItems = [
    { path: '/seller/create-order', label: 'Yangi Buyurtma' },
    { path: '/seller/orders', label: 'Buyurtmalar' }
  ];

  if (loading) {
    return (
      <Layout navItems={navItems}>
        <div className="seller-dashboard">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Ma'lumotlar yuklanmoqda...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout navItems={navItems}>
      <div className="seller-dashboard animate-fadeIn">
        <h2 className="page-title">Sotuvchi Paneli</h2>
        <p className="seller-greeting animate-fadeInLeft">Xush kelibsiz, {user?.name}</p>

        <div className="stats-grid">
          <div className="stat-card animate-bounceIn" style={{ animationDelay: '0.1s' }}>
            <div className="stat-icon-wrapper primary">
              <ShoppingBag size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Bugungi buyurtmalar</p>
              <p className="stat-value">
                <AnimatedCounter value={stats.todayOrders} suffix=" ta" />
              </p>
            </div>
          </div>

          <div className="stat-card animate-bounceIn" style={{ animationDelay: '0.2s' }}>
            <div className="stat-icon-wrapper success">
              <DollarSign size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Jami savdo summa</p>
              <p className="stat-value">
                <AnimatedCounter value={stats.totalAmount} suffix=" so'm" />
              </p>
            </div>
          </div>

          <div className="stat-card animate-bounceIn" style={{ animationDelay: '0.3s' }}>
            <div className="stat-icon-wrapper warning">
              <Clock size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">To'lanmagan qoldiq</p>
              <p className="stat-value">
                <AnimatedCounter value={stats.pendingAmount} suffix=" so'm" />
              </p>
            </div>
          </div>
        </div>

        <div className="quick-actions animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <button className="action-btn primary" onClick={() => navigate('/seller/create-order')}>
            <Plus size={22} />
            <div className="action-text">
              <span className="action-title">Yangi buyurtma yaratish</span>
              <span className="action-desc">Mijoz uchun yangi buyurtma qo'shish</span>
            </div>
          </button>
          <button className="action-btn secondary" onClick={() => navigate('/seller/orders')}>
            <Package size={22} />
            <div className="action-text">
              <span className="action-title">Buyurtmalarni ko'rish</span>
              <span className="action-desc">Barcha buyurtmalar ro'yxati</span>
            </div>
          </button>
        </div>
      </div>
    </Layout>
  );
}