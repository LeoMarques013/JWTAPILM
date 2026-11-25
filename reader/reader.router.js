const router = require('../shared/resource').router(require('./reader.controller'));
router.get('/:id/loans', require('./reader.controller').loans);
module.exports = router;
