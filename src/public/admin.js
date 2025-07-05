let currentShortId = '';
let currentManagementPassword = '';

document.addEventListener('DOMContentLoaded', () => {
    // 嘗試從 URL 參數獲取 shortId 和 managementPassword (如果從縮網址結果頁面點擊過來)
    const urlParams = new URLSearchParams(window.location.search);
    const initialShortId = urlParams.get('shortId');
    const initialManagementPassword = urlParams.get('managementPassword');

    if (initialShortId && initialManagementPassword) {
        document.getElementById('loginShortId').value = initialShortId;
        document.getElementById('loginManagementPassword').value = initialManagementPassword;
        // 可以自動觸發登入，但為了安全，讓用戶手動點擊登入按鈕
        // loginAdmin();
    }

    // 初始化時顯示第一個 Tab
    openAdminTab(null, 'update-settings');
});

function openAdminTab(evt, tabName) {
    var i, tabContent, tabButtons;
    tabContent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = "none";
        tabContent[i].classList.remove('active');
    }
    tabButtons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    document.getElementById(tabName).classList.add('active');
    if (evt) {
        evt.currentTarget.classList.add("active");
    } else {
        document.querySelector('.tab-button').classList.add('active');
    }

    // 如果切換到流量分析頁面，且已登入，則重新載入數據
    if (tabName === 'traffic-analysis' && currentShortId) {
        fetchAdminDetails();
    }
}

async function loginAdmin() {
    const loginShortId = document.getElementById('loginShortId').value;
    const loginManagementPassword = document.getElementById('loginManagementPassword').value;
    const loginResultDiv = document.getElementById('loginResult');
    loginResultDiv.innerHTML = '';

    if (!loginShortId || !loginManagementPassword) {
        loginResultDiv.innerHTML = '<p class="error-message">請輸入短網址 ID 和管理密碼。</p>';
        return;
    }

    try {
        const response = await fetch(`/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ shortId: loginShortId, managementPassword: loginManagementPassword })
        });

        const data = await response.json();

        if (response.ok) {
            currentShortId = loginShortId;
            currentManagementPassword = loginManagementPassword;
            document.getElementById('admin-login').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            loginResultDiv.innerHTML = '<p class="success-message">登入成功！</p>';
            fetchAdminDetails(); // 登入成功後立即獲取數據
        } else {
            loginResultDiv.innerHTML = `<p class="error-message">錯誤: ${data.error || '登入失敗'}</p>`;
        }
    } catch (error) {
        console.error('登入請求失敗:', error);
        loginResultDiv.innerHTML = '<p class="error-message">網路或伺服器錯誤。</p>';
    }
}

async function fetchAdminDetails() {
    if (!currentShortId || !currentManagementPassword) {
        console.error('未登入或缺少憑證。');
        return;
    }

    try {
        const response = await fetch(`/api/admin/details/${currentShortId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ managementPassword: currentManagementPassword })
        });

        const data = await response.json();

        if (response.ok) {
            displayTrafficAnalysis(data);
            // 更新更新設定頁面的預設值
            document.getElementById('updateLongUrl').value = data.longUrl;
            document.getElementById('updatePassword').value = data.passwordProtected ? '已設定密碼' : ''; // 不顯示實際密碼
            if (data.expiresAt) {
                document.getElementById('updateExpiresAt').value = new Date(data.expiresAt).toISOString().slice(0, 16);
            } else {
                document.getElementById('updateExpiresAt').value = '';
            }

        } else {
            alert(`獲取數據錯誤: ${data.error || '未知錯誤'}`);
            console.error('獲取數據錯誤:', data.error);
        }
    } catch (error) {
        console.error('獲取數據請求失敗:', error);
        alert('網路或伺服器錯誤，請檢查控制台。');
    }
}

async function updateShortUrlSettings() {
    const updateLongUrl = document.getElementById('updateLongUrl').value;
    const updatePassword = document.getElementById('updatePassword').value;
    const updateExpiresAt = document.getElementById('updateExpiresAt').value;
    const updateSettingsResultDiv = document.getElementById('updateSettingsResult');
    updateSettingsResultDiv.innerHTML = '';

    if (!updateLongUrl) {
        updateSettingsResultDiv.innerHTML = '<p class="error-message">新的目標網址是必填的。</p>';
        return;
    }

    try {
        const response = await fetch(`/api/admin/update/${currentShortId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                managementPassword: currentManagementPassword,
                newLongUrl: updateLongUrl,
                newPassword: updatePassword,
                newExpiresAt: updateExpiresAt
            })
        });

        const data = await response.json();

        if (response.ok) {
            updateSettingsResultDiv.innerHTML = `<p class="success-message">${data.message}</p>`;
            fetchAdminDetails(); // 更新後重新獲取數據以顯示最新狀態
        } else {
            updateSettingsResultDiv.innerHTML = `<p class="error-message">錯誤: ${data.error || '更新失敗'}</p>`;
        }
    } catch (error) {
        console.error('更新設定請求失敗:', error);
        updateSettingsResultDiv.innerHTML = '<p class="error-message">網路或伺服器錯誤。</p>';
    }
}

// Chart.js 實例，用於銷毀和重新創建圖表
let charts = {};
const chartColors = [
    'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
    'rgba(199, 199, 199, 0.7)', 'rgba(83, 102, 255, 0.7)', 'rgba(255, 99, 255, 0.7)'
];
const chartBorderColors = [
    'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)',
    'rgba(199, 199, 199, 1)', 'rgba(83, 102, 255, 1)', 'rgba(255, 99, 255, 1)'
];


function displayTrafficAnalysis(data) {
    document.getElementById('currentShortUrlDisplay').textContent = `${window.location.origin}/${currentShortId}`;
    document.getElementById('originalLongUrlDisplay').textContent = data.longUrl;
    document.getElementById('totalClicksDisplay').textContent = data.totalClicks;
    document.getElementById('createdAtDisplay').textContent = new Date(data.createdAt).toLocaleString();
    document.getElementById('expiresAtDisplay').textContent = data.expiresAt ? new Date(data.expiresAt).toLocaleString() : '無設定';
    document.getElementById('passwordProtectedDisplay').textContent = data.passwordProtected ? '是' : '否';

    const recentClicksList = document.getElementById('recentClicksList');
    recentClicksList.innerHTML = '';
    if (data.recentClicks && data.recentClicks.length > 0) {
        const ul = document.createElement('ul');
        data.recentClicks.forEach(click => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>時間:</strong> ${new Date(click.timestamp).toLocaleString()}<br>
                <strong>IP:</strong> ${click.ipAddress}<br>
                <strong>國家/城市:</strong> ${click.country} ${click.city ? `(${click.city})` : ''}<br>
                <strong>裝置:</strong> ${click.deviceType} (${click.os})<br>
                <strong>瀏覽器:</strong> ${click.browser}<br>
                <strong>來源:</strong> ${click.referrer || '直接訪問'}
            `;
            ul.appendChild(li);
        });
        recentClicksList.appendChild(ul);
    } else {
        recentClicksList.innerHTML = '<p>目前沒有點擊紀錄。</p>';
    }

    // 繪製圖表
    renderChart('countryChart', '國家分佈', data.countryDistribution);
    renderChart('deviceTypeChart', '裝置類型分佈', data.deviceTypeDistribution);
    renderChart('osChart', '作業系統分佈', data.osDistribution);
    renderChart('browserChart', '瀏覽器分佈', data.browserDistribution);
    renderChart('referrerChart', '流量來源分佈', data.referrerDistribution);
}

function renderChart(canvasId, title, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // 如果圖表已存在，先銷毀它
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const labels = Object.keys(data);
    const values = Object.values(data);

    charts[canvasId] = new Chart(ctx, {
        type: 'pie', // 可以根據數據類型選擇 'bar', 'doughnut' 等
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: values,
                backgroundColor: chartColors.slice(0, labels.length),
                borderColor: chartBorderColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: title
                }
            }
        }
    });
}