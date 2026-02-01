# Automation v1 API Examples

## Valid Automation Examples

### Example 1: Simple Keyword Trigger with Static Reply

**Request**: `POST /automations`

```json
{
  "name": "Welcome New Followers",
  "enabled": true,
  "priority": 10,
  "scope": "global",
  "trigger_type": "keyword",
  "trigger_value": "interested",
  "actions": {
    "public_reply": {
      "enabled": true,
      "type": "static",
      "text": "Thanks for your interest! Check your DMs for more info."
    }
  },
  "stop_after_execution": false
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "Welcome New Followers",
    "enabled": true,
    "priority": 10,
    "scope": "global",
    "trigger_type": "keyword",
    "trigger_value": "interested",
    "actions": { ... },
    "stop_after_execution": false,
    "created_at": "2026-01-30T06:35:00Z"
  }
}
```

---

### Example 2: Post-Specific Automation

**Request**: `POST /automations`

```json
{
  "name": "Product Launch Promo",
  "enabled": true,
  "priority": 20,
  "scope": "post",
  "post_id": "instagram_post_12345",
  "trigger_type": "keyword",
  "trigger_value": "price",
  "actions": {
    "public_reply": {
      "enabled": true,
      "type": "static",
      "text": "Our new product starts at $99! Limited time offer."
    }
  },
  "stop_after_execution": true
}
```

---

### Example 3: DM with Buttons (if ENABLE_DM=true)

**Request**: `POST /automations`

```json
{
  "name": "Send Product Link",
  "enabled": true,
  "priority": 5,
  "scope": "global",
  "trigger_type": "keyword",
  "trigger_value": "link",
  "actions": {
    "dm": {
      "enabled": true,
      "delay_seconds": 30,
      "message": "Here's the link you requested! Check it out:",
      "buttons": [
        {
          "title": "Shop Now",
          "url": "https://example.com/shop"
        },
        {
          "title": "Learn More",
          "url": "https://example.com/about"
        }
      ]
    }
  },
  "stop_after_execution": false
}
```

---

### Example 4: Multiple Actions

**Request**: `POST /automations`

```json
{
  "name": "Full Engagement Flow",
  "enabled": true,
  "priority": 15,
  "scope": "global",
  "trigger_type": "keyword",
  "trigger_value": "discount",
  "actions": {
    "public_reply": {
      "enabled": true,
      "type": "static",
      "text": "Great! Check your DMs for an exclusive discount code."
    },
    "dm": {
      "enabled": true,
      "delay_seconds": 60,
      "message": "Here's your exclusive 20% OFF code: SAVE20",
      "buttons": [
        {
          "title": "Shop Now",
          "url": "https://example.com/shop?code=SAVE20"
        }
      ]
    }
  },
  "stop_after_execution": true
}
```

---

## Invalid Automation Examples (Will Fail Validation)

### Error 1: AI Reply Type (Gated in Phase 1)

**Request**: `POST /automations`

```json
{
  "name": "AI Responder",
  "trigger_type": "keyword",
  "trigger_value": "help",
  "actions": {
    "public_reply": {
      "enabled": true,
      "type": "ai",  // ❌ Only "static" allowed in v1
      "text": "AI generated response"
    }
  }
}
```

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "errors": [
    {
      "field": "actions.public_reply.type",
      "message": "Invalid literal value, expected \"static\""
    }
  ]
}
```

---

### Error 2: Intent Trigger (Gated in Phase 1)

**Request**: `POST /automations`

```json
{
  "name": "Intent Based",
  "trigger_type": "intent",  // ❌ Gated in Phase 1
  "trigger_value": "purchase_intent",
  "actions": {
    "public_reply": {
      "enabled": true,
      "type": "static",
      "text": "Thanks!"
    }
  }
}
```

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "errors": [
    {
      "field": "trigger_type",
      "message": "Intent-based triggers are not available in Phase 1. Use keyword triggers only."
    }
  ]
}
```

---

### Error 3: Too Many Buttons

**Request**: `POST /automations`

```json
{
  "name": "Too Many Buttons",
  "trigger_type": "keyword",
  "trigger_value": "links",
  "actions": {
    "dm": {
      "enabled": true,
      "message": "Check these out:",
      "buttons": [
        { "title": "Link 1", "url": "https://example.com/1" },
        { "title": "Link 2", "url": "https://example.com/2" },
        { "title": "Link 3", "url": "https://example.com/3" },
        { "title": "Link 4", "url": "https://example.com/4" }  // ❌ Max 3
      ]
    }
  }
}
```

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "errors": [
    {
      "field": "actions.dm.buttons",
      "message": "Array must contain at most 3 element(s)"
    }
  ]
}
```

---

### Error 4: HTTP URL (Not HTTPS)

**Request**: `POST /automations`

```json
{
  "name": "Insecure Link",
  "trigger_type": "keyword",
  "trigger_value": "link",
  "actions": {
    "dm": {
      "enabled": true,
      "message": "Here you go:",
      "buttons": [
        {
          "title": "Click Here",
          "url": "http://example.com"  // ❌ Must be HTTPS
        }
      ]
    }
  }
}
```

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "errors": [
    {
      "field": "actions.dm.buttons.0.url",
      "message": "URLs must be HTTPS"
    }
  ]
}
```

---

### Error 5: No Actions Enabled

**Request**: `POST /automations`

```json
{
  "name": "Empty Automation",
  "trigger_type": "keyword",
  "trigger_value": "test",
  "actions": {
    "public_reply": {
      "enabled": false  // ❌ At least one action must be enabled
    }
  }
}
```

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "errors": [
    {
      "field": "actions",
      "message": "At least one action (public_reply, dm, or discount_code) must be enabled"
    }
  ]
}
```

---

### Error 6: Delay Too Long

**Request**: `POST /automations`

```json
{
  "name": "Long Delay",
  "trigger_type": "keyword",
  "trigger_value": "wait",
  "actions": {
    "dm": {
      "enabled": true,
      "delay_seconds": 500,  // ❌ Max 300 seconds
      "message": "This will take a while..."
    }
  }
}
```

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "errors": [
    {
      "field": "actions.dm.delay_seconds",
      "message": "Number must be less than or equal to 300"
    }
  ]
}
```

---

### Error 7: Missing Required Field (Post ID)

**Request**: `POST /automations`

```json
{
  "name": "Post Specific",
  "scope": "post",  // ❌ post_id required when scope is "post"
  "trigger_type": "keyword",
  "trigger_value": "test",
  "actions": {
    "public_reply": {
      "enabled": true,
      "type": "static",
      "text": "Thanks!"
    }
  }
}
```

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "errors": [
    {
      "field": "post_id",
      "message": "post_id is required when scope is \"post\""
    }
  ]
}
```

---

### Error 8: Feature Disabled (DM)

**Request**: `POST /automations` (when `ENABLE_DM=false`)

```json
{
  "name": "DM Test",
  "trigger_type": "keyword",
  "trigger_value": "dm",
  "actions": {
    "dm": {
      "enabled": true,  // ❌ DM feature disabled
      "message": "Hello!"
    }
  }
}
```

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "errors": [
    {
      "field": "actions.dm",
      "message": "DM feature is currently disabled. Please contact support to enable."
    }
  ]
}
```

---

### Error 9: Max Automations Limit

**Request**: `POST /automations` (when user already has 5 automations)

**Response**: `400 Bad Request`
```json
{
  "success": false,
  "error": "Maximum 5 automations allowed per user in Phase 1"
}
```

---

## Update Automation Examples

### Update 1: Change Reply Text

**Request**: `PUT /automations/:id`

```json
{
  "actions": {
    "public_reply": {
      "enabled": true,
      "type": "static",
      "text": "Updated reply text!"
    }
  }
}
```

---

### Update 2: Change Priority

**Request**: `PUT /automations/:id`

```json
{
  "priority": 50
}
```

---

### Update 3: Disable Automation

**Request**: `POST /automations/:id/disable`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "enabled": false,
    ...
  }
}
```

---

## List Automations

**Request**: `GET /automations`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Welcome New Followers",
      "enabled": true,
      "priority": 10,
      ...
    },
    {
      "id": "uuid-2",
      "name": "Product Launch Promo",
      "enabled": false,
      "priority": 20,
      ...
    }
  ],
  "count": 2
}
```

---

## Delete Automation

**Request**: `DELETE /automations/:id`

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Automation deleted successfully"
}
```
