# Raju Fishes: launch guide for the family

This page is written for someone who does not write code. Read it from the top. Nothing here has been done yet: the site is **not** online and nothing has been signed up for. Every step below is for you to do when you are ready.

**How long it takes:** plan about **2 to 3 weeks** from today, mostly waiting for approvals (the SMS code approval and the payment account). Start those two first.

---

## 1. Before anything else: the pages you must read and edit

The shop has five pages that the payment company checks before it will let you take real money. They are in the footer of every page:

| Page | Address on the site |
|---|---|
| Contact us | `/contact` |
| Shipping and delivery policy | `/shipping` |
| Cancellation and refund policy | `/refunds` |
| Privacy policy | `/privacy` |
| Terms and conditions | `/terms` |

**These are plain-English drafts, not finished legal documents. The whole family must read every page and change it so it says what you really do.** Anything written in `[SQUARE BRACKETS]` is a gap you must fill (cut-off times, days closed, how many days a refund takes, your food licence number, your city for disputes, and so on). Do not publish with a bracket left in.

How to change them:

- **Your business name, phone, email, address and opening hours** go in the admin panel: **Admin > Delivery > Shop details and other settings**. Save once and the Contact page, the footer and the policies all update.
- **The wording** of the policies is in the code files `web/app/shipping/page.tsx`, `refunds`, `privacy`, `terms` and `contact` (the folder name is the page). Ask whoever looks after the code to change the sentences with you sitting beside them, or ask them to move the text into the admin panel if you want to edit it yourselves later.
- Have a lawyer or an accountant read the final version if you can. See section 8 for why.

---

## 2. What we use, and what each costs

| Job | Service | Cost to start |
|---|---|---|
| The shop pages people see | **Vercel** | Free "Hobby" plan is fine to start. Their rules say a shop that earns money should be on a paid plan, so plan for the paid plan (about US$20 a month) once you sell. |
| The server (orders, prices, logins) | **Render** (or Railway, similar) | The free plan sleeps when idle, which makes the first visit slow and can miss the 1-minute cleanup of unpaid orders. Use the paid "Starter" plan (about US$7 a month) so it is always on. |
| The database | **MongoDB Atlas** | Free "M0" is fine to start. Move to a paid size when orders grow. |
| Photos | **Cloudinary** | Free plan is enough to start. |
| Online payments | **Razorpay** | No monthly fee; they take a percentage of each payment. |
| SMS sign-in codes | **MSG91** | Pay per SMS. |
| Web address | A domain seller (GoDaddy, Namecheap, Google Domains successor, etc.) | About ₹800 to ₹1,500 a year for a `.in` or `.com`. |

Prices change, so check each site's price page on the day you sign up.

---

## 3. The one rule that surprises people: use your own domain for both halves

The shop has two halves that talk to each other: the **website** (Vercel) and the **server** (Render). Sign-in uses a cookie, and browsers only keep that cookie if both halves live under the **same domain**. So:

- Website: `https://www.yourshop.in` (and `https://yourshop.in` sends people to `www`)
- Server: `https://api.yourshop.in`

If you leave them on the free addresses (`something.vercel.app` and `something.onrender.com`), the shop pages will load but **customers will not be able to stay signed in**. Do step 6 (the domain) before you test sign in.

---

## 4. Accounts to create (in the family's name)

Use a **shared family email address** (like `rajufishes.family@gmail.com`) and not one person's private email, so the accounts survive if a person is away. Turn on two-step verification for every account. Write the logins in a notebook kept at home, not in WhatsApp.

Create, in this order: **MongoDB Atlas, Cloudinary, Razorpay, MSG91, Render, Vercel, the domain**.

Where each secret value lives is in section 5.

---

## 5. Click-by-click setup

Keep one empty text file open called "my values". Each service gives you something to copy. Paste it there with its name. **Never paste these values into WhatsApp, email, or GitHub.**

### 5.1 MongoDB Atlas (the database)

1. Go to **mongodb.com/atlas** and click **Try Free**. Sign in with the family email.
2. Create an **Organization** and a **Project** called `rajufishes`.
3. Click **Create** (or **Build a Database**). Choose **M0 Free**, provider **AWS**, region **Mumbai (ap-south-1)**. Name it `rajufishes`. Click **Create**.
4. A screen asks you to make a database user. Type a user name `rajufishes-app`. Click **Autogenerate Secure Password**, **copy it** into "my values", then click **Create User**.
5. On the same screen, "Where would you like to connect from?" choose **My Local Environment** and add IP address **0.0.0.0/0** with the note `Render`. (Render's address changes, so this is the usual choice. The password protects the database. When you pay for Render, you can narrow this to Render's fixed addresses.) Click **Finish**.
6. Click **Connect** next to your cluster, then **Drivers**. Copy the line that starts `mongodb+srv://`. It has `<password>` in it. Replace `<password>` with the password from step 4, and add the name `rajufishes` after the `.net/` like this:
   `mongodb+srv://rajufishes-app:YOURPASSWORD@cluster0.xxxxx.mongodb.net/rajufishes?retryWrites=true&w=majority`
   If the password has symbols like `@` or `#`, use the Atlas "Autogenerate" one (it avoids them).

   **This whole line is the value for `MONGODB_URI`.**

### 5.2 Cloudinary (photos)

1. Go to **cloudinary.com**, click **Sign up for free**, use the family email.
2. When asked, choose any option for "what are you building".
3. On the **Dashboard** (open **Programmable Media**), you will see a box **Product Environment Credentials** with **Cloud name**, **API Key**, and **API Secret** (click the eye to show it).
4. Copy:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

Photos you upload in the admin panel are sent here and shown on the site in the right size.

### 5.3 Razorpay (payments): first test mode, then live

1. Go to **razorpay.com** and **Sign Up**. Create the account in the name of the business or the person who will own the bank account.
2. In the dashboard, make sure the switch at the top says **Test Mode**.
3. Go to **Account & Settings > API Keys** (under "Website and app settings"). Click **Generate Test Key**.
   - **Key Id** (starts `rzp_test_`) → `RAZORPAY_KEY_ID` **and** `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - **Key Secret** (shown once, copy it now) → `RAZORPAY_KEY_SECRET`
4. Go to **Account & Settings > Webhooks > Add New Webhook**.
   - **Webhook URL:** `https://api.yourshop.in/api/payments/razorpay/webhook`
   - **Secret:** make up a long random phrase (20+ letters and numbers), write it in "my values". This is `RAZORPAY_WEBHOOK_SECRET`.
   - Tick the event `payment.captured` (the shop only listens for that one; ticking more does no harm). Save.
5. **Going live** needs "KYC" (Know Your Customer). Click **Activate Account** and complete it. Have ready:
   - PAN card of the business or owner; if a company or firm, its PAN too
   - Bank account number, IFSC and a cancelled cheque or bank statement
   - Address proof and ID of the owner (Aadhaar, passport, voter ID)
   - For a firm or company: registration papers and GST certificate, if you have GST
   - A **working website with the five policy pages**, because Razorpay reviews the site. This is why the pages in section 1 matter.
   - Product description, business category (food) and your FSSAI licence number if asked
6. Approval takes a few days. After it, switch the dashboard to **Live Mode** and repeat steps 3 and 4 to make **live** keys (`rzp_live_`). Put the live keys into Render and Vercel in place of the test ones. Make a ₹1 real purchase on the site and then refund it from the admin panel to prove it works.

### 5.4 MSG91 (SMS sign-in code): start about 1 week early

In India, every business SMS must be registered ("DLT"). Approval takes days. Start this the day you decide to launch.

1. Go to **msg91.com** and sign up. Complete their KYC.
2. Register on a DLT portal (MSG91 will guide you; the common ones are Jio TrueConnect, Airtel, Vodafone Idea (Vi) and BSNL). Pay the one-time fee. You need your business PAN, address proof and an authorised person's ID.
3. On the DLT portal, register:
   - a **Header / Sender ID** of 6 letters, for example `RJFISH`
   - a **Content Template** for the sign-in code. For example: `{#var#} is your Raju Fishes sign-in code. Do not share it with anyone.`
4. In MSG91, open **SendOTP** (or **Flow**) and add the same template. Put the DLT template ID in it. Wait for the green "approved".
5. Copy:
   - **Auth Key** (Profile or Settings > Authkey) → `MSG91_AUTH_KEY`
   - **Template ID** of the approved OTP template → `MSG91_TEMPLATE_ID`
   - **Sender ID** (the 6 letters) → `MSG91_SENDER_ID`
6. Add some money to the MSG91 account so messages can send.

**The shop cannot start in "live" mode without these.** The server refuses to start with the fixed test code in production. That is on purpose, so nobody can log in as someone else with `123456`.

### 5.5 Render (the server)

1. Go to **render.com** and sign up with GitHub (the shop's code is in a private GitHub repository `rajufishes`). Allow Render to see that one repository.
2. Click **New + > Web Service**. Choose the `rajufishes` repository.
3. Fill in:
   - **Name:** `rajufishes-api`
   - **Region:** Singapore (the closest to Mumbai)
   - **Branch:** `main`
   - **Root Directory:** `api`
   - **Runtime:** Node
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Starter (paid, always on)
   - **Health Check Path** (under Advanced): `/health`
4. Under **Environment Variables**, click **Add** for each row in this table:

| Name | Value | Where it comes from |
|---|---|---|
| `NODE_ENV` | `production` | type it |
| `MONGODB_URI` | the long `mongodb+srv://…` line | step 5.1 |
| `CUSTOMER_JWT_SECRET` | a long random string, 40+ characters | make one: open **bitwarden.com/password-generator** or any password manager and make a 48-character password |
| `ADMIN_JWT_SECRET` | another, **different**, long random string | same way. Must not match the one above. |
| `CORS_ORIGIN` | `https://www.yourshop.in` | your website address, with `https://`, **no slash at the end**. If you also want the bare domain, put both with a comma between: `https://www.yourshop.in,https://yourshop.in` |
| `CLOUDINARY_CLOUD_NAME` | | step 5.2 |
| `CLOUDINARY_API_KEY` | | step 5.2 |
| `CLOUDINARY_API_SECRET` | | step 5.2 |
| `RAZORPAY_KEY_ID` | `rzp_test_…` first, `rzp_live_…` later | step 5.3 |
| `RAZORPAY_KEY_SECRET` | | step 5.3 |
| `RAZORPAY_WEBHOOK_SECRET` | the phrase you made | step 5.3 |
| `OTP_MODE` | `live` | type it |
| `SMS_PROVIDER` | `msg91` | type it |
| `MSG91_AUTH_KEY` | | step 5.4 |
| `MSG91_TEMPLATE_ID` | | step 5.4 |
| `MSG91_SENDER_ID` | | step 5.4 |

   Do **not** add `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` or `PORT`. Render sets the port by itself.

5. Click **Create Web Service**. Watch the log. If it fails, the log tells you in plain words which setting is wrong or missing ("The API cannot start. Please fix these settings: …"). Fix it under **Environment** and Render restarts.
6. When it says **Live**, open `https://YOUR-NAME.onrender.com/health`. You should see `{"status":"ok", …}`.
7. **Create the owner login (one time).** In Render open your service, click **Shell** (top right), and type, using your own email and a long password (10+ characters, no sample password):

   ```
   OWNER_EMAIL=you@example.in OWNER_PASSWORD='a long password only you know' npm run create-owner:prod
   ```

   It says "Owner login created". This adds your login, one delivery area "All India" and the settings. **It does not add the sample products.** Close the Shell. Add staff later from Admin > Staff.
8. Add your domain: **Settings > Custom Domains > Add**, type `api.yourshop.in`. Render shows a **CNAME** record to add. See section 6.

### 5.6 Vercel (the website)

1. Go to **vercel.com**, sign up with GitHub.
2. Click **Add New > Project** and import the `rajufishes` repository.
3. Set **Root Directory** to `web` (click Edit next to it). Leave the rest as detected (Next.js).
4. Open **Environment Variables** and add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.yourshop.in` (no slash at the end) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.yourshop.in` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | same Key Id as in Render (test first, live later) |

5. Click **Deploy**. When it finishes, you get a `something.vercel.app` address to look at. Pages load but sign in only works once the domain is set up (section 3).
6. Add your domain: **Settings > Domains > Add** `www.yourshop.in`, and then also `yourshop.in` (choose "Redirect to www"). Vercel shows what records to add. See section 6.

> **Changing a value later:** change it in Render or Vercel under Environment, then press **Manual Deploy / Redeploy**. Values starting `NEXT_PUBLIC_` are baked into the site when it is built, so Vercel needs a redeploy after changing them.

---

## 6. Domain: buying it and connecting it

1. Buy the domain from a seller using the **family** account and the family email (not a friend's or the web developer's account). Turn on **domain lock** and **auto-renew**, and keep the renewal card up to date. If the domain lapses, someone else can buy it.
2. At the seller, open **DNS settings** for the domain. Add the records Vercel and Render showed you:
   - `www` → **CNAME** → the value Vercel gave (often `cname.vercel-dns.com`)
   - the bare domain (`@`) → the **A** record Vercel gave
   - `api` → **CNAME** → the value Render gave (looks like `rajufishes-api.onrender.com`)
3. Wait 10 minutes to a few hours. Vercel and Render show a green tick when it is ready, and they switch on the padlock (HTTPS) by themselves.
4. If you set `CORS_ORIGIN` and `NEXT_PUBLIC_*` before the domain was ready, they are already right as long as you typed the final addresses.

---

## 7. After it is online

### Backups
- **Atlas free (M0)** does not make automatic backups you can restore. Before launch, upgrade to the smallest paid size (M10) and switch on **Cloud Backup** (Atlas > your cluster > Backup). Atlas then takes snapshots on a schedule.
- Until then, once a week export your data: Atlas > your cluster > **Browse Collections**, pick `orders` and then `customers`, and use **Export Collection**. Keep the files in the family cloud drive.
- Practise one restore on a day nothing is going on, so you know the steps.

### Uptime check (so you know if the shop is down)
1. Make a free account at **uptimerobot.com** (or similar).
2. Add a monitor: type **HTTP(s)**, address `https://api.yourshop.in/health`, every 5 minutes. Add a second one for `https://www.yourshop.in`.
3. Set the alert to the family email and one phone number's SMS or the free app.
4. `/health` says "ok" only when the database is also connected, so it catches a database problem too.

### Watch it
- Render > your service > **Logs** shows errors in plain text. Look there first if something fails.
- Vercel > your project > **Logs**.

### Order alerts
**There is no automatic "new order" email or WhatsApp yet.** (The place for it is in the code and is empty.) Until it is built, someone must open **Admin > Orders** several times a day, or this should be added in a later round. Please decide who watches the Orders page on launch day.

### Security habits
- Change your admin password if anyone who knew it leaves.
- Remove staff logins for people who stop working with you (Admin > Staff).
- Do not share the Render, Vercel, Atlas, Razorpay or Cloudinary logins with anybody except family.

---

## 8. Business items to check for selling food online in India

**This is a checklist of things to ask about. It is not legal or tax advice, and it may be incomplete or out of date. Please confirm each item with the right authority (for example your local Food Safety office, the GST office, the municipal office) or with a chartered accountant or a lawyer before you start selling.**

- **Food business registration or licence (FSSAI).** Anyone who sells food, including fish, online usually needs a registration or a licence from the Food Safety and Standards Authority of India, depending on how much you sell. Ask which one applies and the fee. The licence number normally must be shown on the site and on the packs. The footer and Terms page have a place for it.
- **State-level rules for fish.** Some states have their own fisheries rules or licences for catching, landing, storing and moving fish. Boats may need their own registration and fishing licences. Confirm yours are current.
- **Tax registration (GST).** Ask an accountant whether you must register for GST, and whether fresh fish is exempt but dry or frozen packs are taxed (rates differ by product). If registered, the GST number goes on invoices and on the Razorpay KYC. The shop's prices are shown as the final price, so ask whether tax is included, and what the invoice must show.
- **Business identity.** Is the business a proprietorship, partnership or company? Which PAN and bank account will the money go to? Razorpay pays out to a bank account that matches the business name.
- **Shop and establishment registration.** Some local bodies need a shop licence or trade licence for the stall or packing room.
- **Packing and labelling.** Packaged dry or frozen food has labelling rules (name, weight, date, storage, licence number). Ask the Food Safety office what your labels must say.
- **Cold chain and hygiene.** Check requirements for the room where you clean and pack, ice, and for the insulated boxes.
- **Consumer rules.** Online sellers in India must show certain things (seller name, address, contact, price, refund policy, a grievance contact). The policy pages are a start. Confirm with a professional that they cover what is needed.
- **Data and privacy.** You hold customers' names, phone numbers and addresses. Ask whether anything more is needed under Indian data-protection rules, and keep the Privacy page accurate.
- **Insurance.** Ask about product and transit insurance for perishable goods.

---

## 9. Launch checklist

Tick each box when it is done. Do them roughly in this order.

### Start these first (they take days)
- [ ] Decide the shop's name, the domain, and which family member owns each account
- [ ] **MSG91 and DLT registration started** (sender name and sign-in message approved) — about a week early
- [ ] **Razorpay account created and KYC submitted** (needs the five policy pages live first, so do section 1 early)
- [ ] FSSAI, GST and other items in section 8 confirmed with the right authority or an accountant

### Shop content
- [ ] Real photos taken from `docs/PHOTOS.md`, named as listed there, uploaded in Admin > Products
- [ ] Sample products deleted or replaced with **real names, prices and stock** (production starts with no sample products if you used `create-owner:prod`)
- [ ] Today's market board filled in (Admin > Market board)
- [ ] **Delivery areas and charges** set (Admin > Delivery); the "fresh fish only to chosen cities" switch decided; the pincode tester tried with real pincodes
- [ ] Business name, phone, email, address and opening hours saved (Admin > Delivery)
- [ ] **All five policy pages read and edited by the family**; no `[BRACKET]` left
- [ ] FSSAI number shown where it should be

### Accounts and settings
- [ ] Atlas, Cloudinary, Razorpay, MSG91, Render, Vercel set up as in section 5
- [ ] Domain bought in the **family** account; `www` and `api` working with the padlock
- [ ] Owner login created with a **new** strong password; sample/test logins not present
- [ ] Staff accounts added for people who help
- [ ] Atlas backups on (section 7); uptime check on (section 7)

### Test orders (use Razorpay **test mode** first)
- [ ] Sign in with a real phone and a real SMS code
- [ ] Place a cash-on-delivery order → it shows in Admin > Orders
- [ ] Place an online order with a Razorpay test card/UPI → shows "Paid online"
- [ ] Close the payment window → order stays unpaid and can be retried
- [ ] Cancel an order → stock comes back
- [ ] Give a refund from the admin panel
- [ ] Guest order tracked from the link
- [ ] Order moved placed → packed → shipped → delivered, and the customer's screen follows
- [ ] Checked on a phone, on a tablet, and on a slow connection
- [ ] Not delivered here: type a pincode you don't serve and read the message

### Go live
- [ ] Razorpay approved; **live keys** put in Render and Vercel (and redeployed)
- [ ] One real ₹1 payment made and refunded
- [ ] A friend outside the family places a real order from their own phone
- [ ] Someone is named to watch Admin > Orders on launch day (no automatic alert yet)

### Launch day
1. Check `https://api.yourshop.in/health` says ok and the home page loads on your phone.
2. Fill today's market board before you tell anyone.
3. Make sure stock numbers are right and there are enough ice and boxes for the first orders.
4. Tell family and friends first (WhatsApp status, the shop link) and ask them to place small orders.
5. Keep the phone at the stall switched on. Check Orders every hour for the first day.
6. Take a screenshot of the first real order for the memory book.
7. After a week: look at what went wrong, update the policies and the delivery charges, and fix the list.

---

## 10. If something goes wrong

| What you see | What to do |
|---|---|
| Shop says "We cannot load today's prices" | The server is down or waking up. Open `https://api.yourshop.in/health`. If it fails, look at Render > Logs. |
| Render says "The API cannot start" | Read the lines under it. They say which setting is empty or wrong. Fix it in Render > Environment. |
| Customers cannot stay signed in | The website and server are not on the same domain (section 3), or `CORS_ORIGIN` is not exactly the website address. |
| Payment succeeds but order shows unpaid | Check the Razorpay webhook (5.3 step 4): address, secret, and ticked events. |
| No sign-in SMS arrives | Check MSG91 balance and that the template is approved. |
| Photos do not upload | The three Cloudinary values are wrong or missing. |
| You forgot the admin password | In Render > Shell, make a new owner with a different email using the `create-owner:prod` line, then delete the old one in Admin > Staff. |
