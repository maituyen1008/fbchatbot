var express = require('express');
var router = express.Router();
var WebhookController = require('../controllers/webhookController');

router.post('/', WebhookController.webhook);
router.get('/', WebhookController.verifyWebhook);

module.exports = router;
