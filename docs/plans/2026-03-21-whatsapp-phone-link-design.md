# WhatsApp Phone Link Design

**Problem**

Client phone numbers are currently rendered as plain text in `src/components/ServiceItemCard.jsx`, so tapping them does not open a WhatsApp conversation.

**Goal**

Turn client phone numbers into direct WhatsApp links only when the stored value can be normalized into a valid international `wa.me/<digits>` target.

**Approach**

Keep the normalization logic in `src/lib/phone.js` instead of inside the component. The existing phone utility already knows how to distinguish international numbers from local Portuguese numbers for flag detection, so it is the right place to add a helper that returns a WhatsApp URL or an empty string.

`src/components/ServiceItemCard.jsx` should stay simple: compute the helper output once for the current phone value and render an anchor only when the helper returns a URL. Un-normalizable values remain plain text, preserving the current display while avoiding broken WhatsApp links.

**Normalization Rules**

- Accept numbers already written in international form with `+` or `00`.
- Accept local Portuguese numbers that the app already recognizes and expand them to `351`.
- Strip formatting characters like spaces, dashes, and parentheses.
- Reject values that cannot be normalized into a WhatsApp-safe international digit string.

**UI Behavior**

- Normalizable numbers open `https://wa.me/<digits>` in a new tab.
- The visible text remains the original formatted phone string.
- Non-normalizable numbers still render as plain text.
- Empty phone values still show `Sem telefone`.

**Testing**

- Extend the existing `ServiceItemCard.locationLink.test.jsx` coverage with phone-link assertions.
- Add unit coverage for the phone helper so the normalization contract is explicit and reusable.

**Constraints**

- Do not change the stored phone value format.
- Do not link ambiguous numbers that cannot be normalized confidently.
