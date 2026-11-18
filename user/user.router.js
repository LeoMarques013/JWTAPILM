const router = require('express').Router();
const controller = require('./user.controller');
const { isAdmin } = require('../auth/auth.middleware');
router.use(isAdmin);
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/active', controller.active);
module.exports = router;
