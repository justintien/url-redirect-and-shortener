const mongoose = require('mongoose'); // 這裡需要解除註解
const shortid = require('shortid'); // 這裡需要解除註解

// 定義單次點擊的資料結構
const clickSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now }, // 點擊時間
    ipAddress: String, // 點擊者的 IP 位址
    country: String, // 國家
    region: String, // 區域/省份
    city: String, // 城市
    os: String, // 作業系統 (e.g., Windows 10, iOS 15)
    deviceType: String, // 裝置類型 (e.g., desktop, mobile, tablet)
    browser: String, // 瀏覽器 (e.g., Chrome 100, Safari 15)
    referrer: String, // 流量來源網址
});

// 定義短網址的資料結構
const urlSchema = new mongoose.Schema({
    longUrl: {
        type: String,
        required: true // 長網址是必填的
    },
    shortId: {
        type: String,
        required: true,
        unique: true, // 短 ID 必須是唯一的
        default: shortid.generate // 預設使用 shortid 庫自動生成
    },
    customShortId: { // 允許使用者自訂短網址路徑
        type: String,
        unique: true,
        sparse: true // 允許此欄位為空，但如果存在則必須唯一
    },
    createdAt: {
        type: Date,
        default: Date.now // 創建時間預設為當前時間
    },
    expiresAt: Date, // 短網址的到期時間 (可選)
    password: String, // 密碼保護 (可選)
    totalClicks: {
        type: Number,
        default: 0 // 總點擊數，預設為 0
    },
    clicks: [clickSchema] // 儲存所有點擊的詳細資訊，是一個 ClickSchema 陣列
});

const Url = mongoose.model('Url', urlSchema); // 建立 Url 模型
module.exports = Url; // 實際檔案中會這樣導出
