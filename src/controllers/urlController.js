const Url = require('../models/Url'); // 實際檔案中會這樣引入
const validator = require('validator');
const shortid = require('shortid'); // 這裡需要解除註解
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

// 輔助函數：根據 IP 位址獲取地理位置資訊
const getGeoInfo = (ip) => {
    if (!ip) return {};
    // 處理 IPv6 位址，geoip-lite 可能需要 IPv4 或特定格式
    const ipv4 = ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip;
    const geo = geoip.lookup(ipv4);
    return {
        country: geo ? geo.country : 'Unknown',
        region: geo ? geo.region : 'Unknown',
        city: geo ? geo.city : 'Unknown',
    };
};

// 輔助函數：根據 User-Agent 字串獲取作業系統、裝置和瀏覽器資訊
const getUserAgentInfo = (userAgentString) => {
    if (!userAgentString) return {};
    const uaParsedResult = new UAParser(userAgentString).getResult();
    return {
        os: uaParsedResult.os.name ? `${uaParsedResult.os.name} ${uaParsedResult.os.version || ''}`.trim() : 'Unknown',
        deviceType: uaParsedResult.device.type || 'Unknown', // 例如: mobile, tablet, desktop
        browser: uaParsedResult.browser.name ? `${uaParsedResult.browser.name} ${uaParsedResult.browser.version || ''}`.trim() : 'Unknown',
    };
};

// 縮網址功能
exports.shortenUrl = async (req, res) => {
    const { longUrl, customShortId, expiresAt, password } = req.body;

    // 驗證輸入的長網址是否為有效 URL
    if (!longUrl || !validator.isURL(longUrl, { require_protocol: true })) {
        return res.status(400).json({ error: 'Invalid URL provided. Please include http:// or https://' });
    }

    try {
        let shortIdToUse;
        if (customShortId) {
            // 如果提供了自訂短網址，檢查是否已被使用
            const existingCustomUrl = await Url.findOne({ customShortId });
            if (existingCustomUrl) {
                return res.status(409).json({ error: 'Custom short ID is already in use.' });
            }
            shortIdToUse = customShortId;
        } else {
            // 如果沒有提供自訂短網址，則自動生成一個
            shortIdToUse = shortid.generate();
        }

        // 創建新的 Url 文件
        const newUrl = new Url({
            longUrl,
            shortId: shortIdToUse,
            customShortId: customShortId || undefined, // 如果沒有自訂，則不儲存此欄位
            expiresAt: expiresAt ? new Date(expiresAt) : undefined, // 轉換為 Date 物件
            password: password || undefined,
        });

        await newUrl.save(); // 儲存到資料庫

        // 返回生成的短網址給前端
        res.status(201).json({
            shortUrl: `${req.protocol}://${req.get('host')}/${newUrl.shortId}`
        });

    } catch (err) {
        console.error('Error shortening URL:', err);
        // 處理可能的唯一索引衝突 (例如 shortId 重複，雖然 shortid.generate 衝突機率極低)
        if (err.code === 11000) {
            return res.status(409).json({ error: 'A short ID conflict occurred. Please try again or choose a different custom ID.' });
        }
        res.status(500).json({ error: 'Server error during URL shortening.' });
    }
};

// 導向長網址並記錄點擊數據
exports.redirectToLongUrl = async (req, res) => {
    const { shortId } = req.params;
    // 獲取客戶端 IP 位址 (考慮代理伺服器)
    const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.connection.remoteAddress;
    const userAgentHeader = req.headers['user-agent']; // 獲取 User-Agent 字串
    const referrer = req.headers['referer'] || 'Direct'; // 獲取來源網址

    try {
        const urlEntry = await Url.findOne({ shortId });

        if (!urlEntry) {
            return res.status(404).send('Short URL not found.');
        }

        // 檢查短網址是否過期
        if (urlEntry.expiresAt && urlEntry.expiresAt < new Date()) {
            return res.status(410).send('Short URL has expired.');
        }

        // 檢查是否有密碼保護 (此處僅為簡單提示，實際應用需導向密碼驗證頁面)
        if (urlEntry.password) {
            // 實際應用中，這裡會導向一個密碼輸入頁面，然後再驗證
            return res.status(401).send('This URL is password protected. Please provide the password to access.');
        }

        // 記錄點擊資訊
        const geoInfo = getGeoInfo(ipAddress);
        const uaInfo = getUserAgentInfo(userAgentHeader);

        urlEntry.clicks.push({
            ipAddress,
            ...geoInfo,
            ...uaInfo,
            referrer,
        });
        urlEntry.totalClicks++; // 總點擊數加一
        await urlEntry.save(); // 更新資料庫

        res.redirect(urlEntry.longUrl); // 重新導向到原始長網址

    } catch (err) {
        console.error('Error redirecting URL:', err);
        res.status(500).send('Server error during redirection.');
    }
};

// 獲取短網址的詳細資訊 (流量分析用)
exports.getShortUrlDetails = async (req, res) => {
    const { shortId } = req.params;

    try {
        const urlEntry = await Url.findOne({ shortId });

        if (!urlEntry) {
            return res.status(404).json({ error: 'Short URL not found.' });
        }

        // 為了避免返回過大的數據，這裡只返回最近的點擊紀錄
        // 實際應用中，流量分析會更複雜，可能需要聚合管道 (aggregation pipeline)
        // 來計算國家分佈、裝置分佈、時間趨勢等
        const analysis = {
            longUrl: urlEntry.longUrl,
            totalClicks: urlEntry.totalClicks,
            createdAt: urlEntry.createdAt,
            expiresAt: urlEntry.expiresAt,
            passwordProtected: !!urlEntry.password, // 是否有密碼保護
            recentClicks: urlEntry.clicks.slice(-20).reverse(), // 只顯示最近 20 筆點擊，並倒序排列 (最新在前)
            // 你可以在這裡添加更多聚合數據，例如：
            // countryDistribution: await Url.aggregate([
            //     { $match: { shortId: shortId } },
            //     { $unwind: '$clicks' },
            //     { $group: { _id: '$clicks.country', count: { $sum: 1 } } },
            //     { $sort: { count: -1 } }
            // ]),
            // osDistribution: await Url.aggregate([
            //     { $match: { shortId: shortId } },
            //     { $unwind: '$clicks' },
            //     { $group: { _id: '$clicks.os', count: { $sum: 1 } } },
            //     { $sort: { count: -1 } }
            // ]),
        };

        res.json(analysis);

    } catch (err) {
        console.error('Error fetching URL details:', err);
        res.status(500).json({ error: 'Server error during fetching URL details.' });
    }
};

// 更新目標網址
exports.updateTargetUrl = async (req, res) => {
    const { shortId } = req.params;
    const { newLongUrl } = req.body;

    // 驗證新的目標網址是否為有效 URL
    if (!newLongUrl || !validator.isURL(newLongUrl, { require_protocol: true })) {
        return res.status(400).json({ error: 'Invalid new URL provided. Please include http:// or https://' });
    }

    try {
        // 找到對應的短網址條目
        const urlEntry = await Url.findOne({ shortId });

        if (!urlEntry) {
            return res.status(404).json({ error: 'Short URL not found.' });
        }

        urlEntry.longUrl = newLongUrl; // 更新長網址
        await urlEntry.save(); // 儲存更新

        res.json({ message: 'Target URL updated successfully.', newLongUrl: urlEntry.longUrl });

    } catch (err) {
        console.error('Error updating target URL:', err);
        res.status(500).json({ error: 'Server error during updating target URL.' });
    }
};