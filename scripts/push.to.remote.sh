#!/bin/bash

__DIR__=$(dirname "${BASH_SOURCE[0]}")

if test -z "$1";then
    echo $"Usage: $0 {ssh-vm}"
    exit 1
fi

TARGET_HOST=$1

FROM_ROOT=$__DIR__/../
TO_ROOT=/data/app/url-redirect-and-shortener

rsync -avz --no-o --no-g -u \
--rsync-path="sudo rsync" \
--exclude=".git" \
--exclude="node_modules" \
--exclude="mongodb_data" \
${FROM_ROOT}/ ${TARGET_HOST}:${TO_ROOT}/
