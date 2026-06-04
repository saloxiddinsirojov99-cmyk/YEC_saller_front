import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../services/api';
import { Plus, Edit2, Trash2, Package, X } from 'lucide-react';
import './ProductManagement.css';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0
  });
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await getProducts();
      setProducts(response || []);
      setLoading(false);
    } catch (err) {
      setError('Mahsulotlarni yuklashda xato: ' + err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editId) {
        await updateProduct(editId, formData);
        setSuccessMsg('Mahsulot muvaffaqiyatli tahrirlandi!');
      } else {
        await createProduct(formData);
        setSuccessMsg('Mahsulot muvaffaqiyatli qo\'shildi!');
      }
      await fetchProducts();
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', description: '', price: 0 });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price
    });
    setEditId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu mahsulotni o\'chirishni xohlaysizmi?')) return;
    try {
      await deleteProduct(id);
      setSuccessMsg('Mahsulot o\'chirildi!');
      await fetchProducts();
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
        <div className="product-management">
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
      <div className="product-management animate-fadeIn">
        <div className="header">
          <h2 className="page-title">Mahsulotlarni Boshqarish</h2>
          <button className="btn btn-primary" onClick={() => {
            setShowForm(true);
            setEditId(null);
            setFormData({ name: '', description: '', price: 0 });
          }}>
            <Plus size={20} />
            Yangi Mahsulot
          </button>
        </div>

        {error && <div className="error-message animate-shake">{error}</div>}
        {successMsg && <div className="success-message animate-fadeIn">{successMsg}</div>}

        {showForm && (
          <div className="form-card animate-scaleIn">
            <div className="form-card-header">
              <h3><Package size={20} /> {editId ? 'Mahsulotni Tahrirlash' : 'Yangi Mahsulot Qo\'shish'}</h3>
              <button className="btn-icon close-form" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-group">
                <label>Mahsulot nomi *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Mahsulot nomini kiriting"
                />
              </div>

              <div className="form-group">
                <label>Tavsifi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Mahsulot tavsifi"
                ></textarea>
              </div>

              <div className="form-group">
                <label>Narxi (so'm) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editId ? 'Tahrirlashni Saqlash' : 'Qo\'shish'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditId(null);
                  }}
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="products-grid">
          {products.length === 0 ? (
            <div className="empty-state">Mahsulotlar topilmadi</div>
          ) : (
            products.map((product, index) => (
              <div key={product.id} className="product-card animate-fadeInUp" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  {product.code && <p className="product-code">Kod: {product.code}</p>}
                  {product.description && <p className="description">{product.description}</p>}
                  <p className="price">{product.price.toLocaleString()} so'm</p>
                </div>
                <div className="product-actions">
                  <button className="btn-icon" onClick={() => handleEdit(product)} title="Tahrirlash">
                    <Edit2 size={18} />
                  </button>
                  <button className="btn-icon danger" onClick={() => handleDelete(product.id)} title="O'chirish">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}