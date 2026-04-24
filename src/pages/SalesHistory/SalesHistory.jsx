import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Download, Check } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { formatCurrency } from '../../utils/formatters';
import './SalesHistory.css';

const MOCK_SALES = [
  { id: '1001', date: 'Hoy, 10:45 AM', client: 'Juan Pérez', items: 3, total: 1250.00, method: 'Efectivo', status: 'Pagado' },
  { id: '1002', date: 'Hoy, 09:30 AM', client: 'Consumidor Final', items: 1, total: 45.00, method: 'Efectivo', status: 'Pagado' },
  { id: '1003', date: 'Ayer, 18:20 PM', client: 'María Gómez', items: 5, total: 320.00, method: 'Fiado', status: 'Pendiente' },
  { id: '1004', date: 'Ayer, 14:10 PM', client: 'Carlos Taller', items: 2, total: 120.00, method: 'Tarjeta', status: 'Pagado' },
  { id: '1005', date: '21 Oct, 11:00 AM', client: 'Consumidor Final', items: 10, total: 850.50, method: 'Efectivo', status: 'Pagado' },
];

const SalesHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week'
  const { user } = useAuth();
  const { shopSettings } = useShop();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'sales'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSales(salesData);
      setLoading(false);
    }, (error) => {
      console.error("Error drawing sales history: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleExportCSV = () => {
    if (sales.length === 0) return alert("No hay ventas para exportar.");

    const headers = ['ID Ticket', 'Fecha', 'Cliente', 'Metodo', 'Articulos', 'Total'];
    const rows = sales.map(sale => [
      sale.id.slice(-6).toUpperCase(),
      new Date(sale.createdAt).toLocaleString(),
      sale.customerName,
      sale.method,
      sale.items?.length || 0,
      sale.total
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ventas_TuNegocio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkAsPaid = async (sale) => {
    if (!window.confirm(`¿Marcar este ticket de ${formatCurrency(sale.total, shopSettings.currency)} como pagado?`)) return;

    try {
      await runTransaction(db, async (transaction) => {
        const saleRef = doc(db, 'sales', sale.id);
        
        // 1. Update sale status/method
        transaction.update(saleRef, { 
          method: 'Efectivo', // Change to Efectivo or add a status field
          paidAt: new Date().toISOString()
        });

        // 2. If it was linked to a customer, reduce their debt
        if (sale.customerId) {
          const customerRef = doc(db, 'customers', sale.customerId);
          const customerSnap = await transaction.get(customerRef);
          
          if (customerSnap.exists()) {
            const currentDebt = customerSnap.data().debtBalance || 0;
            const newDebt = Math.max(0, currentDebt - sale.total);
            transaction.update(customerRef, { debtBalance: newDebt });
          }
        }
      });
    } catch (error) {
      console.error("Error marking as paid:", error);
      alert("Error al actualizar la venta");
    }
  };

  const filteredSales = sales.filter((sale) => {
    // 1. Search filter
    const matchesSearch = sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Date filter
    if (dateFilter === 'all') return true;

    const saleDate = new Date(sale.createdAt);
    const now = new Date();

    if (dateFilter === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }

    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return saleDate >= oneWeekAgo;
    }

    return true;
  });

  return (
    <div className="sales-history-page">
      <div className="page-header">
        <div>
          <h1>Historial de Ventas</h1>
          <p>Consulta, filtra y exporta tus ventas pasadas.</p>
        </div>
        <button className="btn-outline" onClick={handleExportCSV}>
          <Download size={18} />
          <span>Exportar Excel (CSV)</span>
        </button>
      </div>

      <div className="sales-container">
        <div className="sales-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por ID o cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button 
              className={`btn-outline ${dateFilter === 'today' ? 'active' : ''}`}
              onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
            >
              <Calendar size={18} />
              <span>Hoy</span>
            </button>
            <button 
              className={`btn-outline ${dateFilter === 'week' ? 'active' : ''}`}
              onClick={() => setDateFilter(dateFilter === 'week' ? 'all' : 'week')}
            >
              <span>Esta Semana</span>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Fecha y Hora</th>
                <th>Cliente</th>
                <th>Método</th>
                <th>Artículos</th>
                <th>Total</th>
                <th>Estado</th>
                <th className="actions-cell">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td><span className="text-secondary">#{sale.id.slice(-6).toUpperCase()}</span></td>
                  <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td><b>{sale.customerName}</b></td>
                  <td>
                    <span className={`method-badge ${sale.method?.toLowerCase()}`}>
                      {sale.method}
                    </span>
                  </td>
                  <td>{sale.items?.length || 0} arts.</td>
                  <td><b>{formatCurrency(sale.total, shopSettings.currency)}</b></td>
                  <td>
                    {sale.method === 'Fiado' ? (
                      sale.paidAmount > 0 ? (
                        <span className="badge-warning" style={{ backgroundColor: '#ffedd5', color: '#9a3412' }}>Abonado</span>
                      ) : (
                        <span className="badge-warning">Por Cobrar</span>
                      )
                    ) : (
                      <span className="badge-success">Pagado</span>
                    )}
                  </td>
                   <td className="actions-cell">
                    {sale.method === 'Fiado' && (
                      <button 
                        className="action-btn text-success" 
                        title="Marcar como Pagado"
                        onClick={() => handleMarkAsPaid(sale)}
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button className="action-btn" title="Ver Ticket">
                      <FileText size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;
