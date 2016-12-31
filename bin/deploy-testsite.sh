#!/bin/sh

aws s3 sync \
    --profile s3upload \
    --exact-timestamps \
    --delete \
    --cache-control 'no-cache' \
    --exclude *.DS_Store \
    ./public \
    s3://test.tetricus.com

