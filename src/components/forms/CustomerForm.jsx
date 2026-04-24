import React, { useState } from 'react';

const CustomerForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    debtBalance: initialData?.debtBalance || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      debtBalance: parseFloat(formData.debtBalance) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Nombre Completo *</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          className="form-control" 
          placeholder="Ej. Juan Pérez"
          required 
          value={formData.name}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="phone">Teléfono / WhatsApp</label>
          <input 
            type="text" 
            id="phone" 
            name="phone" 
            className="form-control" 
            placeholder="Ej. 555-0100"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="debtBalance">Saldo Inicial (L)</label>
          <input 
            type="number" 
            id="debtBalance" 
            name="debtBalance" 
            className="form-control" 
            placeholder="0.00"
            step="0.01"
            value={formData.debtBalance}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary">
          {initialData ? 'Actualizar Cliente' : 'Guardar Cliente'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
