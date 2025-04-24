const express = require('express');
const router = express.Router();

let treeData = {
  name: "Алексей",
  children: [
    {
      name: "Иван",
      children: [
        { name: "Петр", children: [] },
        { name: "Мария", children: [] }
      ]
    },
    {
      name: "Ольга",
      children: [
        { name: "Сергей", children: [] }
      ]
    }
  ]
};

router.get('/', (req, res) => {
  res.json(treeData);
});

router.post('/', (req, res) => {
  treeData = req.body;
  res.status(200).json({ message: "Tree updated successfully" });
});

module.exports = router;
