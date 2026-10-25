/**
 * The one place for business details. The footer, the delivery bar, the contact page and every policy page read from here.
 * Fill in the values below. Anything left empty shows on the site as "[ADD YOUR ...]" so it is easy to spot.
 * Phone, email, address, name, opening hours and the free-delivery amount can also be set in Admin > Delivery; a value set there wins.
 * The full list of blanks is in docs/FILL-ME-IN.md.
 */
export const business = {
  name: 'Raju Fishes',
  legalName: '', // owner or registered name, e.g. "K. Raju trading as Raju Fishes"
  address: '',
  phone: '',
  email: '',
  fssai: '', // FSSAI licence number
  gst: '', // GSTIN, or write "Not registered"
  deliveryZones: '', // e.g. "Fresh fish: pincodes 5xxxxx to 5xxxxx. Dry and frozen: all India."
  freeDeliveryOver: 0, // rupees; keep equal to the free-delivery amount in Admin > Delivery. 0 = not set
  refundWindow: '', // how long after delivery a customer can report a problem, e.g. "2 hours"
  coldChain: '', // e.g. "Packed on ice in an insulated box and kept below 4 degrees until it leaves us"
  cancellationRule: '', // e.g. "You can cancel any time before we pack your order"
  hours: '', // e.g. "Every day, 6 am to 8 pm"

  // smaller details the policy pages need
  freshCutoff: '', // e.g. "10 am"
  deliverySlots: '', // e.g. "7 to 10 am, 4 to 7 pm"
  daysClosed: '', // e.g. "the days the boats do not go out"
  dryDispatchDays: '', // e.g. "2"
  dryDeliveryDays: '', // e.g. "3 to 7"
  refundPayoutDays: '', // e.g. "5 to 7"
  refundByCash: '', // how cash-on-delivery refunds are paid, e.g. "UPI"
  replyTime: '', // e.g. "one working day"
  deliveryPartner: '', // courier name
  recordsYears: '', // how long order records are kept
  taxNote: '', // e.g. "all taxes"
  weightRule: '', // e.g. "within 5 percent, and you pay for the weight sent"
  courtCity: '', // e.g. "Visakhapatnam, Andhra Pradesh"
  lastUpdated: '', // date the policies were last checked
}

export type Business = typeof business
