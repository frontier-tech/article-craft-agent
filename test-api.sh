#!/bin/bash
# API テストスクリプト
# 使い方: ./test-api.sh https://your-app.vercel.app YOUR_API_SECRET

VERCEL_URL=$1
API_SECRET=$2

if [ -z "$VERCEL_URL" ] || [ -z "$API_SECRET" ]; then
  echo "使い方: $0 <VERCEL_URL> <API_SECRET>"
  echo "例: $0 https://article-craft-agent.vercel.app my-secret-key"
  exit 1
fi

echo "Testing API at: $VERCEL_URL/api/generate"
echo "---"

curl -X POST "$VERCEL_URL/api/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_SECRET" \
  -d '{
    "topic": "Introduction to Claude Agent SDK",
    "style": "technical",
    "audience": "developers",
    "tone": "professional",
    "length": 800,
    "language": "en",
    "keywords": ["claude", "agents", "ai"],
    "maxBudgetUsd": 0.5,
    "verbose": true
  }' | jq .
