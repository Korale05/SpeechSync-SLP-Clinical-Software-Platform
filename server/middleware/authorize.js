export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user credentials' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]` });
    }

    next();
  };
};


export default authorize;
