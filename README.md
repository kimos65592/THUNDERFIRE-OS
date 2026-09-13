# Neo — J.A.R.V.I.S Mark V Android APK

This project wraps the supplied Mark V HTML OS inside an Android WebView and adds a native Android microphone layer.

## Native additions
- Android foreground microphone service.
- Local Vosk wake-word detection for `Neo`.
- Arabic command capture using Android SpeechRecognizer after wake word detection.
- Native Arabic TTS bridge.
- Native vibration bridge.
- Native flashlight bridge.
- Existing HTML/Cognitive UI kept as the main interface.

## Important Android behavior
The microphone foreground service must be started while the app is visible and the user has granted `RECORD_AUDIO`. Android 15 restricts starting microphone foreground services from the background and from `BOOT_COMPLETED` in normal cases.

## GitHub build
The workflow downloads the Vosk small English model during the build, then produces a debug APK as a GitHub Actions artifact.
