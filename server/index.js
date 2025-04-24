const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const treeRoutes = require('./routes/tree');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/tree', treeRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
