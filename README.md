<p align="center">
  <img src="assets/images/icon.png" width="112" alt="AquaFeed icon" />
</p>

<h1 align="center">AquaFeed</h1>

<p align="center">
  Mobile app for an automatic fish feeder with water-quality monitoring.
</p>

## Screenshots

<p align="center">
  <img src="docs/screenshots/login.png" width="24%" alt="Sign in" />
  <img src="docs/screenshots/dashboard.png" width="24%" alt="Dashboard" />
  <img src="docs/screenshots/feeding.png" width="24%" alt="Feeding" />
  <img src="docs/screenshots/history.png" width="24%" alt="History" />
</p>
<p align="center">
  <img src="docs/screenshots/dashboard-dark.png" width="24%" alt="Dashboard, dark" />
  <img src="docs/screenshots/water-dark.png" width="24%" alt="Water quality, dark" />
  <img src="docs/screenshots/settings-dark.png" width="24%" alt="Settings, dark" />
</p>

## What it does

- **Dashboard:** tank status at a glance, with water readings, today's feedings, feed left in the feeder and open alerts.
- **Water:** pH, temperature and clarity with history charts, time in range and recent readings.
- **Feeding:** a countdown to the next feeding, today's results, feeding times you can add, edit and switch off, and a "Feed now" button.
- **History:** alerts to check and a day-by-day log of every feeding.
- **Settings:** profile and photo, feeder connection, tank details, light or dark appearance, and alerts on your phone.
- **Administrators:** manage people, alert limits and sensor calibration.

It works offline with the last synced data, and has a demo mode with sample data so you can try everything without any hardware.

## Built with

Expo and React Native (TypeScript), Expo Router, NativeWind (Tailwind CSS), Firebase Realtime Database and Authentication, Zustand, React Hook Form with Zod, and Lucide icons.

## Getting started

```sh
npm install
npx expo start
```

Press `w` to open it in a browser, or scan the QR code with Expo Go on your phone.

With no configuration the app starts in **demo mode**. Tap "Try a demo account" on the sign-in screen to explore with sample data.

### Connecting to Firebase

1. Create a Firebase project and turn on Realtime Database and Authentication (email/password and Google).
2. Copy `.env.example` to `.env` and fill in your project's web app values.
3. Restart with `npx expo start --clear`.

Google sign-in, push alerts and the photo picker use native code, so they need a development build (`npx expo run:android` or an EAS build) rather than Expo Go.

## Scripts

```sh
npx expo start      # run the app
npx tsc --noEmit    # typecheck
npx eslint src      # lint
```

## License

[Apache 2.0](LICENSE)
