const router = require('express').Router();
  router.get('/dashboard', require('../models/auth/auth.middleware').isAdmin, require('./report.controller').dashboard);
module.exports = router;
