import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, Package } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../../components/Modal';
import ProductForm from '../../components/forms/ProductForm';
import './Inventory.css';

const MOCK_PRODUCTS = [
  { id: '1', name: 'Coca-Cola 600ml', category: 'Bebidas', price: 18.00, stock: 2, minStock: 5 },
  { id: '2', name: 'Sabritas Saladas 40g', category: 'Botanas', price: 15.00, stock: 15, minStock: 10 },
  { id: '3', name: 'Galletas Emperador', category: 'Abarrotes', price: 16.50, stock: 1, minStock: 3 },
  { id: '4', name: 'Pan Bimbo Blanco', category: 'Abarrotes', price: 42.00, stock: 8, minStock: 5 },
  { id: '5', name: 'Leche Lala Entera 1L', category: 'Lácteos', price: 26.00, stock: 24, minStock: 10 },
];

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { user } = useAuth();
  const { shopSettings } = useShop();

  // Firestore Real-time Listener (Filtered by owner)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'products'), 
      where('ownerId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.name.localeCompare(b.name));
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = async (productData) => {
    try {
      await addDoc(collection(db, 'products'), {
        ...productData,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding product: ", error);
      alert("Error al guardar el producto");
    }
  };

  const handleEditProduct = async (productData) => {
    try {
      const productRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(productRef, productData);
      setIsModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error updating product: ", error);
      alert("Error al actualizar el producto");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        console.error("Error deleting product: ", error);
        alert("Error al eliminar el producto");
      }
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closePortal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="inventory-page">
      <div className="page-header">
        <div>
          <h1>Inventario</h1>
          <p>Gestiona tus productos, precios y niveles de stock.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="inventory-container">
        <div className="inventory-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-outline">
            <Filter size={18} />
            <span>Filtros</span>
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table inventory-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th className="actions-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const isLowStock = product.stock <= product.minStock;
                const isOutOfStock = product.stock === 0;
                
                return (
                  <tr key={product.id}>
                    <td className="product-name-cell">
                      <div className="product-icon">{product.name.charAt(0)}</div>
                      <span className="product-name">{product.name}</span>
                    </td>
                    <td>{product.category}</td>
                    <td><b>{formatCurrency(product.price, shopSettings.currency)}</b></td>
                    <td>{product.stock}</td>
                    <td>
                      {isOutOfStock ? (
                        <span className="badge-danger">Agotado</span>
                      ) : isLowStock ? (
                        <span className="badge-warning">Bajo</span>
                      ) : (
                        <span className="badge-success">Óptimo</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="action-btn edit" 
                        title="Editar"
                        onClick={() => openEditModal(product)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="action-btn delete" 
                        title="Eliminar"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="empty-state">
              <Package size={48} className="empty-icon" />
              <h3>No se encontraron productos</h3>
              <p>Revisa tu búsqueda o intenta agregar uno nuevo.</p>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closePortal}
        title={selectedProduct ? "Editar Producto" : "Crear Nuevo Producto"}
      >
        <ProductForm 
          onSubmit={selectedProduct ? handleEditProduct : handleAddProduct} 
          onCancel={closePortal}
          initialData={selectedProduct}
        />
      </Modal>
    </div>
  );
};

export default Inventory;
