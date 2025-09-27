import { useRef, useState } from 'react';

const initialState = {
  inventoryManager: '',
  productName: '',
  serialNumber: '',
  operationalUnit: '',
  recordDate: '',
};

function ExternalDecommissionActsManager({
  acts,
  onUpload,
  onRefresh,
  onDownload,
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
      setError('Debes adjuntar el documento del acta.');
      return;
    }

    const formData = new FormData();
    formData.append('inventoryManager', values.inventoryManager);
    formData.append('productName', values.productName);
    formData.append('serialNumber', values.serialNumber);
    formData.append('operationalUnit', values.operationalUnit);
    formData.append('recordDate', values.recordDate);
    formData.append('actFile', fileInputRef.current.files[0]);

    try {
      await onUpload(formData);
      setValues(initialState);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (uploadError) {
      setError(uploadError.message || 'No se pudo registrar el acta.');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3>Actas de bajas externas</h3>
        <p className="muted">
          Registra los documentos de respaldo de bajas realizadas fuera del inventario del sistema.
        </p>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Encargado de inventario
          <input
            name="inventoryManager"
            value={values.inventoryManager}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Producto
          <input name="productName" value={values.productName} onChange={handleChange} required />
        </label>
        <label>
          Serie
          <input name="serialNumber" value={values.serialNumber} onChange={handleChange} />
        </label>
        <label>
          Unidad operativa
          <input
            name="operationalUnit"
            value={values.operationalUnit}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Fecha del acta
          <input
            type="date"
            name="recordDate"
            value={values.recordDate}
            onChange={handleChange}
            required
          />
        </label>
        <label className="full-width">
          Documento del acta
          <input type="file" ref={fileInputRef} accept="application/pdf,image/*" required />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="submit" className="primary" disabled={isUploading}>
            {isUploading ? 'Guardando...' : 'Registrar acta'}
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
              <th>Producto</th>
              <th>Serie</th>
              <th>Unidad operativa</th>
              <th>Encargado</th>
              <th>Fecha</th>
              <th>Archivo</th>
            </tr>
          </thead>
          <tbody>
            {acts.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  {isFiltered
                    ? 'No hay actas que coincidan con la búsqueda.'
                    : 'No hay actas registradas.'}
                </td>
              </tr>
            )}
            {acts.map((act) => (
              <tr key={act._id}>
                <td>{act.productName}</td>
                <td>{act.serialNumber || '—'}</td>
                <td>{act.operationalUnit}</td>
                <td>{act.inventoryManager}</td>
                <td>{new Date(act.recordDate).toLocaleDateString('es-CL')}</td>
                <td>
                  <button type="button" className="link" onClick={() => onDownload(act)}>
                    Descargar
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

ExternalDecommissionActsManager.defaultProps = {
  acts: [],
  onRefresh: () => {},
  onDownload: () => {},
  isUploading: false,
  isFiltered: false,
};

export default ExternalDecommissionActsManager;
