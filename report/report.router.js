const router = require('express').Router();
router.get('/dashboard', require('../auth/auth.middleware').isAdmin, require('./report.controller').dashboard);
module.exports = router;
