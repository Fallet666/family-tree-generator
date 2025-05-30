
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const indexPath = path.join(__dirname, '..', 'storage', 'index.json');

router.get('/', (req, res) => {
    if (!fs.existsSync(indexPath)) return res.json([]);
    const data = fs.readFileSync(indexPath, 'utf8');
    return res.json(JSON.parse(data));
});

module.exports = router;
