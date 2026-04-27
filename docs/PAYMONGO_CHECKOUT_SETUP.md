# PayMongo Checkout Setup

This implementation uses PayMongo Hosted Checkout for one-time subscription-period purchases. It does not register webhooks from app runtime code.

## Supabase Secrets

Configure these Edge Function secrets before deploy:

```bash
supabase secrets set PAYMONGO_SECRET_KEY=sk_test_xxx
supabase secrets set PAYMONGO_WEBHOOK_SECRET=whsec_xxx
supabase secrets set SITE_URL=https://your-app.example.com
supabase secrets set PAYMONGO_PAYMENT_METHOD_TYPES=card,gcash,paymaya,grab_pay,qrph,dob,dob_ubp,brankas_bdo,brankas_landbank,brankas_metrobank,billease
supabase secrets set PAYMONGO_TEST_AMOUNT_CENTS=100
```

`PAYMONGO_PAYMENT_METHOD_TYPES` is optional. If omitted, the Edge Function uses the broad default list in `create-paymongo-checkout`.
`PAYMONGO_TEST_AMOUNT_CENTS=100` makes test-mode checkout charge PHP 1.00 while plan cards still display the real plan price. It is ignored when the configured PayMongo key is not a `sk_test_*` key.

## Deploy

Apply the migration, then deploy both functions:

```bash
supabase db push
supabase functions deploy create-paymongo-checkout
supabase functions deploy verify-paymongo-checkout
supabase functions deploy paymongo-webhook --no-verify-jwt
```

The subscription expiration migration installs a `pg_cron` job named
`expire-due-user-subscriptions`. It runs every 15 minutes and marks
`active` or `trialing` subscriptions as `expired` once `ends_at <= now()`.

## PayMongo Webhook

Register one webhook in the PayMongo Dashboard or API tooling:

```text
https://<project-ref>.supabase.co/functions/v1/paymongo-webhook
```

Subscribe to `checkout_session.payment.paid`. The webhook secret from PayMongo must match `PAYMONGO_WEBHOOK_SECRET`.

The success page only polls local payment state. App access unlocks only after the signed webhook marks the local attempt paid and creates or renews `user_subscriptions`.
