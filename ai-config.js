"use strict";

/*
=========================================================
J.A.R.V.I.S AI CONFIGURATION
=========================================================

Groq + GPT-OSS-20B

تحذير:
لا ترفع apiKey الحقيقي إلى GitHub.
هذا مناسب للاختبار المحلي فقط.
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
        0.35,

    maxTokens:
        1600,

    reasoningEffort:
        "medium",

    /*
    Groq built-in browser_search
    هو خط البحث الأساسي داخل الموديل.
    */

    browserSearch:
        true,

    /*
    Fallback احتياطي من جهة التطبيق.
    
    لو الموديل لم يستخدم البحث في موقف
    يبدو أنه يحتاج معلومات خارجية،
    JARVIS يجرب هذا المسار.
    */

    fallbackWebSearch:
        true,

    /*
    يمكن لاحقًا وضع Proxy/Search API هنا.
    
    مثال:
    https://your-backend.example/search

    لو فارغ يستخدم DuckDuckGo Instant Answer
    كـ fallback best-effort.
    */

    fallbackSearchEndpoint:
        "",

    /*
    عدد دورات الـAgent القصوى.
    */

    maxAgentIterations:
        6,

    /*
    أقصى محاولات إعادة تنفيذ Tool فاشلة.
    */

    maxRetries:
        2

};
