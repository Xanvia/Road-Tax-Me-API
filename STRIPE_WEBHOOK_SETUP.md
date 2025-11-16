# Stripe Webhook Setup Guide

## 🔒 Security Implementation

Your webhook endpoint now has **signature verification** to prevent unauthorized webhook calls.

## 📋 Setup Steps

### 1. Get Your Webhook Secret from Stripe

#### For Development (Stripe CLI):
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3001/api/payments/webhook/stripe
```

The CLI will output a webhook secret like:
```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

#### For Production (Stripe Dashboard):
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/payments/webhook/stripe`
4. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.failed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### 2. Update Your .env File

Add the webhook secret to your `.env`:

```env
# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_PUBLIC_KEY=pk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
```

### 3. Test the Webhook

#### Using Stripe CLI (Development):
```bash
# In one terminal, run your server
npm run dev

# In another terminal, listen for webhooks
stripe listen --forward-to localhost:3001/api/payments/webhook/stripe

# In a third terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

#### Using Stripe Dashboard (Production):
1. Go to your webhook endpoint in Stripe Dashboard
2. Click "Send test webhook"
3. Select `payment_intent.succeeded`
4. Click "Send test webhook"

### 4. Verify Security

The webhook endpoint now:
- ✅ Verifies the `stripe-signature` header
- ✅ Validates the webhook secret
- ✅ Rejects tampered or fake webhooks
- ✅ Only processes verified Stripe events

## 🚨 Important Notes

1. **Never commit your webhook secret** to version control
2. **Different secrets for dev/prod** - Use Stripe CLI secret for local development
3. **HTTPS required in production** - Stripe webhooks only work with HTTPS
4. **Raw body required** - The endpoint receives raw body for signature verification (already configured)

## 🔍 Testing Webhook Security

Try calling the webhook without a valid signature:

```bash
curl -X POST http://localhost:3001/api/payments/webhook/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded"}'
```

Expected response:
```json
{
  "status": "error",
  "message": "Missing stripe-signature header"
}
```

This confirms the security is working! 🔒

## 📝 Event Flow

1. User completes payment in Stripe → Stripe sends webhook
2. Your server receives webhook → Verifies signature
3. If valid → Updates payment status to `completed`
4. Also updates submission status to `completed`
5. Returns success response to Stripe

## 🐛 Troubleshooting

**Webhook signature verification failed:**
- Check `STRIPE_WEBHOOK_SECRET` is correct in .env
- Ensure you're using the right secret (dev vs prod)
- Verify raw body is being sent (already configured)

**Webhook not received:**
- Check firewall/network settings
- Verify URL is accessible from internet (for production)
- Check Stripe Dashboard → Webhooks → Recent events

**Payment status not updating:**
- Check server logs for webhook processing errors
- Verify `submissionId` is in payment intent metadata
- Ensure database connection is working
