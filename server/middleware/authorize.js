export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user credentials' });
    }

    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    const upperAllowedRoles = allowedRoles.map(r => r.toUpperCase());

    if (!upperAllowedRoles.includes(userRole)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]` });
    }

    next();
  };
};


export default authorize;
