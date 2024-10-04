exports.checkRole = (authorizedRoles) => (req, res, next)=>{
    if(authorizedRoles.includes('*')){
      next()
    }
  
    const userRole = req.user?.role
  
    if(!userRole || !authorizedRoles.includes(userRole)){
      res.status(401).json({ message: 'Accès interdit' });
    }
  
    next();
  }
  