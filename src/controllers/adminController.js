const Url = require('../models/Url');
const validator = require('validator');

// 輔助函數：驗證管理密碼
const authenticateAdminMiddleware = async (req, res, next) => {
    const shortId = req.params.shortId || req.body.shortId
    const { managementPassword } = req.body; // 來自請求體

    if (!shortId || !managementPassword) {
        return res.status(400).json({ error: 'Short ID and management password are required.' });
    }

    try {
        // 為了獲取 managementPassword 欄位，需要明確指定 .select('+managementPassword')
        const urlEntry = await Url.findOne({ shortId }).select('+managementPassword');

        if (!urlEntry || urlEntry.managementPassword !== managementPassword) {
            return res.status(401).json({ error: 'Invalid Short ID or management password.' });
        }

        // 驗證成功，將 urlEntry 附加到 req 物件，以便後續的控制器使用
        req.urlEntry = urlEntry;
        next(); // 繼續執行下一個中介軟體或路由處理函數
    } catch (err) {
        console.error('Admin authentication error:', err);
        res.status(500).json({ error: 'Server error during authentication.' });
    }
};

// 後台登入驗證 (簡單的驗證，只返回成功訊息)
exports.authenticateAdmin = [
    authenticateAdminMiddleware, // 這裡直接使用中介軟體進行驗證
     async (req, res) => {
        const urlEntry = req.urlEntry; // 從中介軟體獲取已驗證的 urlEntry
        res.json({});
     }
]

// 獲取短網址的詳細資訊 (流量分析用，需要管理密碼驗證)
exports.getAdminUrlDetails = [
    authenticateAdminMiddleware, // 先進行管理密碼驗證
    async (req, res) => {
        const urlEntry = req.urlEntry; // 從中介軟體獲取已驗證的 urlEntry

        try {
            // 為了避免返回過大的數據，這裡只返回最近的點擊紀錄
            const analysis = {
                longUrl: urlEntry.longUrl,
                totalClicks: urlEntry.totalClicks,
                createdAt: urlEntry.createdAt,
                expiresAt: urlEntry.expiresAt,
                passwordProtected: !!urlEntry.password,
                recentClicks: urlEntry.clicks.slice(-50).reverse(), // 顯示最近 50 筆點擊，並倒序排列
                // 這裡可以加入更多聚合分析數據，例如：
                // 國家分佈
                countryDistribution: urlEntry.clicks.reduce((acc, click) => {
                    const country = click.country || 'Unknown';
                    acc[country] = (acc[country] || 0) + 1;
                    return acc;
                }, {}),
                // 裝置類型分佈
                deviceTypeDistribution: urlEntry.clicks.reduce((acc, click) => {
                    const deviceType = click.deviceType || 'Unknown';
                    acc[deviceType] = (acc[deviceType] || 0) + 1;
                    return acc;
                }, {}),
                // 作業系統分佈
                osDistribution: urlEntry.clicks.reduce((acc, click) => {
                    const os = click.os || 'Unknown';
                    acc[os] = (acc[os] || 0) + 1;
                    return acc;
                }, {}),
                // 瀏覽器分佈
                browserDistribution: urlEntry.clicks.reduce((acc, click) => {
                    const browser = click.browser || 'Unknown';
                    acc[browser] = (acc[browser] || 0) + 1;
                    return acc;
                }, {}),
                // 來源分佈
                referrerDistribution: urlEntry.clicks.reduce((acc, click) => {
                    const referrer = click.referrer || 'Direct';
                    // 簡化 referrer，只取域名
                    let domain = referrer;
                    try {
                        const url = new URL(referrer);
                        domain = url.hostname;
                    } catch (e) {
                        // 無效 URL，保持原樣或標記為 Direct
                    }
                    acc[domain] = (acc[domain] || 0) + 1;
                    return acc;
                }, {}),
            };

            res.json(analysis);

        } catch (err) {
            console.error('Error fetching admin URL details:', err);
            res.status(500).json({ error: 'Server error during fetching admin URL details.' });
        }
    }
];

// 更新目標網址 (需要管理密碼驗證)
exports.updateTargetUrl = [
    authenticateAdminMiddleware, // 先進行管理密碼驗證
    async (req, res) => {
        const urlEntry = req.urlEntry; // 從中介軟體獲取已驗證的 urlEntry
        const { newLongUrl, newPassword, newExpiresAt } = req.body; // 允許更新多個欄位

        if (!newLongUrl || !validator.isURL(newLongUrl, { require_protocol: true })) {
            return res.status(400).json({ error: 'Invalid new URL provided. Please include http:// or https://' });
        }

        try {
            urlEntry.longUrl = newLongUrl;
            if (newPassword !== undefined) { // 允許清空密碼
                urlEntry.password = newPassword === '' ? undefined : newPassword;
            }
            if (newExpiresAt !== undefined) { // 允許清空到期日
                urlEntry.expiresAt = newExpiresAt === '' ? undefined : new Date(newExpiresAt);
            }

            await urlEntry.save();

            res.json({ message: 'Target URL and settings updated successfully.', updatedUrl: urlEntry.longUrl });

        } catch (err) {
            console.error('Error updating target URL from admin:', err);
            res.status(500).json({ error: 'Server error during updating target URL.' });
        }
    }
];
