# Quick Start Guide

## ✅ Setup Complete!

Your Instagram Automation Platform backend is ready to run.

---

## 🎯 What's Been Set Up

### Database
- ✅ PostgreSQL database `instagram_automation` created
- ✅ All 10 tables migrated with indexes
- ✅ Test data seeded

### Test Account
- **Email**: test@example.com
- **Password**: password123
- **Telegram Chat ID**: 123456789
- **Instagram**: @test_instagram (test_ig_business_123)

### Test Automations
1. **Welcome Flow - Keyword** (Priority: 10)
   - Trigger: keyword "interested"
   - Actions: Static reply + DM with buttons

2. **Purchase Intent - AI Reply** (Priority: 5)
   - Trigger: intent "purchase_inquiry"
   - Actions: AI-generated reply

---

## 🚀 Running the Server

### Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Test Endpoints

**Health Check**
```bash
curl http://localhost:3000/health
```

**Webhook Verification** (simulates Instagram verification)
```bash
curl "http://localhost:3000/webhooks/instagram/comments?hub.mode=subscribe&hub.verify_token=your_webhook_verify_token&hub.challenge=test123"
```

---

## 🔧 Configuration Needed

Before production use, update `.env` with real credentials:

### 1. Instagram/Meta Configuration
```env
META_APP_ID=your_actual_meta_app_id
META_APP_SECRET=your_actual_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_verify_token
META_WEBHOOK_SECRET=your_hmac_secret
```

**How to get these:**
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an app → Add Instagram product
3. Configure webhooks → Get credentials

### 2. Google Gemini API
```env
GEMINI_API_KEY=your_gemini_api_key
```

**How to get:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key

### 3. Telegram Bot
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

**How to get:**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the token

### 4. Redis (if not running locally)
```env
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

---

## 📡 Testing the Automation Pipeline

### 1. Start Redis (if not running)
```bash
# macOS with Homebrew
brew services start redis

# Or run in foreground
redis-server
```

### 2. Start the Server
```bash
npm run dev
```

### 3. Test Webhook with Mock Data

Create a test file `test-webhook.json`:
```json
{
  "object": "instagram",
  "entry": [{
    "id": "test_ig_business_123",
    "time": 1234567890,
    "changes": [{
      "field": "comments",
      "value": {
        "id": "comment_123",
        "text": "I'm interested in this!",
        "from": {
          "id": "commenter_456",
          "username": "test_commenter"
        },
        "media": {
          "id": "post_789",
          "username": "test_instagram"
        }
      }
    }]
  }]
}
```

Send webhook (requires valid HMAC signature in production):
```bash
curl -X POST http://localhost:3000/webhooks/instagram/comments \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d @test-webhook.json
```

**Note**: In development, you may need to temporarily disable HMAC verification for testing.

---

## 🤖 Testing Telegram Bot

### 1. Update .env with Real Bot Token

### 2. Start Server
```bash
npm run dev
```

### 3. Message Your Bot
1. Find your bot on Telegram
2. Send `/start`
3. Try commands:
   - `/status` - View account status
   - `/automations` - List automations
   - `/limits` - View rate limits

---

## 📊 Verify Database

```bash
# Connect to database
PGPASSWORD=v1shbuildmen8n! psql -U postgres -h localhost -d instagram_automation

# Check tables
\dt

# View users
SELECT id, email, telegram_chat_id FROM users;

# View automations
SELECT id, name, trigger_type, trigger_value, enabled FROM automations;

# Exit
\q
```

---

## 🔍 Monitoring Logs

The server uses structured logging. Watch logs in real-time:

```bash
npm run dev
```

Logs show:
- Incoming webhooks
- Comment processing
- Automation execution
- Rate limit checks
- API calls to Instagram/Gemini
- Errors and alerts

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
brew services restart postgresql
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG

# Restart Redis
brew services restart redis
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=3001
```

---

## 📦 Next Steps

### 1. Production Deployment
- Set up managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Set up managed Redis (ElastiCache, Memorystore)
- Deploy to cloud (AWS, Google Cloud, Heroku)
- Set up HTTPS with SSL certificate
- Configure Instagram webhook with public URL

### 2. Frontend Dashboard
- Build React + Vite frontend
- Implement OAuth flow for Instagram
- Create automation builder UI
- Add analytics dashboard

### 3. Advanced Features
- A/B testing for automations
- Advanced analytics and reporting
- Multi-language support
- Webhook retry mechanism
- Admin panel

---

## 📚 Documentation

- [README.md](README.md) - Full documentation
- [Implementation Plan](implementation_plan.md) - Architecture details
- [Walkthrough](walkthrough.md) - Implementation notes

---

## 🎉 You're Ready!

Your Instagram automation platform backend is fully functional and ready for testing.

Start the server with `npm run dev` and begin testing! 🚀
