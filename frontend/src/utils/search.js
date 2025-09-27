import { getProductStatusLabel } from './productStatus';

const PRODUCT_TYPE_LABELS = {
  PURCHASED: 'Compra',
  RENTAL: 'Arriendo',
};

export function normalizeSearchTerm(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

export function matchesSearchTerm(value, term) {
  if (!term) {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  return String(value).toLowerCase().includes(term);
}

export function matchesAnyField(fields, term) {
  if (!term) {
    return true;
  }

  return fields.some((field) => matchesSearchTerm(field, term));
}

function toLocaleDate(value, { includeTime = false } = {}) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return includeTime ? date.toLocaleString('es-CL') : date.toLocaleDateString('es-CL');
}

function getProductSearchFields(product) {
  if (!product) {
    return [];
  }

  const typeLabel = PRODUCT_TYPE_LABELS[product.type] || product.type;
  const statusLabel = getProductStatusLabel(product.status);

  return [
    product.productModel?.name,
    product.name,
    product.productModel?.partNumber,
    product.partNumber,
    product.serialNumber,
    product.quantity,
    product.productModel?.description,
    product.description,
    product.inventoryNumber,
    product.rentalId,
    product.dispatchGuide?.guideNumber,
    product.dispatchGuide?.vendor,
    product.currentAssignment?.assignedTo,
    product.currentAssignment?.assignedEmail,
    product.currentAssignment?.location,
    product.decommissionReason,
    product.decommissionedBy?.name,
    product.status,
    statusLabel,
    product.type,
    typeLabel,
    toLocaleDate(product.createdAt),
    toLocaleDate(product.updatedAt),
    toLocaleDate(product.decommissionedAt, { includeTime: true }),
  ];
}

export function filterProductsBySearch(products, term, options = {}) {
  const normalizedTerm = normalizeSearchTerm(term);
  const statusFilter = options.status ?? null;
  const list = Array.isArray(products) ? products : [];

  let filtered = list;
  if (statusFilter && statusFilter !== 'ALL') {
    filtered = filtered.filter((item) => item.status === statusFilter);
  }

  if (!normalizedTerm) {
    return filtered;
  }

  return filtered.filter((product) =>
    matchesAnyField(getProductSearchFields(product), normalizedTerm)
  );
}

export function filterDispatchGuides(guides, term) {
  const normalizedTerm = normalizeSearchTerm(term);
  const list = Array.isArray(guides) ? guides : [];

  if (!normalizedTerm) {
    return list;
  }

  return list.filter((guide) =>
    matchesAnyField(
      [
        guide.guideNumber,
        guide.vendor,
        guide.fileName,
        guide.createdBy?.name,
        guide.createdBy?.email,
        guide.dispatchDate,
        toLocaleDate(guide.dispatchDate),
      ],
      normalizedTerm
    )
  );
}

export function filterExternalDecommissionActs(acts, term) {
  const normalizedTerm = normalizeSearchTerm(term);
  const list = Array.isArray(acts) ? acts : [];

  if (!normalizedTerm) {
    return list;
  }

  return list.filter((act) =>
    matchesAnyField(
      [
        act.inventoryManager,
        act.productName,
        act.serialNumber,
        act.operationalUnit,
        act.fileName,
        act.uploadedBy?.name,
        act.uploadedBy?.email,
        toLocaleDate(act.recordDate),
      ],
      normalizedTerm
    )
  );
}

export function filterStockSummary(summary, term) {
  const normalizedTerm = normalizeSearchTerm(term);
  const list = Array.isArray(summary) ? summary : [];

  if (!normalizedTerm) {
    return list;
  }

  return list.filter((item) =>
    matchesAnyField(
      [
        item.name,
        item.partNumber,
        item.description,
        item.productModelId,
        item.productModelId ? String(item.productModelId) : null,
        item.totals?.total,
        item.totals?.available,
        item.totals?.assigned,
        item.totals?.decommissioned,
        item.typeBreakdown?.purchased,
        item.typeBreakdown?.rental,
      ],
      normalizedTerm
    )
  );
}

export function filterUsers(users, term) {
  const normalizedTerm = normalizeSearchTerm(term);
  const list = Array.isArray(users) ? users : [];

  if (!normalizedTerm) {
    return list;
  }

  return list.filter((user) =>
    matchesAnyField(
      [
        user.name,
        user.email,
        user.role,
        user.adAccount,
        toLocaleDate(user.createdAt, { includeTime: true }),
        toLocaleDate(user.updatedAt, { includeTime: true }),
      ],
      normalizedTerm
    )
  );
}
