document.addEventListener('DOMContentLoaded', () => {
    // 獲取 URL 中的 shortId
    const pathSegments = window.location.pathname.split('/');
    const shortId = pathSegments[pathSegments.length - 1]; // 應該是 /verify/:shortId
    if (shortId) {
        // 可以將 shortId 儲存起來，以便提交時使用
        document.body.dataset.shortId = shortId;
    } else {
        document.getElementById('message').textContent = '無效的連結。';
        document.getElementById('message').style.display = 'block';
    }
});

async function submitPassword() {
    const password = document.getElementById('passwordInput').value;
    const messageDiv = document.getElementById('message');
    const shortId = document.body.dataset.shortId; // 從 data-屬性獲取 shortId
    messageDiv.innerHTML = '';
    messageDiv.style.display = 'none';

    if (!password) {
        messageDiv.innerHTML = '請輸入密碼。';
        messageDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`/api/verify-password/${shortId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            window.location.replace(data.redirectUrl); // 驗證成功，轉址
        } else {
            messageDiv.innerHTML = data.error || '密碼錯誤。';
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('密碼驗證請求失敗:', error);
        messageDiv.innerHTML = '網路或伺服器錯誤，請檢查控制台。';
        messageDiv.style.display = 'block';
    }
}