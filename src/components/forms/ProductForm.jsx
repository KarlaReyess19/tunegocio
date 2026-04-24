import React, { useState } from 'react';

const ProductForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || '',
    price: initialData?.price || '',
    stock: initialData?.stock || '',
    minStock: initialData?.minStock || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock, 10) || 0,
      minStock: parseInt(formData.minStock, 10) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Nombre del Producto *</label>
        <input 
          type="text" 
          id="name" 
          name="name" 
          className="form-control" 
          placeholder="Ej. Coca-Cola 600ml"
          required 
          value={formData.name}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category">Categoría</label>
          <input 
            type="text" 
            id="category" 
            name="category" 
            className="form-control" 
            placeholder="Ej. Bebidas"
            value={formData.category}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="price">Precio (L) *</label>
          <input 
            type="number" 
            id="price" 
            name="price" 
            className="form-control" 
            placeholder="0.00"
            step="0.01"
            required 
            value={formData.price}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="stock">Stock Actual *</label>
          <input 
            type="number" 
            id="stock" 
            name="stock" 
            className="form-control" 
            placeholder="0"
            required 
            value={formData.stock}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="minStock">Alerta de Stock (Mínimo) *</label>
          <input 
            type="number" 
            id="minStock" 
            name="minStock" 
            className="form-control" 
            placeholder="0"
            required 
            value={formData.minStock}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary">
          {initialData ? 'Actualizar Producto' : 'Guardar Producto'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
