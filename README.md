# Speech Therapy App with Expo

This is a mobile application built with Expo and React Native for speech therapy assistance. The app allows users to record speech, analyze patterns, and track progress over time.

## Features

- Voice recording with high-quality audio
- Real-time recording status
- Secure local storage of recordings
- Permission handling for microphone access
- Cross-platform support (iOS & Android)

## Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- Expo Go app on your mobile device

## Installation

1. Clone the repository:
   ```bash
   git clone [your-repo-url]
   cd swell-speech-therapy
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. Open the Expo Go app on your mobile device and scan the QR code displayed in the terminal.

## Development Setup

1. Install the Expo CLI globally:
   ```bash
   npm install -g expo-cli
   ```

2. Install project dependencies:
   ```bash
   npx expo install
   ```

## Available Scripts

- `npm start` or `yarn start`: Start the Expo development server
- `npm run ios` or `yarn ios`: Start the iOS simulator
- `npm run android` or `yarn android`: Start the Android emulator
- `npm run web` or `yarn web`: Start the web version
- `npm test` or `yarn test`: Run tests

## Building for Production

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Configure EAS Build:
   ```bash
   eas build:configure
   ```

3. Build for your target platform:
   ```bash
   # For iOS
   eas build --platform ios
   
   # For Android
   eas build --platform android
   ```

## Permissions

The app requires the following permissions:

- iOS:
  - Microphone access
  - Speech Recognition

- Android:
  - RECORD_AUDIO
  - INTERNET

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the development team.