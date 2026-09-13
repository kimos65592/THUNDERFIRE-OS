package com.thunderfire.neo

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface

class NativeBridge(
    private val context: Context
) {

    @JavascriptInterface
    fun startNeo() {
        NeoWakeService.start(context)
    }

    @JavascriptInterface
    fun stopNeo() {
        NeoWakeService.stop(context)
    }

    @JavascriptInterface
    fun isNeoRunning(): Boolean {
        return NeoWakeService.isRunning
    }

    @JavascriptInterface
    fun speak(text: String) {
        MainActivity.instance?.speakNative(text)
    }

    @JavascriptInterface
    fun vibrate() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= 31) {
                val manager =
                    context.getSystemService(VibratorManager::class.java)
                manager?.defaultVibrator?.vibrate(
                    VibrationEffect.createWaveform(
                        longArrayOf(0, 180, 100, 180),
                        -1
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator =
                    context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                @Suppress("DEPRECATION")
                vibrator?.vibrate(
                    longArrayOf(0, 180, 100, 180),
                    -1
                )
            }
        } catch (_: Throwable) {
        }
    }

    @JavascriptInterface
    fun setFlashlight(enabled: Boolean): Boolean {
        return try {
            val cameraManager =
                context.getSystemService(Context.CAMERA_SERVICE) as CameraManager

            val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
                val chars =
                    cameraManager.getCameraCharacteristics(id)
                chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true &&
                    chars.get(CameraCharacteristics.LENS_FACING) ==
                    CameraCharacteristics.LENS_FACING_BACK
            } ?: return false

            cameraManager.setTorchMode(
                cameraId,
                enabled
            )

            true
        } catch (_: Throwable) {
            false
        }
    }
}
