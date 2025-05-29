const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const offsetMs = 3 * 60 * 60 * 1000; // +3 часа
    const now = new Date(Date.now() + offsetMs);

    // Человеко-читаемый формат: YYYY-MM-DD HH:MM:SS
    const formatted = now.toISOString().replace('T', ' ').substring(0, 19);
    res.json({ time: formatted });
});

module.exports = router;
