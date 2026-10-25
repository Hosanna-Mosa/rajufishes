# Analytics: counting visitors and seeing the numbers

Two separate things, both free:

1. **Counting.** The shop tells Google Analytics (through Firebase) when someone looks at a fish, adds it to the cart, buys, and so on. No names, phone numbers, emails, addresses or full pincodes are ever sent.
2. **Reading.** The admin page **Analytics** (owner login only) reads those counts back from Google and shows them next to your exact orders and money.

If you do nothing, the shop works normally. The Analytics page then shows a "Connect analytics" card, and the orders and revenue on it are still exact, because they come from our own database.

---

## Part 1. Counting visits (about 10 minutes)

1. Go to the Firebase console and press **Add project**. Name it for example `raju-fishes`.
2. When it asks about Google Analytics, keep it **on** and pick or create an Analytics account.
3. Inside the project, press the **web icon `</>`** to add a web app. Name it `shop`. Skip hosting.
4. Firebase shows a block of settings called `firebaseConfig`. Copy each value into `web/.env.local`:

   | In firebaseConfig | In `web/.env.local` |
   | --- | --- |
   | `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
   | `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
   | `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
   | `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |
   | `measurementId` | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` |

   All seven are needed. If one is missing the shop quietly counts nothing.
5. Put the same seven values in the settings of the place that hosts the website. Restart or redeploy it.

Visits are only counted on the live site. On your own computer nothing is counted, unless you add `NEXT_PUBLIC_ANALYTICS_DEV=1` to `web/.env.local` for testing.

### What visitors see
A small bar at the bottom: "We use cookies to count visits." with **OK** and **Decline**. Counting starts only after OK. The choice is remembered in their browser. The wording is in one file, `web/lib/analyticsCopy.ts`. The Privacy page explains this in plain words too.

### Who is never counted
The admin pages, and any browser where an owner or staff member has signed in to the admin. So your own clicks do not pollute the numbers.

---

## Part 2. Reading the numbers in the admin (about 15 minutes)

1. In Google Cloud (console.cloud.google.com), open the **same project** Firebase made. Go to **APIs and services > Library**, search **Google Analytics Data API** and press **Enable**.
2. Go to **IAM and admin > Service accounts > Create service account**. Name it `analytics-reader`. It needs no roles here. Press Done.
3. Open that service account, tab **Keys > Add key > Create new key > JSON**. A file downloads. **Treat it like a password.** Do not put it in the project folder, do not email it, never commit it. (`.gitignore` blocks common names, but keep it somewhere else anyway.)
4. Copy the service account's email address (it looks like `analytics-reader@raju-fishes.iam.gserviceaccount.com`).
5. Open **analytics.google.com > Admin > Property access management > +** and add that email with the role **Viewer**.
6. On the same Admin screen open **Property details** and copy the **Property ID** (digits only). This is `GA4_PROPERTY_ID`.
7. Turn the key file into one line of text. On a Mac, in Terminal:

   ```
   base64 -i <file> | tr -d '\n' | pbcopy
   ```

   Replace `<file>` with the key file's path (you can drag the file into Terminal to type the path). Nothing prints; the text is now on your clipboard. Paste it as the value of `GA_SERVICE_ACCOUNT_JSON_BASE64`.
8. Put both values in `api/.env`:

   ```
   GA4_PROPERTY_ID=123456789
   GA_SERVICE_ACCOUNT_JSON_BASE64=<paste here>
   ```

   and in the settings of the place that hosts the API. Restart the API. Then delete the downloaded key file, or keep it in a password manager.

Open **Admin > Analytics**. If something is wrong the page says so in the "Connect analytics" card and the rest of the shop is unaffected. The most common causes: the Data API is not enabled, the service account was not added as Viewer, or the Property ID is wrong.

Google's numbers appear after a delay of a few hours, except "Users online now", which is live. The API remembers each answer for 60 seconds (30 for "online now"), so pressing refresh quickly does not change anything.

---

## Where each value goes

| Value | Local | Hosting |
| --- | --- | --- |
| 7 `NEXT_PUBLIC_FIREBASE_*` values | `web/.env.local` | web host |
| `NEXT_PUBLIC_ANALYTICS_DEV` | `web/.env.local` (testing only) | leave out |
| `GA4_PROPERTY_ID` | `api/.env` | API host |
| `GA_SERVICE_ACCOUNT_JSON_BASE64` | `api/.env` | API host |

Never put the last one in a file that is committed.

---

## Every event, and when it fires

Names are Google's standard ones, currency is INR, and items carry `item_id`, `item_name`, `item_category`, `price`, `quantity`. The code for all of them is in `web/lib/analytics.ts`.

| Event | When |
| --- | --- |
| `page_view` | Every page change (order pages show as `/orders/:id`, no real ids) |
| `select_item` | A product card is opened from a list |
| `view_item` | A product page is opened |
| `search` | Search results appear for what someone typed |
| `add_to_cart` | Add button on a card or product page |
| `remove_from_cart` | An item is removed from the cart |
| `view_cart` | The cart page is opened (once per visit to it) |
| `begin_checkout` | The checkout page is opened (once) |
| `add_shipping_info` | Place order is pressed, with the delivery slot |
| `add_payment_info` | Place order is pressed, with COD or online |
| `purchase` | The order confirmation, once per order: `transaction_id` is the order number, plus value, shipping, items. Online orders only count once paid |
| `sign_up` / `login` | An account is made / someone signs in (method: email or phone) |
| `pincode_check` | A pincode check finishes: result `ok` or `not_deliverable`, never the pincode |
| `tab_filter` | A category tab is chosen |
| `contact_click` | WhatsApp or Call is tapped on the contact page |

**Never sent:** names, phone numbers, emails, addresses, full pincodes, tracking links, order ids in page addresses. Google's default IP anonymising stays on.

---

## Checking that it works (DebugView)

1. Add `NEXT_PUBLIC_ANALYTICS_DEV=1` to `web/.env.local` and restart the web server.
2. In Chrome install the extension **Google Analytics Debugger** and turn it on.
3. Open the shop, press **OK** on the cookie bar, then click around.
4. In Firebase: **Analytics > DebugView**. Your events appear within seconds, in order.
5. Remove `NEXT_PUBLIC_ANALYTICS_DEV` when done.

Without the extension you can also open Chrome's Network tab and look for requests to `google-analytics.com/g/collect`; each one carries an `en=` event name.
