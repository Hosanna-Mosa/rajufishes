# Database, in plain words

Raju Fishes keeps everything in one MongoDB database. In development the API starts a throwaway in-memory database when `MONGODB_URI` is empty (data resets on restart). For the real shop you point it at MongoDB Atlas.

## What is stored (collections)

| Collection | What it holds |
|---|---|
| `products` | Every item for sale: name, group, price, stock, cuts, weights, photos, "landed today" time. |
| `orders` | Every order (see below). |
| `customers` | Customer accounts: name, email (lowercase, unique), optional phone, **password hash**, saved addresses. |
| `passwordresets` | One row per reset link: a hash of the token, when it expires, whether it was used. Removed automatically after a day. |
| `otpcodes` | Only used if phone codes are switched on. Hashed codes, short life. |
| `carts` / stock holds | Stock held for an order that is waiting for payment, released if unpaid. |
| `admins` | Owner and staff logins: email, password hash, role. |
| `coupons`, `zones`, `settings`, `market` | Coupon codes, delivery zones and prices, business settings, today's market board. |

## What one order stores

Order number, the items (name, cut, weight, quantity, price at that moment), subtotal, delivery charge, discount, total, payment method and status, the delivery name, phone, address and slot, an optional email, a tracking token (hashed), the status history with times, and the account it belongs to if the customer was signed in.

## What is NOT stored

- **No card numbers, UPI IDs or bank details.** Payment happens on Razorpay. We keep only their payment id and whether it succeeded.
- **No plain passwords.** Only bcrypt hashes (cost 12) that cannot be turned back into the password. Passwords are never written to logs. Reset tokens are stored hashed too.
- No secret keys. Those live only in environment variables.

## Pointing the shop at MongoDB Atlas

1. Create an Atlas project and a free or paid cluster. Choose the **Mumbai (ap-south-1)** region so it is close to your customers.
2. Under **Database Access**, create a database user with a long random password and the "read and write to any database" role (or just this database).
3. Under **Network Access**, add the IP address of the server that runs the API. Do not leave `0.0.0.0/0` open for launch.
4. Click **Connect, Drivers** and copy the connection string. Put it in the API's environment as `MONGODB_URI`, with the database name in it, for example `mongodb+srv://USER:PASSWORD@cluster.mongodb.net/rajufishes`. Never commit it.
5. Restart the API. It creates the indexes by itself.

## Backups

- **Atlas backups:** on paid clusters turn on Cloud Backup (continuous or daily snapshots) in the cluster's Backup tab. Test one restore before launch.
- **Manual copy:** `mongodump --uri "$MONGODB_URI" --out backup-YYYY-MM-DD`, kept somewhere private. Restore with `mongorestore`.

## Before launch checklist

- [ ] Atlas Cloud Backup turned on, and one restore tried
- [ ] Database user has a strong random password (not reused anywhere)
- [ ] Network Access lists only the API server, not the whole internet
- [ ] `MONGODB_URI` set only as an environment variable, never in git
- [ ] Admin and staff passwords changed from the development ones
- [ ] `LOGIN_MODE`, `WEB_URL` and mail settings set so reset emails really arrive
