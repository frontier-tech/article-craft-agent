#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

REPO="frontier-tech/article-craft-agent"
DEPLOY_URL="https://article-craft-agent-abc.vercel.app"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    🔍 Vercel Deployment Watcher (GitHub API)  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}📦 Repository: ${REPO}${NC}"
echo -e "${CYAN}🌐 URL: ${DEPLOY_URL}${NC}\n"

START_TIME=$(date +%s)
LAST_STATE=""
LAST_COMMIT=""

while true; do
  # Get latest deployment from GitHub
  DEPLOYMENTS=$(gh api "repos/${REPO}/deployments" --jq '.[0]' 2>/dev/null)
  
  if [ -z "$DEPLOYMENTS" ] || [ "$DEPLOYMENTS" = "null" ]; then
    echo -e "${YELLOW}⚠️  Unable to fetch deployments. Retrying...${NC}"
    sleep 3
    continue
  fi
  
  DEPLOYMENT_ID=$(echo "$DEPLOYMENTS" | jq -r '.id')
  COMMIT_SHA=$(echo "$DEPLOYMENTS" | jq -r '.sha' | cut -c1-7)
  
  # Get deployment status
  STATUS_INFO=$(gh api "repos/${REPO}/deployments/${DEPLOYMENT_ID}/statuses" --jq '.[0]' 2>/dev/null)
  STATE=$(echo "$STATUS_INFO" | jq -r '.state')
  DESCRIPTION=$(echo "$STATUS_INFO" | jq -r '.description')
  
  # Calculate elapsed time
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  ELAPSED_MIN=$((ELAPSED / 60))
  ELAPSED_SEC=$((ELAPSED % 60))
  
  # Spinner animation
  SPINNER=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  SPIN_INDEX=$((ELAPSED % 10))
  
  # Display status
  if [[ "$STATE" == "success" ]]; then
    echo -e "\r${GREEN}✅ Status: SUCCESS${NC} | ${CYAN}Commit: ${COMMIT_SHA}${NC} | ${CYAN}Elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}    "
    echo -e "\n${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 Deployment completed successfully!        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}\n"
    echo -e "${GREEN}🚀 Live at: ${DEPLOY_URL}${NC}"
    echo -e "${CYAN}📝 Description: ${DESCRIPTION}${NC}\n"
    
    # Play success sound (macOS)
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &
    
    # Auto-test if requested
    if [[ "$1" == "--test" ]]; then
      echo -e "${BLUE}🧪 Running automatic test in 3 seconds...${NC}\n"
      sleep 3
      
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
        }' -s | jq .
    fi
    
    exit 0
    
  elif [[ "$STATE" == "failure" ]] || [[ "$STATE" == "error" ]]; then
    echo -e "\r${RED}❌ Status: ${STATE^^}${NC} | ${CYAN}Commit: ${COMMIT_SHA}${NC} | ${CYAN}Elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}    "
    echo -e "\n${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ Deployment failed!                         ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}\n"
    echo -e "${RED}📝 Description: ${DESCRIPTION}${NC}\n"
    
    # Play error sound (macOS)
    afplay /System/Library/Sounds/Basso.aiff 2>/dev/null &
    
    echo -e "${YELLOW}💡 Check logs at: https://vercel.com/dashboard${NC}\n"
    exit 1
    
  elif [[ "$STATE" == "pending" ]] || [[ "$STATE" == "queued" ]] || [[ "$STATE" == "in_progress" ]]; then
    echo -ne "\r${YELLOW}${SPINNER[$SPIN_INDEX]} Status: ${STATE^^}${NC} | ${CYAN}Commit: ${COMMIT_SHA}${NC} | ${CYAN}Elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}    "
  else
    echo -ne "\r${YELLOW}⏳ Status: ${STATE}${NC} | ${CYAN}Commit: ${COMMIT_SHA}${NC} | ${CYAN}Elapsed: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}    "
  fi
  
  # Notify on state change
  if [[ "$STATE" != "$LAST_STATE" ]] && [[ -n "$LAST_STATE" ]]; then
    echo -e "\n${BLUE}📢 Status changed: ${LAST_STATE} → ${STATE}${NC}"
    if [[ -n "$DESCRIPTION" ]] && [[ "$DESCRIPTION" != "null" ]]; then
      echo -e "${CYAN}   ${DESCRIPTION}${NC}"
    fi
  fi
  
  # Notify on new commit
  if [[ "$COMMIT_SHA" != "$LAST_COMMIT" ]] && [[ -n "$LAST_COMMIT" ]]; then
    echo -e "\n${BLUE}📦 New deployment: ${COMMIT_SHA}${NC}"
  fi
  
  LAST_STATE="$STATE"
  LAST_COMMIT="$COMMIT_SHA"
  
  # Wait before next check
  sleep 3
done
