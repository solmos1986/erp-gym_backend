export const requirePermission = (permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];

    // 🔥 SI ES STRING → convertir a array
    const permsArray = Array.isArray(permissions)
      ? permissions
      : [permissions];

    const hasPermission = permsArray.some(p =>
      userPermissions.includes(p)
    );
    

    if (!hasPermission) {
      return res.status(403).json({
        message: "No tienes permiso para esta acción"
      });
    }

    next();
  };
};

export default requirePermission;