const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const logFile = path.join(__dirname, '..', 'logs', 'actions.log');

router.get('/', (req, res) => {
    if (!fs.existsSync(logFile)) return res.json([]);
    const logs = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
    res.json(logs);
});

router.post('/', (req, res) => {
    const entry = req.body?.entry;
    if (!entry) return res.status(400).json({ error: 'Missing entry' });
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${entry}\n`);
    res.status(200).json({ message: 'Log added' });
});

router.delete('/', (req, res) => {
    if (fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, ''); // очищаем содержимое
    }
    res.status(200).json({ message: 'Log cleared' });
});

module.exports = router;
