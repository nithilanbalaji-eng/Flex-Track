# Flex Track — iOS app

The native app, built with Expo (React Native). Talks to the same API as the
web build, so accounts, plans, crews and logs are shared between them.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone. You'll be talking to the live
API at `https://flex-track-8sag.onrender.com/api` — change `extra.apiUrl` in
`app.json` to point somewhere else.

> The first request after a quiet period takes ~50 seconds while the free Render
> instance wakes up. That's expected, not a hang.

## Building without a Mac

iOS builds normally need macOS and Xcode. EAS builds in the cloud instead, so
this works from Windows:

```bash
npm install -g eas-cli
eas login                 # needs a free Expo account
eas build --platform ios  # needs an Apple Developer account ($99/yr)
eas submit --platform ios # uploads to App Store Connect
```

## What differs from the web build

| | Web | App |
| --- | --- | --- |
| Token storage | `localStorage` | Device keychain via `expo-secure-store` |
| Navigation | React Router | React Navigation |
| Styling | Tailwind | `StyleSheet` + shared tokens in `src/theme` |
| Apple Health | Webhook from a Shortcuts automation | Native HealthKit (to do) |
| Ads | AdSense (never approved) | AdMob (to do) |
| Subscriptions | Stripe | StoreKit / In-App Purchase (to do) |

`src/api/*` and `src/types/*` are shared with the web build almost verbatim —
only the client's token storage differs.

## In-App Purchase

Subscriptions go through StoreKit, because Apple rejects third-party payment
for digital goods.

> **This does not work in Expo Go.** `react-native-iap` ships native code, so
> the buy button reports "not available" there. It needs a development build:
> `eas build --profile development --platform ios`. Everything else in the app
> still runs in Expo Go.

### Setting it up in App Store Connect

1. Create an **auto-renewable subscription** with product id
   `flextrack_premium_monthly` at $2.99/month. It must match
   `src/config/products.ts` and the id the backend checks receipts against.
2. **App Store Connect → App Information → App-Specific Shared Secret** —
   generate one and set it on the API host as `APPLE_IAP_SHARED_SECRET`. Without
   it the server can't verify receipts and every purchase is refused.
3. **App Store Server Notifications V2** → point the production and sandbox URLs
   at `https://<your-api>/api/apple/notifications`, so renewals, cancellations
   and refunds update entitlement without the app being open.
4. Create a **Sandbox tester** account under Users and Access to test purchases
   without being charged.

### How entitlement is decided

The app never claims it paid. StoreKit produces a receipt, the app posts it to
`POST /api/subscription/apple/verify`, and the server asks Apple whether it's
genuine and still active. The transaction is only finished once the server has
recorded it, so a purchase interrupted by a crash is replayed by StoreKit rather
than being lost.

## Still to wire up

- **HealthKit** — replaces the webhook bridge with real reads
- **AdMob** — ad units in place of the in-house promo in `AdSlot`
