#!/bin/bash

# 尋找 MongoDB 容器的名稱或 ID
# 這裡假設你的 docker-compose.yml 中的 MongoDB 服務名稱是 'mongodb'
# 容器名稱通常會是 <專案名稱>-mongodb-1
# 你可以透過 `docker ps --format "{{.Names}}"` 找到確切的名稱
MONGO_CONTAINER_NAME=$(docker compose ps -q mongodb)

if [ -z "$MONGO_CONTAINER_NAME" ]; then
  echo "錯誤：找不到 'mongodb' 服務的運行容器。請確認 Docker Compose 服務已啟動 (docker-compose up)。"
  exit 1
fi

echo "進入 MongoDB Shell (mongosh) ... (容器名稱: $MONGO_CONTAINER_NAME)"
echo "使用 'use shorturl_db' 切換資料庫，使用 'db.urls.find({}).pretty()' 查詢資料。"
echo "輸入 'exit' 退出 shell。"

# 執行 docker exec 進入 mongosh
docker exec -it "$MONGO_CONTAINER_NAME" mongo