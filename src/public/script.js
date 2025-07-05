document.addEventListener('DOMContentLoaded', () => {
    // 預設將到期時間設為一個月後
    const expiresAtInput = document.getElementById('expiresAtInput');
    if (expiresAtInput) {
        const now = new Date();
        now.setMonth(now.getMonth() + 1); // 設定為一個月後
        // 格式化為儼-MM-DDTHH:MM，符合 datetime-local 輸入框的要求
        expiresAtInput.value = now.toISOString().slice(0, 16);
    }
});

async function shortenUrl() {
    const longUrl = document.getElementById('longUrlInput').value;
    const customShortId = document.getElementById('customShortIdInput').value;
    const expiresAt = document.getElementById('expiresAtInput').value;
    const password = document.getElementById('passwordInput').value;
    const resultDiv = document.getElementById('shortenResult');
    resultDiv.innerHTML = ''; // 清空之前結果

    if (!longUrl) {
        resultDiv.innerHTML = '<p class="error-message">請輸入長網址。</p>';
        return;
    }

    // 前端驗證 customShortId 長度
    if (customShortId && (customShortId.length < 10)) {
        resultDiv.innerHTML = '<p class="error-message">自訂短網址路徑必須至少 10 個字元。</p>';
        return;
    }


    try {
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                longUrl,
                customShortId: customShortId || undefined,
                expiresAt: expiresAt || undefined,
                password: password || undefined
            })
        });

        const data = await response.json();

        if (response.ok) {
            resultDiv.innerHTML = `
                <p class="success-message">短網址已成功生成！</p>
                <p><strong>縮短後的網址:</strong> <a href="${data.shortUrl}" target="_blank">${data.shortUrl}</a></p>
                <div class="admin-info">
                    <p><strong>後台管理資訊 (請務必妥善保存):</strong></p>
                    <p><strong>後台網址:</strong> <code>${data.adminUrl}</code></p>
                    <p><strong>短網址 ID:</strong> <code>${data.shortId}</code></p>
                    <p><strong>管理密碼:</strong> <code>${data.managementPassword}</code></p>
                    <p>您可以進入後台網址，並輸入上述資訊進行管理。</p>
                    <p>或直接點擊前往 <a href="${data.adminUrl}?shortId=${data.shortId}&managementPassword=${data.managementPassword}" target="_blank">後台管理介面</a> 進行管理。</p>
                </div>
            `;
            // 清空輸入框
            document.getElementById('longUrlInput').value = '';
            document.getElementById('customShortIdInput').value = '';
            document.getElementById('passwordInput').value = '';
            // 重設到期時間
            const expiresAtInput = document.getElementById('expiresAtInput');
            const now = new Date();
            now.setMonth(now.getMonth() + 1);
            expiresAtInput.value = now.toISOString().slice(0, 16);
        } else {
            resultDiv.innerHTML = `<p class="error-message">錯誤: ${data.error || '未知錯誤'}</p>`;
        }
    } catch (error) {
        console.error('縮網址請求失敗:', error);
        resultDiv.innerHTML = '<p class="error-message">網路或伺服器錯誤，請檢查控制台。</p>';
    }
}