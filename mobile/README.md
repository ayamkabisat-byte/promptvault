# PromptVault Mobile

Native Android/iOS frontend for the existing PromptVault Supabase backend.

## Stack
- Expo SDK 55
- React Native 0.83
- Expo Router
- Supabase
- Expo Clipboard

## What works in V1
- Discover gallery from `public.prompts`
- Search prompt title/category/tags
- Prompt detail + copy prompt
- Fashion gallery from `public.fashion_prompts`
- OOTD-first fashion covers
- LOOK / INFOGRAPHIC switch in fashion detail
- Previous / Next fashion browsing
- Session favorites
- Native bottom tabs

The mobile app is read-only for PromptVault content. Admin and bulk import remain on the web app.

## Local test
Use Node.js 20.19+.

```bash
cd mobile
npm install
npx expo install --fix
npx expo-doctor
npx expo start
```

For a physical Android phone, install a compatible Expo development client or use a development build. Expo Go compatibility changes over time, so a development build is the preferred path for this project.

## First APK with EAS

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

The `preview` profile outputs an APK for direct installation/testing.

## Google Play AAB

```bash
npx eas-cli@latest build --platform android --profile production
```

The production profile outputs an Android App Bundle (`.aab`) suitable for Play Console once branding, privacy/data-safety declarations, store listing assets, screenshots, app signing, and final QA are complete.

## Android application id

`com.ayamkabisat.promptvault`

Do not change this after the first Play Store release unless intentionally publishing a separate application.

## Supabase
The checked-in key is a Supabase **publishable** key, not a service-role secret. RLS remains the security boundary. Never add a service-role key to this mobile project.

## Before Play Store submission
1. Add final app icon + adaptive icon + splash assets.
2. Add persistent favorites if wanted.
3. Test slow/offline network states and image failures.
4. Verify all public Supabase RLS policies.
5. Create privacy policy and complete Play Console Data Safety form.
6. Create screenshots, feature graphic, short description, full description, content rating, and support contact.
7. Build production AAB and run internal/closed testing before production.
