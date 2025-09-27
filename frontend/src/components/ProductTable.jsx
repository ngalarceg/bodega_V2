import { getProductStatusBadge, getProductStatusLabel } from '../utils/productStatus';

function formatType(type) {
  if (type === 'PURCHASED') {
    return 'Compra';
  }
  if (type === 'RENTAL') {
    return 'Arriendo';
  }
  return type;
}

function ProductTable({ products, onSelect, selectedProductId, isFiltered = false }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Detalle de inventario</h3>
        <p className="muted">Selecciona un producto para ver sus detalles y gestionar asignaciones.</p>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>N° serie</th>
              <th>N° parte</th>
              <th>Inventario / ID</th>
              <th>Guía</th>
              <th>Estado</th>
              <th>Asignación actual</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  {isFiltered
                    ? 'No hay productos que coincidan con la búsqueda.'
                    : 'Aún no hay productos registrados.'}
                </td>
              </tr>
            )}
            {products.map((product) => {
              const productName = product.productModel?.name || product.name;
              const productPartNumber = product.productModel?.partNumber || product.partNumber;
              const isSelected = product._id === selectedProductId;
              const displaySerial = product.isSerialized
                ? product.serialNumber || '—'
                : 'Sin serie';
              const parsedQuantity = Number(product.quantity);
              const displayQuantity = product.isSerialized
                ? 1
                : Number.isFinite(parsedQuantity) && parsedQuantity > 0
                ? parsedQuantity
                : 1;
              return (
                <tr
                  key={product._id}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => onSelect(product._id)}
                >
                  <td>{productName}</td>
                  <td>{formatType(product.type)}</td>
                  <td>{displayQuantity}</td>
                  <td>{displaySerial}</td>
                  <td>{productPartNumber}</td>
                  <td>
                    {product.type === 'PURCHASED'
                      ? product.inventoryNumber || '—'
                      : product.rentalId}
                  </td>
                  <td>{product.dispatchGuide?.guideNumber || '—'}</td>
                  <td>
                    <span className={getProductStatusBadge(product.status)}>
                      {getProductStatusLabel(product.status)}
                    </span>
                    {product.status === 'DECOMMISSIONED' && product.decommissionReason && (
                      <div className="muted small-text">{product.decommissionReason}</div>
                    )}
                  </td>
                  <td>
                    {product.status === 'ASSIGNED' && product.currentAssignment ? (
                      <div>
                        <div>{product.currentAssignment.assignedTo}</div>
                        {product.currentAssignment.assignedEmail && (
                          <div className="muted small-text">
                            {product.currentAssignment.assignedEmail}
                          </div>
                        )}
                        <div className="muted">({product.currentAssignment.location})</div>
                      </div>
                    ) : product.status === 'DECOMMISSIONED' ? (
                      <span className="muted">No disponible</span>
                    ) : !product.isSerialized ? (
                      <span className="muted">Registro sin asignaciones</span>
                    ) : (
                      <span className="muted">Sin asignación</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductTable;
