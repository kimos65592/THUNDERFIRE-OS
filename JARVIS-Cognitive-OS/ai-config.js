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
        "PUT_YOUR_OPENAI_COMPATIBLE_ENDPOINT_HERE",

    apiKey:
        "PUT_YOUR_API_KEY_HERE",

    model:
        "PUT_YOUR_MODEL_NAME_HERE",

    temperature:
        0.25,

    maxTokens:
        1200

};
