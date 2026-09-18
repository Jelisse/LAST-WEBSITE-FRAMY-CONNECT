# Confirmed NFC keychain inventory

Owner confirmation: 19 September 2026. Existing physical stock in Maputo, Mozambique.

| Model | Pieces |
| --- | ---: |
| Instagram | 175 |
| TikTok | 175 |
| Pattern / Padrão artístico | 150 |
| **Total** | **500** |

This is the breakdown of the existing 500 units, not an additional delivery. No blank keychains are included in this count.

Migration `0011_maputo_keychain_stock.sql` records the count and location in the management audit, enables the three stocked models and removes placeholder blank-keychain inventory. Available-to-order quantities deduct outstanding reservations from the physical count. The correction runs once and preserves subsequent sales and manager edits on retries. It does not add another 500 units to the physical stock ledger.

The migration is committed for deployment. Applying it to the Cloudflare database remains pending authenticated access; the local record is not confirmation of a live database update.
