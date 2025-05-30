
const express = require('express');
const router = express.Router();
const fs = require('fs');
const { appendProjectLog } = require('../logs/logger');
const path = require('path');

const storageDir = path.join(__dirname, '..', 'storage');
const logsDir = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

router.get('/', (req, res) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const filePath = path.join(storageDir, `${projectId}.json`);
  if (!fs.existsSync(filePath)) {
    appendProjectLog(projectId, "Requested nonexistent project");
    return res.status(200).json(null);
  }

  const data = fs.readFileSync(filePath, 'utf8');
  appendProjectLog(projectId, "Loaded project tree");
  return res.status(200).json(JSON.parse(data));
});


router.post('/', (req, res) => {
  const { projectId, treeData } = req.body;
  if (!projectId || !treeData) {
    return res.status(400).json({ error: 'projectId and treeData are required' });
  }

  const filePath = path.join(storageDir, `${projectId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(treeData, null, 2), 'utf8');
  appendProjectLog(projectId, "Saved project tree");
  
    // обновляем индекс
    const indexPath = path.join(__dirname, '..', 'storage', 'index.json');
    let index = [];
    if (fs.existsSync(indexPath)) {
        index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }

    const now = new Date().toISOString();
    const existing = index.find(p => p.projectId === projectId);
    if (existing) {
        existing.updatedAt = now;
        if (treeData.name) existing.name = treeData.name;
    } else {
        index.push({
            projectId,
            name: treeData.name || "Без имени",
            updatedAt: now
        });
    }

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    return res.status(200).json({ message: 'Tree saved successfully' });
    
});

module.exports = router;
