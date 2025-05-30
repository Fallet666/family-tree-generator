const fs = require('fs');
const path = require('path');
const http = require('http');

const logPath = path.join(__dirname, 'actions.log');

function fetchServerTime(callback) {
    const options = {
        hostname: 'localhost',
        port: 3000, // Убедись, что API сервер слушает этот порт
        path: '/api/time',
        method: 'GET',
    };

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                callback(json.time);
            } catch (e) {
                console.error('[logger] Ошибка парсинга времени:', e);
                callback(getFallbackTime());
            }
        });
    });

    req.on('error', (error) => {
        console.error('[logger] Ошибка запроса времени:', error);
        callback(getFallbackTime());
    });

    req.end();
}

function getFallbackTime() {
    const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
    return now.toISOString().replace('T', ' ').substring(0, 19);
}

function appendLog(entry) {
    fetchServerTime((timestamp) => {
        const line = `[${timestamp}] ${entry}\n`;
        fs.appendFileSync(logPath, line);
    });
}

function getLogs() {
    if (!fs.existsSync(logPath)) return [];
    return fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
}

function clearLogs() {
    if (fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '');
    }
}

module.exports = {
    appendLog,
    getLogs,
    clearLogs,
};


function appendProjectLog(projectId, entry) {
    const projectLogPath = path.join(__dirname, `${projectId}.log`);
    fetchServerTime((timestamp) => {
        const line = `[${timestamp}] ${entry}\n`;
        fs.appendFileSync(projectLogPath, line);
    });
}

module.exports.appendProjectLog = appendProjectLog;
