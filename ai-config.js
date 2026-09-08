"use strict";

/*
=========================================================
J.A.R.V.I.S AI CONFIGURATION
=========================================================

مهم:

الكود يدعم أي API متوافق مع OpenAI Chat Completions.

لا تضع مفتاح API في مستودع GitHub عام.

للاختبار المحلي يمكنك وضع المفتاح هنا مؤقتًا.

الأفضل لاحقًا:
Web
 ↓
Your backend
 ↓
AI provider

=========================================================
*/

window.JARVIS_AI_CONFIG = {

    enabled: true,

    endpoint:
        "https://api.groq.com/openai/v1/chat/completions",

    apiKey:
        "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",

    model:
        "openai/gpt-oss-20b",

    temperature:
        0.25,

    maxTokens:
        1200

};
