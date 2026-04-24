import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, DollarSign, FileText, Users, Trash2, Edit2 } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { formatCurrency } from '../../utils/formatters';
import Modal from '../../components/Modal';
import CustomerForm from '../../components/forms/CustomerForm';
import './Customers.css';

const MOCK_CUSTOMERS = [
  { id: '1', name: 'María Gómez', phone: '555-0101', debtBalance: 320.00, lastPurchase: '2023-10-24' },
  { id: '2', name: 'Juan Pérez', phone: '555-0102', debtBalance: 0.00, lastPurchase: '2023-10-25' },
  { id: '3', name: 'Doña Lucha', phone: '555-0103', debtBalance: 1250.00, lastPurchase: '2023-10-20' },
  { id: '4', name: 'Carlos Taller', phone: '555-0104', debtBalance: 45.50, lastPurchase: '2023-10-23' },
];

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const { user } = useAuth();
  const { shopSettings } = useShop();

  // Firestore Real-time Listener (Filtered by owner)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'customers'), 
      where('ownerId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching customers: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCustomer = async (customerData) => {
    try {
      await addDoc(collection(db, 'customers'), {
        ...customerData,
        ownerId: user.uid,
        lastPurchase: 'Nunca',
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding customer: ", error);
      alert("Error al guardar el cliente");
    }
  };

  const handleEditCustomer = async (customerData) => {
    try {
      const customerRef = doc(db, 'customers', selectedCustomer.id);
      await updateDoc(customerRef, customerData);
      setIsModalOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Error updating customer: ", error);
      alert("Error al actualizar el cliente");
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (error) {
        console.error("Error deleting customer: ", error);
        alert("Error al eliminar el cliente");
      }
    }
  };

  const handlePaymentClick = (customer) => {
    setSelectedCustomer(customer);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(paymentAmount)) return;

    const amount = parseFloat(paymentAmount);
    
    if (amount > selectedCustomer.debtBalance) {
      alert(`El abono no puede ser mayor a la deuda actual (${formatCurrency(selectedCustomer.debtBalance, shopSettings.currency)})`);
      return;
    }

    const newBalance = Math.max(0, selectedCustomer.debtBalance - amount);

    try {
      await updateDoc(doc(db, 'customers', selectedCustomer.id), {
        debtBalance: newBalance
      });
      // Optionally register this as a transaction in a 'payments' collection
      // containing: amount, paymentMethod, date, customerId
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentMethod('Efectivo');
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Error updating balance: ", error);
      alert("Error al procesar el pago");
    }
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const closePortal = () => {
    setIsModalOpen(false);
    setIsPaymentModalOpen(false);
    setSelectedCustomer(null);
    setPaymentAmount('');
  };

  // Re-calculate total debt
  const totalDebt = customers.reduce((sum, c) => sum + (parseFloat(c.debtBalance) || 0), 0);

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Clientes y Fiados</h1>
          <p>Lleva el control de los clientes que compran a crédito.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="customers-container">
        <div className="customers-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="summary-badges">
            <div className="badge-total-debt">
              <span>Total por Cobrar:</span>
              <b>{formatCurrency(totalDebt, shopSettings.currency)}</b>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table customers-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Última Compra</th>
                <th>Saldo Pendiente</th>
                <th>Estado</th>
                <th className="actions-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const hasDebt = customer.debtBalance > 0;
                
                return (
                  <tr key={customer.id}>
                    <td className="customer-name-cell">
                      <div className="avatar-small">{customer.name.charAt(0)}</div>
                      <span className="customer-name">{customer.name}</span>
                    </td>
                    <td>
                      <div className="phone-cell">
                        <Phone size={14} className="text-secondary" />
                        <span>{customer.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{customer.lastPurchase}</td>
                    <td>
                      <b className={hasDebt ? 'text-danger' : 'text-success'}>
                        {formatCurrency(customer.debtBalance, shopSettings.currency)}
                      </b>
                    </td>
                    <td>
                      {hasDebt ? (
                        <span className="badge-warning">Con Deuda</span>
                      ) : (
                        <span className="badge-success">Al Corriente</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="action-btn edit" 
                        title="Editar"
                        onClick={() => openEditModal(customer)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="action-btn pay" 
                        title="Registrar Abono" 
                        disabled={!hasDebt}
                        onClick={() => handlePaymentClick(customer)}
                      >
                        <DollarSign size={16} />
                      </button>
                      <button 
                        className="action-btn delete" 
                        title="Eliminar"
                        onClick={() => handleDeleteCustomer(customer.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="empty-state">
              <Users size={48} className="empty-icon" />
              <h3>No se encontraron clientes</h3>
              <p>Revisa tu búsqueda o intenta agregar uno nuevo.</p>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closePortal}
        title={selectedCustomer ? "Editar Cliente" : "Registrar Nuevo Cliente"}
      >
        <CustomerForm 
          onSubmit={selectedCustomer ? handleEditCustomer : handleAddCustomer} 
          onCancel={closePortal}
          initialData={selectedCustomer}
        />
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={closePortal}
        title="Registrar Abono / Pago"
      >
        <form onSubmit={handlePaymentSubmit} className="payment-form">
          <div className="payment-summary">
            <p>Cliente: <b>{selectedCustomer?.name}</b></p>
            <p>Deuda Actual: <b className="text-danger">{formatCurrency(selectedCustomer?.debtBalance || 0, shopSettings.currency)}</b></p>
          </div>
          
          <div className="form-group">
            <label>Monto del Abono ({shopSettings.currency})</label>
            <input 
              type="number" 
              className="form-control" 
              placeholder="0.00" 
              step="0.01"
              max={selectedCustomer?.debtBalance}
              required
              autoFocus
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Método de Pago</label>
            <select 
              className="form-control"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta / Transferencia</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={closePortal}>Cancelar</button>
            <button type="submit" className="btn-primary">Confirmar Pago</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
