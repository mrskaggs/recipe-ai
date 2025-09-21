// Role-based access control middleware

// Check if user has required role
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin has access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has the required role
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires ${requiredRole} role`
      });
    }

    next();
  };
};

// Check if user has one of the allowed roles
const requireAnyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin has access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has one of the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user is admin only
const requireAdmin = requireRole('admin');

// Check if user is admin or user
const requireUserOrAdmin = requireAnyRole('user', 'admin');

module.exports = {
  requireRole,
  requireAnyRole,
  requireAdmin,
  requireUserOrAdmin
};
