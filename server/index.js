const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/api/time', require('./routes/time'));
app.use('/api/tree', require('./routes/tree'));
app.use('/api/logs', require('./routes/logs'));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
