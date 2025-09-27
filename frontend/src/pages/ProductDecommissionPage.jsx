import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductTable from '../components/ProductTable';
import { useAuth } from '../hooks/useAuth';
import { getProductStatusBadge, getProductStatusLabel } from '../utils/productStatus';
import { filterProductsBySearch, normalizeSearchTerm } from '../utils/search';

function ProductDecommissionPage() {
  const { request, hasRole } = useAuth();
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = hasRole('ADMIN', 'MANAGER');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/products');
      setProducts(data);
    } catch (err) {
      setError(err.message || 'No se pudo obtener el inventario.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (canManage) {
      loadProducts();
    }
  }, [loadProducts, canManage]);

  const activeProducts = useMemo(
    () => products.filter((product) => product.status !== 'DECOMMISSIONED'),
    [products]
  );

  const decommissionedProducts = useMemo(
    () => products.filter((product) => product.status === 'DECOMMISSIONED'),
    [products]
  );

  const filteredActiveProducts = useMemo(
    () => filterProductsBySearch(activeProducts, searchTerm),
    [activeProducts, searchTerm]
  );

  const filteredDecommissionedProducts = useMemo(
    () => filterProductsBySearch(decommissionedProducts, searchTerm),
    [decommissionedProducts, searchTerm]
  );

  useEffect(() => {
    setSelectedProductId((current) => {
      if (!filteredActiveProducts.length) {
        return null;
      }
      if (current && filteredActiveProducts.some((item) => item._id === current)) {
        return current;
      }
      return filteredActiveProducts[0]._id;
    });
  }, [filteredActiveProducts]);

  const selectedProduct = useMemo(
    () => filteredActiveProducts.find((product) => product._id === selectedProductId) || null,
    [filteredActiveProducts, selectedProductId]
  );

  const selectedProductName = selectedProduct?.productModel?.name || selectedProduct?.name;
  const selectedProductIsSerialized = selectedProduct?.isSerialized !== false;
  const selectedProductSerial = selectedProductIsSerialized
    ? selectedProduct?.serialNumber || '—'
    : 'Sin serie';
  const selectedProductQuantity = selectedProductIsSerialized
    ? 1
    : (() => {
        const parsed = Number(selectedProduct?.quantity);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      })();

  useEffect(() => {
    setReason('');
    setFormError('');
  }, [selectedProductId]);

  const normalizedSearch = useMemo(() => normalizeSearchTerm(searchTerm), [searchTerm]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!selectedProduct) {
      setFormError('Selecciona un producto disponible.');
      return;
    }

    if (selectedProduct.status !== 'AVAILABLE') {
      setFormError('Debes liberar la asignación antes de dar de baja este producto.');
      return;
    }

    if (!reason.trim()) {
      setFormError('Indica el motivo de la baja.');
      return;
    }

    setSubmitting(true);
    try {
      await request(`/products/${selectedProduct._id}/decommission`, {
        method: 'POST',
        data: { reason: reason.trim() },
      });
      setReason('');
      await loadProducts();
    } catch (submitError) {
      setFormError(submitError.message || 'No se pudo dar de baja el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <section className="dashboard-section">
        <div className="card">
          <h2>Dar de baja productos</h2>
          <p className="muted">Solo los administradores o encargados pueden dar de baja equipos.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <div>
          <h2>Dar de baja productos</h2>
          <p className="muted">Registra la baja de equipos e indica el motivo correspondiente.</p>
        </div>
        <div className="section-actions">
          <label className="inline-filter">
            Buscar
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Nombre, serie, motivo..."
            />
          </label>
          <button type="button" className="secondary" onClick={loadProducts} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar inventario'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="dashboard-grid secondary">
        <ProductTable
          products={filteredActiveProducts}
          onSelect={setSelectedProductId}
          selectedProductId={selectedProductId}
          isFiltered={Boolean(normalizedSearch)}
        />
        <div className="card">
          <div className="card-header">
            <h3>Baja de inventario</h3>
            <p className="muted">
              Selecciona un producto disponible y detalla el motivo de la baja.
            </p>
          </div>

          {!selectedProduct && (
            <p className="muted">No hay productos disponibles para dar de baja.</p>
          )}

          {selectedProduct && (
            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="full-width">
                <strong>{selectedProductName}</strong>{' '}
                <span className="muted">({selectedProductSerial})</span>
              </div>
              <div className="full-width muted small-text">
                Cantidad registrada: {selectedProductQuantity}
              </div>
              {!selectedProductIsSerialized && (
                <div className="full-width muted small-text">
                  Registro por cantidad. No es necesario liberar asignaciones.
                </div>
              )}
              <div className="full-width">
                <span className={getProductStatusBadge(selectedProduct.status)}>
                  {getProductStatusLabel(selectedProduct.status)}
                </span>
              </div>
              {selectedProduct.status === 'ASSIGNED' && selectedProduct.currentAssignment && (
                <div className="full-width muted small-text">
                  Actualmente asignado a {selectedProduct.currentAssignment.assignedTo}
                  {selectedProduct.currentAssignment.assignedEmail
                    ? ` (${selectedProduct.currentAssignment.assignedEmail})`
                    : ''}{' '}
                  en {selectedProduct.currentAssignment.location}.
                </div>
              )}
              <label className="full-width">
                Motivo
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  placeholder="Describe la razón de la baja"
                  disabled={selectedProduct.status !== 'AVAILABLE'}
                />
              </label>
              {formError && <p className="error">{formError}</p>}
              <button
                type="submit"
                className="danger"
                disabled={submitting || selectedProduct.status !== 'AVAILABLE'}
              >
                {submitting ? 'Registrando...' : 'Registrar baja'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Historial de bajas</h3>
          <p className="muted">Consulta los equipos dados de baja y su motivo.</p>
        </div>
        <div className="table-responsive">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>N° serie</th>
                <th>Motivo</th>
                <th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {filteredDecommissionedProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    {normalizedSearch
                      ? 'No hay bajas que coincidan con la búsqueda.'
                      : 'Aún no se registran bajas.'}
                  </td>
                </tr>
              )}
              {filteredDecommissionedProducts.map((product) => {
                const isSerialized = product.isSerialized !== false;
                const parsedQuantity = Number(product.quantity);
                const quantity = isSerialized
                  ? 1
                  : Number.isFinite(parsedQuantity) && parsedQuantity > 0
                  ? parsedQuantity
                  : 1;
                const serial = isSerialized ? product.serialNumber || '—' : 'Sin serie';
                return (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td>{quantity}</td>
                    <td>{serial}</td>
                    <td>{product.decommissionReason || '—'}</td>
                    <td>
                      {product.decommissionedAt
                        ? new Date(product.decommissionedAt).toLocaleString('es-CL')
                        : '—'}
                      {product.decommissionedBy?.name ? ` · ${product.decommissionedBy.name}` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default ProductDecommissionPage;
