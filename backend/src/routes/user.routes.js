const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/user.controller');
const v = require('../middleware/validate');

router.use(auth);
router.get('/me', c.getMe);
router.put('/me', v.profile, c.updateMe);
router.post('/change-password/request', v.changeRequest, c.requestPasswordChange);
router.post('/change-password/confirm', v.changeConfirm, c.confirmPasswordChange);

module.exports = router;
