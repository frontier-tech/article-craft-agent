#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_NAME="article-craft-agent"
DEPLOY_URL="https://article-craft-agent-abc.vercel.app"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    🔍 Vercel Deployment Watcher               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}\n"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo -e "${RED}❌ Vercel CLI not found. Please install it:${NC}"
  echo -e "${YELLOW}   npm install -g vercel${NC}\n"
  exit 1
fi

echo -e "${CYAN}📦 Project: ${PROJECT_NAME}${NC}"
echo -e "${CYAN}🌐 URL: ${DEPLOY_URL}${NC}\n"

START_TIME=$(date +%s)
LAST_STATUS=""

while true; do
  # Get latest deployment info
  DEPLOY_INFO=$(vercel ls "${PROJECT_NAME}" 2>/dev/null | sed -n '4p')
  
  if [ -z "$DEPLOY_INFO" ]; then
    echo -e "${YELLOW}⚠️  Unable to fetch deployment. Retrying...${NC}"
    sleep 3
    continue
  fi
  
  # Parse deployment info
  STATUS=$(echo "$DEPLOY_INFO" | awk '{print $6}')
  CREATED=$(echo "$DEPLOY_INFO" | awk '{print $5}')
  
  # Calculate elapsed time
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  ELAPSED_MIN=$((ELAPSED / 60))
  ELAPSED_SEC=$((ELAPSED % 60))
  
  # Show status with animation
  SPINNER=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  SPIN_INDEX=$((ELAPSED % 10))
  
  # Clear line and show current status
  if [[ "$STATUS" == "READY" ]]; then
    echo -e "\r${GREEN}✅ Status: READY${NC} | ${CYAN}Elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}    "
    echo -e "\n${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 Deployment completed successfully!        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}\n"
    echo -e "${GREEN}🚀 Live at: ${DEPLOY_URL}${NC}\n"
    
    # Play success sound (macOS)
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &
    
    # Auto-test if requested
    if [[ "$1" == "--test" ]]; then
      echo -e "${BLUE}🧪 Running automatic test...${NC}\n"
      sleep 2
      curl -X POST "${DEPLOY_URL}/api/generate" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer article-gen-secret-2026" \
        -d '{
          "topic": "Test Deployment",
          "style": "technical",
          "audience": "developers",
          "tone": "professional",
          "length": 500,
          "language": "en",
          "maxBudgetUsd": 0.3,
          "verbose": true
        }' -s -w "\n\nHTTP Status: %{http_code}\n"
    fi
    
    exit 0
    
  elif [[ "$STATUS" == "ERROR" ]] || [[ "$STATUS" == "CANCELED" ]]; then
    echo -e "\r${RED}❌ Status: ${STATUS}${NC} | ${CYAN}Elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}    "
    echo -e "\n${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ Deployment failed!                         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}\n"
    
    # Play error sound (macOS)
    afplay /System/Library/Sounds/Basso.aiff 2>/dev/null &
    
    echo -e "${YELLOW}💡 Check logs at: https://vercel.com/dashboard${NC}\n"
    exit 1
    
  elif [[ "$STATUS" == "BUILDING" ]] || [[ "$STATUS" == "QUEUED" ]]; then
    echo -ne "\r${YELLOW}${SPINNER[$SPIN_INDEX]} Status: ${STATUS}${NC} | ${CYAN}Elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}    "
  else
    echo -ne "\r${YELLOW}⏳ Status: ${STATUS}${NC} | ${CYAN}Elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}    "
  fi
  
  # Status change notification
  if [[ "$STATUS" != "$LAST_STATUS" ]] && [[ -n "$LAST_STATUS" ]]; then
    echo -e "\n${BLUE}📢 Status changed: ${LAST_STATUS} → ${STATUS}${NC}"
  fi
  
  LAST_STATUS="$STATUS"
  
  # Wait before next check
  sleep 2
done
