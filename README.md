# url-redirect-and-shortener

一個免費強大的縮網址服務

URL Redirect & Shortener

## 專案簡介

`url-redirect-and-shortener` 是一個功能齊全的短網址服務，旨在提供使用者一個簡潔、高效且具備管理功能的網址縮短解決方案。除了基本的網址縮短功能外，它還支援自訂短網址、密碼保護，並提供後台管理介面，讓使用者可以追蹤點擊數據和管理已建立的短網址。本專案採用 Docker Compose 進行部署，方便快速啟動和管理。

## 主要功能

* **網址縮短：** 將冗長的網址轉換為簡短易記的短網址。

* **自訂短網址：** 允許使用者設定個性化的短網址路徑，長度限制在 1 到 10 個字元。

* **密碼保護：** 為短網址設定公開訪問密碼，只有輸入正確密碼的用戶才能訪問原始網址。

* **後台管理介面：** 提供一個獨立的後台介面，用於管理所有已建立的短網址。

* **自動生成管理密碼：** 每個短網址都會自動生成一個獨立的管理密碼，用於後台登入和管理。

* **流量分析：** 在後台介面查看短網址的點擊數據，包括總點擊數、最近點擊紀錄、國家、裝置、作業系統、瀏覽器和流量來源分佈。

* **短網址更新：** 在後台介面更新短網址的目標長網址、公開密碼和到期時間。

* **到期時間設定：** 支援為短網址設定到期時間，過期後自動失效。

* **Docker 部署：** 提供 `docker-compose.yml` 檔案，實現快速、隔離的部署。

## 使用技術

* **後端：**

  * **Node.js:** 運行時環境。

  * **Express.js:** Web 應用程式框架。

  * **MongoDB:** NoSQL 資料庫，用於儲存網址資訊和點擊數據。

  * **Mongoose:** MongoDB 的物件資料模型 (ODM) 工具，簡化資料庫操作。

  * **Crypto (Node.js 內建):** 用於生成安全隨機字串（如管理密碼和短 ID）。

  * **Validator.js:** 用於驗證 URL 格式。

  * **ua-parser-js:** 用於解析用戶代理字串，獲取裝置、作業系統和瀏覽器資訊。

  * **GeoIP-Lite:** 用於基於 IP 地址進行地理位置查詢。

* **前端：**

  * **HTML5 / CSS3 / JavaScript:** 標準網頁技術。

  * **Chart.js:** 用於在後台介面繪製流量分析圖表。

* **部署：**

  * **Docker:** 容器化平台。

  * **Docker Compose:** 用於定義和運行多容器 Docker 應用程式。

## 快速開始

### 環境要求

* [Docker](https://www.docker.com/get-started/)

* [Docker Compose](https://docs.docker.com/compose/install/)

### 安裝與運行

1. **克隆專案：**
首先，將專案從 GitHub 克隆到你的本地機器：

```sh
git clone https://github.com/justintien/url-redirect-and-shortener.git
cd url-redirect-and-shortener
```

2. **啟動服務：**
使用 Docker Compose 啟動 Node.js 應用程式和 MongoDB 資料庫。這將在後台啟動服務並自動處理依賴安裝。

```sh
docker-compose up -d
```

首次運行可能需要一些時間來下載 Docker 映像並安裝 Node.js 依賴。請耐心等待。

3. **檢查服務狀態 (可選)：**

```sh
docker-compose ps
```

確保 `app` 和 `mongodb` 服務都處於 `Up` 狀態。

4. **訪問應用程式：**

* **縮網址主頁：** 在瀏覽器中打開 `http://localhost:9527`

* **後台管理：** 在瀏覽器中打開 `http://localhost:9527/admin`

## 使用指南

### 縮短網址

1. 訪問 `http://localhost:3000`。

2. 在「長網址」欄位輸入你想要縮短的完整 URL (包含 `http://` 或 `https://`)。

3. （可選）在「自訂短網址路徑」欄位輸入你想要的短網址路徑，長度限制在 1 到 10 個字元。

4. （可選）設定「到期時間」。

5. （可選）設定「公開密碼保護」。

6. 點擊「縮短網址」按鈕。

7. 系統將返回生成的短網址和後台管理資訊（短網址 ID 和管理密碼）。**請務必妥善保存這些後台管理資訊！**

### 後台管理

1. 訪問 `http://localhost:9527/admin`。

2. 輸入你想要管理的短網址 ID 和其對應的管理密碼，然後點擊「登入」。

3. 登入成功後，你可以切換到：

* **更新設定：** 修改短網址的目標 URL、公開密碼或到期時間。

* **流量分析：** 查看該短網址的總點擊數、最近點擊紀錄，以及按國家、裝置、作業系統、瀏覽器和流量來源分佈的統計圖表。

## 專案結構

```sh
url-redirect-and-shortener/
├── src/
│   ├── controllers/
│   │   ├── adminController.js    # 後台管理邏輯 (登入、查詢、更新)
│   │   └── urlController.js      # 縮網址和轉址邏輯 (包含短ID生成)
│   ├── models/
│   │   └── Url.js                # MongoDB Url Schema 定義
│   ├── public/
│   │   ├── admin.html            # 後台管理介面 HTML
│   │   ├── admin.js              # 後台管理介面 JavaScript
│   │   ├── index.html            # 縮網址主頁 HTML
│   │   ├── password_prompt.html  # 公開密碼輸入頁面 HTML
│   │   ├── password_prompt.js    # 公開密碼輸入頁面 JavaScript
│   │   └── script.js             # 縮網址主頁 JavaScript
│   ├── scripts/                  # 輔助腳本 (例如 MongoDB CLI 腳本)
│   │   └── mongo-shell.sh
│   └── server.js                 # 應用程式主入口
├── .gitignore                # Git 忽略文件
├── docker-compose.yml        # Docker Compose 配置
├── package.json              # Node.js 專案依賴和腳本
└── README.md                 # 專案說明文件
```

## 貢獻

歡迎任何形式的貢獻！如果你有任何建議、功能請求或發現 Bug，請隨時提交 Issue 或 Pull Request。

## 許可證

本專案採用 AGPL-3.0 許可證。詳情請參閱 `LICENSE` 檔案。
