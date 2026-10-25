# Bugs found and fixed (Round 11)

Checked in a real browser at 1440x900: header and footer links, home category tiles, "Browse by kind" boxes, tabs, sort, pincode check, pagination, product page, cart, checkout, tracking, About, policy pages, 404, sign in and sign up pages, and every admin page. 33 storefront links were fetched and all answered. For each page the title, heading, active tab and URL were compared.

| # | Where | What was wrong | Fix |
|---|---|---|---|
| 1 | `/products?group=Frozen+packs` | Heading said "Frozen packs" but the underline sat on Fresh and Frozen only had a focus box. The underline was placed once when the page first loaded and never moved on client navigation. | The tab underline now moves whenever the active tab changes (`Tabs.tsx`). |
| 2 | Home category tiles, header links | Tiles that link to a single group (`Fresh fish`, `Prawns and crab`) matched no tab, because the Fresh tab needed both groups. | One function, `tabFor()` in `web/lib/groups.ts`, maps every group value to a tab. The nav, the tabs, the heading and the category photo all use it. Back, forward and refresh agree with the URL. |
| 3 | Header nav | "Fresh / Dry / Frozen" never showed which one you were on. | The nav marks the active link from the same mapping. |
| 4 | Empty pages (empty orders list, empty cart) | The "Shop the catch" button had dark text on a dark background, so it looked like a black box. | `.empty .btn` now uses white text. |
| 5 | Page titles | The listing title did not follow the heading (always "All products"). | The title now matches the heading (`Frozen packs`, `Search: prawn`). |
| 6 | Search | The Search link only opened the listing. | A real search panel with live results, plus `?q=` on the products API. |
| 7 | Account pages | Showed a masked phone number; phone-only sign in. | Email and password accounts, see `docs/DATABASE.md`. |
| 8 | Hydration warning (dev) | The scroll reveal script added its marker before React finished hydrating. | The first scan waits until hydration has settled. |
| 9 | Scroll reveal | An element in the last few pixels of the page could never reveal. | The observer now uses the full viewport. |

Nothing else disagreed: titles, headings, active states and URLs matched on all other pages.
