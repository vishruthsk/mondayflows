#!/bin/bash

# Test script for Create Automation API
# This script tests the POST /automations endpoint

echo "🧪 Testing Create Automation API"
echo "================================"
echo ""

# Check if auth token is provided
if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ ERROR: AUTH_TOKEN environment variable not set"
    echo "Usage: AUTH_TOKEN='your_token_here' ./test-create-automation.sh"
    exit 1
fi

echo "📝 Creating test automation..."
echo ""

# Create automation payload
PAYLOAD='{
  "name": "Test Automation via API",
  "trigger_type": "keyword",
  "trigger_value": "test",
  "scope": "global",
  "actions": {
    "public_reply": {
      "enabled": true,
      "type": "static",
      "text": "Thanks for testing!"
    }
  },
  "follow_gate": false
}'

# Make the API request
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$PAYLOAD" \
  http://localhost:3001/automations)

# Extract status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ SUCCESS: Automation created successfully!"
    
    # Extract automation ID
    AUTOMATION_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
    if [ -n "$AUTOMATION_ID" ] && [ "$AUTOMATION_ID" != "null" ]; then
        echo "📋 Automation ID: $AUTOMATION_ID"
        echo ""
        echo "🔄 Testing enable/disable..."
        
        # Test disable
        DISABLE_RESPONSE=$(curl -s -w "\n%{http_code}" \
          -X POST \
          -H "Authorization: Bearer $AUTH_TOKEN" \
          http://localhost:3001/automations/$AUTOMATION_ID/disable)
        
        DISABLE_CODE=$(echo "$DISABLE_RESPONSE" | tail -n1)
        if [ "$DISABLE_CODE" = "200" ]; then
            echo "✅ Disable successful"
        else
            echo "❌ Disable failed (HTTP $DISABLE_CODE)"
        fi
        
        # Test enable
        ENABLE_RESPONSE=$(curl -s -w "\n%{http_code}" \
          -X POST \
          -H "Authorization: Bearer $AUTH_TOKEN" \
          http://localhost:3001/automations/$AUTOMATION_ID/enable)
        
        ENABLE_CODE=$(echo "$ENABLE_RESPONSE" | tail -n1)
        if [ "$ENABLE_CODE" = "200" ]; then
            echo "✅ Enable successful"
        else
            echo "❌ Enable failed (HTTP $ENABLE_CODE)"
        fi
    fi
else
    echo "❌ FAILED: HTTP $HTTP_CODE"
fi

echo ""
echo "================================"
