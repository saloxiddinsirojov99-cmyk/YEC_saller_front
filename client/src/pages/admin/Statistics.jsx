import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getStatistics } from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import { TrendingUp, Calendar, DollarSign, Clock, Award, Building } from 'lucide-react';
import './Statistics.css';

export default function Statistics() {
  const [stats, setStats] = useState({
    dailyOrders: 0,
    weeklyOrders: 0,
    monthlyOrders: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    topProducts: [],
    topBranches: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const data = await getStatistics();
      // Map server response to component state
      setStats({
        dailyOrders: data?.counts?.daily || 0,
        weeklyOrders: data?.counts?.weekly || 0,
        monthlyOrders: data?.counts?.monthly || 0,
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
      setError('Statistikani yuklashda xato: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Asosiy' },
    { path: '/admin/products', label: 'Mahsulotlar' },
    { path: '/admin/branches', label: 'Filiallar' },
    { path: '/admin/users', label: 'Foydalanuvchilar' },
    { path: '/admin/statistics', label: 'Statistika' }
  ];

  if (loading) {
    return (
      <Layout navItems={navItems}>
        <div className="statistics">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Statistika yuklanmoqda...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout navItems={navItems}>
      <div className="statistics animate-fadeIn">
        <h2 className="page-title">Statistika va Hisobot</h2>

        {error && <div className="error-message animate-shake">{error}</div>}

        {/* Order Statistics */}
        <div className="section animate-fadeInUp">
          <h3><Calendar size={22} /> Buyurtmalar statistikasi</h3>
          <div className="stats-grid">
            <div className="stat-box animate-bounceIn" style={{ animationDelay: '0.1s' }}>
              <div className="stat-icon-wrapper primary">
                <Calendar size={28} />
              </div>
              <p className="stat-label">Bugungi buyurtmalar</p>
              <p className="stat-number">
                <AnimatedCounter value={stats.dailyOrders || 0} />
              </p>
              <p className="stat-unit">ta buyurtma</p>
            </div>
            <div className="stat-box animate-bounceIn" style={{ animationDelay: '0.2s' }}>
              <div className="stat-icon-wrapper info">
                <Calendar size={28} />
              </div>
              <p className="stat-label">Ushbu haftadagi buyurtmalar</p>
              <p className="stat-number">
                <AnimatedCounter value={stats.weeklyOrders || 0} />
              </p>
              <p className="stat-unit">ta buyurtma</p>
            </div>
            <div className="stat-box animate-bounceIn" style={{ animationDelay: '0.3s' }}>
              <div className="stat-icon-wrapper warning">
                <Calendar size={28} />
              </div>
              <p className="stat-label">Ushbu oydagi buyurtmalar</p>
              <p className="stat-number">
                <AnimatedCounter value={stats.monthlyOrders || 0} />
              </p>
              <p className="stat-unit">ta buyurtma</p>
            </div>
          </div>
        </div>

        {/* Revenue Statistics */}
        <div className="section animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h3><DollarSign size={22} /> Daromad</h3>
          <div className="stats-grid">
            <div className="stat-box revenue animate-bounceIn" style={{ animationDelay: '0.3s' }}>
              <div className="stat-icon-wrapper success">
                <TrendingUp size={28} />
              </div>
              <p className="stat-label">Jami daromad</p>
              <p className="stat-number">
                <AnimatedCounter value={stats.totalRevenue || 0} suffix=" so'm" />
              </p>
              <p className="stat-unit">so'm</p>
            </div>
            <div className="stat-box pending animate-bounceIn" style={{ animationDelay: '0.4s' }}>
              <div className="stat-icon-wrapper danger">
                <Clock size={28} />
              </div>
              <p className="stat-label">To'lanmagan qoldiq</p>
              <p className="stat-number">
                <AnimatedCounter value={stats.pendingAmount || 0} suffix=" so'm" />
              </p>
              <p className="stat-unit">so'm</p>
            </div>
          </div>
        </div>

        {/* Top Products */}
        {stats.topProducts && stats.topProducts.length > 0 && (
          <div className="section animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <h3><Award size={22} /> Eng ko'p sotilgan mahsulotlar</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>O'rin</th>
                    <th>Mahsulot</th>
                    <th>Sotilgan miqdori</th>
                    <th>Daromad</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts.map((product, index) => (
                    <tr key={index} className="table-row-animate" style={{ animationDelay: `${index * 0.1}s` }}>
                      <td>
                        <span className={`rank-badge ${index < 3 ? `rank-${index + 1}` : ''}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td>{product.name}</td>
                      <td>
                        <AnimatedCounter value={product.quantity || 0} suffix=" ta" />
                      </td>
                      <td className="revenue-cell">
                        <AnimatedCounter value={product.revenue || 0} suffix=" so'm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Branches */}
        {stats.topBranches && stats.topBranches.length > 0 && (
          <div className="section animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            <h3><Building size={22} /> Filiallar bo'yicha savdo</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Filial</th>
                    <th>Buyurtmalar</th>
                    <th>Daromad</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topBranches.map((branch, index) => (
                    <tr key={index} className="table-row-animate" style={{ animationDelay: `${index * 0.1}s` }}>
                      <td><strong>{branch.name}</strong></td>
                      <td>
                        <AnimatedCounter value={branch.orders || 0} suffix=" ta" />
                      </td>
                      <td className="revenue-cell">
                        <AnimatedCounter value={branch.revenue || 0} suffix=" so'm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}