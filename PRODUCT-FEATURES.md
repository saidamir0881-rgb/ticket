# UZTicket product features MVP

## Database setup

Apply `supabase/migrations/202611270001_product_features.sql` and then `supabase/migrations/202611270002_referral_summary.sql` in the Supabase SQL Editor after the existing migrations. The first adds account favorites and notification preferences, promo codes, referral tracking, refund requests, and organization membership. The second adds the RLS-safe referral count function. Apply both before deploying the code, or the feature endpoints will return a schema error.

## Telegram reminders

Reminders use the Telegram account encrypted and saved when a customer registers. The Vercel cron runs daily at 08:00 Tashkent time and sends a message for paid tickets and favorite events roughly one day before they start. Set a random `CRON_SECRET` in Vercel Project Settings → Environment Variables so Vercel can authorize the scheduled endpoint. The cron endpoint is `/api/cron/event-reminders`.

On Vercel Hobby, scheduled jobs run once per day with up to about an hour of timing variation. A more frequent schedule needs a plan that supports it or an external scheduler.

## Promos and referrals

- Admin: open `/admin/promos` to create a percentage or fixed-amount discount. Codes can be limited by use count and expiration. A code is applied to the booking total before Hamyon payment is created.
- Customers: the account page shows a personal invite URL and the number of registrations attributed to it. The MVP tracks referrals; it does not promise or credit cash rewards.

## Refunds

Customers can request a refund for a paid, non-demo order from `/account`. Review requests at `/admin/refunds`. The Hamyon API currently confirms incoming payments only, so an administrator must return the money using the payment provider and then mark the request “refunded” with a note. “Approved” means the request was accepted; it does not initiate a payment reversal.

## Organizer cabinet

Open `/admin/organizers`, enter the organizer’s profile UUID and organization name, then copy the generated organization UUID. Use that UUID and an event UUID to attach existing events to the organization. The assigned account sees its own event status, paid order/ticket counts, and gross sales at `/organizer`. New event creation and seat layout management remain in the admin workspace for this MVP.

## Existing environment variables

Keep the existing Supabase service role key and Telegram OTP bot settings configured. The reminder job uses `TELEGRAM_OTP_BOT_TOKEN` and `TELEGRAM_OTP_HASH_SECRET`; it does not need an additional bot or database.
