import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getUsers, createUser, updateUser, deleteUser, getBranches } from '../../services/api';
import { Plus, Edit2, Trash2, Key, Users, X } from 'lucide-react';
import './UserManagement.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'seller',
    branch_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersData, branchesData] = await Promise.all([
        getUsers(),
        getBranches()
      ]);
      setUsers(usersData || []);
      setBranches(branchesData || []);
      setLoading(false);
    } catch (err) {
      setError('Ma\'lumotlarni yuklashda xato: ' + err.message);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response || []);
    } catch (err) {
      setError('Foydalanuvchilarni yuklashda xato: ' + err.message);
    }
  };

  const openCreateForm = () => {
    setEditId(null);
    setFormData({ name: '', email: '', password: '', role: 'seller', branch_id: '' });
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      branch_id: user.branch_id || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editId) {
        await updateUser(editId, formData);
        setSuccessMsg('Foydalanuvchi muvaffaqiyatli tahrirlandi!');
      } else {
        await createUser(formData);
        setSuccessMsg('Foydalanuvchi muvaffaqiyatli qo\'shildi!');
      }
      await fetchUsers();
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', email: '', password: '', role: 'seller', branch_id: '' });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu foydalanuvchini o\'chirishni xohlaysizmi?')) return;
    try {
      await deleteUser(id);
      setSuccessMsg('Foydalanuvchi o\'chirildi!');
      await fetchUsers();
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
        <div className="user-management">
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
      <div className="user-management animate-fadeIn">
        <div className="header">
          <h2 className="page-title"><Users size={28} /> Foydalanuvchilarni Boshqarish</h2>
          <button className="btn btn-primary" onClick={openCreateForm}>
            <Plus size={20} />
            Yangi Foydalanuvchi
          </button>
        </div>

        {error && <div className="error-message animate-shake">{error}</div>}
        {successMsg && <div className="success-message animate-fadeIn">{successMsg}</div>}

        {/* Form Modal */}
        {showForm && (
          <div className="form-card animate-scaleIn">
            <div className="form-card-header">
              <h3><Users size={20} /> {editId ? 'Foydalanuvchini Tahrirlash' : 'Yangi Foydalanuvchi Qo\'shish'}</h3>
              <button className="btn-icon close-form" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label>Ismi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Foydalanuvchi ismi"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="email@example.com"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{editId ? 'Yangi parol (agar o\'zgartirish kerak bo\'lsa)' : 'Parol *'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editId}
                    placeholder={editId ? 'Parolni o\'zgartirish uchun kiriting' : 'Kamida 6 belgi'}
                  />
                </div>

                <div className="form-group">
                  <label>Rol *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="seller">Sotuvchi</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Filial</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                >
                  <option value="">Filial tanlanmagan</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editId ? 'Saqlash' : 'Qo\'shish'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="users-list">
          {users.length === 0 ? (
            <div className="empty-state">Foydalanuvchilar topilmadi</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Ismi</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Filial</th>
                    <th>Qo'shilgan</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user.id} className="table-row-animate" style={{ animationDelay: `${index * 0.05}s` }}>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role === 'admin' ? 'Admin' : 'Sotuvchi'}
                        </span>
                      </td>
                      <td>{user.branch_name || '-'}</td>
                      <td>{new Date(user.created_at).toLocaleDateString('uz-UZ')}</td>
                      <td>
                        <button className="btn-icon" onClick={() => openEditForm(user)} title="Tahrirlash">
                          <Edit2 size={18} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDelete(user.id)} title="O'chirish">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}