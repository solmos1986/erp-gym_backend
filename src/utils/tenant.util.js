export const applyTenantFilter = (req, where = {}) => {
  // SYSTEM → no filtra
  if (!req.user.companyId) {
    return where;
  }

  // TENANT → fuerza companyId
  return {
    ...where,
    companyId: req.user.companyId
  };
};