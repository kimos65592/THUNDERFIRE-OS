"use strict";

/*
=========================================================
J.A.R.V.I.S AI CONFIGURATION
=========================================================

Groq + qwen/qwen3.6-27b

تحذير:
لا ترفع apiKey الحقيقي إلى GitHub.
هذا مناسب للاختبار المحلي فقط.
=========================================================
*/

window.JARVIS_AI_CONFIG = {

    enabled: true,

    endpoint:
        "https://openrouter.ai/api/v1/chat/completions",

    apiKey:
        "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",

    model:
        "openrouter/free",

    temperature:
        0.25,

    maxTokens:
        1200,

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
