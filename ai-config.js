"use strict";

window.JARVIS_AI_CONFIG = {
    enabled: true,

    provider: "gemini",

    endpoint:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",

    apiKey:
        "AQ.Ab8RN6Kek9VuQoUGukD4iPIgjJ1AsmuAiqU73S9dQHzySBv3ZQ",

    model:
        "gemini-3.8-flash",

    temperature: 0.25,

    maxTokens: 1200,

    reasoningEffort: "medium",

    browserSearch: false,

    fallbackWebSearch: true,

    fallbackSearchEndpoint: "",

    parallelToolCalls: false,

    maxAgentIterations: 6,

    maxRetries: 2
};
