import { useRef, useState } from 'react';

const initialState = {
  guideNumber: '',
  vendor: '',
  dispatchDate: '',
};

function DispatchGuideManager({
  guides,
  onUpload,
  onRefresh,
  onDownload,
  onDelete,
  isUploading,
  isFiltered = false,
}) {
  const [values, setValues] = useState(initialState);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!fileInputRef.current?.files?.length) {
      setError('Debes adjuntar el archivo de la guía.');
      return;
    }

    const formData = new FormData();
    formData.append('guideNumber', values.guideNumber);
    formData.append('vendor', values.vendor);
    formData.append('dispatchDate', values.dispatchDate);
    formData.append('guideFile', fileInputRef.current.files[0]);

    try {
      await onUpload(formData);
      setValues(initialState);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (uploadError) {
      setError(uploadError.message || 'No se pudo subir la guía de despacho.');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Guías de despacho</h3>
        <p className="muted">
          Carga los documentos asociados a los productos y mantenlos disponibles para auditorías.
        </p>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          N° de guía
          <input name="guideNumber" value={values.guideNumber} onChange={handleChange} required />
        </label>
        <label>
          Proveedor
          <input name="vendor" value={values.vendor} onChange={handleChange} required />
        </label>
        <label>
          Fecha
          <input
            type="date"
            name="dispatchDate"
            value={values.dispatchDate}
            onChange={handleChange}
            required
          />
        </label>
        <label className="full-width">
          Archivo
          <input type="file" ref={fileInputRef} accept="application/pdf,image/*" required />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="submit" className="primary" disabled={isUploading}>
            {isUploading ? 'Guardando...' : 'Subir guía'}
          </button>
          <button type="button" className="secondary" onClick={onRefresh}>
            Actualizar listado
          </button>
        </div>
      </form>

      <div className="table-responsive">
        <table className="data-table compact">
          <thead>
            <tr>
              <th>N° guía</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Archivo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {guides.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  {isFiltered
                    ? 'No hay guías que coincidan con la búsqueda.'
                    : 'No hay guías cargadas.'}
                </td>
              </tr>
            )}
            {guides.map((guide) => (
              <tr key={guide._id}>
                <td>{guide.guideNumber}</td>
                <td>{guide.vendor}</td>
                <td>{new Date(guide.dispatchDate).toLocaleDateString('es-CL')}</td>
                <td>
                  <button type="button" className="link" onClick={() => onDownload(guide)}>
                    Descargar
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="danger compact"
                    onClick={() => onDelete(guide)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

DispatchGuideManager.defaultProps = {
  guides: [],
  onRefresh: () => {},
  onDownload: () => {},
  onDelete: () => {},
  isUploading: false,
  isFiltered: false,
};

export default DispatchGuideManager;
