import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { getStatistics } from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import { Package, Users, Building2, BarChart3 } from 'lucide-react';
import './Dashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    topProducts: [],
    topBranches: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStatistics();
        // Map server response to component state
        setStats({
          totalOrders: data?.counts?.monthly || 0,
          totalRevenue: data?.total_sales || 0,
          pendingAmount: data?.unpaid_orders?.reduce((sum, o) => sum + (o.debt_amount || 0), 0) || 0,
          topProducts: data?.top_products?.map(p => ({
            name: p.product_name,
            quantity: p.total_qty,
            revenue: p.revenue
          })) || [],
          topBranches: data?.branch_sales?.map(b => ({
            name: b.branch_name,
            orders: b.order_count,
            revenue: b.sales_sum
          })) || []
        });
      } catch (err) {
        console.error('Error fetching statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const navItems = [
    { path: '/admin/dashboard', label: 'Asosiy' },
    { path: '/admin/products', label: 'Mahsulotlar' },
    { path: '/admin/branches', label: 'Filiallar' },
    { path: '/admin/users', label: 'Foydalanuvchilar' },
    { path: '/admin/orders', label: 'Buyurtmalar' },
    { path: '/admin/statistics', label: 'Statistika' }
  ];

  const menuItems = [
    { title: 'Mahsulotlarni boshqarish', path: '/admin/products', icon: Package },
    { title: 'Filiallarni boshqarish', path: '/admin/branches', icon: Building2 },
    { title: 'Buyurtmalarni boshqarish', path: '/admin/orders', icon: Package },
    { title: 'Foydalanuvchilarni boshqarish', path: '/admin/users', icon: Users },
    { title: 'Statistikani ko\'rish', path: '/admin/statistics', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <Layout navItems={navItems}>
        <div className="admin-dashboard">
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
      <div className="admin-dashboard">
        <h2 className="page-title">Admin Paneli</h2>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <p className="stat-label">Jami buyurtmalar</p>
              <p className="stat-value">
                <AnimatedCounter value={stats.totalOrders || 0} />
              </p>
            </div>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <p className="stat-label">Jami daromad</p>
              <p className="stat-value">
                <AnimatedCounter value={stats.totalRevenue || 0} suffix=" so'm" />
              </p>
            </div>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <p className="stat-label">To'lanmagan summa</p>
              <p className="stat-value">
                <AnimatedCounter value={stats.pendingAmount || 0} suffix=" so'm" />
              </p>
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="menu-grid">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className="menu-card"
                onClick={() => navigate(item.path)}
              >
                <Icon size={40} />
                <p>{item.title}</p>
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}