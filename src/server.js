const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const urlController = require('./controllers/urlController'); // 引入 URL 控制器

const app = express();
const PORT = process.env.PORT || 9527;
// *** Docker Compose 環境下，MongoDB 服務名稱為 'mongodb' ***
// 請確保你的 MongoDB 服務正在運行，並且連接 URI 正確
// 如果 MongoDB 在不同的主機或端口，請修改這裡
const DB_URI = process.env.DB_URI || 'mongodb://mongodb:27017/shorturl_db';

// 連接 MongoDB 資料庫
mongoose.connect(DB_URI, { serverSelectionTimeoutMS: 30000 })
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// 設定 Express 中介軟體
app.use(express.json()); // 解析 JSON 格式的請求體
app.use(express.urlencoded({ extended: true })); // 解析 URL-encoded 格式的請求體
app.use(express.static(path.join(__dirname, 'public'))); // 提供靜態檔案 (例如: index.html, script.js, CSS)

// =============================================================================
// 路由定義
// =============================================================================

// GET /:shortId
// 用於處理短網址的導向請求，會將使用者重新導向到原始的長網址
app.get('/:shortId', urlController.redirectToLongUrl);

// POST /api/shorten
// 用於接收前端的縮網址請求，生成短網址並儲存到資料庫
app.post('/api/shorten', urlController.shortenUrl);

// GET /api/urls/:shortId
// 用於獲取指定短網址的詳細資訊，包含點擊數據等，供流量分析使用
app.get('/api/urls/:shortId', urlController.getShortUrlDetails);

// PUT /api/urls/:shortId
// 用於更新指定短網址的目標長網址
app.put('/api/urls/:shortId', urlController.updateTargetUrl);

// GET /
// 應用程式的根路由，導向到前端的 index.html 頁面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
