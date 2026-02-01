# Instagram Automation Platform

A production-grade multi-creator Instagram automation platform that processes comment webhooks, executes sophisticated automation rules with intent classification, and provides creator management via Telegram bot and web dashboard.

## 🚀 Features

### Core Automation Engine
- **Multi-automation execution** per comment (sorted by priority)
- **Intent classification** using Google Gemini (cached once per comment)
- **Keyword and intent-based triggers**
- **Multiple action types**: Public replies (static/AI), DMs with buttons, discount codes
- **Stop-after-execution** logic for automation chains
- **Idempotency guarantees** via unique constraints

### Rate Limiting
- Per-creator DM limits (daily)
- Per-creator reply limits (hourly)
- Redis-based sliding window counters
- Automatic skip behavior when limits exceeded

### Telegram Bot
- 15+ commands for automation management
- Real-time alerts (failures, rate limits, token expiry)
- Log viewing and statistics
- Rate limit configuration

### Production Features
- HMAC signature verification for webhooks
- Async job processing with BullMQ
- Exponential backoff retry logic
- Comprehensive audit logging
- Graceful shutdown handling

---

## 📋 Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 14+
- **Redis** 6+
- **Instagram Business Account** with Graph API access
- **Google Gemini API Key**
- **Telegram Bot Token**

---

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd "insta bot"
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` or individual `DB_*` variables
- `REDIS_HOST`, `REDIS_PORT`
- `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_SECRET`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `JWT_SECRET`

### 3. Setup Database

```bash
npm run db:migrate
```

This will create all required tables with indexes and constraints.

### 4. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or your configured `PORT`).

---

## 📡 Instagram Webhook Setup

### 1. Configure Webhook in Meta App Dashboard

1. Go to your Meta App Dashboard
2. Navigate to **Webhooks** → **Instagram**
3. Set callback URL: `https://your-domain.com/webhooks/instagram/comments`
4. Set verify token: (same as `META_WEBHOOK_VERIFY_TOKEN` in `.env`)
5. Subscribe to `comments` field

### 2. Verify Webhook

Meta will send a GET request to verify. The server handles this automatically.

### 3. Test Webhook

Post a comment on an Instagram post from a connected account. Check logs:

```bash
# Watch logs in development
npm run dev
```

---

## 🤖 Telegram Bot Commands

### Setup
- `/start` - Welcome message and command list
- `/connect` - Connect Instagram Business Account
- `/status` - View account status

### Automation Management
- `/automations` - List all automations
- `/enable <id>` - Enable specific automation
- `/disable <id>` - Disable specific automation
- `/toggle` - Toggle all automations on/off

### Rate Limits
- `/limits` - View current rate limit configuration
- `/setdmlimit <number>` - Set max DMs per day
- `/setreplylimit <number>` - Set max replies per hour

### Monitoring
- `/logs` - View recent execution logs
- `/stats` - View automation statistics
- `/help` - Show command list

### Automatic Alerts
The bot automatically sends alerts for:
- Automation failures
- Rate limit hits
- Instagram API errors
- Token expiry warnings

---

## 🗄️ Database Schema

### Core Tables

- **users** - Creator accounts
- **instagram_accounts** - Connected Instagram business accounts
- **automations** - Automation rules (triggers + actions)
- **processed_automation_events** - Execution logs with idempotency
- **rate_limit_config** - Per-creator rate limits
- **discount_codes** - Discount code pools
- **audit_logs** - System-wide audit trail
- **telegram_alerts** - Pending Telegram notifications

See [`src/scripts/schema.sql`](src/scripts/schema.sql) for full schema.

---

## 🏗️ Architecture

### Request Flow

1. **Instagram** sends comment webhook → **Webhook Handler**
2. **Webhook Handler** verifies HMAC, normalizes payload → **Job Queue**
3. **Job Queue** (BullMQ) → **Automation Engine**
4. **Automation Engine**:
   - Checks deduplication
   - Loads user and automations
   - Classifies intent (once, cached in Redis)
   - Loops through automations by priority
   - Executes matched automations
   - Logs execution
5. **Action Executor** → Instagram API (replies, DMs)
6. **Rate Limiter** → Redis counters
7. **Telegram Bot** → Sends alerts on failures

### Services

- **WebhookService** - HMAC verification, payload normalization
- **AutomationEngineService** - Core orchestrator
- **IntentClassificationService** - Gemini API integration with caching
- **ActionExecutorService** - Executes replies, DMs, discount codes
- **RateLimiterService** - Redis-based rate limiting
- **TelegramBotService** - Bot commands and alerts

---

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing

1. **Webhook**: Use ngrok to expose local server, configure in Meta dashboard
2. **Telegram Bot**: Message your bot on Telegram
3. **Database**: Check `processed_automation_events` for execution logs

---

## 🚢 Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Environment Variables

Ensure all production secrets are set:
- Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Use managed Redis (ElastiCache, Memorystore)
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`

### Scaling

- **Horizontal scaling**: Run multiple worker instances
- **Job queue**: Separate queue workers from web servers
- **Database**: Use read replicas for analytics
- **Redis**: Use cluster mode for high throughput

---

## 📊 Monitoring

### Logs

Structured JSON logs via Pino:
```bash
# Development (pretty-printed)
npm run dev

# Production (JSON)
NODE_ENV=production npm start
```

### Metrics

Monitor:
- Job queue length (BullMQ)
- Database connection pool usage
- Redis memory usage
- Instagram API rate limits
- Automation execution success rate

---

## 🔒 Security

- ✅ HMAC signature verification on webhooks
- ✅ Access tokens encrypted at rest
- ✅ Rate limiting on webhook endpoint
- ✅ Input validation with Zod
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS configuration
- ✅ JWT authentication for frontend API

---

## 📝 License

MIT

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Check logs: `npm run dev`
- Review implementation plan: [`implementation_plan.md`](implementation_plan.md)

---

## 🎯 Roadmap

- [ ] Frontend dashboard (React + Vite)
- [ ] OAuth flow for Instagram connection
- [ ] Advanced analytics and reporting
- [ ] A/B testing for automations
- [ ] Multi-language support
- [ ] Webhook retry mechanism
- [ ] Admin panel for platform management
# mondayflows
