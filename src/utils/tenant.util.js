export const applyTenantFilter = (req, where = {}) => {
  if (!req.user.companyId) {
    return where;
  }

  return {
    ...where,
    companyId: req.user.companyId
  };
};

export const applyBranchScope = (req, where = {}) => {
  const filter = {
    ...where,
    companyId: req.user.companyId
  };

  if (!req.user.isOwner) {
    filter.branchId = req.user.branchId;
  }

  return filter;
};
