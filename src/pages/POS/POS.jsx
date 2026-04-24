import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, X, CreditCard, Banknote, UserPlus, CheckCircle } from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, runTransaction, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../../components/Modal';
import './POS.css';



const POS = () => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const { user } = useAuth();
  const { shopSettings } = useShop();

  // Firestore Real-time Listeners (Filtered by owner)
  useEffect(() => {
    if (!user) return;

    const qProducts = query(
      collection(db, 'products'), 
      where('ownerId', '==', user.uid)
    );
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name))
      );
    });

    const qCustomers = query(
      collection(db, 'customers'), 
      where('ownerId', '==', user.uid)
    );
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name))
      );
    });

    return () => {
      unsubProducts();
      unsubCustomers();
    };
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleProcessSale = async (method) => {
    if (cart.length === 0) return;
    if (method === 'Fiado' && !selectedCustomer) {
      alert("Por favor selecciona un cliente para ventas a crédito.");
      setIsCustomerModalOpen(true);
      return;
    }

    setProcessing(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Verify and Update Stock for each item
        for (const item of cart) {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await transaction.get(productRef);
          
          if (!productSnap.exists()) throw new Error(`Producto ${item.name} no existe.`);
          
          const currentStock = productSnap.data().stock;
          if (currentStock < item.quantity) {
            throw new Error(`Stock insuficiente para ${item.name}. Disponible: ${currentStock}`);
          }
          
          transaction.update(productRef, { stock: currentStock - item.quantity });
        }

        // 2. Update Customer Debt if Fiado
        if (method === 'Fiado' && selectedCustomer) {
          const customerRef = doc(db, 'customers', selectedCustomer.id);
          const customerSnap = await transaction.get(customerRef);
          const currentDebt = customerSnap.data().debtBalance || 0;
          transaction.update(customerRef, { 
            debtBalance: currentDebt + total,
            lastPurchase: new Date().toISOString().split('T')[0]
          });
        }

        // 3. Create Sales Record
        const saleRef = collection(db, 'sales');
        await addDoc(saleRef, {
          items: cart,
          total,
          method,
          ownerId: user.uid,
          customerName: selectedCustomer?.name || 'Consumidor Final',
          customerId: selectedCustomer?.id || null,
          createdAt: new Date().toISOString()
        });
      });

      setSaleSuccess(true);
      setCart([]);
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Sale failed: ", error);
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(false);
  };

  if (saleSuccess) {
    return (
      <div className="sale-success-screen">
        <CheckCircle size={80} color="var(--success)" />
        <h2>¡Venta Completada!</h2>
        <p>El total fue de <b>{formatCurrency(total, shopSettings.currency)}</b></p>
        <button className="btn-primary" onClick={() => setSaleSuccess(false)}>
          Nueva Venta
        </button>
      </div>
    );
  }

  return (
    <div className="pos-page">
      <div className="pos-main">
        <div className="pos-header">
          <h2>Punto de Venta</h2>
          <div className="pos-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="product-grid">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="product-card"
              onClick={() => addToCart(product)}
            >
              <div className="product-color" style={{ backgroundColor: product.color }}>
                {product.name.charAt(0)}
              </div>
              <div className="product-info">
                <h4>{product.name}</h4>
                <span className="product-price">{formatCurrency(product.price, shopSettings.currency)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pos-sidebar">
        <div className="ticket-header">
          <h3>Ticket Actual</h3>
          <button className="text-btn" onClick={() => setCart([])}>Vaciar</button>
        </div>

        <div className="ticket-client">
          <button 
            className={`btn-outline client-btn ${selectedCustomer ? 'active' : ''}`}
            onClick={() => setIsCustomerModalOpen(true)}
          >
            <UserPlus size={16} />
            <span>{selectedCustomer ? selectedCustomer.name : 'Asignar a Cliente (Fiado)'}</span>
            {selectedCustomer && <X size={14} className="remove-client" onClick={(e) => {
              e.stopPropagation();
              setSelectedCustomer(null);
            }} />}
          </button>
        </div>

        <div className="ticket-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <p>El ticket está vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="ticket-item">
                <div className="item-details">
                  <h4>{item.name}</h4>
                  <span>{formatCurrency(item.price, shopSettings.currency)}</span>
                </div>
                <div className="item-actions">
                  <div className="qty-control">
                    <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                  </div>
                  <div className="item-total">
                    <b>{formatCurrency(item.price * item.quantity, shopSettings.currency)}</b>
                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="ticket-footer">
          <div className="ticket-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(total, shopSettings.currency)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Total a Cobrar</span>
              <span>{formatCurrency(total, shopSettings.currency)}</span>
            </div>
          </div>
          
          <div className="payment-methods">
            <button 
              className="btn-payment cash" 
              disabled={cart.length === 0 || processing}
              onClick={() => handleProcessSale('Efectivo')}
            >
              <Banknote size={20} />
              Efectivo
            </button>
            <button 
              className="btn-payment card" 
              disabled={cart.length === 0 || processing}
              onClick={() => handleProcessSale('Tarjeta')}
            >
              <CreditCard size={20} />
              Tarjeta
            </button>
            <button 
              className="btn-payment credit" 
              disabled={cart.length === 0 || processing}
              onClick={() => handleProcessSale('Fiado')}
            >
              <UserPlus size={20} />
              Fiado
            </button>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)}
        title="Seleccionar Cliente"
      >
        <div className="customer-picker-list">
          <div className="picker-search">
            <input type="text" placeholder="Buscar cliente..." />
          </div>
          {customers.map(c => (
            <div key={c.id} className="picker-item" onClick={() => selectCustomer(c)}>
              <div>
                <b>{c.name}</b>
                <p>{c.phone}</p>
              </div>
              <span className={c.debtBalance > 0 ? 'text-danger' : ''}>
                {formatCurrency(c.debtBalance, shopSettings.currency)}
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default POS;
