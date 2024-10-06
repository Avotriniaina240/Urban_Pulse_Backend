 exports.checkUrbanist = (req, res, next) => {
    if (req.user && req.user.role === 'urbanist') {
      next();
    } else {
      res.status(403).json({ message: 'Accès interdit' });
    }
  }