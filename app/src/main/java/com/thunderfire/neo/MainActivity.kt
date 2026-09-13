package com.thunderfire.neo

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import java.util.Locale

class MainActivity : ComponentActivity(), TextToSpeech.OnInitListener {

    companion object {
        @Volatile
        var instance: MainActivity? = null
    }

    private lateinit var webView: WebView
    private var tts: TextToSpeech? = null

    private val permissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { granted ->
            val mic = granted[Manifest.permission.RECORD_AUDIO] == true ||
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED

            if (mic) {
                NeoWakeService.start(this)
                sendVoiceState("READY")
            } else {
                Toast.makeText(
                    this,
                    "يجب السماح بالميكروفون لتفعيل Neo.",
                    Toast.LENGTH_LONG
                ).show()
                sendVoiceState("MIC_PERMISSION_DENIED")
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instance = this

        tts = TextToSpeech(this, this)

        webView = WebView(this)
        webView.setBackgroundColor(Color.rgb(3, 7, 18))
        setContentView(webView)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.setSupportZoom(false)

        webView.addJavascriptInterface(
            NativeBridge(this),
            "AndroidBridge"
        )

        webView.webViewClient = object : WebViewClient() {}

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val allowed = request.resources.filter {
                        it == PermissionRequest.RESOURCE_AUDIO_CAPTURE ||
                            it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                    }.toTypedArray()

                    if (allowed.isNotEmpty()) {
                        request.grant(allowed)
                    } else {
                        request.deny()
                    }
                }
            }
        }

        webView.loadUrl("file:///android_asset/index.html")

        requestPermissionsAndStart()
    }

    private fun requestPermissionsAndStart() {
        val required = mutableListOf<String>()

        if (
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            required += Manifest.permission.RECORD_AUDIO
        }

        if (
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.CAMERA
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            required += Manifest.permission.CAMERA
        }

        if (required.isEmpty()) {
            NeoWakeService.start(this)
            sendVoiceState("READY")
        } else {
            permissionLauncher.launch(
                required.toTypedArray()
            )
        }
    }

    fun notifyWakeWord() {
        runOnUiThread {
            sendVoiceState("WAKE_DETECTED")
        }
    }

    fun deliverSpeech(text: String) {
        runOnUiThread {
            val escaped =
                org.json.JSONObject.quote(text)

            webView.evaluateJavascript(
                "window.NativeVoice && window.NativeVoice.onSpeechResult($escaped);",
                null
            )

            sendVoiceState("COMMAND_RECEIVED")
        }
    }

    fun sendVoiceState(state: String) {
        if (!::webView.isInitialized) return

        val safe =
            org.json.JSONObject.quote(state)

        runOnUiThread {
            webView.evaluateJavascript(
                "window.NativeVoice && window.NativeVoice.onVoiceState($safe);",
                null
            )
        }
    }

    fun speakNative(text: String) {
        val clean = text.trim()
        if (clean.isEmpty()) return

        runOnUiThread {
            tts?.let {
                it.language = Locale("ar", "EG")
                it.setSpeechRate(0.95f)
                it.speak(
                    clean,
                    TextToSpeech.QUEUE_FLUSH,
                    null,
                    "neo-${System.currentTimeMillis()}"
                )
            }
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale("ar", "EG")
        }
    }

    override fun onDestroy() {
        instance = null
        tts?.stop()
        tts?.shutdown()
        webView.destroy()
        super.onDestroy()
    }
}
