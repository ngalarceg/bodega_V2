import { useEffect, useMemo, useState } from 'react';
import { normalizeSearchTerm } from '../utils/search';

const initialState = {
  productModelId: '',
  type: 'PURCHASED',
  entryMode: 'SERIALIZED',
  serialNumbersText: '',
  quantity: '1',
  inventoryNumber: '',
  rentalId: '',
  dispatchGuideId: '',
};

function ProductForm({ onSubmit, dispatchGuides, productModels, isSubmitting }) {
  const [values, setValues] = useState(initialState);
  const [error, setError] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const hasDispatchGuides = dispatchGuides.length > 0;
  const hasProductModels = productModels.length > 0;
  const normalizedModelSearch = useMemo(
    () => normalizeSearchTerm(modelSearch),
    [modelSearch]
  );
  const filteredModels = useMemo(() => {
    if (!normalizedModelSearch) {
      return productModels;
    }

    return productModels.filter((model) => {
      const name = (model.name || '').toLowerCase();
      const partNumber = (model.partNumber || '').toLowerCase();
      const description = (model.description || '').toLowerCase();

      return (
        name.includes(normalizedModelSearch) ||
        partNumber.includes(normalizedModelSearch) ||
        description.includes(normalizedModelSearch)
      );
    });
  }, [normalizedModelSearch, productModels]);
  const selectedModel = useMemo(
    () => productModels.find((model) => model._id === values.productModelId) || null,
    [productModels, values.productModelId]
  );
  const isBulkEntry = values.entryMode === 'BULK';
  const parsedSerialNumbers = useMemo(
    () =>
      values.serialNumbersText
        .split(/[\n,]/)
        .map((serial) => serial.trim())
        .filter(Boolean),
    [values.serialNumbersText]
  );
  const hasMultipleSerials = !isBulkEntry && parsedSerialNumbers.length > 1;

  useEffect(() => {
    setValues((prev) => {
      if (!dispatchGuides.length) {
        if (!prev.dispatchGuideId) {
          return prev;
        }
        return { ...prev, dispatchGuideId: '' };
      }

      if (prev.dispatchGuideId && dispatchGuides.some((guide) => guide._id === prev.dispatchGuideId)) {
        return prev;
      }

      return { ...prev, dispatchGuideId: dispatchGuides[0]._id };
    });
  }, [dispatchGuides]);

  useEffect(() => {
    setValues((prev) => {
      if (!productModels.length) {
        if (!prev.productModelId) {
          return prev;
        }
        return { ...prev, productModelId: '' };
      }

      if (
        prev.productModelId &&
        filteredModels.some((model) => model._id === prev.productModelId)
      ) {
        return prev;
      }

      const fallback = filteredModels[0] || (!normalizedModelSearch ? productModels[0] : null);
      return fallback ? { ...prev, productModelId: fallback._id } : { ...prev, productModelId: '' };
    });
  }, [productModels, filteredModels, normalizedModelSearch]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleModelSearchChange = (event) => {
    setModelSearch(event.target.value);
  };

  const handleTypeChange = (event) => {
    const { value } = event.target;
    setValues((prev) => ({
      ...prev,
      type: value,
      rentalId: value === 'RENTAL' ? prev.rentalId : '',
    }));
  };

  const handleEntryModeChange = (event) => {
    const { value } = event.target;
    setValues((prev) => ({
      ...prev,
      entryMode: value,
      serialNumbersText: value === 'SERIALIZED' ? prev.serialNumbersText : '',
      quantity: value === 'BULK' ? prev.quantity || '1' : '1',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!values.productModelId) {
      setError('Selecciona el modelo de producto.');
      return;
    }

    if (values.type === 'RENTAL' && !values.rentalId) {
      setError('Debes ingresar el ID de arriendo.');
      return;
    }

    if (!values.dispatchGuideId) {
      setError('Selecciona la guía de despacho correspondiente al ingreso.');
      return;
    }

    const inventoryNumberValue =
      typeof values.inventoryNumber === 'string' ? values.inventoryNumber.trim() : '';

    if (isBulkEntry) {
      const parsedQuantity = Number.parseInt(values.quantity, 10);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        setError('Ingresa una cantidad válida (mayor o igual a 1).');
        return;
      }

      try {
        await onSubmit({
          productModelId: values.productModelId,
          type: values.type,
          quantity: parsedQuantity,
          inventoryNumber: values.type === 'PURCHASED' ? inventoryNumberValue : undefined,
          rentalId: values.type === 'RENTAL' ? values.rentalId : undefined,
          dispatchGuideId: values.dispatchGuideId,
          isSerialized: false,
        });
        setValues(initialState);
      } catch (submitError) {
        setError(submitError.message || 'No se pudo crear el producto');
      }
      return;
    }

    const serialNumbers = parsedSerialNumbers;

    if (!serialNumbers.length) {
      setError('Ingresa al menos un número de serie.');
      return;
    }

    const duplicates = serialNumbers.filter(
      (serial, index, arr) => arr.indexOf(serial) !== index
    );

    if (duplicates.length) {
      const duplicatedList = [...new Set(duplicates)];
      setError(`Los siguientes números de serie están repetidos: ${duplicatedList.join(', ')}`);
      return;
    }

    try {
      await onSubmit({
        productModelId: values.productModelId,
        type: values.type,
        serialNumbers,
        inventoryNumber:
          values.type === 'PURCHASED' && serialNumbers.length === 1
            ? inventoryNumberValue
            : undefined,
        rentalId: values.type === 'RENTAL' ? values.rentalId : undefined,
        dispatchGuideId: values.dispatchGuideId,
        isSerialized: true,
      });
      setValues(initialState);
    } catch (submitError) {
      setError(submitError.message || 'No se pudo crear el producto');
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <h3>Nuevo producto</h3>
        <p className="muted">
          Registra equipos provenientes de una compra o arriendo y vincúlalos con su guía de despacho.
        </p>
      </div>
      {(!hasDispatchGuides || !hasProductModels) && (
        <p className="muted small-text">
          {hasProductModels
            ? 'Primero carga una guía de despacho para habilitar el registro de productos.'
            : 'Primero registra un modelo en el catálogo para habilitar el ingreso de productos.'}
        </p>
      )}
      <div className="form-grid">
        <label className="full-width">
          Modelo de producto
          <div className="select-search-group">
            <input
              type="search"
              value={modelSearch}
              onChange={handleModelSearchChange}
              placeholder="Filtrar por nombre, número de parte o descripción"
              disabled={!hasProductModels}
            />
            <select
              name="productModelId"
              value={values.productModelId}
              onChange={handleChange}
              required
              disabled={!hasProductModels || filteredModels.length === 0}
            >
              {filteredModels.map((model) => (
                <option key={model._id} value={model._id}>
                  {model.name} — {model.partNumber}
                </option>
              ))}
            </select>
          </div>
        </label>
        {hasProductModels && normalizedModelSearch && filteredModels.length === 0 && (
          <p className="muted small-text full-width">
            No se encontraron modelos que coincidan con “{modelSearch}”.
          </p>
        )}
        {selectedModel?.description && (
          <div className="full-width muted small-text">
            <strong>Descripción:</strong> {selectedModel.description}
          </div>
        )}
        <label>
          Tipo
          <select name="type" value={values.type} onChange={handleTypeChange}>
            <option value="PURCHASED">Compra</option>
            <option value="RENTAL">Arriendo</option>
          </select>
        </label>
        <fieldset className="full-width">
          <legend>Modo de registro</legend>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="entryMode"
                value="SERIALIZED"
                checked={values.entryMode === 'SERIALIZED'}
                onChange={handleEntryModeChange}
              />
              Con número de serie
            </label>
            <label>
              <input
                type="radio"
                name="entryMode"
                value="BULK"
                checked={values.entryMode === 'BULK'}
                onChange={handleEntryModeChange}
              />
              Sin número de serie (por cantidad)
            </label>
          </div>
          <p className="muted small-text">
            Selecciona “Sin número de serie” para registrar artículos que llegan en cantidad y no se
            identifican individualmente.
          </p>
        </fieldset>
        {!isBulkEntry && (
          <label className="full-width">
            N° de serie
            <textarea
              name="serialNumbersText"
              value={values.serialNumbersText}
              onChange={handleChange}
              rows={hasMultipleSerials ? 6 : 3}
              placeholder="Ingresa un número por línea o separa por comas"
              required
            />
            <span className="muted small-text">
              Puedes pegar múltiples números de serie. Se registrará un producto por cada número
              válido ingresado.
            </span>
            {hasMultipleSerials && (
              <span className="muted small-text">
                Se registrarán {parsedSerialNumbers.length} productos con esta información.
              </span>
            )}
          </label>
        )}
        {isBulkEntry && (
          <label>
            Cantidad de unidades
            <input
              type="number"
              name="quantity"
              min="1"
              step="1"
              value={values.quantity}
              onChange={handleChange}
              required
            />
            <span className="muted small-text">
              Se registrará una entrada agrupada con la cantidad indicada.
            </span>
          </label>
        )}
        {values.type === 'PURCHASED' && (
          <label>
            N° de inventario (opcional)
            <input
              name="inventoryNumber"
              value={values.inventoryNumber}
              onChange={handleChange}
              disabled={hasMultipleSerials}
            />
            {hasMultipleSerials && (
              <span className="muted small-text">
                Para cargar múltiples productos se dejará vacío el número de inventario.
              </span>
            )}
            {isBulkEntry && (
              <span className="muted small-text">
                Si lo dejas vacío, el lote quedará sin número de inventario asignado.
              </span>
            )}
          </label>
        )}
        {values.type === 'RENTAL' && (
          <label>
            ID de arriendo
            <input name="rentalId" value={values.rentalId} onChange={handleChange} required />
          </label>
        )}
        <label>
          Guía de despacho
          <select
            name="dispatchGuideId"
            value={values.dispatchGuideId}
            onChange={handleChange}
            required
            disabled={!hasDispatchGuides}
          >
            {dispatchGuides.map((guide) => (
              <option key={guide._id} value={guide._id}>
                {guide.guideNumber} — {new Date(guide.dispatchDate).toLocaleDateString('es-CL')}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button
        type="submit"
        className="primary"
        disabled={isSubmitting || !hasDispatchGuides || !hasProductModels}
      >
        {isSubmitting ? 'Guardando...' : 'Registrar producto'}
      </button>
    </form>
  );
}

ProductForm.defaultProps = {
  dispatchGuides: [],
  productModels: [],
  isSubmitting: false,
};

export default ProductForm;
