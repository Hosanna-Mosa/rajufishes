# Decisions

## Accepted in Round 1
- **Delivery:** one "All India" zone, flat ₹60 (sample), free over ₹999 (sample), counted on the subtotal before any coupon. The fresh-fish city limit is a setting, off by default.
- **SMS:** MSG91 (stub until Round 3; development uses the fixed test code).
- **Payment fees:** Razorpay fee absorbed by the business. COD everywhere.
- **Guest checkout:** allowed; guests track an order by a private link.
- **Stock:** a number per product, held 30 minutes during online payment, put back on cancel or expiry.
- **Pricing:** each product is per kg or per pack. "Prawns and crab" is a display group on top of fresh, dry and frozen.
- **"Boats" nav link** becomes an About page.
- **Responsive (overrides the desktop-only designs):** customer site works at 390 px and 1440 px; the admin panel also works on a phone. Boat Paint look kept, big headings scaled down on phones, full state list at checkout.

## Still open

Each item has a recommended default. If the family says nothing, the default is used.

## 1. Delivery area and charges
- **Open:** where do we deliver, what do we charge, and can fresh fish travel that far?
- **Recommended default:** one zone "All India", flat ₹60 (sample), free over ₹999 (sample), 3 day ETA, COD allowed. Fresh fish limited to chosen cities is **off**. Dry and frozen go everywhere.
- **Why:** it matches the designs and lets us launch. Zones can be added later in admin without code.
- **Needs from the family:** the real flat charge, the free-over amount, which cities can get fresh fish the same or next day, and which courier is used (frozen and fresh need cold packing and a courier that handles it).
- **Related:** is the charge counted before or after a coupon? Recommended: before the coupon (on subtotal).

## 2. SMS provider for OTP
Options (do not sign up yet):
- **MSG91:** India-focused SMS provider with OTP tooling and DLT support; simple API; usually the cheapest for India.
- **Twilio (Verify):** global, very good developer tools and reliability, costs more per SMS in India, still needs India DLT registration for local delivery.
- **Others to know:** Fast2SMS and Firebase Phone Auth (Firebase ties login to Google's system, which we do not want here).
- **Recommended default: MSG91.** In development the fixed test code is used, no SMS is sent.
- **Note:** India requires the sender and the OTP message template to be registered (DLT) before SMS reaches phones. This can take days. Start it early, before Round 5.

## 3. Payment fees
- **Open:** who pays Razorpay's fee?
- **Recommended default:** the business absorbs it, and prices stay the same for online and COD. Razorpay normally charges a small percentage per online payment (around 2%, plus GST on the fee, and the rate varies by method; check Razorpay's pricing page and our account at signup). Test mode is free.
- **COD note:** COD has its own cost (failed deliveries, cash handling). Recommended: allow COD in every zone, with an optional cap on COD order size (setting `codMaxTotal`, off by default) if we see abuse.
- **Refunds:** refund to the original payment method through admin; Razorpay's fee on the original payment may not come back (confirm in their terms).

## 4. Domain name
- **Open:** the web address.
- **Recommended default:** a `.in` or `.com` of the shop name, e.g. `rajufishes.in` or `rajufishes.com`. Check what is free before choosing. Buy only after the family agrees, on an account owned by the family, not by a developer.
- **Also:** a business email on the domain for Razorpay and customer mail.

## 5. Stock approach
- **Open:** how do we track how much fish is left? Fresh fish changes daily and a market stall sells the same fish at the same time.
- **Recommended default:** a simple number per product (kg for fresh, packs for dry and frozen).
  - It goes down when an order is placed (COD) or when payment starts (online, held 30 minutes).
  - It goes back up when an order is cancelled or an unpaid online order expires.
  - Family updates the numbers each morning on the market board.
  - A "do not track" switch per product for items that are always available (e.g. dry fish).
  - Because the stall sells the same fish, leave a small safety margin: show a product as sold out when stock is at or below a set level (default 0, family may raise it).
- **Not now:** real-time stall-to-website stock sync, or automatic warehouses.

## 6. Smaller items (defaults will be used)
- **"The boats" page** (the home nav link, no design): recommended default is to replace it with a small About page (photos of the boats and family, from the extras in PHOTOS.md), built in Round 5.
- **Guest checkout:** allowed (the sign-in design offers it). Guests track orders by a private link sent after ordering. Recommended: yes.
- **Where to get order alerts:** recommended email to a family address in Round 3, WhatsApp later.
- **Same fish, different cut price:** cuts carry an optional extra price per kg, default ₹0.
- **Minimum order:** none by default (zone setting exists).
- **Licences:** the family confirms the food licence (FSSAI) details to show on the site before launch.
- **Returns:** fresh fish is not returnable except for a quality problem; refund by photo within a few hours of delivery. The family writes the final wording.
