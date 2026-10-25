// All wording for the cookie notice and the privacy paragraph is here, in one place.
export const COOKIE_TEXT = 'We use cookies to count visits.'
export const COOKIE_OK = 'OK'
export const COOKIE_DECLINE = 'Decline'

/** The paragraph on the Privacy page. `shop` and `email` come from the business settings. */
export const privacyAnalytics = (shop: string, email: string) => ({
  title: 'Cookies and visit counting',
  paragraphs: [
    `If you press OK on the cookie notice, ${shop} uses Google Analytics to count visits. It uses small files called cookies to see which pages are opened, which products are looked at and how people find the shop, so we can make it better. This is anonymous: we do not send your name, phone number, email, address or pincode to Google Analytics, and your IP address is not stored in full.`,
    `If you press Decline, nothing is counted and the shop works exactly the same. You can change your mind at any time by clearing this site's data in your browser, and you can write to ${email} to ask about your data.`,
  ],
})
