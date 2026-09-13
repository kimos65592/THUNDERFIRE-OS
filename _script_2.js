
        lucide.createIcons();
        /* 6.5. TACTICAL INTENT & HARDWARE VOICE COMMAND ENGINE */
        class IntentEngine {
            static processUserIntent(text) {
                const lower = text.trim();

                // 1. Flashlight Voice Commands
                if (/(شغل|افتح|تفعيل|اطفئ|اقفل|إيقاف|سوي|اطفي|ولع).*(كشاف|فلاش|ضوء|torch|flashlight)/i.test(lower) || /كشاف|فلاش/i.test(lower)) {
                    if (/(اطفئ|اقفل|إيقاف|اطفي|سكر)/i.test(lower)) {
                        if (STATE.isTorchOn) HardwareControls.toggleFlashlight();
                    } else {
                        if (!STATE.isTorchOn) HardwareControls.toggleFlashlight();
                    }
                }

                // 2. Hardware Vibration Voice Command
                if (/(اهتز|هز|تنبيه بالاهتزاز|vibrate)/i.test(lower)) {
                    HardwareControls.vibratePhone([300, 150, 300]);
                }

                // 3. Brightness Control Command
                const brightnessMatch = lower.match(/(سطوع|تعتيم|اضاءة|إضاءة)\s*(\d{1,3})/i);
                if (brightnessMatch) {
                    let val = parseInt(brightnessMatch[2]);
                    if (val >= 0 && val <= 100) {
                        let overlayVal = 100 - val;
                        HardwareControls.setDimOverlay(overlayVal);
                        const rangeInput = document.querySelector('input[type="range"]');
                        if (rangeInput) rangeInput.value = overlayVal;
                    }
                } else if (/(قلل|خفف|وطي).*(سطوع|اضاءة|إضاءة|شاشة)/i.test(lower)) {
                    HardwareControls.setDimOverlay(50);
                } else if (/(ارفع|زود|علي).*(سطوع|اضاءة|إضاءة|شاشة)/i.test(lower)) {
                    HardwareControls.setDimOverlay(0);
                }

                // 4. Everlasting Name & Hobby Automatic Extraction
                const nameMatch = lower.match(/(اسمي|أنا اسمي|يدعونني|نادني|احفظ ان اسمي|تذكر ان اسمي)\s+([^\s\.\,]+)/i);
                if (nameMatch && nameMatch[2]) {
                    const userName = nameMatch[2];
                    MemoryVaults.saveProfileField('name', userName);
                    const facts = MemoryVaults.getFacts();
                    const updatedFacts = facts.filter(f => !f.startsWith("اسم المستخدِم الدائم:"));
                    updatedFacts.unshift(`اسم المستخدِم الدائم: ${userName}`);
                    MemoryVaults.saveFacts(updatedFacts);
                }

                const hobbyMatch = lower.match(/(هوايتي|أحب|اهتمامي|احفظ ان هوايتي|تذكر ان هوايتي)\s+(.+)/i);
                if (hobbyMatch && hobbyMatch[2]) {
                    const userHobby = hobbyMatch[2].trim();
                    MemoryVaults.saveProfileField('hobbies', userHobby);
                }

                if (/(احفظ أن|احفظ ان|تذكر أن|تذكر ان)\s+(.+)/i.test(lower)) {
                    const factText = lower.match(/(احفظ أن|احفظ ان|تذكر أن|تذكر ان)\s+(.+)/i)[2];
                    if (factText && factText.length > 2) {
                        const facts = MemoryVaults.getFacts();
                        if (!facts.includes(factText)) {
                            facts.push(factText);
                            MemoryVaults.saveFacts(facts);
                            NotificationEngine.showToast(`🧠 تم حفظ الحقيقة بالذاكرة الدائمة الأبدية`);
                        }
                    }
                }
            }

            static processResponseActions(responseText) {
                const actionRegex = /\[ACTION:(.*?)\]/g;
                let match;
                while ((match = actionRegex.exec(responseText)) !== null) {
                    const actionStr = match[1];
                    const [cmd, param] = actionStr.split(':');
                    if (cmd === 'TOGGLE_FLASHLIGHT') HardwareControls.toggleFlashlight();
                    if (cmd === 'FLASHLIGHT_ON' && !STATE.isTorchOn) HardwareControls.toggleFlashlight();
                    if (cmd === 'FLASHLIGHT_OFF' && STATE.isTorchOn) HardwareControls.toggleFlashlight();
                    if (cmd === 'VIBRATE') HardwareControls.vibratePhone([300, 150, 300]);
                    if (cmd === 'SET_BRIGHTNESS' && param) {
                        let overlayVal = 100 - parseInt(param);
                        HardwareControls.setDimOverlay(overlayVal);
                    }
                }
                return responseText.replace(/\[ACTION:.*?\]/g, '').trim();
            }
        }

        /* 7. STREAMING GEMINI ENGINE (SYNCED WITH EVERLASTING VAULTS) */
        class GeminiStreamEngine {
            static async streamPrompt(userPrompt, onChunkReceived, onComplete) {
                STATE.isStreaming = true;
                AudioStreamer.reset();
                showStreamingIndicator("جاري البث المباشر واستلام الصوت اللحظي...");

                const profile = MemoryVaults.getProfile();
                const facts = MemoryVaults.getFacts().join("\n- ");
                const directives = MemoryVaults.getDirectives();
                const pastSessions = MemoryVaults.getPastSessions();
                const pastSummary = pastSessions.slice(0, 3).map(s => s.firstMessage).join(" | ");

                const systemInstruction = `أنت نظام J.A.R.V.I.S Mark V OS - المساعد الذكي الفائق المحفوظ الهوية للأبد.
1. هوية المستخدِم الدائمة والذاكرة الأبدية (Vault 1 & Profile):
- الاسم الدائم للمستخدِم: ${profile.name}
- الهوايات والاهتمامات: ${profile.hobbies}
- كافة الحقائق المخزنة:
- ${facts}

2. التوجيهات التشغيلية وشخصية النظام (Vault 2):
${directives}

3. الجلسات السابقة (Vault 3 Archive):
${pastSummary || 'لا توجد أرشفة قريبة'}

تحدث دائماً بلغة ذكية وتكتيكية مخاطباً المستخدم باسمه (${profile.name}). إذا طلب التحكم بالعتاد، أضف أحد الأوامر التالية:
[ACTION:TOGGLE_FLASHLIGHT]
[ACTION:VIBRATE]
[ACTION:SET_BRIGHTNESS:50]`;

                const contents = [];
                const recentHistory = STATE.activeSessionMessages.slice(-15);
                recentHistory.forEach(msg => {
                    if (msg.user) contents.push({ role: "user", parts: [{ text: msg.user }] });
                    if (msg.bot) contents.push({ role: "model", parts: [{ text: msg.bot }] });
                });
                contents.push({ role: "user", parts: [{ text: userPrompt }] });

                const url = `${CONFIG.geminiApiBase}/${CONFIG.geminiModel}:streamGenerateContent?alt=sse&key=${STATE.apiKey}`;

                try {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: contents,
                            systemInstruction: { parts: [{ text: systemInstruction }] }
                        })
                    });

                    if (!response.ok) throw new Error(`خطأ في خادم Gemini (${response.status})`);

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder("utf-8");
                    let buffer = "";
                    let fullText = "";

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop();

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const jsonStr = line.replace(/^data:\s*/, "").trim();
                                if (jsonStr === "[DONE]") continue;

                                try {
                                    const parsed = JSON.parse(jsonStr);
                                    const chunk = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                                    if (chunk) {
                                        fullText += chunk;
                                        onChunkReceived(chunk);
                                        AudioStreamer.pushChunk(chunk);
                                    }
                                } catch (e) {}
                            }
                        }
                    }

                    AudioStreamer.flush();
                    hideStreamingIndicator();
                    STATE.isStreaming = false;

                    STATE.activeSessionMessages.push({ user: userPrompt, bot: fullText });
                    MemoryVaults.render();

                    if (onComplete) onComplete(fullText);
                    return fullText;

                } catch (err) {
                    hideStreamingIndicator();
                    STATE.isStreaming = false;
                    alert("⚠️ خطأ في الاتصال: " + err.message);
                    return null;
                }
            }
        }

        /* 8. LIVE CONTINUOUS VOICE ENGINE */
        class LiveVoiceEngine {
            static toggleLiveMode() {
                STATE.isLiveModeActive = !STATE.isLiveModeActive;
                const btnText = document.getElementById("live-mode-btn-text");
                const btn = document.getElementById("live-chat-toggle-btn");

                if (STATE.isLiveModeActive) {
                    if (btnText) btnText.innerText = "محادثة لايف: نشطة 🎙️";
                    btn.classList.add("live-talking-glow", "bg-cyan-500", "text-slate-950");
                    this.startContinuousListening();
                } else {
                    if (btnText) btnText.innerText = "محادثة لايف";
                    btn.classList.remove("live-talking-glow", "bg-cyan-500", "text-slate-950");
                    if (STATE.speechRecognition) STATE.speechRecognition.stop();
                }
            }

            static startContinuousListening() {
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    alert("التعرف الصوتي غير مدعوم بمتصفحك.");
                    return;
                }

                const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (STATE.speechRecognition) try { STATE.speechRecognition.stop(); } catch(e){}

                const rec = new SpeechClass();
                rec.lang = 'ar-SA';
                rec.continuous = false;
                rec.interimResults = false;

                rec.onstart = () => {
                    document.getElementById("mic-btn").classList.add("text-red-400", "animate-pulse");
                    showStreamingIndicator("JARVIS أستمع إليك الآن...");
                };

                rec.onresult = (event) => {
                    const speechText = event.results[0][0].transcript;
                    if (speechText.trim()) {
                        document.getElementById("user-input").value = speechText;
                        handleUserSubmit(new Event('submit'));
                    }
                };

                rec.onend = () => {
                    document.getElementById("mic-btn").classList.remove("text-red-400", "animate-pulse");
                    if (!STATE.isStreaming) hideStreamingIndicator();
                };

                STATE.speechRecognition = rec;
                try { rec.start(); } catch(e){}
            }
        }

        /* 9. VISION CAMERA ENGINE */
        class VisionEngine {
            static mediaStream = null;

            static toggleCameraDrawer() {
                const drawer = document.getElementById("vision-drawer");
                if (drawer) drawer.classList.toggle("hidden");
            }

            static async startCamera() {
                try {
                    const video = document.getElementById("vision-video-feed");
                    const placeholder = document.getElementById("camera-placeholder");
                    this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    video.srcObject = this.mediaStream;
                    if (placeholder) placeholder.classList.add("hidden");
                } catch(err) {
                    alert("تعذر تشغيل الكاميرا: " + err.message);
                }
            }

            static async captureAndAnalyze(promptText) {
                const video = document.getElementById("vision-video-feed");
                const canvas = document.getElementById("vision-snapshot-canvas");
                if (!video || !this.mediaStream) return alert("يرجى تشغيل الكاميرا أولاً.");

                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
                appendImageMessage("user", canvas.toDataURL('image/jpeg'), promptText);

                showStreamingIndicator("جاري تحليل الصورة عبر Gemini Vision...");

                try {
                    const url = `${CONFIG.geminiApiBase}/${CONFIG.geminiModel}:generateContent?key=${STATE.apiKey}`;
                    const res = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: promptText },
                                    { inlineData: { mimeType: "image/jpeg", data: base64Image } }
                                ]
                            }]
                        })
                    });
                    const data = await res.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "لم أتمكن من قراءة الصورة.";
                    appendMessage("jarvis", text);
                    AudioStreamer.pushChunk(text);
                    AudioStreamer.flush();
                } catch(e) {
                    appendMessage("jarvis", "⚠️ خطأ الكاميرا: " + e.message);
                } finally {
                    hideStreamingIndicator();
                }
            }
        }

        /* 10. ARC REACTOR CANVAS ANIMATION */
        class ArcReactorCanvas {
            constructor(id) {
                this.canvas = document.getElementById(id);
                if (!this.canvas) return;
                this.ctx = this.canvas.getContext('2d');
                this.angle = 0;
                this.render();
            }

            render() {
                if (!this.canvas) return;
                const ctx = this.ctx;
                const w = this.canvas.width; const h = this.canvas.height;
                const cx = w / 2; const cy = h / 2;

                ctx.clearRect(0, 0, w, h);
                this.angle += STATE.isStreaming ? 0.08 : 0.03;

                ctx.save();
                ctx.translate(cx, cy); ctx.rotate(this.angle);
                ctx.strokeStyle = STATE.isStreaming ? '#00ffaa' : '#00f3ff'; 
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();

                for (let i = 0; i < 6; i++) {
                    ctx.rotate(Math.PI / 3);
                    ctx.fillStyle = STATE.isStreaming ? '#00ffaa' : '#00f3ff';
                    ctx.fillRect(8, -2, 5, 4);
                }
                ctx.restore();

                ctx.beginPath();
                ctx.arc(cx, cy, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff'; 
                ctx.shadowColor = STATE.isStreaming ? '#00ffaa' : '#00f3ff'; 
                ctx.shadowBlur = 12;
                ctx.fill();

                requestAnimationFrame(() => this.render());
            }
        }

        /* =========================================================
           NEO NATIVE ANDROID BRIDGE
        ========================================================= */
        window.NativeVoice = {
            onVoiceState(state) {
                const indicator = document.getElementById("streaming-indicator");
                const text = document.getElementById("streaming-text");
                const mic = document.getElementById("mic-btn");

                const messages = {
                    READY: "Neo جاهز للاستماع محليًا...",
                    PASSIVE_LISTENING: "Neo يستمع للكلمة المفتاحية محليًا...",
                    WAKE_DETECTED: "Neo — سمعتك. تفضل...",
                    LISTENING_TO_COMMAND: "Neo يستمع إلى أمرك الآن...",
                    PROCESSING_COMMAND: "جاري فهم الأمر...",
                    COMMAND_RECEIVED: "تم استلام الأمر...",
                    STOPPED: "الاستماع متوقف",
                    MIC_PERMISSION_DENIED: "إذن الميكروفون مرفوض",
                    WAKE_MODEL_ERROR: "تعذر تحميل محرك Neo المحلي"
                };

                if (indicator && text) {
                    text.innerText = messages[state] || ("Neo: " + state);
                    indicator.classList.remove("hidden");
                }

                if (mic) {
                    mic.classList.toggle("text-red-400", state !== "PASSIVE_LISTENING" && state !== "STOPPED");
                    mic.classList.toggle("animate-pulse", state === "WAKE_DETECTED" || state === "LISTENING_TO_COMMAND");
                }
            },

            onSpeechResult(text) {
                const input = document.getElementById("user-input");
                if (!input || !text) return;

                input.value = text;
                handleUserSubmit(new Event("submit"));
            }
        };

        /* On Android, the native service owns microphone lifecycle. */
        const _toggleInstantSpeech = window.toggleInstantSpeech;
        window.toggleInstantSpeech = function() {
            if (window.AndroidBridge) {
                try {
                    window.AndroidBridge.startNeo();
                    NativeVoice.onVoiceState("READY");
                    return;
                } catch (e) {}
            }
            if (typeof _toggleInstantSpeech === "function") {
                _toggleInstantSpeech();
            }
        };

        /* Native hardware bridge where Android APIs are available. */
        const _hardwareToggleFlashlight = HardwareControls.toggleFlashlight.bind(HardwareControls);
        HardwareControls.toggleFlashlight = async function() {
            if (window.AndroidBridge) {
                const next = !STATE.isTorchOn;
                try {
                    const ok = window.AndroidBridge.setFlashlight(next);
                    if (ok) {
                        STATE.isTorchOn = next;
                        SFXEngine.playTacticalBeep(700, 0.1);
                        NotificationEngine.showToast(next ? "🔦 تم تشغيل كشاف الهاتف" : "🔦 تم إطفاء الكشاف");
                        return;
                    }
                } catch (e) {}
            }
            return _hardwareToggleFlashlight();
        };

        const _hardwareVibrate = HardwareControls.vibratePhone.bind(HardwareControls);
        HardwareControls.vibratePhone = function(pattern) {
            if (window.AndroidBridge) {
                try {
                    window.AndroidBridge.vibrate();
                    return;
                } catch (e) {}
            }
            return _hardwareVibrate(pattern);
        };

        /* Native TTS for APK; WebSpeech remains the Web fallback. */
        const _enqueueSentence = AudioStreamer.enqueueSentence.bind(AudioStreamer);
        AudioStreamer.enqueueSentence = function(sentence) {
            if (window.AndroidBridge && sentence && sentence.trim()) {
                try {
                    window.AndroidBridge.speak(sentence.replace(/```[\s\S]*?```/g, '').replace(/\[ACTION:.*?\]/g, '').replace(/[*_#`]/g, '').trim());
                    return;
                } catch (e) {}
            }
            return _enqueueSentence(sentence);
        };


        const CONFIG = {
            geminiModel: "gemini-2.5-flash",
            geminiApiBase: "https://generativelanguage.googleapis.com/v1beta/models",
            storagePrefix: "JARVIS_MARK_V_EVERLASTING_",
            currentMode: "NORMAL"
        };

        const STATE = {
            apiKey: localStorage.getItem(CONFIG.storagePrefix + "API_KEY") || "",
            isLiveModeActive: false,
            isStreaming: false,
            speechRecognition: null,
            flashlightTrack: null,
            isTorchOn: false,
            activeSessionMessages: [],
            receivedNotificationsHistory: []
        };

        /* 0. TACTICAL AUDIO SFX SYNTHESIZER */
        class SFXEngine {
            static getCtx() {
                if (!this.audioCtx) {
                    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
                return this.audioCtx;
            }

            static playTacticalBeep(freq = 800, duration = 0.15, type = 'sine') {
                try {
                    const ctx = this.getCtx();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, ctx.currentTime);
                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + duration);
                } catch(e){}
            }

            static playAlarmSequence() {
                try {
                    const ctx = this.getCtx();
                    const now = ctx.currentTime;
                    [0, 0.2, 0.4, 0.6].forEach(delay => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(950, now + delay);
                        osc.frequency.exponentialRampToValueAtTime(450, now + delay + 0.15);
                        gain.gain.setValueAtTime(0.25, now + delay);
                        gain.gain.linearRampToValueAtTime(0.01, now + delay + 0.15);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now + delay);
                        osc.stop(now + delay + 0.15);
                    });
                } catch(e){}
            }
        }

        /* 1. AUDIO SYNTHESIZER & STREAMING VOICE */
        class LiveAudioStreamer {
            constructor() {
                this.sentenceBuffer = "";
                this.synth = window.speechSynthesis;
            }

            reset() {
                this.sentenceBuffer = "";
                if (this.synth) this.synth.cancel();
            }

            pushChunk(textChunk) {
                if (CONFIG.currentMode === "SILENT") return;
                this.sentenceBuffer += textChunk;
                const parts = this.sentenceBuffer.split(/([\.!\?\n،؟])/);

                while (parts.length > 2) {
                    const sentence = (parts.shift() + parts.shift()).trim();
                    if (sentence.length > 1) this.enqueueSentence(sentence);
                }
                this.sentenceBuffer = parts.join('');
            }

            flush() {
                if (this.sentenceBuffer.trim().length > 0) {
                    this.enqueueSentence(this.sentenceBuffer.trim());
                    this.sentenceBuffer = "";
                }
            }

            enqueueSentence(sentence) {
                const clean = sentence.replace(/```[\s\S]*?```/g, '').replace(/\[ACTION:.*?\]/g, '').replace(/[*_#`]/g, '').trim();
                if (!clean) return;

                const utterance = new SpeechSynthesisUtterance(clean);
                utterance.lang = "ar-SA";
                utterance.rate = 1.15;
                utterance.pitch = 0.95;

                utterance.onend = () => {
                    if (this.synth && !this.synth.speaking && STATE.isLiveModeActive) {
                        setTimeout(() => {
                            if (STATE.isLiveModeActive && !STATE.isStreaming) {
                                LiveVoiceEngine.startContinuousListening();
                            }
                        }, 250);
                    }
                };

                if (this.synth) this.synth.speak(utterance);
            }

            speakNotification(text) {
                if (this.synth && CONFIG.currentMode !== "SILENT") {
                    const u = new SpeechSynthesisUtterance("تنبيه من جارفيس: " + text);
                    u.lang = "ar-SA";
                    u.rate = 1.1;
                    this.synth.speak(u);
                }
            }
        }
        const AudioStreamer = new LiveAudioStreamer();

        /* 2. EVERLASTING 5-VAULT MEMORY & IDENTITY ENGINE (PERMANENT RETENTION) */
        class MemoryVaults {
            // Profile & User Identity Vault
            static getProfile() {
                const defaultProf = { name: "المدير المسئول", hobbies: "التكنولوجيا والبرمجة" };
                try {
                    return JSON.parse(localStorage.getItem(CONFIG.storagePrefix + "PROFILE")) || defaultProf;
                } catch(e) { return defaultProf; }
            }

            static saveProfileField(field, val) {
                const prof = this.getProfile();
                prof[field] = val.trim();
                localStorage.setItem(CONFIG.storagePrefix + "PROFILE", JSON.stringify(prof));
                NotificationEngine.showToast(`🧠 تم تحديث الهوية الدائمة: ${field === 'name' ? 'الاسم' : 'الهوايات'}`);
                this.render();
            }

            // Vault 1: Permanent Facts Vault
            static getFacts() {
                const prof = this.getProfile();
                const defaultFacts = [
                    `اسم المستخدِم الدائم: ${prof.name}`,
                    `هوايات واهتمامات المستخدِم: ${prof.hobbies}`,
                    "النظام: J.A.R.V.I.S Mark V OS",
                    "الصلاحية: مدير الهاتف الكامل"
                ];
                try {
                    const stored = JSON.parse(localStorage.getItem(CONFIG.storagePrefix + "VAULT_FACTS"));
                    return (stored && Array.isArray(stored) && stored.length > 0) ? stored : defaultFacts;
                } catch(e) { return defaultFacts; }
            }

            static saveFacts(facts) {
                localStorage.setItem(CONFIG.storagePrefix + "VAULT_FACTS", JSON.stringify(facts));
                this.render();
            }

            static addFactPrompt() {
                const f = prompt("أدخل حقيقة جديدة للحفظ الأبدي بالذاكرة الدائمة:");
                if (f && f.trim()) {
                    const facts = this.getFacts();
                    facts.push(f.trim());
                    this.saveFacts(facts);
                    NotificationEngine.showToast("🧠 تم حفظ الحقيقة الجديدة بالذاكرة الأبدية");
                }
            }

            static deleteFact(idx) {
                const facts = this.getFacts();
                facts.splice(idx, 1);
                this.saveFacts(facts);
            }

            // Vault 2: Personality Directives Vault
            static getDirectives() {
                return localStorage.getItem(CONFIG.storagePrefix + "VAULT_DIRECTIVES") || "تحدث بإيجاز وتكتيكية عالية، ونفذ الأوامر بسرعة ودقة مع تذكر اسم المستخدم وهواياته دائماً.";
            }

            static saveDirectives(text) {
                localStorage.setItem(CONFIG.storagePrefix + "VAULT_DIRECTIVES", text);
                NotificationEngine.showToast("⚙️ تم تحديث تعليمات الشخصية بالذاكرة");
            }

            // Vault 3: Past Sessions History Archive Vault
            static getPastSessions() {
                try {
                    return JSON.parse(localStorage.getItem(CONFIG.storagePrefix + "PAST_SESSIONS")) || [];
                } catch(e) { return []; }
            }

            static savePastSessions(sessions) {
                localStorage.setItem(CONFIG.storagePrefix + "PAST_SESSIONS", JSON.stringify(sessions));
                this.render();
            }

            static archiveCurrentSession() {
                if (STATE.activeSessionMessages.length === 0) {
                    return NotificationEngine.showToast("⚠️ لا توجد محادثات بالجلسة الحالية لأرشفتها.");
                }
                const sessions = this.getPastSessions();
                const newSession = {
                    id: Date.now(),
                    date: new Date().toLocaleString('ar-EG'),
                    messagesCount: STATE.activeSessionMessages.length,
                    firstMessage: STATE.activeSessionMessages[0]?.user || "جلسة حوارية",
                    fullHistory: [...STATE.activeSessionMessages]
                };
                sessions.unshift(newSession);
                if (sessions.length > 15) sessions.pop(); // keep last 15 sessions
                this.savePastSessions(sessions);
                NotificationEngine.showToast("📥 تم أرشفة الجلسة الحالية في الخزينة الثالثة بنجاح");
            }

            static clearSessions() {
                if (confirm("هل أنت تأكد من مسح أرشيف الجلسات السابقة بالكامل؟")) {
                    localStorage.removeItem(CONFIG.storagePrefix + "PAST_SESSIONS");
                    this.render();
                    NotificationEngine.showToast("🗑️ تم مسح أرشيف الجلسات السابقة");
                }
            }

            static deleteSession(idx) {
                const sessions = this.getPastSessions();
                sessions.splice(idx, 1);
                this.savePastSessions(sessions);
            }

            // Vault 4 & 5: Active Context & Rendering
            static resetActiveSession() {
                STATE.activeSessionMessages = [];
                NotificationEngine.showToast("🔄 تم إعادة ضبط الجلسة النشطة");
                this.render();
            }

            static render() {
                // Render Profile Data Inputs
                const prof = this.getProfile();
                const nameInput = document.getElementById("user-profile-name");
                const hobbiesInput = document.getElementById("user-profile-hobbies");
                if (nameInput && !nameInput.value) nameInput.value = prof.name;
                if (hobbiesInput && !hobbiesInput.value) hobbiesInput.value = prof.hobbies;

                // Update Welcome Message
                const welcomeEl = document.getElementById("welcome-message-text");
                if (welcomeEl) {
                    welcomeEl.innerHTML = `مرحباً بك يا <strong class="text-cyan-400">${escapeHtml(prof.name)}</strong>. <strong class="text-cyan-400">J.A.R.V.I.S Mark V OS</strong> يعمل بالذاكرة الأبدية المحفوظة.`;
                }

                // Render Facts List
                const listEl = document.getElementById("vault-facts-list");
                if (listEl) {
                    listEl.innerHTML = this.getFacts().map((fact, idx) => `
                        <div class="p-2 rounded bg-slate-900 border border-purple-500/20 flex justify-between items-center text-slate-200">
                            <span class="truncate">• ${escapeHtml(fact)}</span>
                            <button onclick="MemoryVaults.deleteFact(${idx})" class="text-red-400 text-[10px] hover:underline shrink-0 mr-1">حذف</button>
                        </div>
                    `).join('');
                }

                // Render Directives
                const dirEl = document.getElementById("vault-directives-text");
                if (dirEl && !dirEl.value) dirEl.value = this.getDirectives();

                // Render Past Sessions
                const sessEl = document.getElementById("vault-sessions-list");
                if (sessEl) {
                    const sessions = this.getPastSessions();
                    if (sessions.length === 0) {
                        sessEl.innerHTML = `<p class="text-[11px] text-slate-500 italic">لا توجد جلسات مؤرشفة سابقاً.</p>`;
                    } else {
                        sessEl.innerHTML = sessions.map((s, idx) => `
                            <div class="p-2 rounded bg-slate-900 border border-purple-500/20 flex justify-between items-center text-slate-200">
                                <div>
                                    <p class="font-bold text-purple-300 text-[11px] truncate">${escapeHtml(s.firstMessage)}</p>
                                    <p class="text-[9px] text-slate-400">🕒 ${s.date} (${s.messagesCount} رسالة)</p>
                                </div>
                                <button onclick="MemoryVaults.deleteSession(${idx})" class="text-red-400 text-[10px] hover:underline shrink-0">حذف</button>
                            </div>
                        `).join('');
                    }
                }

                // Render Active Stats
                const statsEl = document.getElementById("vault-active-stats");
                if (statsEl) {
                    const rems = TaskEngine.getReminders();
                    statsEl.innerHTML = `
                        <p>• الاسم المسجل بالأبدية: <strong class="text-cyan-400">${escapeHtml(prof.name)}</strong></p>
                        <p>• الهوايات: <strong class="text-emerald-300">${escapeHtml(prof.hobbies)}</strong></p>
                        <p>• عدد الحقائق الدائمة: <strong class="text-purple-300">${this.getFacts().length}</strong></p>
                        <p>• التذكيرات والمهام: <strong class="text-amber-300">${rems.length} مهمة</strong></p>
                        <p>• رسائل الجلسة الحالية: <strong class="text-emerald-300">${STATE.activeSessionMessages.length} رسالة</strong></p>
                    `;
                }
            }
        }

        /* 3. HARDWARE & MESSAGING CONTROLS (FULL HARDWARE BINDINGS) */
        class HardwareControls {
            static async toggleFlashlight() {
                try {
                    if (!STATE.flashlightTrack || STATE.flashlightTrack.readyState !== 'live') {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: { exact: 'environment' } }
                        }).catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }));
                        STATE.flashlightTrack = stream.getVideoTracks()[0];
                    }

                    const track = STATE.flashlightTrack;
                    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
                    STATE.isTorchOn = !STATE.isTorchOn;

                    if ('torch' in capabilities || track.getConstraints) {
                        await track.applyConstraints({ advanced: [{ torch: STATE.isTorchOn }] });
                        SFXEngine.playTacticalBeep(700, 0.1);
                        NotificationEngine.showToast(STATE.isTorchOn ? "🔦 تم تشغيل كشاف الهاتف" : "🔦 تم إطفاء الكشاف");
                    } else {
                        await track.applyConstraints({ advanced: [{ torch: STATE.isTorchOn }] });
                        SFXEngine.playTacticalBeep(700, 0.1);
                        NotificationEngine.showToast(STATE.isTorchOn ? "🔦 تم تشغيل الكشاف" : "🔦 تم إطفاء الكشاف");
                    }
                } catch(err) {
                    STATE.isTorchOn = false;
                    NotificationEngine.showToast("⚠️ تعذر التحكم بالكشاف: " + err.message, "error");
                }
            }

            static vibratePhone(pattern) {
                if (navigator.vibrate) {
                    navigator.vibrate(pattern);
                    SFXEngine.playTacticalBeep(400, 0.08);
                } else {
                    NotificationEngine.showToast("📳 الاهتزاز غير مدعوم على هذا المتصفح");
                }
            }

            static setDimOverlay(val) {
                const overlay = document.getElementById("hardware-brightness-overlay");
                const label = document.getElementById("brightness-val-label");
                if (overlay && label) {
                    const opacity = val / 100;
                    overlay.style.opacity = opacity;
                    label.innerText = (100 - val) + "%";
                }
            }

            static initBattery() {
                if ('getBattery' in navigator) {
                    navigator.getBattery().then(b => {
                        const update = () => {
                            const ind = document.getElementById("battery-indicator");
                            if (ind) ind.innerText = `🔋 البطارية: ${Math.round(b.level * 100)}% ${b.charging ? '⚡' : ''}`;
                        };
                        update();
                        b.addEventListener('levelchange', update);
                        b.addEventListener('chargingchange', update);
                    });
                }
            }
        }

        class MessagingEngine {
            static sendWhatsApp() {
                const phone = document.getElementById("msg-phone-number").value.replace(/[^0-9]/g, '');
                const body = encodeURIComponent(document.getElementById("msg-content-body").value);
                if (!phone || !body) return alert("يرجى إدخال الرقم والنص.");
                window.open(`https://wa.me/${phone}?text=${body}`, '_blank');
            }

            static sendSMS() {
                const phone = document.getElementById("msg-phone-number").value;
                const body = encodeURIComponent(document.getElementById("msg-content-body").value);
                if (!body) return alert("يرجى إدخال النص.");
                window.open(`sms:${phone}?body=${body}`, '_blank');
            }

            static shareNative() {
                const body = document.getElementById("msg-content-body").value;
                if (navigator.share && body) {
                    navigator.share({ title: 'رسالة من J.A.R.V.I.S', text: body });
                } else {
                    alert("خاصية Web Share غير مدعومة أو النص فارغ.");
                }
            }
        }

        /* 4. NOTIFICATION ENGINE & ANDROID NOTIFICATION LISTENER BRIDGE */
        class NotificationEngine {
            static requestPermission() {
                if ('Notification' in window) {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            this.showToast("🔔 تم تفعيل إشعارات المتصفح والنظام بنجاح");
                        } else {
                            this.showToast("⚠️ تم رفض إشعارات المتصفح، سيعمل التنبيه الصوتي الداخلي.");
                        }
                    });
                } else {
                    this.showToast("ℹ️ إشعارات النظام غير مدعومة بالمتصفح، تم تفعيل الصوت الداخلي.");
                }
            }

            static simulateIncomingNotification(appName, text) {
                const notifObj = {
                    id: Date.now(),
                    appName: appName || "تطبيقات الهاتف",
                    text: text || "رسالة جديدة وصلت لهاتفك",
                    time: new Date().toLocaleTimeString('ar-EG')
                };

                STATE.receivedNotificationsHistory.unshift(notifObj);
                this.renderNotificationsLog();

                // 1. Play Alert Sound Sequence
                SFXEngine.playAlarmSequence();

                // 2. Physical Vibration
                HardwareControls.vibratePhone([300, 100, 300]);

                // 3. HUD Toast Display
                this.showToast(`📩 إشعار من [${notifObj.appName}]: ${notifObj.text}`, "alert");

                // 4. Native Browser Notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification(`إشعار جديد: ${notifObj.appName}`, {
                            body: notifObj.text,
                            icon: 'https://placehold.co/100x100/00f3ff/000000?text=JARVIS'
                        });
                    } catch(e){}
                }

                // 5. Speech Synthesis Read Aloud
                const toggle = document.getElementById("auto-speak-notifications-toggle");
                if (!toggle || toggle.checked) {
                    AudioStreamer.speakNotification(`إشعار من ${notifObj.appName}: ${notifObj.text}`);
                }
            }

            static triggerCustomTestNotif() {
                const app = document.getElementById("test-notif-app").value.trim() || "WhatsApp";
                const txt = document.getElementById("test-notif-text").value.trim() || "أحمد: مرحباً جارفيس، جهز التقرير اليومي!";
                this.simulateIncomingNotification(app, txt);
            }

            static renderNotificationsLog() {
                const container = document.getElementById("incoming-notifications-log");
                if (!container) return;
                if (STATE.receivedNotificationsHistory.length === 0) {
                    container.innerHTML = `<p class="text-[11px] text-slate-500 italic">لا توجد إشعارات جديدة حتى الآن.</p>`;
                    return;
                }
                container.innerHTML = STATE.receivedNotificationsHistory.map(n => `
                    <div class="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex justify-between items-start text-xs">
                        <div>
                            <span class="font-bold text-emerald-300">📱 ${escapeHtml(n.appName)}</span>
                            <p class="text-slate-200 mt-0.5">${escapeHtml(n.text)}</p>
                        </div>
                        <span class="text-[9px] text-slate-400 font-mono">${n.time}</span>
                    </div>
                `).join('');
            }

            static showToast(message, type = 'info') {
                const toastContainer = document.getElementById("hud-toast-container");
                if (!toastContainer) return;
                const toast = document.createElement("div");
                const borderCol = type === 'alert' || type === 'error' ? 'border-red-500/80 bg-red-950/90 text-red-200 shadow-red-500/30' : 'border-cyan-500/80 bg-slate-900/95 text-cyan-200 shadow-cyan-500/30';
                toast.className = `p-3 rounded-xl border ${borderCol} shadow-xl backdrop-blur text-xs flex items-center justify-between transition-all duration-300 animate-pulse`;
                toast.innerHTML = `<span class="font-bold">${escapeHtml(message)}</span><button onclick="this.parentElement.remove()" class="text-xs opacity-70 hover:opacity-100 mr-3">✕</button>`;
                toastContainer.appendChild(toast);
                setTimeout(() => { if (toast.parentNode) toast.remove(); }, 7000);
            }
        }

        // Native Android APK Notification Listener Callback Receiver (Interface Bridge)
        window.onAndroidNotificationReceived = function(appName, text) {
            NotificationEngine.simulateIncomingNotification(appName, text);
        };

        class BackgroundKeepAlive {
            static async initWakeLock() {
                try {
                    if ('wakeLock' in navigator) {
                        await navigator.wakeLock.request('screen');
                    }
                } catch(e){}
            }

            static startSilentAudioLoop() {
                try {
                    const ctx = SFXEngine.getCtx();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    gain.gain.value = 0.0001; // Silent stream to prevent CPU sleeping
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                } catch(e){}
            }
        }

        /* 5. REMINDERS & SCHEDULE TICKER ENGINE (FOREGROUND & BACKGROUND) */
        class TaskEngine {
            static getReminders() {
                try {
                    return JSON.parse(localStorage.getItem(CONFIG.storagePrefix + "REMINDERS")) || [];
                } catch(e) { return []; }
            }

            static saveReminders(arr) {
                localStorage.setItem(CONFIG.storagePrefix + "REMINDERS", JSON.stringify(arr));
                this.render();
                MemoryVaults.render();
            }

            static addReminder(e) {
                e.preventDefault();
                const title = document.getElementById("task-title-input").value.trim();
                const time = document.getElementById("task-time-input").value;
                if (!title || !time) return;

                const reminders = this.getReminders();
                reminders.push({ id: Date.now(), title, time, triggered: false });
                this.saveReminders(reminders);

                document.getElementById("task-title-input").value = "";
                document.getElementById("task-time-input").value = "";
                NotificationEngine.showToast("⏰ تم جدولة التذكير بنجاح");
            }

            static deleteReminder(id) {
                const reminders = this.getReminders().filter(r => r.id !== id);
                this.saveReminders(reminders);
            }

            static render() {
                const container = document.getElementById("reminders-list-container");
                if (!container) return;
                const list = this.getReminders();
                if (list.length === 0) {
                    container.innerHTML = `<p class="text-xs text-slate-500">لا يوجد مواعيد أو مهام مسجلة حالياً.</p>`;
                    return;
                }
                container.innerHTML = list.map(r => `
                    <div class="p-3 rounded-xl bg-slate-900 border ${r.triggered ? 'border-red-500/50 bg-red-950/30' : 'border-amber-500/30'} flex justify-between items-center text-xs">
                        <div>
                            <p class="font-bold text-slate-100">${escapeHtml(r.title)}</p>
                            <p class="text-[10px] text-slate-400">⏰ ${new Date(r.time).toLocaleString('ar-EG')} ${r.triggered ? '⚠️ (تم التنبيه)' : ''}</p>
                        </div>
                        <button onclick="TaskEngine.deleteReminder(${r.id})" class="text-red-400 text-xs hover:underline">حذف</button>
                    </div>
                `).join('');
            }

            static startTickerLoop() {
                setInterval(() => {
                    const now = new Date().getTime();
                    const list = this.getReminders();
                    let changed = false;

                    list.forEach(r => {
                        const target = new Date(r.time).getTime();
                        if (!r.triggered && now >= target) {
                            r.triggered = true;
                            changed = true;
                            NotificationEngine.simulateIncomingNotification("تنبيه المواعيد", `حان الآن موعد: ${r.title}`);
                        }
                    });

                    if (changed) this.saveReminders(list);
                }, 1000);
            }
        }

        /* 6. CODE DEVELOPMENT & CUSTOM PLUGINS */
        class CodeExecutor {
            static runCode() {
                const code = document.getElementById("code-sandbox-editor").value;
                const outputEl = document.getElementById("code-output-box");
                try {
                    let logs = [];
                    const customConsole = { log: (...args) => logs.push(args.join(' ')) };
                    const fn = new Function('console', code);
                    fn(customConsole);
                    outputEl.innerText = logs.length > 0 ? logs.join('\n') : "تم التنفيذ بنجاح بدون مخرجات.";
                } catch(err) {
                    outputEl.innerText = "❌ خطأ في التنفيذ: " + err.message;
                }
            }
        }

        class PluginEngine {
            static getPlugins() {
                try {
                    return JSON.parse(localStorage.getItem(CONFIG.storagePrefix + "PLUGINS")) || [];
                } catch(e) { return []; }
            }

            static savePlugin() {
                const name = document.getElementById("plugin-name-input").value.trim();
                const code = document.getElementById("plugin-code-input").value.trim();
                if (!name || !code) return alert("يرجى ملء الاسم والكود.");

                const plugins = this.getPlugins();
                plugins.push({ name, code });
                localStorage.setItem(CONFIG.storagePrefix + "PLUGINS", JSON.stringify(plugins));
                document.getElementById("plugin-name-input").value = "";
                document.getElementById("plugin-code-input").value = "";
                this.render();
                NotificationEngine.showToast(`⚙️ تم إضافة الأداة ${name} بنجاح`);
            }

            static render() {
                const container = document.getElementById("plugins-list-container");
                if (!container) return;
                const list = this.getPlugins();
                container.innerHTML = list.map(p => `
                    <div class="p-2 rounded bg-slate-900 border border-cyan-500/30 flex justify-between items-center text-xs">
                        <span class="mono-font text-cyan-300">⚙️ ${escapeHtml(p.name)}()</span>
                        <span class="text-[10px] text-emerald-400">جاهزة للاستدعاء</span>
                    </div>
                `).join('');
            }
        }

        /* SYSTEM BOOT & INITIALIZATION */
        window.addEventListener("load", () => {
            new ArcReactorCanvas("arc-reactor-canvas");
            MemoryVaults.render();
            TaskEngine.render();
            TaskEngine.startTickerLoop();
            PluginEngine.render();
            HardwareControls.initBattery();
            BackgroundKeepAlive.initWakeLock();
            BackgroundKeepAlive.startSilentAudioLoop();
            updateApiKeyStatusUI();
        });

        function switchTab(tabId) {
            ['chat', 'vaults', 'phone', 'reminders', 'code'].forEach(t => {
                const view = document.getElementById('view-' + t);
                const btn = document.getElementById('tab-btn-' + t);
                if (view) view.classList.add('hidden');
                if (btn) btn.className = "w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-900 text-slate-400 text-xs font-bold transition-all";
            });

            const activeView = document.getElementById('view-' + tabId);
            const activeBtn = document.getElementById('tab-btn-' + tabId);
            if (activeView) activeView.classList.remove('hidden');
            if (activeBtn) activeBtn.className = "w-full flex items-center gap-3 p-2.5 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-bold";
        }

        function changeSystemMode(mode) {
            CONFIG.currentMode = mode;
            document.body.className = "h-screen flex flex-col overflow-hidden text-slate-200 select-none mode-" + mode.toLowerCase();
            MemoryVaults.render();
            NotificationEngine.showToast(`🎯 تم التبديل إلى الوضع: ${mode}`);
        }

        async function handleUserSubmit(e) {
            e.preventDefault();
            const inputEl = document.getElementById("user-input");
            const text = inputEl.value.trim();
            if (!text) return;

            inputEl.value = "";
            appendMessage("user", text);

            IntentEngine.processUserIntent(text);

            const jarvisBubbleId = appendEmptyStreamingMessage();

            await GeminiStreamEngine.streamPrompt(
                text,
                (chunk) => updateStreamingMessageChunk(jarvisBubbleId, chunk),
                (fullText) => {
                    const cleanedText = IntentEngine.processResponseActions(fullText);
                    finalizeStreamingMessage(jarvisBubbleId, cleanedText);
                }
            );
        }

        function toggleInstantSpeech() {
            LiveVoiceEngine.startContinuousListening();
        }

        function triggerArcPulse() {
            SFXEngine.playTacticalBeep(1200, 0.2);
            NotificationEngine.showToast("⚡ مفاعل أرك يفيض بالطاقة. الذاكرة الأبدية وقارئ الإشعارات بنسبة 100%.");
        }

        function showStreamingIndicator(msg) {
            const el = document.getElementById("streaming-indicator");
            const txt = document.getElementById("streaming-text");
            if (el && txt) { txt.innerText = msg; el.classList.remove("hidden"); }
        }

        function hideStreamingIndicator() {
            const el = document.getElementById("streaming-indicator");
            if (el) el.classList.add("hidden");
        }

        function appendMessage(role, text) {
            const chatStream = document.getElementById("chat-stream");
            const msgDiv = document.createElement("div");
            const isUser = role === 'user';
            
            msgDiv.className = `flex gap-4 max-w-3xl ${isUser ? 'mr-auto flex-row-reverse' : ''}`;
            const iconBg = isUser ? 'bg-purple-950 border-purple-500/40 text-purple-400' : 'bg-cyan-950 border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/20';

            msgDiv.innerHTML = `
                <div class="w-9 h-9 rounded-full ${iconBg} border flex items-center justify-center shrink-0">
                    <i data-lucide="${isUser ? 'user' : 'bot'}" class="w-5 h-5"></i>
                </div>
                <div class="space-y-1 max-w-xl">
                    <div class="glass-panel p-4 rounded-2xl ${isUser ? 'rounded-tl-none bg-purple-950/40' : 'rounded-tr-none cyber-border'} text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
                        ${escapeHtml(text)}
                    </div>
                </div>
            `;
            chatStream.appendChild(msgDiv);
            chatStream.scrollTop = chatStream.scrollHeight;
            lucide.createIcons();
        }

        function appendEmptyStreamingMessage() {
            const chatStream = document.getElementById("chat-stream");
            const id = "stream_msg_" + Date.now();
            const msgDiv = document.createElement("div");
            msgDiv.id = id;
            msgDiv.className = "flex gap-4 max-w-3xl";

            msgDiv.innerHTML = `
                <div class="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                    <i data-lucide="bot" class="w-5 h-5"></i>
                </div>
                <div class="space-y-1 max-w-xl">
                    <div class="msg-content glass-panel p-4 rounded-2xl rounded-tr-none cyber-border text-sm leading-relaxed text-slate-100 whitespace-pre-wrap min-h-[48px]">
                        <span class="animate-pulse text-cyan-400">...</span>
                    </div>
                </div>
            `;
            chatStream.appendChild(msgDiv);
            chatStream.scrollTop = chatStream.scrollHeight;
            lucide.createIcons();
            return id;
        }

        function updateStreamingMessageChunk(msgId, chunk) {
            const msgDiv = document.getElementById(msgId);
            if (!msgDiv) return;
            const contentEl = msgDiv.querySelector('.msg-content');
            if (contentEl) {
                if (contentEl.innerText === "...") contentEl.innerText = "";
                contentEl.innerText += chunk;
                const chatStream = document.getElementById("chat-stream");
                chatStream.scrollTop = chatStream.scrollHeight;
            }
        }

        function finalizeStreamingMessage(msgId, fullText) {
            const msgDiv = document.getElementById(msgId);
            if (!msgDiv) return;
            const contentEl = msgDiv.querySelector('.msg-content');
            if (contentEl && !contentEl.innerText.trim()) {
                contentEl.innerText = fullText || "تم تنفيذ الأمر.";
            }
        }

        function appendImageMessage(role, imageUrl, promptText) {
            const chatStream = document.getElementById("chat-stream");
            const msgDiv = document.createElement("div");
            msgDiv.className = "flex gap-4 max-w-3xl";
            msgDiv.innerHTML = `
                <div class="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-400/50 flex items-center justify-center shrink-0">
                    <i data-lucide="camera" class="w-5 h-5 text-cyan-400"></i>
                </div>
                <div class="space-y-2 max-w-md">
                    <div class="glass-panel p-3 rounded-2xl border-cyan-500/40 cyber-border space-y-2">
                        <img src="${imageUrl}" class="w-full rounded-xl border border-cyan-500/30">
                        <p class="text-[11px] text-slate-400 italic">"${escapeHtml(promptText)}"</p>
                    </div>
                </div>
            `;
            chatStream.appendChild(msgDiv);
            chatStream.scrollTop = chatStream.scrollHeight;
            lucide.createIcons();
        }

        function toggleApiKeyModal() {
            document.getElementById("apikey-modal").classList.toggle("hidden");
            if (STATE.apiKey) document.getElementById("api-key-input").value = STATE.apiKey;
        }

        function saveApiKeyUI() {
            const key = document.getElementById("api-key-input").value.trim();
            STATE.apiKey = key;
            if (key) {
                localStorage.setItem(CONFIG.storagePrefix + "API_KEY", key);
            } else {
                localStorage.removeItem(CONFIG.storagePrefix + "API_KEY");
            }
            toggleApiKeyModal();
            updateApiKeyStatusUI();
        }

        function clearCustomApiKey() {
            STATE.apiKey = "";
            localStorage.removeItem(CONFIG.storagePrefix + "API_KEY");
            document.getElementById("api-key-input").value = "";
            toggleApiKeyModal();
            updateApiKeyStatusUI();
        }

        function updateApiKeyStatusUI() {
            const btnLabel = document.getElementById("api-key-btn-label");
            const btn = document.getElementById("api-key-status-btn");
            if (btnLabel && btn) {
                if (STATE.apiKey) {
                    btnLabel.innerText = "مفتاح شخصي مفعّل ✓";
                    btn.className = "flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/50 text-purple-300 text-xs font-bold";
                } else {
                    btnLabel.innerText = "API تلقائي ⚡";
                    btn.className = "flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold";
                }
            }
        }

        function escapeHtml(str) {
            return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        }
    