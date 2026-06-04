import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../../services/api';
import { Plus, Edit2, Trash2, Building2, X } from 'lucide-react';
import './BranchManagement.css';

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: ''
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await getBranches();
      setBranches(response || []);
      setLoading(false);
    } catch (err) {
      setError('Filiallarni yuklashda xato: ' + err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editId) {
        await updateBranch(editId, formData);
        setSuccessMsg('Filial muvaffaqiyatli tahrirlandi!');
      } else {
        await createBranch(formData);
        setSuccessMsg('Filial muvaffaqiyatli qo\'shildi!');
      }
      await fetchBranches();
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', address: '', phone: '' });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (branch) => {
    setFormData({
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || ''
    });
    setEditId(branch.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu filialni o\'chirishni xohlaysizmi?')) return;
    try {
      await deleteBranch(id);
      setSuccessMsg('Filial o\'chirildi!');
      await fetchBranches();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Asosiy' },
    { path: '/admin/products', label: 'Mahsulotlar' },
    { path: '/admin/branches', label: 'Filiallar' },
    { path: '/admin/users', label: 'Foydalanuvchilar' }
  ];

  if (loading) {
    return (
      <Layout navItems={navItems}>
        <div className="branch-management">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Yuklanmoqda...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout navItems={navItems}>
      <div className="branch-management animate-fadeIn">
        <div className="header">
          <h2 className="page-title"><Building2 size={28} /> Filiallarni Boshqarish</h2>
          <button className="btn btn-primary" onClick={() => {
            setShowForm(true);
            setFormData({ name: '', address: '', phone: '' });
          }}>
            <Plus size={20} />
            Yangi Filial
          </button>
        </div>

        {error && <div className="error-message animate-shake">{error}</div>}
        {successMsg && <div className="success-message animate-fadeIn">{successMsg}</div>}

        {showForm && (
          <div className="form-card animate-scaleIn">
            <div className="form-card-header">
              <h3><Building2 size={20} /> {editId ? 'Filialni Tahrirlash' : 'Yangi Filial Qo\'shish'}</h3>
              <button className="btn-icon close-form" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="branch-form">
              <div className="form-group">
                <label>Filial nomi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Filial nomini kiriting"
                />
              </div>

              <div className="form-group">
                <label>Manzil</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Filial manzili"
                />
              </div>

              <div className="form-group">
                <label>Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 XX XXX XX XX"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editId ? 'Saqlash' : 'Qo\'shish'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="branches-list">
          {branches.length === 0 ? (
            <div className="empty-state">Filiallar topilmadi</div>
          ) : (
            <div className="branches-grid">
              {branches.map((branch, index) => (
                <div key={branch.id} className="branch-card animate-fadeInUp" style={{ animationDelay: `${index * 0.08}s` }}>
                  <div className="branch-icon">
                    <Building2 size={32} />
                  </div>
                  <div className="branch-info">
                    <h3>{branch.name}</h3>
                    {branch.address && <p className="branch-address">📍 {branch.address}</p>}
                    {branch.phone && <p className="branch-phone">📞 {branch.phone}</p>}
                  </div>
                  <div className="branch-actions">
                    <button className="btn-icon" onClick={() => handleEdit(branch)} title="Tahrirlash">
                      <Edit2 size={18} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(branch.id)} title="O'chirish">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}