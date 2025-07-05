document.addEventListener('DOMContentLoaded', () => {
    // 預設將到期時間設為一個月後
    const expiresAtInput = document.getElementById('expiresAtInput');
    if (expiresAtInput) {
        const now = new Date();
        now.setMonth(now.getMonth() + 1); // 設定為一個月後
        // 格式化為儼-MM-DDTHH:MM，符合 datetime-local 輸入框的要求
        expiresAtInput.value = now.toISOString().slice(0, 16);
    }

    // 初始化時顯示第一個 Tab
    openTab(null, 'shorten');
});

// 切換 Tab 頁面
function openTab(evt, tabName) {
    var i, tabContent, tabButtons;
    tabContent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = "none"; // 隱藏所有 Tab 內容
        tabContent[i].classList.remove('active');
    }
    tabButtons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove("active"); // 移除所有 Tab 按鈕的 active 樣式
    }
    document.getElementById(tabName).style.display = "block"; // 顯示當前選中的 Tab 內容
    document.getElementById(tabName).classList.add('active');
    if (evt) { // 避免初始化時傳入 null
        evt.currentTarget.classList.add("active"); // 為當前選中的 Tab 按鈕添加 active 樣式
    } else { // 首次載入時，手動設定第一個按鈕 active
        document.querySelector('.tab-button').classList.add('active');
    }
}

// 縮網址功能
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
                <p>短網址已生成:</p>
                <p><a href="${data.shortUrl}" target="_blank">${data.shortUrl}</a></p>
                <p>請複製此網址並分享！</p>
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

// 更新目標網址功能
async function updateUrl() {
    const shortId = document.getElementById('updateShortId').value;
    const newLongUrl = document.getElementById('newLongUrl').value;
    const resultDiv = document.getElementById('updateResult');
    resultDiv.innerHTML = '';

    if (!shortId || !newLongUrl) {
        resultDiv.innerHTML = '<p class="error-message">請輸入短網址 ID 和新的目標網址。</p>';
        return;
    }

    try {
        const response = await fetch(`/api/urls/${shortId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newLongUrl })
        });

        const data = await response.json();

        if (response.ok) {
            resultDiv.innerHTML = `<p>目標網址已更新成功！新的目標網址: <a href="${data.newLongUrl}" target="_blank">${data.newLongUrl}</a></p>`;
            document.getElementById('updateShortId').value = '';
            document.getElementById('newLongUrl').value = '';
        } else {
            resultDiv.innerHTML = `<p class="error-message">錯誤: ${data.error || '未知錯誤'}</p>`;
        }
    } catch (error) {
        console.error('更新網址請求失敗:', error);
        resultDiv.innerHTML = '<p class="error-message">網路或伺服器錯誤，請檢查控制台。</p>';
    }
}

// 流量分析功能
async function analyzeUrl() {
    const shortId = document.getElementById('analyzeShortId').value;
    const resultDiv = document.getElementById('analyzeResult');
    resultDiv.innerHTML = '';

    if (!shortId) {
        resultDiv.innerHTML = '<p class="error-message">請輸入要分析的短網址 ID。</p>';
        return;
    }

    try {
        const response = await fetch(`/api/urls/${shortId}`);
        const data = await response.json();

        if (response.ok) {
            let clicksHtml = '<h3>最近點擊紀錄 (最多 20 筆):</h3>';
            if (data.recentClicks && data.recentClicks.length > 0) {
                clicksHtml += '<ul>';
                data.recentClicks.forEach(click => {
                    clicksHtml += `<li>
                        <strong>時間:</strong> ${new Date(click.timestamp).toLocaleString()}<br>
                        <strong>IP:</strong> ${click.ipAddress}<br>
                        <strong>國家/城市:</strong> ${click.country} ${click.city ? `(${click.city})` : ''}<br>
                        <strong>裝置:</strong> ${click.deviceType} (${click.os})<br>
                        <strong>瀏覽器:</strong> ${click.browser}<br>
                        <strong>來源:</strong> ${click.referrer || '直接訪問'}
                    </li>`;
                });
                clicksHtml += '</ul>';
            } else {
                clicksHtml += '<p>目前沒有點擊紀錄。</p>';
            }

            resultDiv.innerHTML = `
                <p><strong>原始網址:</strong> <a href="${data.longUrl}" target="_blank">${data.longUrl}</a></p>
                <p><strong>總點擊數:</strong> ${data.totalClicks}</p>
                <p><strong>創建時間:</strong> ${new Date(data.createdAt).toLocaleString()}</p>
                ${data.expiresAt ? `<p><strong>到期時間:</strong> ${new Date(data.expiresAt).toLocaleString()}</p>` : '<p><strong>到期時間:</strong> 無設定</p>'}
                ${data.passwordProtected ? '<p><strong>密碼保護:</strong> 是</p>' : '<p><strong>密碼保護:</strong> 否</p>'}
                ${clicksHtml}
                <!-- 這裡可以添加更多圖表和數據聚合，例如：
                <canvas id="countryChart"></canvas>
                <canvas id="deviceChart"></canvas>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script>
                    // 在這裡根據 data.countryDistribution 和 data.deviceDistribution 繪製圖表
                    // 這需要後端提供更多聚合數據
                </script>
                -->
            `;
        } else {
            resultDiv.innerHTML = `<p class="error-message">錯誤: ${data.error || '未知錯誤'}</p>`;
        }
    } catch (error) {
        console.error('流量分析請求失敗:', error);
        resultDiv.innerHTML = '<p class="error-message">網路或伺服器錯誤，請檢查控制台。</p>';
    }
}
