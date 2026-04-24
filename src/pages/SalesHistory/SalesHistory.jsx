import React, { useState, useEffect } from 'react';
import { Search, Calendar, FileText, Download } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
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

  const filteredSales = sales.filter((sale) =>
    sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <button className="btn-outline">
              <Calendar size={18} />
              <span>Hoy</span>
            </button>
            <button className="btn-outline">
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
                      <span className="badge-warning">Por Cobrar</span>
                    ) : (
                      <span className="badge-success">Pagado</span>
                    )}
                  </td>
                  <td className="actions-cell">
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
