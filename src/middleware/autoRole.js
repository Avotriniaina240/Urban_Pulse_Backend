exports.checkRole = (authorizedRoles) => (req, res, next) => {
  if (authorizedRoles.includes('*')) {
    return next(); // Si '*' est autorisé, passer directement à la route suivante
  }

  const userRole = req.user?.role;

  // Si l'utilisateur n'a pas de rôle ou si son rôle n'est pas dans la liste des rôles autorisés
  if (!userRole || !authorizedRoles.includes(userRole)) {
    return res.status(401).json({ message: 'Accès interdit' }); // Ajoutez return ici
  }

  // Si tout est correct, passer à la route suivante
  next();
};
