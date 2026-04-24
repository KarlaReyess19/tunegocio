import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, DollarSign, FileText, Users, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs, runTransaction } from 'firebase/firestore';
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
  const [customerDebts, setCustomerDebts] = useState([]);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPaymentId, setProcessingPaymentId] = useState(null);
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

  const handlePaymentClick = async (customer) => {
    setSelectedCustomer(customer);
    setIsPaymentModalOpen(true);
    setLoadingDebts(true);
    
    try {
      const q = query(
        collection(db, 'sales'),
        where('customerId', '==', customer.id),
        where('method', '==', 'Fiado')
      );
      const snap = await getDocs(q);
      const debts = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        // Handle legacy data where pendingBalance might not exist but it was Fiado
        currentPending: d.data().pendingBalance !== undefined ? d.data().pendingBalance : (d.data().total - (d.data().paidAmount || 0))
      })).filter(d => d.currentPending > 0)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        
      setCustomerDebts(debts);
    } catch (error) {
      console.error("Error fetching customer debts:", error);
    } finally {
      setLoadingDebts(false);
    }
  };

  const handlePaymentSubmit = async (sale, amountToPay) => {
    if (!amountToPay || isNaN(amountToPay) || amountToPay <= 0) return;
    const amount = parseFloat(amountToPay);

    try {
      setProcessingPaymentId(sale.id);
      await runTransaction(db, async (transaction) => {
        // 1. PRE-READS (Important: Reads must happen before any writes)
        const saleRef = doc(db, 'sales', sale.id);
        const customerRef = doc(db, 'customers', selectedCustomer.id);
        
        const saleSnap = await transaction.get(saleRef);
        const customerSnap = await transaction.get(customerRef);
        
        if (!saleSnap.exists()) throw new Error("Venta no existe");
        if (!customerSnap.exists()) throw new Error("Cliente no existe");
        
        const saleData = saleSnap.data();
        const customerData = customerSnap.data();

        const currentPaid = saleData.paidAmount || 0;
        const currentTotal = saleData.total || 0;
        const newPaid = currentPaid + amount;
        const fullyPaid = newPaid >= currentTotal;
        const currentTotalDebt = customerData.debtBalance || 0;

        // 2. WRITES (All updates happen after reads)
        const methodToSave = fullyPaid ? paymentMethod : 'Fiado';
        
        transaction.update(saleRef, {
          paidAmount: newPaid,
          pendingBalance: Math.max(0, currentTotal - newPaid),
          method: methodToSave,
          lastPaymentMethod: paymentMethod,
          lastAbonoAt: new Date().toISOString()
        });

        transaction.update(customerRef, {
          debtBalance: Math.max(0, currentTotalDebt - amount)
        });
      });

      // Refresh local list
      setCustomerDebts(prev => prev.map(d => {
        if (d.id === sale.id) {
          const newPending = d.currentPending - amount;
          return { ...d, currentPending: newPending };
        }
        return d;
      }).filter(d => d.currentPending > 0));
      
      setPaymentAmount('');
    } catch (error) {
      console.error("Error en pago individual:", error);
      alert("No se pudo procesar el pago. Por favor intenta de nuevo.");
    } finally {
      setProcessingPaymentId(null);
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
    setCustomerDebts([]);
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
        title={`Deudas de ${selectedCustomer?.name}`}
      >
        <div className="debt-explorer">
          {loadingDebts ? (
            <div className="loading-debts">Cargando deudas...</div>
          ) : customerDebts.length === 0 ? (
            <div className="no-debts">
              <CheckCircle size={40} color="var(--success)" />
              <p>Este cliente no tiene deudas pendientes.</p>
            </div>
          ) : (
            <div className="debt-list">
              {customerDebts.map(debt => (
                <div key={debt.id} className="debt-card">
                  <div className="debt-header">
                    <span className="debt-date">{new Date(debt.createdAt).toLocaleDateString()}</span>
                    <span className="debt-id">#{debt.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="debt-body">
                    <div className="debt-info">
                      <span>Venta Total: <b>{formatCurrency(debt.total, shopSettings.currency)}</b></span>
                      <span>Saldo Pendiente: <b className="text-danger">{formatCurrency(debt.currentPending, shopSettings.currency)}</b></span>
                    </div>
                    <div className="debt-payment-action">
                      <select 
                        className="form-control method-select"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                      </select>
                      <input 
                        type="number" 
                        placeholder="Monto..." 
                        className="form-control amount-input"
                        max={debt.currentPending}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                      <button 
                        className="btn-primary btn-sm"
                        disabled={processingPaymentId === debt.id}
                        onClick={() => handlePaymentSubmit(debt, paymentAmount)}
                      >
                        {processingPaymentId === debt.id ? '...' : 'Pagar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={closePortal}>Cerrar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
