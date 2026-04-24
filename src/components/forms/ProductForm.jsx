import React, { useState } from 'react';
import { Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { uploadImage } from '../../services/cloudinary';

const ProductForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || '',
    price: initialData?.price || '',
    stock: initialData?.stock || '',
    minStock: initialData?.minStock || '',
    imageUrl: initialData?.imageUrl || ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido.');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let finalImageUrl = formData.imageUrl;

      // 1. Upload to Cloudinary if new image selected
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      // 2. Submit to parent
      onSubmit({
        ...formData,
        imageUrl: finalImageUrl,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock, 10) || 0,
        minStock: parseInt(formData.minStock, 10) || 0,
      });
    } catch (error) {
      alert('Error al subir la imagen: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <div className="image-upload-section">
        {imagePreview ? (
          <div className="image-preview-container">
            <img src={imagePreview} alt="Vista previa" className="image-preview" />
            <button type="button" className="remove-image-btn" onClick={removeImage}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <label className="image-upload-placeholder">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              style={{ display: 'none' }} 
            />
            <Upload size={24} />
            <span>Subir imagen</span>
          </label>
        )}
      </div>

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
        <button type="submit" className="btn-primary" disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 size={18} className="spin" />
              Subiendo...
            </>
          ) : (
            initialData ? 'Actualizar Producto' : 'Guardar Producto'
          )}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
