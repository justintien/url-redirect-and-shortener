const Url = require('../models/Url');
const validator = require('validator');
// const shortid = require('shortid'); // 不再直接用於生成 ID，但如果其他地方有用到可以保留
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const crypto = require('crypto');

// 設定 shortid 的字元集和長度
// 這裡使用預設的字元集，並設定最小/最大長度為 6
// 注意：shortid 庫本身沒有直接設定固定長度的方法，我們透過 Mongoose Schema 進行驗證
// shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_');
// shortid.worker(1); // 這些設定對於我們現在手動控制長度的方式不再是必須的
// shortid.seed(2025);

// 輔助函數：生成隨機安全字串作為管理密碼
const generateSecurePassword = (length = 16) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

// 輔助函數：生成固定長度的隨機短 ID
const generateFixedLengthShortId = (length = 6) => {
    // 使用 base64url 編碼可以生成 URL-safe 的字元
    // 每個字元需要約 6 bits，所以 length * 3/4 決定需要的位元組數
    // 為了保險起見，可以稍微多生成一些位元組，然後截取
    const bytesNeeded = Math.ceil(length * 0.75); // 每個 base64url 字元代表 6 位元，所以 4 個字元代表 3 位元組
    const randomBytes = crypto.randomBytes(bytesNeeded + 2); // 多生成一些，確保能截取到足夠的長度
    return randomBytes.toString('base64url').slice(0, length);
};

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

    // 驗證 customShortId 長度
    if (customShortId && (customShortId.length < 10)) {
        return res.status(400).json({ error: 'Custom short ID must be great than 10 characters long.' });
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
            // 自動生成 6 位元短 ID，並確保唯一性
            let isUnique = false;
            const MAX_RETRIES = 5; // 防止無限迴圈，設定最大重試次數
            let retries = 0;

            while (!isUnique && retries < MAX_RETRIES) {
                generatedId = generateFixedLengthShortId(6); // 生成 6 個字元的 ID
                const existingUrl = await Url.findOne({ shortId: generatedId });
                if (!existingUrl) {
                    isUnique = true;
                }
                retries++;
            }

            if (!isUnique) {
                return res.status(500).json({ error: 'Failed to generate a unique short ID after multiple attempts. Please try again.' });
            }
            shortIdToUse = generatedId;
        }

        const managementPassword = generateSecurePassword(); // 生成管理密碼

        // 創建新的 Url 文件
        const newUrl = new Url({
            longUrl,
            shortId: shortIdToUse,
            customShortId: customShortId || undefined, // 如果沒有自訂，則不儲存此欄位
            expiresAt: expiresAt ? new Date(expiresAt) : undefined, // 轉換為 Date 物件
             password: password || undefined, // 公開訪問密碼
            managementPassword: managementPassword, // 後台管理密碼
        });

        await newUrl.save(); // 儲存到資料庫

        // 返回生成的短網址給前端
        res.status(201).json({
            shortUrl: `${req.protocol}://${req.get('host')}/${newUrl.shortId}`,
            adminUrl: `${req.protocol}://${req.get('host')}/admin`, // 導向後台登入頁面
            shortId: newUrl.shortId, // 返回短網址ID
            managementPassword: managementPassword // 返回管理密碼
        });

    } catch (err) {
        console.error('Error shortening URL:', err);
        // 處理可能的唯一索引衝突 (例如 shortId 重複，雖然 shortid.generate 衝突機率極低)
        if (err.code === 11000) {
            return res.status(409).json({ error: 'A short ID conflict occurred. Please try again or choose a different custom ID.' });
        }
        // 處理 Mongoose 驗證錯誤
        if (err.name === 'ValidationError') {
          const errors = Object.keys(err.errors).map(key => err.errors[key].message);
          return res.status(400).json({ error: `Validation failed: ${errors.join(', ')}` });
        }
        res.status(500).json({ error: 'Server error during URL shortening.' });
    }
};

// 向長網址並記錄點擊 (處理公開密碼保護)
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
            // return res.status(401).send('This URL is password protected. Please provide the password to access.');
            // 導向到一個專門的密碼輸入頁面，並將 shortId 傳遞過去
            return res.redirect(`/verify/${shortId}`);
        }

        // 沒有密碼保護或密碼已驗證，記錄點擊並轉址
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

// 驗證公開密碼並轉址
exports.verifyPublicPassword = async (req, res) => {
    const { shortId } = req.params;
    const { password } = req.body; // 從表單提交的密碼

    try {
        // 為了獲取 password 欄位，需要明確指定 .select('+password')
        const urlEntry = await Url.findOne({ shortId }).select('+password');

        if (!urlEntry) {
            return res.status(404).json({ error: 'Short URL not found.' });
        }

        if (!urlEntry.password || urlEntry.password !== password) { // 簡單的密碼比對
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        // 密碼驗證成功，記錄點擊並轉址
        const ipAddress = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.connection.remoteAddress;
        const userAgentHeader = req.headers['user-agent'];
        const referrer = req.headers['referer'] || 'Direct';

        const geoInfo = getGeoInfo(ipAddress);
        const uaInfo = getUserAgentInfo(userAgentHeader);

        urlEntry.clicks.push({
            ipAddress,
            ...geoInfo,
            ...uaInfo,
            referrer,
        });
        urlEntry.totalClicks++;
        await urlEntry.save();

        res.json({ success: true, redirectUrl: urlEntry.longUrl }); // 返回成功和轉址 URL

    } catch (err) {
        console.error('Error verifying public password:', err);
        res.status(500).json({ error: 'Server error during password verification.' });
    }
};