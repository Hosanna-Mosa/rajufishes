# rajufishes: Build rounds

Every round ends with a commit and a push to the private GitHub repo (cloud sessions are temporary). Commit messages are plain. Each round has a "What to check" list written for the family to try without reading code.

Rule for every round: before choosing details for the web app, read the docs inside `web/node_modules/next/dist/docs/` once Next.js is installed, because the latest version may differ from what is assumed here.

---

## Round 0: Planning (this round)
README, PLAN, ROUNDS, PHOTOS, DECISIONS, .gitignore, .env.example. No code.

**What to check:** read `docs/DECISIONS.md` and say yes or change the defaults. Look at the page list in PLAN.md and tell me if anything is missing.

---

## Round 1: Setup, API, database models, seed data (DONE)
- Create `api/` (Express + TypeScript) and `web/` (Next.js + TypeScript, empty shell with design tokens).
- Connect to MongoDB Atlas. Check env values at start.
- All models from PLAN.md.
- Catalogue endpoints (`/products`, `/products/:slug`, `/market`, `/delivery/check`) and `/health`.
- Pricing and delivery-zone services with tests (pincode matching, free-over rule, fresh restriction).
- Seed script: the 12 sample products from the designs (7 fresh, 3 dry, 2 frozen), 5 market-board items, the "All India" zone, settings, a sample coupon (WELCOME10), one admin user from env. Works with the in-memory database and with Atlas.
- Also built early: customer OTP sign in, orders with stock hold and release, Razorpay verify and webhook (mock ids in development), and the admin API (login, products, market, orders, zones, settings, coupons). Rounds 3 and 4 build the screens on top.
- Tests: pricing, stock hold and release, OTP (`npm test`).
- Rate limit, validation, helmet, CORS set up from day one.

**What to check:**
- I can run the API and open `/health` and see "ok".
- `/products` shows the 12 sample products with sample prices.
- `/delivery/check?pincode=500001` says delivery is available with the sample charge and free-over amount.
- A wrong pincode (5 digits, letters) gives a clear error.
- No `.env` file is in GitHub.

---

## Round 2: Customer site: home, all products, product (DONE)
- Boat Paint look from designs G, H, I, built as proper components (header, footer, stripe band, price tag, product card, market panel). Fully responsive, since the designs are desktop only: check at 390 px and 1440 px, big headings scaled down on phones.
- Home with live "Today's market" panel and product grid from the API.
- All products: category filter with counts, sort, paging, pincode check.
- Product page: gallery, cut and weight choosers that change the price, quantity, pincode check, "You may also like".
- Cart stored in the browser (choices only) with the header cart count; Add buttons work; cart page comes in Round 3.
- Placeholder striped image boxes stay until real photos exist; real images appear automatically when a product has them.
- Page titles and descriptions per page.

**What to check:**
- Home, All products and a product page look like the designs on my laptop and on my phone.
- Changing cut or weight changes the price on the product page.
- Filters and sort change the list. Page 2 works.
- Dry and frozen items show a pack price, fresh shows a price per kg.
- Prices on the Today's market panel match the products.
- Typing a pincode shows delivery or "not delivered".

---

## Round 3 (DONE): Cart, checkout, payments, orders, account, sign in
- Cart page (J): lines, quantity, remove, free-delivery bar, coupon, summary, all priced by the server.
- Sign in (M): phone + 6 digit OTP, with the fixed test code in development. SMS provider connected behind a switch, left off until the family picks one.
- Checkout (K): details, address, delivery slot, payment choice. Guest checkout or signed in. Saved address picker for signed-in customers.
- Razorpay in test mode: create order, pay, verify signature, webhook. Cash on delivery.
- Order placed page. Stock reduction, 30 minute hold, auto-cancel for unpaid online orders.
- Account (L): orders with status strip, track order page, saved addresses, profile, sign out, order again.
- Coupons applied in cart and checkout.

**What to check:**
- Sign in with my phone number and the test code 123456 (development only).
- Add two products, apply a sample coupon, go to checkout and place a COD order. It appears in My orders as "Placed".
- Do the same with Razorpay test card. A paid order shows "Paid online". Closing the payment window leaves it unpaid and I can try again.
- A cart under ₹999 shows a delivery charge. Over ₹999 shows Free.
- Trying to change the price in the browser does not change what is charged.
- Guest checkout works and the order can be tracked from the link.
- Cancelling a placed order puts the stock back.

---

## Round 4 (DONE): Admin panel
- Must work on a phone (the owner updates prices from the market stall). Check at 390 px as well as desktop.
**Design first.** There is no admin design yet. Before any admin code, I design these admin pages in the same Boat Paint style (dashboard, market board, products list and form, orders list and detail, delivery zones, coupons, login) as static pages in `design/`, and show them to the family. Build starts only after a yes or changes.

Then build:
- Admin login (JWT, roles owner and staff).
- Products: add, edit, hide, price, stock, cuts, weights, image upload (Cloudinary).
- Today's market price board with one Save.
- Orders: list, filters, detail, status change, notes, COD collected, refund, pick list print.
- Delivery zones and charges, pincode tester, fresh-fish city switch.
- Coupons.

**What to check:**
- Log in as admin; a wrong password is refused and repeated tries are slowed.
- Change today's seer fish price on the market board, save, and see it on the home page.
- Add a new product with a photo and see it in the shop.
- Set stock to 0 and see "Sold out" on the shop; order is blocked.
- Move an order from placed to packed to shipped to delivered; the customer's account strip follows.
- Add a zone for one city with a lower charge and check a pincode in that city.
- Turn on "fresh fish only to chosen cities" and see fresh items blocked for other pincodes; turn it off again.
- Staff login cannot open Delivery or Coupons.

---

## Round 5 (DONE, nothing deployed): Images, polish, performance, SEO, deploy plan, launch checklist
- Real photos in Cloudinary following `docs/PHOTOS.md`: automatic sizing and format, lazy loading, blur placeholder.
- Polish: empty states, error messages, loading states, 404 page, keyboard and screen reader basics, tap size on phones, readable contrast.
- Performance: page speed check on a mid-range phone and slow network, caching of catalogue pages, small JavaScript.
- SEO basics: titles, descriptions, Open Graph image, product structured data, sitemap, robots, clean URLs. Google Business listing note for the stall.
- Deploy plan written and tried on a staging setup:
  - Frontend: Vercel (default) for `web/`.
  - API: Render or Railway (default) for `api/`, always-on instance with the scheduled job.
  - Database: MongoDB Atlas (start on the shared tier, move up when orders grow; backups on).
  - Images: Cloudinary free plan to start.
  - Domain and email, HTTPS, environment variables per host.
- Launch checklist (below).

**What to check:**
- Product pages show real photos, load fast on my phone, and look sharp.
- Searching the shop name on Google (after launch) shows a proper title and description.
- The staging site works end to end with test payment.
- Every item in the launch checklist is ticked.

### Launch checklist
- [ ] Domain bought and pointed; HTTPS works
- [ ] Razorpay account KYC done; live keys in host settings (not in git); one real ₹1 payment tested and refunded
- [ ] SMS provider approved (sender and OTP template registered as India requires); OTP mode set to live; fixed test code confirmed off
- [ ] Production Atlas cluster, backups on, IP allow list set, separate from development data
- [ ] Admin owner password changed from the seed; staff accounts added
- [ ] Real products, prices, stock and photos entered
- [ ] Delivery zones and charges confirmed by the family; fresh-fish rule decided
- [~] Terms, delivery terms, refund and contact details: drafts written, family must edit (see docs/LAUNCH.md)
- [ ] FSSAI and any other food licence details shown if required (family to confirm)
- [ ] Test orders: COD, online, cancel, refund, guest track
- [ ] Order alert to family (email or WhatsApp) tested: NOT BUILT yet
- [ ] `npm audit` clean of serious issues; no secrets in git history
- [ ] Error monitoring and uptime check on
- [~] Phone and tablet widths checked in a browser; slow-network checked with throttling for layout shift
