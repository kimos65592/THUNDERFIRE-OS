# J.A.R.V.I.S Mark V — Neo Android APK

This project wraps the supplied Mark V `index.html` in a native Android shell.

## Native layers
- Android foreground microphone service
- Local Vosk wake detector for **Neo**
- Android SpeechRecognizer for Arabic command capture after wake
- Native Android TTS (`ar-EG`)
- Native flashlight and vibration
- Native Gemini HTTPS transport from the APK/WebView bridge

## Gemini key
Open the API key control in the app and enter a valid Gemini API key. The Android path sends the request through native HTTPS instead of `file://` WebView fetch, which avoids WebView CORS/origin problems.

## GitHub build
Push the whole folder to a GitHub repository. The workflow downloads the Vosk small English model and builds the debug APK with Gradle.
