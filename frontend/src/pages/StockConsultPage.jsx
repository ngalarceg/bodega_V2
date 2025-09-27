import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { filterStockSummary, normalizeSearchTerm } from '../utils/search';

function StockConsultPage() {
  const { request } = useAuth();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/products/stock');
      setSummary(data);
    } catch (err) {
      setSummary([]);
      setError(err.message || 'No se pudo obtener el resumen de stock.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const filteredSummary = useMemo(
    () => filterStockSummary(summary, searchTerm),
    [summary, searchTerm]
  );

  const normalizedSearch = useMemo(() => normalizeSearchTerm(searchTerm), [searchTerm]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Consultar stock</h2>
          <p className="muted">
            Visualiza la cantidad de unidades por modelo de producto sin considerar los números de serie.
          </p>
        </div>
        <div className="section-actions">
          <label className="inline-filter">
            Buscar
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Producto, parte, descripción..."
            />
          </label>
          <button type="button" className="secondary" onClick={loadSummary} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Resumen de unidades</h3>
          <p className="muted">
            Totales agrupados por modelo de producto, con el estado y tipo de adquisición de cada unidad.
          </p>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>N° de parte</th>
                <th>Total</th>
                <th>Disponibles</th>
                <th>Asignados</th>
                <th>Dados de baja</th>
                <th>Compras</th>
                <th>Arriendos</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="muted">
                    Cargando resumen...
                  </td>
                </tr>
              )}
              {!loading && filteredSummary.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    {normalizedSearch
                      ? 'No hay productos que coincidan con la búsqueda.'
                      : 'Aún no hay unidades registradas.'}
                  </td>
                </tr>
              )}
              {filteredSummary.map((item) => (
                <tr key={`${item.productModelId || 'sin-modelo'}-${item.partNumber || 'sin-parte'}`}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description && <div className="muted small-text">{item.description}</div>}
                  </td>
                  <td>{item.partNumber || '—'}</td>
                  <td>{item.totals.total}</td>
                  <td>{item.totals.available}</td>
                  <td>{item.totals.assigned}</td>
                  <td>{item.totals.decommissioned}</td>
                  <td>{item.typeBreakdown.purchased}</td>
                  <td>{item.typeBreakdown.rental}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default StockConsultPage;
