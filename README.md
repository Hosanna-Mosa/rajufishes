# rajufishes

An online fish store for our family's fishing business, Raju Fishes. We now sell from a market stall. This site lets customers all over India order online.

**What we sell:** fresh fish, prawns and crab, dry fish, and frozen packs. No pickles or masala.

**What the site does:**
- Product pages, cart, and checkout with online payment (Razorpay) or cash on delivery.
- Customers sign in with their phone number and a one-time code (OTP). Guests can also check out.
- Customers can track their orders and save addresses.
- A simple admin panel for the family: products, today's market prices, orders, delivery areas and charges, coupons.
- English only. Fast and simple. No launch date yet.

**Status:** Round 0 (planning). No code yet. See `docs/ROUNDS.md` for the build plan.

## Look

The chosen design is "Boat Paint". The pages are in `design/` (G home, H all products, I product, J cart, K checkout, L account, M sign in). The site must reuse that look exactly: Big Shoulders Stencil Display + Archivo fonts, hull blue `#0A5C8F`, yellow `#F4B400`, red `#D7342A`, ink `#10202B`, hard 3px borders with solid shadows, the red pennant price tag, the "Today's market" panel and the white-and-red stripe bands.

## Stack

| Part | Choice |
|---|---|
| Customer site + admin | Next.js (latest) with TypeScript, in `web/` |
| API | Express with TypeScript, in `api/` |
| Database | MongoDB Atlas |
| Admin login | JWT |
| Customer login | Phone number + OTP (fixed test code in development) |
| Images | Cloudinary |
| Payments | Razorpay (test mode first) and cash on delivery |

## Folders

```
web/      Next.js site: customer pages and /admin
api/      Express API, models, seed script
design/   The chosen Boat Paint design pages (reference only)
docs/     PLAN.md, ROUNDS.md, PHOTOS.md, DECISIONS.md
```

## How to run (from Round 1 onward)

You need Node.js 20 or newer. In development no database account is needed: with `MONGODB_URI` empty, a temporary in-memory MongoDB is used (data resets on restart). To use MongoDB Atlas, put its connection string in `api/.env`.

1. Copy `.env.example` into `api/.env` (API section) and `web/.env.local` (web section). Never commit these files.
2. From the project root:
   ```
   npm run setup    # installs root, api and web
   npm run dev      # API on http://localhost:4000, web on http://localhost:3000
   npm run seed     # only needed with a real database (the in-memory one seeds itself)
   npm test         # API tests
   ```
4. In development the OTP code is always the fixed test code from `.env` (`OTP_TEST_CODE`). No SMS is sent. Razorpay runs in test mode with test keys.

Until Round 1 is done these commands do not exist yet.

## Docs

- `docs/PLAN.md`: pages, data models, API, order flow, admin, delivery rules, security.
- `docs/ROUNDS.md`: the build in rounds, with a "what to check" list for each.
- `docs/PHOTOS.md`: how to photograph our own fish with a phone.
- `docs/DECISIONS.md`: open questions with a recommended default for each.

## Admin panel (Round 4)
Open http://localhost:3000/admin after `npm run dev`. Test logins come from `.env.example` (development only):
- Owner: `owner@rajufishes.test` / `dev-admin-pass-123`
- Staff: `staff@rajufishes.test` / `dev-staff-pass-123`

Restart the API to reset the test data. Photos are saved to `api/uploads/` (labelled test mode) until the three `CLOUDINARY_*` keys are set. Refunds are simulated until the Razorpay keys are set. Never commit real keys.
