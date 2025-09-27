const PRODUCT_STATUS_CONFIG = {
  AVAILABLE: {
    label: 'Disponible',
    badge: 'success',
  },
  ASSIGNED: {
    label: 'Asignado',
    badge: 'info',
  },
  DECOMMISSIONED: {
    label: 'Dado de baja',
    badge: 'danger',
  },
};

export function getProductStatusLabel(status) {
  if (!status) {
    return 'Desconocido';
  }
  return PRODUCT_STATUS_CONFIG[status]?.label || status;
}

export function getProductStatusBadge(status) {
  if (!status) {
    return 'status info';
  }
  const badge = PRODUCT_STATUS_CONFIG[status]?.badge || 'info';
  return `status ${badge}`;
}

export function isDecommissioned(status) {
  return status === 'DECOMMISSIONED';
}
