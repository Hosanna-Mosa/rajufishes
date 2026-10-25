# Fill me in

Everything the policy pages, footer, delivery bar and Contact page need lives in **`web/config/business.ts`**.
Any value left empty shows on the live site as `[ADD YOUR ...]`. Fill the file, then rebuild or redeploy the website.

Phone, email, address, shop name, opening hours and the free-delivery amount can instead be typed in **Admin > Delivery > Shop details and other settings**. A value typed there wins over the file.

| Marker shown on the site | Field in `business.ts` | Where it appears |
|---|---|---|
| [ADD YOUR OWNER OR LEGAL NAME] | `legalName` | Terms |
| [ADD YOUR ADDRESS] | `address` (or Admin) | Footer, Contact, Privacy, Terms |
| [ADD YOUR PHONE NUMBER] | `phone` (or Admin) | Footer, Contact, Shipping, Refunds, Privacy, Terms |
| [ADD YOUR EMAIL] | `email` (or Admin) | Footer, Contact, Shipping, Refunds, Privacy, Terms |
| [ADD YOUR FSSAI NUMBER] | `fssai` | Footer, Contact, Terms |
| [ADD YOUR GST NUMBER] | `gst` | Footer, Contact, Terms |
| [ADD YOUR DELIVERY AREAS] | `deliveryZones` | Shipping |
| [ADD YOUR FREE DELIVERY AMOUNT] | `freeDeliveryOver` (or the free-over amount in Admin > Delivery, which wins) | Top bar, footer, Shipping |
| [ADD YOUR REFUND WINDOW] | `refundWindow` | Shipping, Refunds |
| [ADD YOUR COLD CHAIN NOTE] | `coldChain` | Shipping |
| [ADD YOUR CANCELLATION RULE] | `cancellationRule` | Refunds |
| [ADD YOUR OPENING HOURS] | `hours` (or Admin) | Contact |
| [ADD YOUR FRESH FISH CUT-OFF TIME] | `freshCutoff` | Shipping |
| [ADD YOUR DELIVERY SLOTS] | `deliverySlots` | Shipping |
| [ADD YOUR DAYS CLOSED] | `daysClosed` | Shipping |
| [ADD YOUR DRY PACK PACKING DAYS] / [ADD YOUR DRY PACK DELIVERY DAYS] | `dryDispatchDays`, `dryDeliveryDays` | Shipping |
| [ADD YOUR REFUND PAYOUT DAYS] | `refundPayoutDays` | Refunds |
| [ADD YOUR CASH ORDER REFUND METHOD] | `refundByCash` | Refunds |
| [ADD YOUR REPLY TIME] | `replyTime` | Contact |
| [ADD YOUR DELIVERY PARTNER] | `deliveryPartner` | Privacy |
| [ADD YOUR RECORDS YEARS] | `recordsYears` | Privacy |
| [ADD YOUR TAX NOTE] | `taxNote` | Terms |
| [ADD YOUR WEIGHT RULE] | `weightRule` | Terms |
| [ADD YOUR COURT CITY] | `courtCity` | Terms |
| [ADD YOUR LAST UPDATED DATE] | `lastUpdated` | Shipping, Refunds, Privacy, Terms |

The free-delivery amount used by the checkout is the one in Admin > Delivery. Keep `freeDeliveryOver` equal to it, or leave the file blank and let the site read the Admin value.

Also still the family's to do (not shown as markers): the "Draft for ..." line at the top of each policy page should be deleted once the family has read and approved the text.

## Analytics values (Round 13)

None of these are secrets in the shop sense, but never commit real ones. Steps and screenshots-in-words are in `docs/ANALYTICS.md`.

| Value | Where it goes | What it is |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`, `_MEASUREMENT_ID` | `web/.env.local`, and the web host's settings | Copied from the Firebase web app config. All seven are needed, or the shop counts nothing. |
| `NEXT_PUBLIC_ANALYTICS_DEV` | `web/.env.local` only | `1` makes the shop count visits on your own computer, for testing. Leave empty otherwise. |
| `GA4_PROPERTY_ID` | `api/.env`, and the API host's settings | The number of the Google Analytics property (digits only). |
| `GA_SERVICE_ACCOUNT_JSON_BASE64` | `api/.env`, and the API host's settings | The service-account key file, turned into one line of text. This one IS a secret. |
