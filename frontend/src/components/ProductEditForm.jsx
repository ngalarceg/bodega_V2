import { useEffect, useMemo, useState } from 'react';

function buildInitialState(product) {
  if (!product) {
    return {
      productModelId: '',
      serialNumber: '',
      quantity: '1',
      isSerialized: true,
      inventoryNumber: '',
      rentalId: '',
      dispatchGuideId: '',
    };
  }

  return {
    productModelId: product.productModel?._id || '',
    serialNumber: product.serialNumber || '',
    quantity:
      product.isSerialized === false
        ? String(Number.isFinite(Number(product.quantity)) && Number(product.quantity) > 0
            ? Number(product.quantity)
            : 1)
        : '1',
    isSerialized: product.isSerialized !== false,
    inventoryNumber: product.type === 'PURCHASED' ? product.inventoryNumber || '' : '',
    rentalId: product.type === 'RENTAL' ? product.rentalId || '' : '',
    dispatchGuideId: product.dispatchGuide?._id || '',
  };
}

function ProductEditForm({
  product,
  dispatchGuides,
  productModels,
  onSubmit,
  onCancel,
  isSubmitting,
  onReloadDispatchGuides,
  onReloadProductModels,
  loadingDispatchGuides,
  loadingProductModels,
  guidesError,
  modelsError,
}) {
  const [values, setValues] = useState(buildInitialState(product));
  const [error, setError] = useState('');
  const isSerialized = values.isSerialized !== false;

  const availableGuides = useMemo(() => {
    const items = new Map();

    if (product?.dispatchGuide) {
      items.set(product.dispatchGuide._id, product.dispatchGuide);
    }

    dispatchGuides.forEach((guide) => {
      if (!items.has(guide._id)) {
        items.set(guide._id, guide);
      }
    });

    return Array.from(items.values());
  }, [dispatchGuides, product?.dispatchGuide]);

  const availableModels = useMemo(() => {
    const items = new Map();

    if (product?.productModel) {
      items.set(product.productModel._id, product.productModel);
    }

    productModels.forEach((model) => {
      if (!items.has(model._id)) {
        items.set(model._id, model);
      }
    });

    return Array.from(items.values());
  }, [productModels, product?.productModel]);

  const selectedModel = useMemo(
    () => availableModels.find((model) => model._id === values.productModelId) || null,
    [availableModels, values.productModelId]
  );

  const hasDispatchGuides = availableGuides.length > 0;
  const hasProductModels = availableModels.length > 0;

  useEffect(() => {
    setValues(buildInitialState(product));
    setError('');
  }, [product?._id]);

  useEffect(() => {
    setValues((prev) => {
      if (!hasDispatchGuides) {
        if (!prev.dispatchGuideId) {
          return prev;
        }
        return { ...prev, dispatchGuideId: '' };
      }

      if (prev.dispatchGuideId && availableGuides.some((guide) => guide._id === prev.dispatchGuideId)) {
        return prev;
      }

      return { ...prev, dispatchGuideId: availableGuides[0]._id };
    });
  }, [availableGuides, hasDispatchGuides]);

  useEffect(() => {
    setValues((prev) => {
      if (!hasProductModels) {
        if (!prev.productModelId) {
          return prev;
        }
        return { ...prev, productModelId: '' };
      }

      if (prev.productModelId && availableModels.some((model) => model._id === prev.productModelId)) {
        return prev;
      }

      return { ...prev, productModelId: availableModels[0]._id };
    });
  }, [availableModels, hasProductModels]);

  if (!product) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!values.productModelId) {
      setError('Selecciona el modelo de producto.');
      return;
    }

    if (product.type === 'RENTAL' && !values.rentalId) {
      setError('Debes ingresar el ID de arriendo.');
      return;
    }

    if (!values.dispatchGuideId) {
      setError('Selecciona la guía de despacho correspondiente al ingreso.');
      return;
    }

    const serialValue = typeof values.serialNumber === 'string' ? values.serialNumber.trim() : '';
    const quantityValue = Number.parseInt(values.quantity, 10);
    const inventoryNumberValue =
      typeof values.inventoryNumber === 'string' ? values.inventoryNumber.trim() : '';

    if (isSerialized && !serialValue) {
      setError('El número de serie no puede quedar vacío.');
      return;
    }

    if (!isSerialized) {
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        setError('Ingresa una cantidad válida (mayor o igual a 1).');
        return;
      }
    }

    try {
      await onSubmit({
        productModelId: values.productModelId,
        serialNumber: isSerialized ? serialValue : undefined,
        quantity: isSerialized ? undefined : quantityValue,
        inventoryNumber: product.type === 'PURCHASED' ? inventoryNumberValue : undefined,
        rentalId: product.type === 'RENTAL' ? values.rentalId : undefined,
        dispatchGuideId: values.dispatchGuideId,
      });
    } catch (submitError) {
      setError(submitError.message || 'No se pudo actualizar el producto.');
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <div>
          <h3>Editar producto</h3>
          <p className="muted">
            Actualiza los datos originales del producto seleccionado. El tipo de registro no puede modificarse.
          </p>
        </div>
        <div className="section-actions">
          <button
            type="button"
            className="secondary"
            onClick={onReloadProductModels}
            disabled={loadingProductModels}
          >
            {loadingProductModels ? 'Actualizando...' : 'Actualizar modelos'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onReloadDispatchGuides}
            disabled={loadingDispatchGuides}
          >
            {loadingDispatchGuides ? 'Actualizando...' : 'Actualizar guías'}
          </button>
        </div>
      </div>

      {modelsError && (
        <p className="error" role="alert">
          <strong>Error:</strong> {modelsError}
        </p>
      )}
      {guidesError && (
        <p className="error" role="alert">
          <strong>Error:</strong> {guidesError}
        </p>
      )}

      <div className="form-grid">
        <label className="full-width">
          Modelo de producto
          <select
            name="productModelId"
            value={values.productModelId}
            onChange={handleChange}
            required
            disabled={!hasProductModels}
          >
            {availableModels.map((model) => (
              <option key={model._id} value={model._id}>
                {model.name} — {model.partNumber}
              </option>
            ))}
          </select>
        </label>

        {selectedModel?.description && (
          <div className="full-width muted small-text">
            <strong>Descripción:</strong> {selectedModel.description}
          </div>
        )}

        <div>
          <strong>Tipo:</strong> {product.type === 'PURCHASED' ? 'Compra' : 'Arriendo'}
        </div>

        <div>
          <strong>Modo de registro:</strong> {isSerialized ? 'Con número de serie' : 'Por cantidad'}
        </div>

        {isSerialized ? (
          <label>
            N° de serie
            <input
              name="serialNumber"
              value={values.serialNumber}
              onChange={handleChange}
              required
            />
          </label>
        ) : (
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
              Este registro representa un ingreso sin serie. Ajusta la cantidad si es necesario.
            </span>
          </label>
        )}

        {product.type === 'PURCHASED' && (
          <label>
            N° de inventario (opcional)
            <input name="inventoryNumber" value={values.inventoryNumber} onChange={handleChange} />
          </label>
        )}

        {product.type === 'RENTAL' && (
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
            {availableGuides.map((guide) => (
              <option key={guide._id} value={guide._id}>
                {guide.guideNumber} — {new Date(guide.dispatchDate).toLocaleDateString('es-CL')}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="section-actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
        <button
          type="submit"
          className="primary"
          disabled={
            isSubmitting || !hasDispatchGuides || !hasProductModels
          }
        >
          {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

ProductEditForm.defaultProps = {
  dispatchGuides: [],
  productModels: [],
  isSubmitting: false,
  onReloadDispatchGuides: () => {},
  onReloadProductModels: () => {},
  loadingDispatchGuides: false,
  loadingProductModels: false,
  guidesError: '',
  modelsError: '',
};

export default ProductEditForm;
