# rajufishes: Plan

Round 0 planning document. Nothing here is built yet. Where a detail is a guess, it is marked **default** and listed in `DECISIONS.md`.

## 1. Pages and routes

### Customer site (`web/`)

| Route | Page | Design | Notes |
|---|---|---|---|
| `/` | Home | G | Hero, "Today's market" panel (live prices from the price board), "Everything we sell" grid, red stripe band, footer. |
| `/products` | All products | H | Filters: category, "Delivers to" pincode check, sort. Query params: `?category=&sort=&page=`. Paged. |
| `/products/[slug]` | Product | I | Gallery, cut and weight choosers, quantity, Add to cart, Buy now, pincode check, "You may also like". |
| `/cart` | Cart | J | Lines, free-delivery progress bar, coupon box, order summary. |
| `/checkout` | Checkout | K | Details, address, delivery slot, payment (online / COD), order summary. |
| `/order/[orderNo]/thanks` | Order placed | not designed | Simple confirmation. Needed after payment. Built in Boat Paint style from existing parts. |
| `/account` | Account, Orders tab | L | Redirects to `/account/orders`. |
| `/account/orders` | Your orders | L | Each order: packed, shipped, delivered strip, Track order, Order again. |
| `/account/orders/[orderNo]` | Track order | not designed | Status timeline, items, address, payment. Also reached by guests with a signed link. |
| `/account/addresses` | Saved addresses | L | Add, edit, remove, set default. |
| `/account/profile` | Profile | L has the tab, no content | Name, email, phone (read only). |
| `/sign-in` | Sign in | M | Phone, send code, 6 digit code, verify. "Check out as a guest" link. |
| `/the-boats` | The boats | G nav link, no design | Recommend dropping or turning into a small About page. See DECISIONS. |
| `/terms`, `/delivery-terms` | Text pages | not designed | Linked from checkout text. Plain text in the same layout. |

Shared layout parts, all from the designs: red top bar (12px), header (logo, Fresh / Dry / Frozen / Account, Cart count), blue page banner with white and red stripe bands, red "All-India delivery" band, ink footer.

### Admin (`web/app/admin`, no design yet, designed first in Round 4)

| Route | Page |
|---|---|
| `/admin/login` | Email and password |
| `/admin` | Dashboard: new orders today, low stock, unpaid online orders |
| `/admin/market` | Today's market price board |
| `/admin/products` | Product list with search and active filter |
| `/admin/products/new`, `/admin/products/[id]` | Add or edit product |
| `/admin/orders` | Orders list with filters |
| `/admin/orders/[id]` | Order detail, status change, notes, print pick list |
| `/admin/delivery` | Delivery zones, charges, free-over limit, fresh-fish city setting |
| `/admin/coupons` | Coupons list, add, edit |

## 2. Database models (MongoDB, Mongoose)

All money is stored as whole **paise** (integer), never decimals. Razorpay also uses paise. Show rupees in the UI only. All documents have `createdAt` and `updatedAt`.

### Product
- `name` string
- `slug` string, unique
- `category` enum: `fresh` | `dry` | `frozen`
- `group` string: display group such as "Fresh fish", "Prawns and crab", "Dry fish", "Frozen packs" (the design's filter has four boxes; the three-way `category` still drives the card colour)
- `description` string
- `unit` enum: `kg` | `pack`. `kg` = price is per kg and the customer picks a weight. `pack` = fixed pack sold at one price.
- `price` int paise: per kg when `unit=kg`, per pack when `unit=pack`
- `packWeightG` int, only for `unit=pack` (e.g. 250, 500)
- `cuts` array of `{ name, priceDeltaPerKg }` (e.g. Steaks, Whole, Fillet; delta default 0). Empty means no cut choice.
- `weights` array of grams, only for `unit=kg` (e.g. 500, 1000, 2000)
- `stock` number. Meaning follows `unit`: kilograms in stock when `kg`, packs in stock when `pack`.
- `trackStock` boolean (default true). Off means "always available".
- `images` array of `{ url, publicId, alt }`. First is the main image.
- `note` string: short card line (e.g. "Cut fresh, 500 g")
- `landedAt` date, optional: when today's catch arrived. Drives "Landed today first" sort and "landed 5:40 AM".
- `marketListed` boolean, `marketOrder` int: shows in the home "Today's market" panel
- `active` boolean (hidden from shop when false)
- `isFreshFish` derived from `category === "fresh"`; used by the fresh-city delivery rule.

### Customer
- `phone` string (10 digits, stored normalised, unique)
- `name`, `email` (optional)
- `defaultAddressId`
- `lastLoginAt`
- OTP records live in a separate small collection `OtpCode`: `phone`, `codeHash`, `expiresAt`, `attempts`, `usedAt`. A TTL index removes old rows.

### Address
- `customerId` (null for guest order snapshots, which are stored inside the order instead)
- `label` (Home, Work), `name`, `phone`
- `line1` (house number and street), `line2` (area and landmark)
- `city`, `state`, `pincode` (6 digits)
- `isDefault`

### Order
- `orderNo` string, human number like `0421` (from a counter), unique
- `customerId` (null for guests), `guestPhone`
- `contact` `{ name, phone, email }`
- `shippingAddress` snapshot (same fields as Address, copied so later edits do not change old orders)
- `zoneId`, `zoneName` snapshot
- `deliverySlot` enum: `tomorrow_morning` | `tomorrow_evening` (design K)
- `items` array of **OrderItem** (below)
- `subtotal`, `deliveryCharge`, `discount`, `total` (paise)
- `couponCode`
- `status` enum: `placed` | `packed` | `shipped` | `delivered` | `cancelled`
- `statusHistory` array of `{ status, at, by, note }`
- `payment` `{ method: "razorpay" | "cod", status: "pending" | "paid" | "failed" | "refunded" | "cod_due" | "cod_collected", razorpayOrderId, razorpayPaymentId, paidAt, refundId }`
- `trackingNote` (courier name / number, optional text)
- `adminNote`
- `cancelReason`

### OrderItem (embedded in Order)
- `productId`, `name`, `slug`, `image` (snapshots)
- `category`, `unit`
- `cut` string or null
- `weightG` int or null (for `kg` items); `packWeightG` for packs
- `qty` int
- `unitPrice` paise (price for one line unit after cut delta, calculated by the server)
- `lineTotal` paise

### Coupon
- `code` string, unique, uppercase
- `type` enum: `percent` | `flat`
- `value` number (percent, or paise for flat)
- `maxDiscount` paise (cap for percent), optional
- `minSubtotal` paise
- `startsAt`, `endsAt`
- `usageLimit`, `usedCount`, `perCustomerLimit` (default 1)
- `active`

### DeliveryZone
- `name` (e.g. "All India", "Hyderabad", "Chennai")
- `match` `{ pincodes: [string], pincodePrefixes: [string], states: [string] }` (any match counts)
- `isDefault` boolean (the catch-all, "All India")
- `charge` paise (flat sample default ₹60 = 6000, **sample**)
- `freeOver` paise (sample default ₹999 = 99900)
- `minOrder` paise (default 0)
- `etaDays` int
- `codAllowed` boolean
- `freshAllowed` boolean (can this zone get fresh fish)
- `active`

### Settings (single document)
- `restrictFreshToZones` boolean, **default false**. When true, fresh products only ship to zones with `freshAllowed`.
- `freshOnlyMessage` string shown when blocked
- `codMaxTotal` paise (optional cap on COD orders)
- `deliverySlots` list (the two slots above)
- `orderCounter` number
- `stallPhone`, `whatsapp` (for the footer / help text)

### AdminUser
- `email`, `passwordHash` (bcrypt), `name`
- `role` enum: `owner` | `staff` (staff cannot change delivery, coupons, or admins)
- `active`, `lastLoginAt`

## 3. API endpoints

Base path `/api`. JSON. Customer auth = httpOnly cookie with a customer JWT. Admin auth = separate httpOnly cookie with an admin JWT. "Public" needs no login.

### Public catalogue
- `GET /products` query: `category`, `group`, `q`, `sort`, `page`, `limit`
- `GET /products/:slug`
- `GET /market` today's market board (listed products with price and stock)
- `GET /delivery/check?pincode=` returns zone, charge, free-over limit, ETA, COD allowed, fresh allowed

### Cart and pricing
- `POST /cart/quote` body: items (`productId`, `cut`, `weightG`, `qty`), `couponCode`, `pincode`. Returns priced lines, subtotal, delivery, discount, total and any problems. The server always re-prices. The browser cart (localStorage) only stores choices, never prices.
- `POST /coupons/validate`

### Customer auth
- `POST /auth/otp/send` body: `phone`
- `POST /auth/otp/verify` body: `phone`, `code`. Sets cookie.
- `POST /auth/logout`
- `GET /me`, `PATCH /me`
- `GET /me/addresses`, `POST /me/addresses`, `PATCH /me/addresses/:id`, `DELETE /me/addresses/:id`

### Orders and payment
- `POST /orders` create order (signed-in or guest). Body: contact, address, slot, items, coupon, payment method. Server re-prices, checks stock and delivery rules.
  - COD: order is saved as `placed`, payment `cod_due`.
  - Razorpay: order is saved as `placed` with payment `pending`, and a Razorpay order is created. Response includes `razorpayOrderId`, amount, key id.
- `POST /payments/razorpay/verify` body: razorpay ids and signature. Server checks the signature, marks paid.
- `POST /payments/razorpay/webhook` (raw body, signature header). Backup for closed tabs.
- `GET /orders` (customer's own), `GET /orders/:orderNo`
- `GET /orders/track?orderNo=&token=` guest tracking by signed link
- `POST /orders/:orderNo/cancel` customer can cancel while status is `placed`

### Admin (all behind admin JWT)
- `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me`
- `GET /admin/dashboard`
- Products: `GET /admin/products`, `POST /admin/products`, `GET /admin/products/:id`, `PATCH /admin/products/:id`, `PATCH /admin/products/:id/stock`, `PATCH /admin/products/:id/price`, `DELETE /admin/products/:id` (soft: sets inactive)
- Market board: `GET /admin/market`, `PUT /admin/market` (list of `{ productId, price, stock, landedAt, order }`)
- Images: `POST /admin/uploads/sign` (returns a Cloudinary signed upload; the browser uploads straight to Cloudinary)
- Orders: `GET /admin/orders` (filters: status, payment, date, search), `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`, `PATCH /admin/orders/:id/note`, `POST /admin/orders/:id/mark-cod-collected`, `POST /admin/orders/:id/refund` (Razorpay refund, owner only)
- Delivery: `GET/POST /admin/zones`, `PATCH/DELETE /admin/zones/:id`, `GET/PATCH /admin/settings`
- Coupons: `GET/POST /admin/coupons`, `PATCH/DELETE /admin/coupons/:id`
- Admin users (owner only): `GET/POST /admin/users`, `PATCH /admin/users/:id`

### Misc
- `GET /health`

## 4. Order flow and statuses

Statuses: **placed → packed → shipped → delivered**, or **cancelled** from placed or packed (shipped orders are cancelled only by the owner with a note). Status can only move forward in that order, except cancel.

Payment status is separate: `pending`, `paid`, `failed`, `refunded`, `cod_due`, `cod_collected`.

### Cash on delivery
1. Customer places order. Server re-prices, checks stock, delivery rule, and COD allowed for the zone (and the optional COD cap).
2. Order saved: `status=placed`, `payment.status=cod_due`. Stock is reduced now.
3. Family packs it (`packed`), hands it over (`shipped`), delivery (`delivered`).
4. On delivery the admin taps "COD collected": `payment.status=cod_collected`.
5. Cancel: stock is put back.

### Razorpay (test mode first)
1. Customer picks "Pay online" and presses Place order. Server creates the order (`status=placed`, `payment.status=pending`) and a Razorpay order for the exact total in paise. Stock is **held** for 30 minutes.
2. Browser opens the Razorpay checkout window with the order id and public key id.
3. On success the browser sends the three Razorpay values to `/payments/razorpay/verify`. The server checks the HMAC signature with the secret key, then sets `payment.status=paid` and stores the payment id. This step is safe to repeat.
4. Backup: Razorpay's `payment.captured` webhook does the same thing, in case the tab closed. Webhook is verified with its own secret.
5. If payment fails or is closed, the order stays `pending`. The customer can retry from the order page. After 30 minutes an unpaid online order is auto-cancelled and the held stock is released (a small scheduled job).
6. Admin sees only paid online orders in the normal list. Unpaid ones show under a "Waiting for payment" filter.
7. Refund (cancelled paid order): admin presses Refund, server calls Razorpay refund, sets `payment.status=refunded`.

Customer-facing strip in the account design shows Packed / Shipped / Delivered. The page will also show "Placed" first and a clear "Cancelled" state, which the design does not show.

## 5. Admin features (simple)

- **Products:** add, edit, hide (active off), set price, set stock, choose cuts and weights, upload images (up to 5).
- **Today's market price board:** one screen listing all fresh products. For each: today's price per kg, kg left, landed time, and an on/off tick for the home panel. One Save button updates the home page.
- **Orders:** list with filters (status, paid/unpaid, date, search by number or phone), detail view, change status with one button, add a note, mark COD collected, refund, print a simple pick list.
- **Delivery zones and charges:** list of zones, each with pincode/prefix/state rules, charge, free-over limit, ETA, COD yes/no, fresh yes/no. A "Check a pincode" tester. Switch for "fresh fish only to chosen zones".
- **Coupons:** create percent or flat coupons, min order, dates, usage limit, on/off.

## 6. Delivery rules

**Pincode to zone.** A customer pincode is matched to a zone in this order, first hit wins:
1. exact pincode listed in a zone,
2. longest pincode prefix (6 digits, then 5, 4, 3 digits; e.g. `5000` or `500`),
3. state of the address,
4. the default zone (`isDefault`), which is "All India".

Each zone carries the charge, free-over limit, ETA, COD and fresh flags. So the family can later add "Hyderabad: ₹40, free over ₹499, fresh allowed" by adding one zone, with no code change.

**Defaults for now (all sample, to be confirmed):**
- One zone "All India": flat ₹60, free over ₹999, ETA 3 days, COD allowed, fresh allowed.
- Setting `restrictFreshToZones` is **off**. When turned on, fresh products can only be ordered for zones with `freshAllowed`. In that case the cart and checkout show a clear message per line ("Fresh fish is not delivered to this pincode. Remove it or choose dry or frozen items."), and the product page pincode check says so.
- The free-over limit is checked against the subtotal before any coupon (**default**, see DECISIONS).
- The cart and product pincode checks call `/delivery/check`; the final charge is always decided by the server at order time.

## 7. Folder structure (one repo)

```
rajufishes/
  README.md
  .gitignore
  .env.example
  design/                  chosen Boat Paint pages (reference, read only)
  docs/
    PLAN.md  ROUNDS.md  PHOTOS.md  DECISIONS.md
  api/
    package.json  tsconfig.json
    src/
      index.ts             server start
      app.ts               express app, middleware, routes
      config/              env check (fails fast if a key is missing), db connect
      models/              Product, Customer, Address, Order, Coupon, DeliveryZone, Settings, AdminUser, OtpCode
      routes/              catalogue, cart, auth, orders, payments, admin/*
      controllers/
      services/            pricing, delivery, otp, sms, razorpay, cloudinary, stock
      middleware/          auth (customer, admin), validate, rateLimit, errors
      jobs/                expire unpaid orders
      seed/                sample products, zones, settings, admin user
    tests/                 pricing, delivery, payment signature, order status
  web/
    package.json  tsconfig.json  next.config.ts
    app/
      (shop)/              page.tsx (home), products, cart, checkout, order, account, sign-in
      admin/               login, dashboard, market, products, orders, delivery, coupons
      layout.tsx
    components/            Header, Footer, StripeBand, PriceTag, ProductCard, MarketPanel, Button, forms
    lib/                   api client, cart store, money format, pincode helpers
    styles/                tokens.css (colours, fonts, borders, shadows)
    public/
```

Design tokens live in one file: fonts, the four colours (plus teal `#27B0A8` for fresh cards, `#F4B400` for dry, `#8CC4E8` for frozen as used in the designs), 3px border, solid shadows 6/7/10px, pennant clip-path.

## 8. Security basics

- **Validation:** every API body, query and param is validated with a schema (zod) before use. Reject unknown fields. Strings are trimmed and length-limited. Mongo operators in input are stripped (no `$` keys).
- **Server decides money:** the browser never sends prices or totals that are trusted. Every quote and order is re-priced from the database.
- **Rate limits:** OTP send (per phone and per IP, e.g. 3 per 10 minutes), OTP verify (5 attempts per code), login (admin), pincode check, order create, general API limit. 
- **OTP:** 6 digits, stored hashed, 5 minute expiry, single use, lock after 5 wrong tries. Fixed test code works only when `OTP_MODE=test` and never when `NODE_ENV=production` (server refuses to start with that combination).
- **Passwords:** admin passwords hashed with bcrypt. JWT in httpOnly, Secure, SameSite cookies. Short life (customer 30 days, admin 8 hours). Separate secrets for customer and admin.
- **Admin routes** check the admin JWT and role on every call, never only in the UI.
- **Payments:** verify Razorpay signature on the server with the secret key; verify webhook signature on the raw body; make handlers repeat-safe; amounts from the database only.
- **Headers and CORS:** helmet, CORS limited to the site's origin, body size limit.
- **Uploads:** Cloudinary signed uploads only, image types only, size cap. Admin only.
- **Secrets:** no secrets in git. `.env.example` has empty keys; `.env*` is git ignored. Server checks all required env values at start. Only `NEXT_PUBLIC_*` values reach the browser, and only the Razorpay key id.
- **Privacy:** phone numbers and addresses are personal data. Do not log them; mask phone in logs. Guest tracking uses a long random signed token, not the order number alone.
- **Dependencies:** lockfile committed, `npm audit` before launch.
- **Backups:** Atlas automated backups on (decision: tier).
