"use strict";

window.JARVIS_AI_CONFIG = {
    enabled: true,

    provider: "gemini",

    apiKey: "ضع_مفتاح_Gemini_هنا",

    model: "gemini-3.7-flash",

    endpoint:
        "https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",

    temperature: 0.25,

    maxTokens: 1400,

    maxAgentIterations: 6,

    maxRetries: 2,

    googleSearch: true,

    fallbackWebSearch: true,

    /*
     * هذا الإصدار يعمل مباشرة من GitHub Pages.
     * لذلك المفتاح سيكون ظاهرًا في المتصفح.
     * استخدمه للاختبار فقط ولا تنشر مفتاحًا شخصيًا حقيقيًا في مستودع عام.
     */
    clientSideMode: true
};
