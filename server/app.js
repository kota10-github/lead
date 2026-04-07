require('dotenv').config();
const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const threadsRoutes = require('./routes/threads');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 静的ファイル配信（index.html）
app.use(express.static(path.join(__dirname, '..')));

// ルート
app.use('/auth', authRoutes);
app.use('/api/threads', threadsRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
