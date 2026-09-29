const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/transaction.controller');
const v = require('../middleware/validate');

router.use(auth);
router.get('/', v.transactionQuery, c.list);
router.post('/', v.transaction, c.create);
router.delete('/:id', c.remove);

module.exports = router;
