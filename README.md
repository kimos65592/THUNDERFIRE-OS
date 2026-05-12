# ThunderFire AI Assistant

ThunderFire is an advanced AI assistant built as a high-performance Single Page Application (SPA). It integrates Google Gemini API for intelligent conversations and live web building.

## Features

- **AI Chat**: Powered by Google Gemini with conversation memory.
- **Bilingual**: Full support for English and Arabic (RTL support included).
- **Web Builder**: Generate HTML/CSS/JS code and see live previews instantly.
- **Voice Interaction**: Speech-to-Text and Text-to-Speech capabilities.
- **Reminders**: Persistent notification system based on local storage.
- **Personality**: Customizable AI tone and behavior.
- **Commands**: Execute web actions like searching Google or opening YouTube.

## How to Configure

### 1. Gemini API Key
This application requires a Google Gemini API key. 
- In **AI Studio Build**, go to the **Secrets** panel.
- Add a secret named `GEMINI_API_KEY`.
- The application will automatically use this key.

### 2. Notifications
To use the Reminder system, you must allow browser notifications when prompted.

### 3. Voice Input
To use the Voice system, click the microphone button and allow microphone access.

## Deployment

### GitHub Pages (or Median.co)
1. Ensure the `base` in `vite.config.ts` is set to `./`. (Already done).
2. Build the project using `npm run build`.
3. Upload the contents of the `dist/` folder to GitHub Pages.
4. For APK conversion (Median.co), simply point their service to your hosted URL.

## Local Testing
1. Run `npm install`.
2. Run `npm run dev`.
3. Open `http://localhost:3000`.

## APK Preparation
The interface is designed with a responsive CSS grid, ensuring compatibility with mobile devices when converted via Median.co.
