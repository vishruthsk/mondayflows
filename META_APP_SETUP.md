# Meta App Setup Guide

## Overview

This guide walks you through setting up a Meta (Facebook) App to enable Instagram OAuth integration for the Instagram Automation Platform.

---

## Prerequisites

- Facebook Developer account
- Facebook Page
- Instagram Business Account connected to the Facebook Page

---

## Step 1: Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as the app type
4. Fill in app details:
   - **App Name**: Instagram Automation Platform
   - **App Contact Email**: your-email@example.com
5. Click **Create App**

---

## Step 2: Add Instagram Basic Display

1. In your app dashboard, click **Add Product**
2. Find **Instagram Basic Display** and click **Set Up**
3. Click **Create New App** (if prompted)
4. Fill in:
   - **Display Name**: Instagram Automation Platform
   - **Valid OAuth Redirect URIs**: 
     - `http://localhost:3000/auth/instagram/callback` (for local development)
     - `https://yourdomain.com/auth/instagram/callback` (for production)
   - **Deauthorize Callback URL**: `https://yourdomain.com/auth/instagram/deauthorize`
   - **Data Deletion Request URL**: `https://yourdomain.com/auth/instagram/delete`
5. Click **Save Changes**

---

## Step 3: Add Instagram Graph API

1. In your app dashboard, click **Add Product**
2. Find **Instagram Graph API** and click **Set Up**
3. No additional configuration needed at this step

---

## Step 4: Configure App Settings

1. Go to **Settings** → **Basic**
2. Note down:
   - **App ID** → This is your `META_APP_ID`
   - **App Secret** → This is your `META_APP_SECRET` (click **Show** to reveal)
3. Add **App Domains**: 
   - `localhost` (for local development)
   - `yourdomain.com` (for production)
4. Add **Privacy Policy URL**: `https://yourdomain.com/privacy`
5. Add **Terms of Service URL**: `https://yourdomain.com/terms`
6. Click **Save Changes**

---

## Step 5: Configure OAuth Settings

1. Go to **Settings** → **Advanced**
2. Scroll to **OAuth Settings**
3. Add **Valid OAuth Redirect URIs**:
   - `http://localhost:3000/auth/instagram/callback`
   - `https://yourdomain.com/auth/instagram/callback`
4. Enable **Client OAuth Login**: **Yes**
5. Enable **Web OAuth Login**: **Yes**
6. Click **Save Changes**

---

## Step 6: Request Permissions

For production use, you'll need to request the following permissions from Meta:

### Required Permissions:
- `instagram_basic` - Basic profile information
- `instagram_manage_comments` - Read and reply to comments
- `instagram_manage_messages` - Send DMs
- `pages_show_list` - Access to Facebook Pages
- `pages_read_engagement` - Read engagement data

### How to Request:
1. Go to **App Review** → **Permissions and Features**
2. Search for each permission above
3. Click **Request Advanced Access**
4. Fill in the use case description
5. Provide screencast/screenshots of your app
6. Submit for review

**Note**: For development/testing, you can use **Standard Access** which allows testing with up to 5 users.

---

## Step 7: Add Test Users (Development)

1. Go to **Roles** → **Test Users**
2. Click **Add Test Users**
3. Add your Instagram account as a test user
4. Grant permissions when prompted

---

## Step 8: Update Environment Variables

Add the following to your `.env` file:

```bash
# Meta/Instagram
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
META_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
META_WEBHOOK_SECRET=your_webhook_secret_for_hmac

# Server
BASE_URL=http://localhost:3000  # Change to your production URL in production
```

---

## Step 9: Connect Facebook Page to Instagram

1. Go to your Facebook Page settings
2. Click **Instagram** in the left sidebar
3. Click **Connect Account**
4. Log in to your Instagram Business account
5. Confirm the connection

---

## Step 10: Set Up Webhooks (for Comment Notifications)

1. In your Meta App dashboard, go to **Products** → **Webhooks**
2. Click **Configure Webhooks** for Instagram
3. Add **Callback URL**: `https://yourdomain.com/webhooks/instagram/comments`
4. Add **Verify Token**: Same as `META_WEBHOOK_VERIFY_TOKEN` in your `.env`
5. Subscribe to **comments** field
6. Click **Verify and Save**

**Note**: Webhooks require HTTPS. For local development, use ngrok or similar tunneling service.

---

## Testing the OAuth Flow

### Local Development

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Create a user account**:
   ```bash
   curl -X POST http://localhost:3000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

   Response:
   ```json
   {
     "success": true,
     "data": {
       "user": { "id": "...", "email": "test@example.com" },
       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
   }
   ```

3. **Save the token** from the response

4. **Start Instagram OAuth flow**:
   ```bash
   # Open in browser (replace TOKEN with your actual token)
   http://localhost:3000/auth/instagram/start
   # Add header: Authorization: Bearer TOKEN
   ```

   Or use curl:
   ```bash
   curl -L http://localhost:3000/auth/instagram/start \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

5. **Follow the OAuth flow**:
   - You'll be redirected to Facebook/Instagram login
   - Grant permissions
   - You'll be redirected back to `/auth/instagram/callback`
   - Your Instagram account will be connected

6. **Check connection status**:
   ```bash
   curl http://localhost:3000/auth/instagram/status \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

   Response:
   ```json
   {
     "success": true,
     "data": {
       "connected": true,
       "account": {
         "id": "...",
         "username": "your_instagram_username",
         "automation_enabled": true,
         "token_expires_at": "2026-03-31T...",
         "token_expiring_soon": false
       }
     }
   }
   ```

---

## Troubleshooting

### Error: "No Facebook pages found"

**Solution**: Create a Facebook Page and connect it to your Instagram Business account.

### Error: "No Instagram Business account connected"

**Solution**: 
1. Go to your Facebook Page settings
2. Connect your Instagram Business account
3. Make sure it's a **Business** account, not a **Creator** or personal account

### Error: "Invalid redirect_uri"

**Solution**: 
1. Check that the redirect URI in your Meta App settings matches exactly
2. Include protocol (`http://` or `https://`)
3. No trailing slash

### Error: "App Not Set Up: This app is still in development mode"

**Solution**: 
1. Add your Instagram account as a test user in **Roles** → **Test Users**
2. Or switch app to **Live Mode** (requires app review for permissions)

### Token Expires Too Soon

**Solution**: 
- Short-lived tokens expire in 1 hour
- Long-lived tokens expire in 60 days
- The platform automatically exchanges for long-lived tokens
- Implement token refresh before expiry (see Token Management section)

---

## Production Checklist

Before going live:

- [ ] App reviewed and approved by Meta
- [ ] All required permissions granted
- [ ] Privacy Policy and Terms of Service published
- [ ] Production redirect URIs configured
- [ ] HTTPS enabled for all endpoints
- [ ] Webhooks configured with production URL
- [ ] Environment variables set in production
- [ ] Token refresh mechanism implemented
- [ ] Error monitoring and logging enabled

---

## Security Best Practices

1. **Never commit secrets**: Keep `META_APP_SECRET` and `JWT_SECRET` in `.env`, not in code
2. **Use HTTPS in production**: Required for OAuth and webhooks
3. **Validate webhook signatures**: Already implemented in `webhook.service.ts`
4. **Rotate secrets regularly**: Update `JWT_SECRET` and `META_WEBHOOK_SECRET` periodically
5. **Monitor token expiry**: Set up alerts for tokens expiring soon
6. **Rate limit API calls**: Respect Instagram API rate limits

---

## Next Steps

1. Test the OAuth flow locally
2. Create automations via API
3. Test webhook delivery
4. Deploy to staging environment
5. Request Meta app review
6. Deploy to production

---

## Support

- [Meta for Developers Documentation](https://developers.facebook.com/docs/)
- [Instagram Graph API Reference](https://developers.facebook.com/docs/instagram-api/)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api/)
