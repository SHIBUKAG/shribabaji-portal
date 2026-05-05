import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '', // Maps to sku
    db_id: '', // Maps to UUID id
    name: '',
    category: 'Tillage',
    price: '',
    stock: 0,
    status: 'Active'
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'stock' ? parseInt(value) || 0 : value
    }));
  };

  const handleAddClick = () => {
    setIsEditing(false);
    setFormData({
      id: `PRD-${String(products.length + 1).padStart(3, '0')}`,
      db_id: '',
      name: '',
      category: 'Tillage',
      price: '',
      stock: 0,
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (product) => {
    setIsEditing(true);
    setFormData({
      id: product.sku,
      db_id: product.id,
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock,
      status: product.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (db_id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const { error } = await supabase.from('products').delete().eq('id', db_id);
      if (!error) {
        setProducts(products.filter(p => p.id !== db_id));
      } else {
        alert('Error deleting product');
        console.error(error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Calculate new status based on stock if Active or Low Stock
    let newStatus = formData.status;
    if (formData.stock === 0) newStatus = 'Out of Stock';
    else if (formData.stock <= 5 && formData.status !== 'Out of Stock') newStatus = 'Low Stock';
    else if (formData.stock > 5 && newStatus === 'Low Stock') newStatus = 'Active';

    // Clean price string to number
    const numericPrice = parseFloat(formData.price.toString().replace(/[^\d.-]/g, '')) || 0;

    const payload = {
      sku: formData.id,
      name: formData.name,
      category: formData.category,
      price: numericPrice,
      stock: formData.stock,
      min_stock: 5,
      status: newStatus
    };

    if (isEditing) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', formData.db_id);
        
      if (!error) {
        fetchProducts();
        setIsModalOpen(false);
      } else {
        alert('Error updating product: ' + error.message);
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([payload]);
        
      if (!error) {
        fetchProducts();
        setIsModalOpen(false);
      } else {
        alert('Error creating product: ' + error.message);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Products Inventory
          </h1>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            Manage your agriculture instruments and tools.
          </p>
        </div>
        <button 
          onClick={handleAddClick}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))',
            color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--trans-base)'
          }}
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Data Table */}
      <div style={{ background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-card-border)', color: 'var(--clr-text-dim)', textAlign: 'left' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Product ID</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Price</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Stock</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                  <Loader2 size={24} className="spin" style={{ margin: '0 auto', display: 'block', marginBottom: '1rem' }} />
                  Loading products from database...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-dim)' }}>
                  No products found. Click "Add Product" to create one.
                </td>
              </tr>
            ) : (
              products.map((product, i) => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--clr-card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-muted)', fontFamily: 'monospace' }}>{product.sku}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text)', fontWeight: 500 }}>{product.name}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-muted)' }}>{product.category}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text)' }}>₹{Number(product.price).toLocaleString()}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--clr-text-muted)' }}>{product.stock} units</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', 
                      background: product.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : product.status === 'Low Stock' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                      color: product.status === 'Active' ? '#10b981' : product.status === 'Low Stock' ? '#f59e0b' : '#ef4444' 
                    }}>
                      {product.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEditClick(product)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-dim)', cursor: 'pointer', transition: 'var(--trans-base)' }} title="Edit"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', transition: 'var(--trans-base)' }} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--clr-card)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '500px', padding: '2rem', boxShadow: 'var(--shadow-card)',
            animation: 'fadeInUp 0.3s ease both'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--clr-text)' }}>
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Product ID (Readonly) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-dim)', textTransform: 'uppercase' }}>Product ID (SKU)</label>
                <input 
                  type="text" 
                  name="id" 
                  value={formData.id} 
                  onChange={handleInputChange}
                  readOnly={isEditing}
                  style={{
                    background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--clr-text)', padding: '0.75rem', outline: 'none',
                    opacity: isEditing ? 0.7 : 1
                  }}
                />
              </div>

              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Product Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                  style={{
                    background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--clr-text)', padding: '0.75rem', outline: 'none'
                  }}
                />
              </div>

              {/* Group: Category & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Category</label>
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleInputChange}
                    style={{
                      background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--clr-text)', padding: '0.75rem', outline: 'none'
                    }}
                  >
                    <option value="Tillage">Tillage</option>
                    <option value="Plowing">Plowing</option>
                    <option value="Harrowing">Harrowing</option>
                    <option value="Seeding">Seeding</option>
                    <option value="Weeding">Weeding</option>
                    <option value="Leveling">Leveling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Price</label>
                  <input 
                    type="text" 
                    name="price" 
                    value={formData.price} 
                    onChange={handleInputChange} 
                    placeholder="e.g. 45000"
                    required 
                    style={{
                      background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--clr-text)', padding: '0.75rem', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Group: Stock & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Stock Units</label>
                  <input 
                    type="number" 
                    name="stock" 
                    value={formData.stock} 
                    onChange={handleInputChange} 
                    min="0"
                    required 
                    style={{
                      background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--clr-text)', padding: '0.75rem', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)', textTransform: 'uppercase' }}>Force Status (Optional)</label>
                  <select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleInputChange}
                    style={{
                      background: 'var(--clr-bg-2)', border: '1px solid var(--clr-card-border)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--clr-text)', padding: '0.75rem', outline: 'none'
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1, background: 'transparent', color: 'var(--clr-text)', border: '1px solid var(--clr-card-border)', 
                    padding: '0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{
                    flex: 1, background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))', 
                    color: '#fff', border: 'none', padding: '0.75rem', borderRadius: 'var(--radius-full)', 
                    fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {isEditing ? 'Save Changes' : 'Create Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
