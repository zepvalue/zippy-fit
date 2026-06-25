# Google Play — Data safety answers for ZippyFit

Derived from the codebase (Convex schema, auth, backend). Fill the Data safety form in
Play Console → App content → Data safety to match this. Update if data collection changes.

## Section 1 — Data collection and security

- **Does your app collect or share any of the required user data types?** → **Yes**
- **Is all of the user data collected by your app encrypted in transit?** → **Yes** (HTTPS)
- **Do you provide a way for users to request that their data be deleted?** → **Yes**
  - Method: email request (see privacy policy). ⚠️ No in-app/automated deletion yet — see
    "Follow-ups" below. Provide the privacy-policy URL as the deletion-request channel.

## Section 2 — Data types collected

For each: **Collected = Yes, Shared = No, Processed ephemerally = No**, unless noted.

| Category | Data type | Collected | Required/Optional | Purposes |
|---|---|---|---|---|
| Personal info | **Email address** | Yes | Required | Account management, App functionality |
| Personal info | **Name** | Yes | Optional | Account management, App functionality |
| Personal info | **User IDs** | Yes | Required | Account management, App functionality |
| Health & fitness | **Fitness info** (workout logs: date, duration) | Yes | Required | App functionality |
| App activity | **App interactions** (workout history, team nudges/spots) | Yes | Required | App functionality |

**Nothing is shared with third parties.** Convex (database) and the backend are service
providers operating on our behalf, which Google classifies as "collected," not "shared."

## Section 3 — Data types NOT collected (leave unchecked)

Location, Contacts, Photos/videos, Files/docs, Calendar, Financial info, Web browsing,
Device or other IDs, Advertising ID, Biometric data, Crash logs / diagnostics, Messages,
Audio. No analytics or ads SDKs are integrated.

> Note: the schema contains an unused `phone` field with no collection UI — so **phone
> number is NOT collected** and must stay unchecked. Remove the field to avoid confusion.

## Follow-ups before a real (production) launch

1. **Implement account/data deletion** (in-app or an endpoint). Email-only is acceptable
   for internal testing but is the weakest form; Play prefers in-app deletion for production.
2. **Remove the unused `@supabase/supabase-js` dependency** (zero code references).
3. **Remove the unused `phone` schema field** (or add real collection + declare it).
4. **Stand up a hosted backend** — the FastAPI server currently runs behind an ngrok dev
   tunnel; a public release needs a stable hosted URL.
5. Re-run this mapping if you implement push notifications or add any SDK.
