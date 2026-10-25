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

## 7. Choices made in Round 3
- **Prices come only from the API.** The browser stores choices (product, cut, weight, quantity); the cart, checkout and payment totals are quoted by the API each time, so editing a price in the browser changes nothing.
- **Cart:** kept in the browser; on sign-in it is merged into the account cart (same item adds up, up to 50 each) and saved there while signed in.
- **Order placed page is also the tracking page** (`/orders/<no>`). Guests use the private link with a signed token; `/track?orderNo=&token=` redirects to it. The cart is cleared when the order is created.
- **Online payment:** the order is created first, then the payment opens. Closing the window leaves it unpaid and retryable for 30 minutes (stock held); after that it cancels itself and the stock returns.
- **Mock payments:** when `RAZORPAY_KEY_ID` is empty (not production) a clearly labelled test window signs a payment with a dev-only secret and goes through the real verify path.
- **SMS:** small provider interface; MSG91 is used only when `SMS_PROVIDER=msg91` and its keys are set. Otherwise the test code (123456, `OTP_MODE=test`).
- **Notifications:** `api/src/services/notify.ts` has empty "order placed" and "status changed" places for email or SMS later.
- **Delivery slots** come from `GET /api/meta/slots`. A quote without a pincode is marked `estimated`.

## 8. Choices made in Round 4
- **Admin sign in:** email and password, JWT in an httpOnly cookie (8 hours). Wrong passwords are refused and repeated tries slowed (8 per 15 minutes). Roles are `owner` and `staff`.
- **Roles are re-checked on every request**, so a removed or demoted staff member loses access at once. Staff cannot use Delivery, Coupons or Staff (the API refuses, and the menu hides them).
- **Staff:** the owner adds and removes staff and changes their passwords; everyone can change their own password. An optional dev staff login is seeded from `SEED_STAFF_EMAIL` and `SEED_STAFF_PASSWORD`.
- **Market board** lists every active product with a Shown/Hidden switch, price and stock, saved together with one Save button.
- **Cancelling needs a reason.** Cancelling returns stock. A cash order is marked collected by hand.
- **Refunds:** one refund per order, optional partial amount, reason required. Online refunds go through `refundPayment` in `api/src/services/razorpay.ts` (mock when keys are empty, real Razorpay call otherwise); cash refunds are recorded only.
- **Photos:** `api/src/services/uploads.ts` uploads to Cloudinary when its three keys are set. Otherwise (never in production) files go to `api/uploads/` and the product form shows a "TEST MODE" label. Only real JPG, PNG or WebP files (checked by content) up to 6 MB are accepted.
- **Status changes** call the notify stubs in `api/src/services/notify.ts`.
- **Admin never returns secrets** (no password hashes, keys or tokens in any response).
- **Printing:** packing slip per order and one pick list that adds up all new orders by product.

## 9. Choices made in Round 5
- **Policy pages** (Contact, Shipping, Cancellation and refunds, Privacy, Terms) are plain-English drafts with `[BRACKET]` placeholders. Business name, phone, email, address and hours are editable in Admin > Delivery > Shop details and fill the pages and footer (`GET /api/meta/contact`). The family must read and edit them (see `docs/LAUNCH.md`).
- **Startup checks:** in production the API collects every wrong or missing setting into one plain message and refuses to start. It refuses the fixed test OTP code, short or equal JWT secrets, a CORS origin that is localhost or ends with a slash, half-filled Razorpay or Cloudinary groups, and sample login values. This means production cannot start until MSG91 is approved.
- **Same domain for web and API.** Cookies are host-only and SameSite=lax, so the site and API must share a registrable domain (`www.` and `api.`). On the free `vercel.app` and `onrender.com` addresses sign in would not stick.
- **Owner setup in production** uses `npm run create-owner:prod` (owner login, "All India" zone, settings, no sample products), not the sample seed.
- **Health:** `/health` returns 503 when the database is down, so an uptime monitor catches it. Graceful shutdown on SIGTERM; indexes are synced at boot on a real database.
- **Indexes** added for catalogue queries (active/category/landedAt, group, market order) and orders (createdAt, status, customer, razorpay order id, phone). Admin product list is paginated.
- **Rate limit:** the global limit is 6000 per 15 minutes per IP because the website's server renders pages from one IP; a low cap blocked normal use. Login, OTP and checkout keep strict limits.
- **`/api/session`** returns 200 with `customer: null` when signed out, so the browser console has no 401 error on every page.
- **SEO:** titles, descriptions, canonical links, Open Graph image, favicon, sitemap (all products), robots (blocks admin, account, cart, checkout), Product structured data. `htmlLimitedBots: /.*/` keeps title and description in the page head for every visitor.
- **Images:** Cloudinary URLs get automatic format and quality, responsive `srcset`, lazy loading and a blurred tiny preview; the first image on a page loads eagerly.
- **Security headers** (nosniff, frame, referrer, permissions, HSTS in production). A strict Content-Security-Policy is left out on purpose: Razorpay's payment window and Cloudinary images make a wrong policy likely to break payments. Revisit with testing.
- **Layout shift:** `loading.tsx` is tall so the footer is never visible while the page loads; the display font uses `display: optional` to avoid a font swap jump.
- **Not built:** automatic order alerts to the family (email or WhatsApp). The notify stubs are still empty. The family must watch Admin > Orders until this is added.
