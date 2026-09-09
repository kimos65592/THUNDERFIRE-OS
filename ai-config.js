"use strict";

/*
=========================================================
J.A.R.V.I.S AI CONFIGURATION
=========================================================

gemini-3.8-flash

تحذير:
لا ترفع apiKey الحقيقي إلى GitHub.
هذا مناسب للاختبار المحلي فقط.
=========================================================
*/

window.JARVIS_AI_CONFIG = {

    enabled: true,

    provider: "gemini",

    apiKey:
        "AQ.Ab8RN6LIVzClZC0U2j3HbLHlOJp3nA9b0223DqjqCmAK8frT1A",

    model:
        "gemini-3.8-flash",

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
