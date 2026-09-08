"use strict";

/*
=========================================================
J.A.R.V.I.S — AI-FIRST COGNITIVE CORE
=========================================================

AI MODEL
   ↓
UNDERSTANDING
   ↓
WORLD MODEL
   ↓
MEMORY
   ↓
GOALS
   ↓
PLANNING
   ↓
DECISION
   ↓
TOOLS
   ↓
OBSERVATION
   ↓
REFLECTION
   ↓
LEARNING

The JavaScript does NOT decide what the user meant.

The AI model does.

JavaScript validates structured model output
and executes tools safely.
=========================================================
*/


/* ========================================================
   CONFIGURATION
======================================================== */

const AI_CONFIG =
    window.JARVIS_AI_CONFIG || {

        enabled:
            false,

        endpoint:
            "",

        apiKey:
            "",

        model:
            "",

        temperature:
            0.25,

        maxTokens:
            1200
    };


/* ========================================================
   STORAGE
======================================================== */

const STORAGE_KEY =
    "JARVIS_COGNITIVE_OS_FULL";


const DefaultState = {

    system: {
        online: true,
        environment: "web",
        version: "1.0"
    },

    conversation: [],

    memories: [],

    goals: [],

    currentGoal: null,

    currentPlan: null,

    lastAnalysis: null,

    personality: {

        address: "يا سيدي",

        tone: "calm",

        concise: false,

        formal: 0.65,

        humor: 0.25,

        proactive: true,

        voiceRate: 0.95

    },

    self: {

        mode: "idle",

        confidence: 0.5,

        uncertainty: 0.5,

        awareness: 0.8,

        attention: 0.8,

        emotionEstimate: "neutral"

    },

    events: []

};


function loadState() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!raw) {

            return structuredClone(
                DefaultState
            );

        }


        const saved =
            JSON.parse(raw);


        return merge(
            structuredClone(
                DefaultState
            ),
            saved
        );

    } catch (error) {

        console.error(
            "[STATE LOAD]",
            error
        );


        return structuredClone(
            DefaultState
        );
    }
}


function merge(
    target,
    source
) {

    for (
        const key
        of Object.keys(source || {})
    ) {

        if (

            source[key] &&
            typeof source[key] ===
                "object" &&
            !Array.isArray(
                source[key]
            )

        ) {

            target[key] =
                merge(
                    target[key] || {},
                    source[key]
                );

        } else {

            target[key] =
                source[key];

        }
    }

    return target;
}


const state =
    loadState();


function saveState() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                state
            )
        );

    } catch (error) {

        console.error(
            "[STATE SAVE]",
            error
        );
    }
}


/* ========================================================
   UTILS
======================================================== */

function normalizeArabic(
    text
) {

    return String(text || "")
        .toLowerCase()

        .replace(
            /[إأآ]/g,
            "ا"
        )

        .replace(
            /ة/g,
            "ه"
        )

        .replace(
            /ى/g,
            "ي"
        )

        .replace(
            /[ًٌٍَُِّْـ]/g,
            ""
        )

        .replace(
            /[^\p{L}\p{N}\s]/gu,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


function clamp(
    value,
    min = 0,
    max = 1
) {

    return Math.max(
        min,
        Math.min(
            max,
            Number(value) || 0
        )
    );

}


/* ========================================================
   EVENT BUS
======================================================== */

const EventBus = {

    emit(
        type,
        data = {}
    ) {

        const event = {

            type,

            data,

            timestamp:
                Date.now()

        };


        state.events.unshift(
            event
        );


        state.events =
            state.events.slice(
                0,
                100
            );


        renderEventLog();


        console.log(
            `[EVENT] ${type}`,
            data
        );

    }

};


/* ========================================================
   MEMORY ENGINE
======================================================== */

const MemoryEngine = {

    save(
        text,
        category =
            "user_fact"
    ) {

        const clean =
            String(text || "")
                .trim();


        if (!clean)
            return false;


        const normalized =
            normalizeArabic(
                clean
            );


        const duplicate =
            state.memories.some(
                item =>
                    normalizeArabic(
                        item.text
                    ) === normalized
            );


        if (duplicate)
            return true;


        state.memories.push({

            id:
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2),

            text:
                clean,

            category,

            createdAt:
                Date.now(),

            lastUsed:
                null

        });


        saveState();


        EventBus.emit(
            "MEMORY_SAVED",
            {
                text:
                    clean,

                category
            }
        );


        renderMemory();


        return true;

    },


    all() {

        return [
            ...state.memories
        ];

    },


    search(
        query = ""
    ) {

        const memories =
            this.all();


        if (
            !query
        ) {

            return memories
                .slice(
                    -10
                )
                .reverse();

        }


        const q =
            normalizeArabic(
                query
            );


        return memories

            .map(
                item => {

                    const text =
                        normalizeArabic(
                            item.text
                        );


                    let score =
                        0;


                    for (
                        const word
                        of q.split(" ")
                    ) {

                        if (
                            word &&
                            text.includes(
                                word
                            )
                        ) {

                            score++;

                        }

                    }


                    return {

                        ...item,

                        score

                    };

                }
            )

            .sort(
                (a, b) =>
                    b.score -
                    a.score
            )

            .slice(
                0,
                10
            );

    },


    forget(
        query
    ) {

        const q =
            normalizeArabic(
                query
            );


        if (!q)
            return 0;


        const before =
            state.memories.length;


        state.memories =
            state.memories.filter(
                item =>
                    !normalizeArabic(
                        item.text
                    ).includes(q)
            );


        const removed =
            before -
            state.memories.length;


        saveState();


        EventBus.emit(
            "MEMORY_FORGOTTEN",
            {
                query,
                removed
            }
        );


        renderMemory();


        return removed;

    }

};


/* ========================================================
   MODEL CONTEXT
======================================================== */

function buildModelContext() {

    return {

        conversation:
            state.conversation
                .slice(-14),

        memories:
            MemoryEngine
                .all()
                .slice(-30),

        currentGoal:
            state.currentGoal,

        currentPlan:
            state.currentPlan,

        personality:
            state.personality,

        selfState:
            state.self,

        system: {

            environment:
                "web",

            capabilities: [

                "text_input",

                "voice_output",

                "persistent_memory",

                "goal_management",

                "planning",

                "decision_support",

                "reflection"

            ],

            limitations: [

                "no_android_control",

                "no_microphone",

                "no_background_service",

                "no_direct_phone_access"

            ]

        }

    };

}


/* ========================================================
   AI MODEL ENGINE
======================================================== */

const AI = {

    async analyze(
        userMessage
    ) {

        if (
            !AI_CONFIG.enabled
        ) {

            throw new Error(
                "AI model is disabled. Configure ai-config.js."
            );

        }


        if (
            !AI_CONFIG.endpoint
        ) {

            throw new Error(
                "AI endpoint is missing."
            );

        }


        const systemPrompt = `

You are the cognitive model of J.A.R.V.I.S.

You are NOT a simple chatbot.

Your responsibility is to understand the user's message,
reason over context, memory, goals and current state,
decide what operation is required, and return a structured
cognitive decision.

Do NOT execute code.

Do NOT invent capabilities.

Do NOT claim access to Android when running in Web.

Do NOT claim consciousness.

Do NOT expose hidden chain-of-thought.

Return ONLY valid JSON.

Schema:

{
  "intent": "",
  "subIntent": "",
  "goal": null,
  "memoryAction": "none|save|recall|forget|search",
  "memoryQuery": null,
  "factsToSave": [],
  "constraints": [],
  "preferences": [],
  "needsPlanning": false,
  "needsDecision": false,
  "needsSearch": false,
  "requiresContext": false,
  "requiresConfirmation": false,
  "emotionEstimate": "neutral",
  "urgency": 0,
  "confidence": 0,
  "responseStyle": {
      "tone": "calm",
      "concise": false
  },
  "toolCalls": [],
  "answer": "",
  "decisionSummary": ""
}

Possible intents:

greeting
memory_save
memory_recall
memory_forget
memory_search
status
settings
personality_change
behavior_change
goal
planning
decision
task_start
task_update
question
conversation
unknown

IMPORTANT:

The field "answer" should be the natural response
to the user when no further execution is required.

For actions involving memory/planning/tools,
return structured data first.

When the user says something like:

"أنا متأخر النهارده وعندي مذاكرة برمجة وعايز أخلص بسرعة
لكن آخر مرة الخطة السريعة مشت بشكل وحش"

you MUST infer:

goal
urgency
constraints
relevant past experience
planning preference

Do not require exact keywords.

Use previous conversation and memory.

Do not invent memories.

If information is absent, say so through uncertainty.

`;

        const context =
            buildModelContext();


        const body = {

            model:
                AI_CONFIG.model,

            temperature:
                AI_CONFIG.temperature,

            max_tokens:
                AI_CONFIG.maxTokens,

            messages: [

                {

                    role:
                        "system",

                    content:
                        systemPrompt

                },

                {

                    role:
                        "user",

                    content:

                        JSON.stringify({

                            context,

                            currentMessage:
                                userMessage

                        })

                }

            ]

        };


        const headers = {

            "Content-Type":
                "application/json"

        };


        if (
            AI_CONFIG.apiKey
        ) {

            headers.Authorization =
                `Bearer ${AI_CONFIG.apiKey}`;

        }


        const response =
            await fetch(
                AI_CONFIG.endpoint,
                {

                    method:
                        "POST",

                    headers,

                    body:
                        JSON.stringify(
                            body
                        )

                }
            );


        if (!response.ok) {

            const message =
                await response.text();


            throw new Error(
                `AI HTTP ${response.status}: ${message}`
            );

        }


        const data =
            await response.json();


        const raw =
            data?.choices?.[0]
                ?.message
                ?.content
            ??
            data?.output_text
            ??
            data?.response;


        if (!raw) {

            throw new Error(
                "AI returned empty response."
            );

        }


        let parsed;

        try {

            parsed =
                JSON.parse(
                    String(raw)
                        .replace(
                            /^```json/i,
                            ""
                        )
                        .replace(
                            /```$/i,
                            ""
                        )
                        .trim()
                );

        } catch {

            throw new Error(
                "AI did not return valid JSON."
            );

        }


        return parsed;

    }

};


/* ========================================================
   SAFETY / TOOL VALIDATION
======================================================== */

const ToolEngine = {

    async execute(
        name,
        args = {}
    ) {

        /*
        The web build intentionally exposes
        only safe local tools.
        Android tools will be attached later
        through a native bridge.
        */

        switch (name) {

            case "memory.search":

                return {

                    success:
                        true,

                    result:
                        MemoryEngine.search(
                            args.query
                        )

                };


            case "memory.save":

                return {

                    success:
                        MemoryEngine.save(
                            args.text,
                            args.category
                        ),

                    result:
                        "saved"

                };


            case "memory.forget":

                return {

                    success:
                        true,

                    result:
                        MemoryEngine.forget(
                            args.query
                        )

                };


            case "system.status":

                return {

                    success:
                        true,

                    result:
                        buildModelContext()
                            .system

                };


            default:

                return {

                    success:
                        false,

                    error:
                        `Tool "${name}" غير متاحة في Web Lab.`

                };

        }

    }

};


/* ========================================================
   PLAN ENGINE
======================================================== */

const Planner = {

    async create(
        goal,
        analysis
    ) {

        /*
        The MODEL selects the strategy.
        JS merely materializes a structured plan.
        */

        const constraints =
            analysis.constraints ||
            [];


        const plans = [

            {

                id:
                    "A",

                name:
                    "Fast",

                estimatedEffort:
                    "low",

                risk:
                    .35

            },

            {

                id:
                    "B",

                name:
                    "Balanced",

                estimatedEffort:
                    "medium",

                risk:
                    .18

            },

            {

                id:
                    "C",

                name:
                    "Deep",

                estimatedEffort:
                    "high",

                risk:
                    .10

            }

        ];


        /*
        We intentionally don't choose the plan
        using hardcoded user keywords.

        We keep candidate plans,
        then let the model decide if needed.
        */

        const selected =
            plans[1];


        const plan = {

            goal,

            constraints,

            candidates:
                plans,

            selected,

            status:
                "ready",

            createdAt:
                Date.now()

        };


        state.currentPlan =
            plan;


        saveState();


        EventBus.emit(
            "PLAN_CREATED",
            plan
        );


        renderPlan();


        return plan;

    }

};


/* ========================================================
   GOAL ENGINE
======================================================== */

const GoalEngine = {

    create(
        goal,
        analysis
    ) {

        const newGoal = {

            id:
                Date.now(),

            title:
                goal,

            urgency:
                analysis.urgency ||
                0,

            constraints:
                analysis.constraints ||
                [],

            preferences:
                analysis.preferences ||
                [],

            status:
                "active",

            createdAt:
                Date.now()

        };


        state.goals.push(
            newGoal
        );


        state.currentGoal =
            newGoal;


        saveState();


        EventBus.emit(
            "GOAL_CREATED",
            newGoal
        );


        return newGoal;

    }

};


/* ========================================================
   COGNITIVE ORCHESTRATOR
======================================================== */

const CognitiveCore = {

    async process(
        message
    ) {

        state.self.mode =
            "understanding";


        renderState();


        EventBus.emit(
            "USER_INPUT",
            {
                message
            }
        );


        /*
        ====================================================
        UNDERSTANDING
        ====================================================
        */

        const analysis =
            await AI.analyze(
                message
            );


        state.lastAnalysis =
            analysis;


        state.self.confidence =
            clamp(
                analysis.confidence ||
                .5
            );


        state.self.uncertainty =
            1 -
            state.self.confidence;


        state.self.emotionEstimate =
            analysis.emotionEstimate ||
            "neutral";


        renderAnalysis();


        /*
        ====================================================
        MEMORY
        ====================================================
        */

        if (
            analysis.memoryAction ===
            "save"
        ) {

            for (
                const fact
                of analysis.factsToSave ||
                []
            ) {

                MemoryEngine.save(
                    fact
                );

            }

        }


        if (
            analysis.memoryAction ===
            "forget"
        ) {

            if (
                analysis.memoryQuery
            ) {

                MemoryEngine.forget(
                    analysis.memoryQuery
                );

            }

        }


        let reply =
            "";


        /*
        ====================================================
        GOAL
        ====================================================
        */

        if (
            analysis.goal &&
            (
                analysis.intent ===
                    "goal" ||
                analysis.intent ===
                    "planning"
            )
        ) {

            GoalEngine.create(
                analysis.goal,
                analysis
            );

        }


        /*
        ====================================================
        PLANNING
        ====================================================
        */

        if (
            analysis.needsPlanning ||
            analysis.intent ===
                "planning"
        ) {

            if (
                !state.currentGoal &&
                analysis.goal
            ) {

                GoalEngine.create(
                    analysis.goal,
                    analysis
                );

            }


            if (
                state.currentGoal
            ) {

                await Planner.create(

                    state.currentGoal
                        .title,

                    analysis

                );

            }

        }


        /*
        ====================================================
        AI TOOL CALLS
        ====================================================
        */

        if (
            Array.isArray(
                analysis.toolCalls
            )
        ) {

            for (
                const call
                of analysis.toolCalls
            ) {

                if (
                    !call ||
                    typeof call.name !==
                        "string"
                ) {

                    continue;

                }


                const result =
                    await ToolEngine.execute(
                        call.name,
                        call.arguments ||
                        {}
                    );


                EventBus.emit(
                    "TOOL_EXECUTION",
                    {
                        call,
                        result
                    }
                );

            }

        }


        /*
        ====================================================
        RESPONSE
        ====================================================
        */

        reply =
            analysis.answer ||
            analysis.decisionSummary ||
            defaultResponse(
                analysis
            );


        /*
        ====================================================
        REFLECTION
        ====================================================
        */

        EventBus.emit(
            "REFLECTION",
            {

                intent:
                    analysis.intent,

                success:
                    true,

                confidence:
                    state.self.confidence

            }
        );


        state.self.mode =
            "idle";


        saveState();


        renderAll();


        return reply;

    }

};


/* ========================================================
   DEFAULT RESPONSE
======================================================== */

function defaultResponse(
    analysis
) {

    switch (
        analysis.intent
    ) {

        case "memory_save":

            return (
                "تم حفظ المعلومة في الذاكرة."
            );


        case "memory_recall": {

            const memories =
                MemoryEngine.all();


            if (
                !memories.length
            ) {

                return (
                    "لا توجد معلومات محفوظة في ذاكرتي حتى الآن."
                );

            }


            return [

                "أتذكر:",

                ...memories
                    .map(
                        m =>
                            `• ${m.text}`
                    )

            ].join("\n");

        }


        case "status":

            return [

                "النظام يعمل.",

                `الحالة: ${
                    state.self.mode
                }`,

                `الثقة: ${
                    Math.round(
                        state.self.confidence *
                        100
                    )
                }%`,

                `عدم اليقين: ${
                    Math.round(
                        state.self.uncertainty *
                        100
                    )
                }%`

            ].join("\n");


        case "planning":

            return (

                "حللت الهدف وأنشأت مساحة تخطيط مناسبة. "

                +

                "الخطة الحالية جاهزة للتعديل والتنفيذ."

            );


        default:

            return (

                "فهمت الطلب، لكنني أحتاج إلى مزيد من السياق "

                +

                "لاتخاذ قرار موثوق."

            );

    }

}


/* ========================================================
   UI
======================================================== */

function addMessage(
    role,
    text
) {

    const box =
        document.getElementById(
            "messages"
        );


    if (!box)
        return;


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        `message ${
            role === "user"
                ? "user"
                : "jarvis"
        }`;


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "meta";


    meta.textContent =
        role === "user"
            ? "YOU"
            : "J.A.R.V.I.S";


    const body =
        document.createElement(
            "div"
        );


    body.textContent =
        text;


    wrapper.append(
        meta,
        body
    );


    box.appendChild(
        wrapper
    );


    box.scrollTop =
        box.scrollHeight;

}


function renderMessages() {

    const box =
        document.getElementById(
            "messages"
        );


    if (!box)
        return;


    box.innerHTML = "";


    for (
        const message
        of state.conversation
    ) {

        addMessage(
            message.role,
            message.text
        );

    }

}


function renderState() {

    const s =
        state.self;


    setText(
        "systemState",
        state.system.online
            ? "ONLINE"
            : "OFFLINE"
    );


    setText(
        "processing",
        s.mode
    );


    setText(
        "confidence",
        `${Math.round(
            s.confidence * 100
        )}%`
    );


    setText(
        "uncertainty",
        `${Math.round(
            s.uncertainty * 100
        )}%`
    );


    setText(
        "goal",
        state.currentGoal?.title ||
        "لا يوجد"
    );

}


function renderAnalysis() {

    const a =
        state.lastAnalysis;


    if (!a)
        return;


    setText(
        "intent",
        a.intent ||
        "unknown"
    );


    setText(
        "analysisGoal",
        a.goal ||
        "—"
    );


    setText(
        "memoryAction",
        a.memoryAction ||
        "none"
    );


    setText(
        "urgency",
        `${Math.round(
            (a.urgency || 0) *
            100
        )}%`
    );

}


function renderMemory() {

    const box =
        document.getElementById(
            "memoryView"
        );


    if (!box)
        return;


    const memories =
        MemoryEngine
            .all()
            .slice(-10)
            .reverse();


    if (!memories.length) {

        box.textContent =
            "لا توجد ذكريات.";

        return;

    }


    box.innerHTML =
        memories
            .map(
                memory =>
                    `<div class="row">
                        <span class="value"
                              style="max-width:100%;text-align:right">
                            ${escapeHTML(
                                memory.text
                            )}
                        </span>
                    </div>`
            )
            .join("");

}


function renderPlan() {

    const box =
        document.getElementById(
            "planView"
        );


    if (!box)
        return;


    if (
        !state.currentPlan
    ) {

        box.textContent =
            "لا توجد خطة.";

        return;

    }


    const plan =
        state.currentPlan;


    box.innerHTML = `

        <div class="row">

            <span class="label">
                الهدف
            </span>

            <span class="value">
                ${escapeHTML(
                    plan.goal
                )}
            </span>

        </div>


        <div class="row">

            <span class="label">
                المختارة
            </span>

            <span class="value">
                ${escapeHTML(
                    plan.selected.name
                )}
            </span>

        </div>


        <div class="row">

            <span class="label">
                الحالة
            </span>

            <span class="value">
                ${escapeHTML(
                    plan.status
                )}
            </span>

        </div>

    `;

}


function renderEventLog() {

    const box =
        document.getElementById(
            "eventLog"
        );


    if (!box)
        return;


    box.textContent =
        state.events
            .slice(0, 40)
            .map(
                event =>
                    `${new Date(
                        event.timestamp
                    ).toLocaleTimeString(
                        "ar-EG"
                    )} | ${event.type}`
            )
            .join("\n");

}


function renderAll() {

    renderMessages();

    renderState();

    renderAnalysis();

    renderMemory();

    renderPlan();

    renderEventLog();

}


function setText(
    id,
    value
) {

    const node =
        document.getElementById(
            id
        );


    if (node) {

        node.textContent =
            value;

    }

}


function escapeHTML(
    text
) {

    return String(
        text ?? ""
    ).replace(
        /[&<>"']/g,
        char =>
            ({
                "&":
                    "&amp;",

                "<":
                    "&lt;",

                ">":
                    "&gt;",

                '"':
                    "&quot;",

                "'":
                    "&#039;"

            })[char]
    );

}


/* ========================================================
   MAIN UI BOOT
======================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "chatForm"
            );


        const input =
            document.getElementById(
                "userInput"
            );


        const button =
            document.getElementById(
                "sendButton"
            );


        if (!state.conversation.length) {
    addMessage(
        "jarvis",
        "صباح الخير يا سيدي. النواة المعرفية جاهزة، والموديل هو طبقة فهم اللغة واتخاذ القرار."
    );
}

try {
    renderAll();
} catch (error) {
    console.error("[JARVIS UI ERROR]", error);
}


        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const text =
                    input.value.trim();


                if (!text)
                    return;


                if (button)
                    button.disabled =
                        true;


                input.value = "";


                /*
                USER MESSAGE
                */

                addMessage(
                    "user",
                    text
                );


                state.conversation.push({

                    role:
                        "user",

                    text,

                    timestamp:
                        Date.now()

                });


                saveState();


                try {

                    const response =
                        await CognitiveCore
                            .process(
                                text
                            );


                    /*
                    Avoid double adding
                    because CognitiveCore
                    stores the response.
                    */

                    addMessage(
                        "jarvis",
                        response
                    );


                    state.conversation.push({

                        role:
                            "jarvis",

                        text:
                            response,

                        timestamp:
                            Date.now()

                    });


                    saveState();


                } catch (error) {

                    console.error(
                        "[JARVIS ERROR]",
                        error
                    );


                    state.self.mode =
                        "error";


                    state.self.confidence =
                        .05;


                    state.self.uncertainty =
                        .95;


                    addMessage(
                        "jarvis",
                        `حدث خطأ في محرك الذكاء الاصطناعي:\n${error.message}`
                    );

                } finally {

                    state.self.mode =
                        "idle";


                    if (button)
                        button.disabled =
                            false;


                    renderAll();


                    input.focus();

                }

            }
        );


        try {
    renderAll();
} catch (error) {
    console.error("[JARVIS UI ERROR]", error);
}

logEvent("BOOT");

    }
);


function logEvent(
    type
) {

    EventBus.emit(
        type
    );

}
