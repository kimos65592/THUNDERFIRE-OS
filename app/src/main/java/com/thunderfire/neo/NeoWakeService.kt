package com.thunderfire.neo

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import org.vosk.Model
import org.vosk.Recognizer
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

class NeoWakeService : Service() {

    companion object {
        private const val CHANNEL_ID = "neo_voice_engine"
        private const val NOTIFICATION_ID = 5101

        @Volatile
        var isRunning = false
            private set

        fun start(context: Context) {
            val intent = Intent(context, NeoWakeService::class.java)
            ContextCompat.startForegroundService(
                context,
                intent
            )
        }

        fun stop(context: Context) {
            context.stopService(
                Intent(context, NeoWakeService::class.java)
            )
        }
    }

    private val running = AtomicBoolean(false)
    private val commandMode = AtomicBoolean(false)
    private val mainHandler = Handler(Looper.getMainLooper())

    private var audioRecord: AudioRecord? = null
    private var model: Model? = null
    private var recognizer: Recognizer? = null
    private var commandRecognizer: SpeechRecognizer? = null

    private var worker: Thread? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = buildNotification("Neo is listening locally")
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            @Suppress("DEPRECATION")
            startForeground(
                NOTIFICATION_ID,
                notification
            )
        }

        isRunning = true
        running.set(true)

        mainHandler.post {
            MainActivity.instance?.sendVoiceState(
                "PASSIVE_LISTENING"
            )
        }

        prepareModelAndStart()
    }

    private fun prepareModelAndStart() {
        if (
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            stopSelf()
            return
        }

        Thread {
            try {
                val modelDir =
                    File(
                        filesDir,
                        "model-en-us"
                    )

                if (!modelDir.exists()) {
                    copyAssetDirectory(
                        "model-en-us",
                        modelDir
                    )
                }

                model = Model(
                    modelDir.absolutePath
                )

                startWakeLoop()
            } catch (error: Throwable) {
                mainHandler.post {
                    MainActivity.instance?.sendVoiceState(
                        "WAKE_MODEL_ERROR"
                    )
                }
                stopSelf()
            }
        }.start()
    }

    private fun startWakeLoop() {
        worker?.interrupt()

        worker = Thread {
            try {
                val sampleRate = 16000f
                val minBuffer =
                    AudioRecord.getMinBufferSize(
                        16000,
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT
                    )

                val bufferSize =
                    maxOf(
                        minBuffer,
                        4096
                    )

                val audio = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    16000,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize * 2
                )

                audioRecord = audio

                val wakeGrammar =
                    "[\"neo\", \"[unk]\"]"

                val rec = Recognizer(
                    model,
                    sampleRate,
                    wakeGrammar
                )

                recognizer = rec

                audio.startRecording()

                mainHandler.post {
                    MainActivity.instance?.sendVoiceState(
                        "PASSIVE_LISTENING"
                    )
                }

                val buffer =
                    ByteArray(bufferSize)

                while (
                    running.get() &&
                    !commandMode.get()
                ) {
                    val read =
                        audio.read(
                            buffer,
                            0,
                            buffer.size,
                            AudioRecord.READ_BLOCKING
                        )

                    if (read <= 0) continue

                    if (rec.acceptWaveForm(
                            buffer,
                            read
                        )
                    ) {
                        val result: String =
                            rec.result()
                        val text =
                            extractText(
                                result
                            )

                        if (
                            text.equals(
                                "neo",
                                ignoreCase = true
                            ) ||
                            text.contains(
                                " neo ",
                                ignoreCase = true
                            )
                        ) {
                            onWakeWordDetected()
                            break
                        }
                    }
                }
            } catch (_: InterruptedException) {
            } catch (_: Throwable) {
                mainHandler.post {
                    MainActivity.instance?.sendVoiceState(
                        "WAKE_ENGINE_ERROR"
                    )
                }
            } finally {
                releaseAudio()
                recognizer?.close()
                recognizer = null
            }
        }

        worker?.start()
    }

    private fun onWakeWordDetected() {
        if (!running.get()) return
        if (!commandMode.compareAndSet(false, true)) return

        mainHandler.post {
            MainActivity.instance?.notifyWakeWord()
        }

        stopAudioCapture()
        startCommandRecognition()
    }

    private fun startCommandRecognition() {
        mainHandler.post {
            if (!SpeechRecognizer.isRecognitionAvailable(this)) {
                MainActivity.instance?.sendVoiceState(
                    "COMMAND_SPEECH_UNAVAILABLE"
                )
                resumeWakeWord()
                return@post
            }

            try {
                commandRecognizer?.destroy()

                commandRecognizer =
                    SpeechRecognizer.createSpeechRecognizer(
                        this
                    )

                commandRecognizer?.setRecognitionListener(
                    object : RecognitionListener {

                        override fun onReadyForSpeech(
                            params: android.os.Bundle?
                        ) {
                            MainActivity.instance?.sendVoiceState(
                                "LISTENING_TO_COMMAND"
                            )
                        }

                        override fun onBeginningOfSpeech() {
                        }

                        override fun onRmsChanged(
                            rmsdB: Float
                        ) {
                        }

                        override fun onBufferReceived(
                            buffer: ByteArray?
                        ) {
                        }

                        override fun onEndOfSpeech() {
                            MainActivity.instance?.sendVoiceState(
                                "PROCESSING_COMMAND"
                            )
                        }

                        override fun onError(
                            error: Int
                        ) {
                            MainActivity.instance?.sendVoiceState(
                                "COMMAND_ERROR_$error"
                            )
                            resumeWakeWord()
                        }

                        override fun onResults(
                            results: android.os.Bundle?
                        ) {
                            val texts =
                                results?.getStringArrayList(
                                    SpeechRecognizer.RESULTS_RECOGNITION
                                )

                            val best =
                                texts?.firstOrNull()?.trim()
                                    ?: ""

                            if (best.isNotEmpty()) {
                                MainActivity.instance?.deliverSpeech(
                                    best
                                )
                            }

                            resumeWakeWord()
                        }

                        override fun onPartialResults(
                            partialResults: android.os.Bundle?
                        ) {
                        }

                        override fun onEvent(
                            eventType: Int,
                            params: android.os.Bundle?
                        ) {
                        }
                    }
                )

                val intent =
                    Intent(
                        RecognizerIntent.ACTION_RECOGNIZE_SPEECH
                    ).apply {
                        putExtra(
                            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                        )
                        putExtra(
                            RecognizerIntent.EXTRA_LANGUAGE,
                            "ar-EG"
                        )
                        putExtra(
                            RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE,
                            "ar-EG"
                        )
                        putExtra(
                            RecognizerIntent.EXTRA_PARTIAL_RESULTS,
                            false
                        )
                        putExtra(
                            RecognizerIntent.EXTRA_MAX_RESULTS,
                            3
                        )
                    }

                commandRecognizer?.startListening(
                    intent
                )

            } catch (_: Throwable) {
                resumeWakeWord()
            }
        }
    }

    private fun resumeWakeWord() {
        mainHandler.postDelayed(
            {
                if (!running.get()) return@postDelayed

                commandRecognizer?.destroy()
                commandRecognizer = null

                commandMode.set(false)

                MainActivity.instance?.sendVoiceState(
                    "PASSIVE_LISTENING"
                )

                startWakeLoop()
            },
            500
        )
    }

    private fun extractText(result: String): String {
        return try {
            JSONObject(result)
                .optString(
                    "text",
                    ""
                )
                .trim()
        } catch (_: Throwable) {
            ""
        }
    }

    private fun stopAudioCapture() {
        try {
            audioRecord?.stop()
        } catch (_: Throwable) {
        }
        releaseAudio()
    }

    private fun releaseAudio() {
        try {
            audioRecord?.release()
        } catch (_: Throwable) {
        }
        audioRecord = null
    }

    private fun copyAssetDirectory(
        assetPath: String,
        destination: File
    ) {
        destination.mkdirs()

        val children =
            assets.list(assetPath)
                ?: emptyArray()

        if (children.isEmpty()) {
            assets.open(assetPath).use { input ->
                val target =
                    File(
                        destination.parentFile,
                        destination.name
                    )
                copyStream(
                    input,
                    target
                )
            }
            return
        }

        for (child in children) {
            val childAsset =
                "$assetPath/$child"
            val target =
                File(
                    destination,
                    child
                )

            val nested =
                assets.list(childAsset)
                    ?: emptyArray()

            if (nested.isEmpty()) {
                assets.open(childAsset).use { input ->
                    copyStream(
                        input,
                        target
                    )
                }
            } else {
                copyAssetDirectory(
                    childAsset,
                    target
                )
            }
        }
    }

    private fun copyStream(
        input: InputStream,
        target: File
    ) {
        target.parentFile?.mkdirs()
        FileOutputStream(target).use { output ->
            input.copyTo(output)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(
                    com.thunderfire.neo.R.string.wake_service_channel
                ),
                NotificationManager.IMPORTANCE_LOW
            )

            channel.description =
                "Local Neo wake-word microphone service"

            val manager =
                getSystemService(
                    NotificationManager::class.java
                )

            manager.createNotificationChannel(
                channel
            )
        }
    }

    private fun buildNotification(
        text: String
    ): Notification {
        val launchIntent =
            Intent(
                this,
                MainActivity::class.java
            )

        val pendingIntent =
            PendingIntent.getActivity(
                this,
                1,
                launchIntent,
                PendingIntent.FLAG_IMMUTABLE or
                    PendingIntent.FLAG_UPDATE_CURRENT
            )

        return NotificationCompat.Builder(
            this,
            CHANNEL_ID
        )
            .setContentTitle(
                getString(
                    R.string.wake_service_title
                )
            )
            .setContentText(text)
            .setSmallIcon(
                android.R.drawable.ic_btn_speak_now
            )
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setCategory(
                NotificationCompat.CATEGORY_SERVICE
            )
            .setPriority(
                NotificationCompat.PRIORITY_LOW
            )
            .build()
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {
        if (!running.get()) {
            running.set(true)
            isRunning = true
            prepareModelAndStart()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running.set(false)
        isRunning = false
        commandMode.set(false)

        try {
            commandRecognizer?.cancel()
            commandRecognizer?.destroy()
        } catch (_: Throwable) {
        }

        commandRecognizer = null

        worker?.interrupt()
        worker = null

        stopAudioCapture()

        try {
            recognizer?.close()
        } catch (_: Throwable) {
        }

        recognizer = null

        try {
            model?.close()
        } catch (_: Throwable) {
        }

        model = null

        mainHandler.post {
            MainActivity.instance?.sendVoiceState(
                "STOPPED"
            )
        }

        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
