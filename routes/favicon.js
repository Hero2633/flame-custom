const express = require('express');
const router = express.Router();
const getFavicon = require('../controllers/favicon/getFavicon');

router.route('/').get(getFavicon);

module.exports = router;
