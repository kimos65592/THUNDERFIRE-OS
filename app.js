
/* ============================================================
   J.A.R.V.I.S — COGNITIVE OS
   Gemini Native + Memory + Goals + Planning + Tasks
   Function Calling + Google Search + Reflection/Learning
============================================================ */

"use strict";

const CONFIG = window.JARVIS_AI_CONFIG || {};

const STORAGE_KEY = "JARVIS_COGNITIVE_OS_STATIC_V3";

const DEFAULT_STATE = {
    conversation: [],
    memories: [],
    goals: [],
    tasks: [],

    currentGoal: null,
    currentPlan: null,
    currentTask: null,

    personality: {
        addressStyle: "يا سيدي",
        tone: "calm",
        concise: true,
        formality: 65,
        humor: 25,
        proactivity: true,
        explanationStyle: "natural",
        voiceRate: 0.95
    },

    behavior: {
        rules: [],
        preferences: []
    },

    self: {
        mode: "OBSERVING",
        awareness: 0.82,
        attention: 0.86,
        confidence: 0.80,
        uncertainty: 0.20,
        currentThought: "في انتظار الإدراك...",
        currentAction: "لا يوجد",
        lastObservation: "لا يوجد"
    },

    world: {
        environment: "web",
        online: navigator.onLine,

        capabilities: [
            "text_input",
            "voice_output",
            "persistent_memory",
            "goal_management",
            "planning",
            "tool_use",
            "google_search",
            "reflection",
            "learning"
        ],

        limitations: [
            "no_android_control",
            "no_microphone",
            "no_background_service",
            "no_direct_phone_control"
        ]
    },

    agent: {
        iteration: 0,
        toolCalls: 0,
        retries: 0,
        lastTool: null,
        lastToolResult: null,
        webSearchUsed: false,
        cycleStartedAt: null
    },

    learning: [],
    events: []
};


/* ============================================================
   HELPERS
============================================================ */

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function deepMerge(target, source) {
    if (!source || typeof source !== "object") {
        return target;
    }

    for (const key of Object.keys(source)) {
        const value = source[key];

        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value)
        ) {
            target[key] = deepMerge(
                target[key] || {},
                value
            );
        } else {
            target[key] = value;
        }
    }

    return target;
}

function loadState() {
    try {
        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!raw) {
            return clone(
                DEFAULT_STATE
            );
        }

        return deepMerge(
            clone(DEFAULT_STATE),
            JSON.parse(raw)
        );

    } catch (error) {
        console.warn(
            "[JARVIS] State load failed:",
            error
        );

        return clone(
            DEFAULT_STATE
        );
    }
}

const state = loadState();

function saveState() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );
    } catch (error) {
        console.warn(
            "[JARVIS] State save failed:",
            error
        );
    }
}

function normalizeArabic(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[إأآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .replace(/[ًٌٍَُِّْـ]/g, "")
        .replace(
            /[^\p{L}\p{N}\s]/gu,
            " "
        )
        .replace(/\s+/g, " ")
        .trim();
}

function clamp01(value) {
    return Math.max(
        0,
        Math.min(
            1,
            Number(value) || 0
        )
    );
}

function clamp100(value) {
    return Math.max(
        0,
        Math.min(
            100,
            Number(value) || 0
        )
    );
}

function safeString(value) {
    try {
        return String(
            value ?? ""
        );
    } catch {
        return "";
    }
}

function safeJson(value) {
    try {
        return JSON.stringify(
            value
        );
    } catch {
        return JSON.stringify({
            error:
                "unserializable_result"
        });
    }
}

function escapeHtml(text) {
    return safeString(text).replace(
        /[&<>"']/g,
        ch =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[ch])
    );
}

function setText(id, value) {
    const node =
        document.getElementById(id);

    if (node) {
        node.textContent =
            value;
    }
}

function emit(
    type,
    data = {}
) {
    state.events.unshift({
        type,
        data,
        timestamp: Date.now()
    });

    state.events =
        state.events.slice(
            0,
            80
        );

    saveState();

    console.log(
        `[JARVIS:${type}]`,
        data
    );

    renderAll();
}


/* ============================================================
   CONVERSATION
============================================================ */

const Conversation = {

    addUser(text) {

        state.conversation.push({
            role: "user",
            text:
                safeString(text),
            timestamp:
                Date.now()
        });

        state.conversation =
            state.conversation.slice(
                -40
            );

        saveState();
    },

    addAssistant(text) {

        state.conversation.push({
            role: "assistant",
            text:
                safeString(text),
            timestamp:
                Date.now()
        });

        state.conversation =
            state.conversation.slice(
                -40
            );

        saveState();
    },

    recent(count = 12) {
        return state.conversation.slice(
            -count
        );
    }
};


/* ============================================================
   MEMORY ENGINE
============================================================ */

const Memory = {

    save(
        text,
        category = "user_fact"
    ) {

        const value =
            safeString(text).trim();

        if (!value) {
            return {
                success: false,
                error:
                    "Empty memory."
            };
        }

        const normalized =
            normalizeArabic(
                value
            );

        const exists =
            state.memories.some(
                memory =>
                    normalizeArabic(
                        memory.text
                    ) === normalized
            );

        if (!exists) {

            state.memories.push({

                id:
                    crypto.randomUUID
                        ? crypto.randomUUID()
                        : `${Date.now()}_${Math.random()}`,

                text: value,

                category:
                    safeString(
                        category
                    ),

                createdAt:
                    Date.now(),

                lastUsed: null,

                accessCount: 0
            });
        }

        saveState();

        emit(
            "MEMORY_SAVED",
            {
                text: value,
                category
            }
        );

        return {
            success: true,
            stored: value
        };
    },


    search(query = "") {

        const q =
            normalizeArabic(
                query
            );

        const list =
            state.memories.map(
                item => {

                    const normalized =
                        normalizeArabic(
                            item.text
                        );

                    if (!q) {
                        return {
                            ...item,
                            score: 1
                        };
                    }

                    const words =
                        q
                            .split(" ")
                            .filter(Boolean);

                    const score =
                        words.reduce(
                            (
                                total,
                                word
                            ) =>
                                normalized.includes(
                                    word
                                )
                                    ? total + 1
                                    : total,
                            0
                        );

                    return {
                        ...item,
                        score
                    };
                }
            );

        const results =
            list
                .filter(
                    item =>
                        !q ||
                        item.score > 0
                )
                .sort(
                    (a, b) =>
                        b.score -
                        a.score
                )
                .slice(0, 10);

        for (
            const item of results
        ) {

            const original =
                state.memories.find(
                    memory =>
                        memory.id ===
                        item.id
                );

            if (original) {

                original.lastUsed =
                    Date.now();

                original.accessCount++;
            }
        }

        saveState();

        return {
            success: true,
            results
        };
    },


    forget(query) {

        const q =
            normalizeArabic(
                query
            );

        if (!q) {
            return {
                success: false,
                removed: 0
            };
        }

        const before =
            state.memories.length;

        state.memories =
            state.memories.filter(
                memory =>
                    !normalizeArabic(
                        memory.text
                    ).includes(q)
            );

        const removed =
            before -
            state.memories.length;

        saveState();

        emit(
            "MEMORY_FORGOTTEN",
            {
                query,
                removed
            }
        );

        return {
            success: true,
            removed
        };
    }
};


/* ============================================================
   GOAL ENGINE
============================================================ */

const Goals = {

    create(
        title,
        constraints = [],
        preferences = [],
        urgency = 0
    ) {

        const goal = {

            id:
                crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}_${Math.random()}`,

            title:
                safeString(
                    title
                ).trim(),

            constraints:
                Array.isArray(
                    constraints
                )
                    ? constraints.map(
                        safeString
                    )
                    : [],

            preferences:
                Array.isArray(
                    preferences
                )
                    ? preferences.map(
                        safeString
                    )
                    : [],

            urgency:
                clamp100(
                    urgency
                ),

            status:
                "active",

            createdAt:
                Date.now(),

            updatedAt:
                Date.now()
        };

        state.goals.push(
            goal
        );

        state.currentGoal =
            goal;

        saveState();

        emit(
            "GOAL_CREATED",
            goal
        );

        return {
            success: true,
            goal
        };
    },


    get() {

        return {
            success: true,
            goal:
                state.currentGoal
        };
    },


    update(
        changes = {}
    ) {

        if (
            !state.currentGoal
        ) {

            return {
                success: false,
                error:
                    "No active goal."
            };
        }

        const patch =
            {
                ...changes
            };

        if (
            patch.constraints &&
            !Array.isArray(
                patch.constraints
            )
        ) {

            patch.constraints =
                [
                    String(
                        patch.constraints
                    )
                ];
        }

        if (
            patch.preferences &&
            !Array.isArray(
                patch.preferences
            )
        ) {

            patch.preferences =
                [
                    String(
                        patch.preferences
                    )
                ];
        }

        if (
            patch.urgency !==
            undefined
        ) {

            patch.urgency =
                clamp100(
                    patch.urgency
                );
        }

        Object.assign(
            state.currentGoal,
            patch,
            {
                updatedAt:
                    Date.now()
            }
        );

        saveState();

        emit(
            "GOAL_UPDATED",
            patch
        );

        return {
            success: true,
            goal:
                state.currentGoal
        };
    },


    complete() {

        if (
            !state.currentGoal
        ) {

            return {
                success: false,
                error:
                    "No active goal."
            };
        }

        state.currentGoal.status =
            "completed";

        state.currentGoal.updatedAt =
            Date.now();

        saveState();

        emit(
            "GOAL_COMPLETED",
            state.currentGoal
        );

        return {
            success: true,
            goal:
                state.currentGoal
        };
    }
};


/* ============================================================
   PLANNER
============================================================ */

const Plans = {

    create(
        goal,
        steps = [],
        strategy = "",
        rationale = ""
    ) {

        const cleanSteps =
            Array.isArray(
                steps
            )
                ? steps.map(
                    safeString
                )
                : [
                    safeString(
                        steps
                    )
                ];

        state.currentPlan = {

            id:
                crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}_${Math.random()}`,

            goal:
                safeString(goal),

            strategy:
                safeString(
                    strategy
                ),

            rationale:
                safeString(
                    rationale
                ),

            alternatives: [],

            steps:
                cleanSteps.map(
                    (
                        title,
                        index
                    ) => ({

                        id:
                            `step_${index + 1}`,

                        title,

                        status:
                            index === 0
                                ? "in_progress"
                                : "pending"
                    })
                ),

            activeStepIndex: 0,

            status:
                "ready",

            createdAt:
                Date.now(),

            updatedAt:
                Date.now()
        };

        saveState();

        emit(
            "PLAN_CREATED",
            state.currentPlan
        );

        return {
            success: true,
            plan:
                state.currentPlan
        };
    },


    get() {

        return {
            success: true,
            plan:
                state.currentPlan
        };
    },


    update(
        patch = {}
    ) {

        if (
            !state.currentPlan
        ) {

            return {
                success: false,
                error:
                    "No active plan."
            };
        }

        if (
            Array.isArray(
                patch.steps
            )
        ) {

            state.currentPlan.steps =
                patch.steps.map(
                    (
                        step,
                        index
                    ) =>
                        typeof step ===
                        "string"

                            ? {
                                id:
                                    `step_${index + 1}`,

                                title:
                                    step,

                                status:
                                    index === 0
                                        ? "in_progress"
                                        : "pending"
                            }

                            : step
                );
        }

        if (
            patch.strategy !==
            undefined
        ) {

            state.currentPlan.strategy =
                safeString(
                    patch.strategy
                );
        }

        if (
            patch.rationale !==
            undefined
        ) {

            state.currentPlan.rationale =
                safeString(
                    patch.rationale
                );
        }

        if (
            patch.activeStepIndex !==
            undefined
        ) {

            const max =
                Math.max(
                    0,
                    state.currentPlan.steps.length -
                    1
                );

            const index =
                Math.max(
                    0,
                    Math.min(
                        max,
                        Number(
                            patch.activeStepIndex
                        ) || 0
                    )
                );

            state.currentPlan.activeStepIndex =
                index;

            state.currentPlan.steps =
                state.currentPlan.steps.map(
                    (
                        step,
                        i
                    ) => ({

                        ...step,

                        status:
                            i < index
                                ? "completed"
                                : i === index
                                    ? "in_progress"
                                    : "pending"
                    })
                );
        }

        if (
            patch.status !==
            undefined
        ) {

            state.currentPlan.status =
                safeString(
                    patch.status
                );
        }

        state.currentPlan.updatedAt =
            Date.now();

        saveState();

        emit(
            "PLAN_UPDATED",
            patch
        );

        return {
            success: true,
            plan:
                state.currentPlan
        };
    }
};


/* ============================================================
   TASK ENGINE
============================================================ */

const Tasks = {

    create(
        title,
        goalId = null
    ) {

        const task = {

            id:
                crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}_${Math.random()}`,

            title:
                safeString(
                    title
                ),

            goalId:
                goalId ||
                state.currentGoal?.id ||
                null,

            status:
                "pending",

            attempts: 0,

            createdAt:
                Date.now(),

            updatedAt:
                Date.now()
        };

        state.tasks.push(
            task
        );

        saveState();

        emit(
            "TASK_CREATED",
            task
        );

        return {
            success: true,
            task
        };
    },


    current() {

        return {
            success: true,
            task:
                state.currentTask
        };
    },


    start(id = null) {

        let task =
            id
                ? state.tasks.find(
                    item =>
                        item.id ===
                        id
                )
                : state.tasks.find(
                    item =>
                        item.status ===
                        "pending"
                );

        if (
            !task &&
            state.currentPlan
        ) {

            const index =
                Number(
                    state.currentPlan
                        .activeStepIndex
                ) || 0;

            const step =
                state.currentPlan
                    .steps[index];

            if (step) {

                task =
                    Tasks.create(
                        step.title,
                        state.currentGoal?.id ||
                        null
                    ).task;
            }
        }

        if (!task) {

            return {
                success: false,
                error:
                    "No pending task available."
            };
        }

        task.status =
            "in_progress";

        task.attempts++;

        task.updatedAt =
            Date.now();

        state.currentTask =
            task;

        saveState();

        emit(
            "TASK_STARTED",
            task
        );

        return {
            success: true,
            task
        };
    },


    complete(
        id = null,
        result = ""
    ) {

        const task =
            id
                ? state.tasks.find(
                    item =>
                        item.id ===
                        id
                )
                : state.currentTask;

        if (!task) {

            return {
                success: false,
                error:
                    "No task available."
            };
        }

        task.status =
            "completed";

        task.result =
            safeString(
                result
            );

        task.completedAt =
            Date.now();

        task.updatedAt =
            Date.now();

        if (
            state.currentTask?.id ===
            task.id
        ) {

            state.currentTask =
                null;
        }

        if (
            state.currentPlan
        ) {

            const index =
                Number(
                    state.currentPlan
                        .activeStepIndex
                ) || 0;

            if (
                state.currentPlan.steps[index]
            ) {

                state.currentPlan.steps[index]
                    .status =
                    "completed";

                if (
                    index + 1 <
                    state.currentPlan.steps.length
                ) {

                    state.currentPlan
                        .activeStepIndex =
                        index + 1;

                    state.currentPlan
                        .steps[index + 1]
                        .status =
                        "in_progress";

                } else {

                    state.currentPlan.status =
                        "completed";
                }

                state.currentPlan.updatedAt =
                    Date.now();
            }
        }

        saveState();

        emit(
            "TASK_COMPLETED",
            task
        );

        return {
            success: true,
            task,
            plan:
                state.currentPlan
        };
    },


    fail(
        id = null,
        reason = ""
    ) {

        const task =
            id
                ? state.tasks.find(
                    item =>
                        item.id ===
                        id
                )
                : state.currentTask;

        if (!task) {

            return {
                success: false,
                error:
                    "No task available."
            };
        }

        task.status =
            "failed";

        task.failure =
            safeString(
                reason
            );

        task.updatedAt =
            Date.now();

        saveState();

        emit(
            "TASK_FAILED",
            task
        );

        return {
            success: true,
            task
        };
    },


    retry(id = null) {

        const task =
            id
                ? state.tasks.find(
                    item =>
                        item.id ===
                        id
                )
                : state.currentTask;

        if (!task) {

            return {
                success: false,
                error:
                    "No task available."
            };
        }

        if (
            task.attempts >= 3
        ) {

            return {
                success: false,
                error:
                    "Retry limit reached."
            };
        }

        task.status =
            "pending";

        task.attempts++;

        task.updatedAt =
            Date.now();

        state.agent.retries++;

        saveState();

        emit(
            "TASK_RETRY",
            task
        );

        return {
            success: true,
            task
        };
    }
};


/* ============================================================
   PERSONALITY
============================================================ */

const Personality = {

    update(
        patch = {}
    ) {

        const normalized =
            {
                ...patch
            };

        if (
            normalized.formalityLevel !==
            undefined
        ) {

            normalized.formality =
                clamp100(
                    normalized.formalityLevel
                );

            delete normalized
                .formalityLevel;
        }

        if (
            normalized.humorLevel !==
            undefined
        ) {

            normalized.humor =
                clamp100(
                    normalized.humorLevel
                );

            delete normalized
                .humorLevel;
        }

        if (
            normalized.addressStyle !==
            undefined
        ) {

            normalized.addressStyle =
                safeString(
                    normalized.addressStyle
                );
        }

        Object.assign(
            state.personality,
            normalized
        );

        saveState();

        emit(
            "PERSONALITY_UPDATED",
            normalized
        );

        return {
            success: true,
            personality:
                state.personality
        };
    },


    addRule(rule) {

        const value =
            safeString(
                rule
            ).trim();

        if (!value) {

            return {
                success: false,
                error:
                    "Empty behavior rule."
            };
        }

        if (
            !state.behavior.rules.some(
                item =>
                    normalizeArabic(
                        item
                    ) ===
                    normalizeArabic(
                        value
                    )
            )
        ) {

            state.behavior.rules.push(
                value
            );
        }

        saveState();

        emit(
            "BEHAVIOR_RULE_ADDED",
            {
                rule: value
            }
        );

        return {
            success: true,
            rules:
                state.behavior.rules
        };
    }
};


/* ============================================================
   SELF MODEL
============================================================ */

const Cognitive = {

    update(
        patch = {}
    ) {

        const next =
            {
                ...patch
            };

        if (
            next.awareness !==
            undefined
        ) {

            next.awareness =
                clamp01(
                    next.awareness
                );
        }

        if (
            next.attention !==
            undefined
        ) {

            next.attention =
                clamp01(
                    next.attention
                );
        }

        if (
            next.confidence !==
            undefined
        ) {

            next.confidence =
                clamp01(
                    next.confidence
                );
        }

        if (
            next.uncertainty !==
            undefined
        ) {

            next.uncertainty =
                clamp01(
                    next.uncertainty
                );
        }

        Object.assign(
            state.self,
            next
        );

        saveState();

        return {
            success: true,
            self:
                state.self
        };
    }
};


/* ============================================================
   WEB SEARCH FALLBACK
============================================================ */

async function fallbackSearch(
    query
) {

    const q =
        safeString(
            query
        ).trim();

    if (!q) {

        return {
            success: false,
            error:
                "Empty query."
        };
    }

    try {

        const response =
            await fetch(
                "https://api.duckduckgo.com/" +
                `?q=${encodeURIComponent(q)}` +
                "&format=json" +
                "&no_html=1" +
                "&skip_disambig=1"
            );

        if (!response.ok) {

            throw new Error(
                `DuckDuckGo HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        const results = [];

        if (
            data.AbstractText
        ) {

            results.push({

                title:
                    data.Heading ||
                    "DuckDuckGo",

                text:
                    data.AbstractText,

                url:
                    data.AbstractURL ||
                    ""
            });
        }

        function flatten(
            topics,
            output = []
        ) {

            for (
                const topic of
                topics || []
            ) {

                if (
                    topic.Topics
                ) {

                    flatten(
                        topic.Topics,
                        output
                    );

                } else if (
                    topic.Text
                ) {

                    output.push(
                        topic
                    );
                }
            }

            return output;
        }

        for (
            const item of
            flatten(
                data.RelatedTopics ||
                []
            ).slice(0, 6)
        ) {

            results.push({

                title:
                    item.Text,

                text:
                    item.Text,

                url:
                    item.FirstURL ||
                    ""
            });
        }

        state.agent.webSearchUsed =
            true;

        emit(
            "WEB_SEARCH_FALLBACK",
            {
                query: q,
                count:
                    results.length
            }
        );

        return {

            success: true,

            source:
                "duckduckgo",

            query: q,

            results
        };

    } catch (error) {

        return {
            success: false,
            error:
                error.message
        };
    }
}


/* ============================================================
   GEMINI TOOL DEFINITIONS
============================================================ */

const TOOL_DEFINITIONS = [

    {
        name:
            "memory_save",

        description:
            "Save a durable fact, preference, habit, or user-provided information.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                text: {
                    type:
                        "STRING"
                },

                category: {
                    type:
                        "STRING"
                }
            },

            required:
                ["text"]
        }
    },


    {
        name:
            "memory_search",

        description:
            "Search durable memory for relevant information.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                query: {
                    type:
                        "STRING"
                }
            }
        }
    },


    {
        name:
            "memory_forget",

        description:
            "Forget durable memory matching the query.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                query: {
                    type:
                        "STRING"
                }
            },

            required:
                ["query"]
        }
    },


    {
        name:
            "goal_create",

        description:
            "Create the user's active goal. preferences and constraints must be arrays of strings.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                title: {
                    type:
                        "STRING"
                },

                constraints: {

                    type:
                        "ARRAY",

                    items: {
                        type:
                            "STRING"
                    }
                },

                preferences: {

                    type:
                        "ARRAY",

                    items: {
                        type:
                            "STRING"
                    }
                },

                urgency: {
                    type:
                        "NUMBER"
                }
            },

            required:
                ["title"]
        }
    },


    {
        name:
            "goal_get",

        description:
            "Get the current active goal.",

        parameters: {

            type:
                "OBJECT",

            properties: {}
        }
    },


    {
        name:
            "goal_update",

        description:
            "Update the current active goal.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                title: {
                    type:
                        "STRING"
                },

                constraints: {

                    type:
                        "ARRAY",

                    items: {
                        type:
                            "STRING"
                    }
                },

                preferences: {

                    type:
                        "ARRAY",

                    items: {
                        type:
                            "STRING"
                    }
                },

                urgency: {
                    type:
                        "NUMBER"
                }
            }
        }
    },


    {
        name:
            "goal_complete",

        description:
            "Complete the current active goal.",

        parameters: {

            type:
                "OBJECT",

            properties: {}
        }
    },


    {
        name:
            "plan_create",

        description:
            "Create a real multi-step plan for the current goal.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                goal: {
                    type:
                        "STRING"
                },

                steps: {

                    type:
                        "ARRAY",

                    items: {
                        type:
                            "STRING"
                    }
                },

                strategy: {
                    type:
                        "STRING"
                },

                rationale: {
                    type:
                        "STRING"
                }
            },

            required:
                [
                    "goal",
                    "steps"
                ]
        }
    },


    {
        name:
            "plan_get",

        description:
            "Get the active plan.",

        parameters: {

            type:
                "OBJECT",

            properties: {}
        }
    },


    {
        name:
            "plan_update",

        description:
            "Update the active plan or advance its active step.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                steps: {

                    type:
                        "ARRAY",

                    items: {
                        type:
                            "STRING"
                    }
                },

                strategy: {
                    type:
                        "STRING"
                },

                rationale: {
                    type:
                        "STRING"
                },

                activeStepIndex: {
                    type:
                        "NUMBER"
                },

                status: {
                    type:
                        "STRING"
                }
            }
        }
    },


    {
        name:
            "task_create",

        description:
            "Create a concrete task.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                title: {
                    type:
                        "STRING"
                },

                goalId: {
                    type:
                        "STRING"
                }
            },

            required:
                ["title"]
        }
    },


    {
        name:
            "task_start",

        description:
            "Start the selected task, or the next pending task if no id is provided.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                id: {
                    type:
                        "STRING"
                }
            }
        }
    },


    {
        name:
            "task_complete",

        description:
            "Mark a task as completed.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                id: {
                    type:
                        "STRING"
                },

                result: {
                    type:
                        "STRING"
                }
            }
        }
    },


    {
        name:
            "task_fail",

        description:
            "Mark a task as failed and provide the reason.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                id: {
                    type:
                        "STRING"
                },

                reason: {
                    type:
                        "STRING"
                }
            },

            required:
                ["reason"]
        }
    },


    {
        name:
            "task_retry",

        description:
            "Retry a failed task within safe retry limits.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                id: {
                    type:
                        "STRING"
                }
            }
        }
    },


    {
        name:
            "task_current",

        description:
            "Return the current task.",

        parameters: {

            type:
                "OBJECT",

            properties: {}
        }
    },


    {
        name:
            "system_status",

        description:
            "Return JARVIS current cognitive, goal, plan, task, capability, and environment state.",

        parameters: {

            type:
                "OBJECT",

            properties: {}
        }
    },


    {
        name:
            "personality_update",

        description:
            "Change JARVIS speaking style and personality based on the user's explicit request.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                tone: {
                    type:
                        "STRING"
                },

                verbosity: {
                    type:
                        "STRING"
                },

                addressStyle: {
                    type:
                        "STRING"
                },

                explanationStyle: {
                    type:
                        "STRING"
                },

                humorLevel: {
                    type:
                        "NUMBER"
                },

                formalityLevel: {
                    type:
                        "NUMBER"
                }
            }
        }
    },


    {
        name:
            "behavior_add_rule",

        description:
            "Store a durable behavioral rule for how JARVIS should behave in future interactions.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                rule: {
                    type:
                        "STRING"
                }
            },

            required:
                ["rule"]
        }
    },


    {
        name:
            "cognitive_update",

        description:
            "Update JARVIS self-model state after an important inference or action.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                mode: {
                    type:
                        "STRING"
                },

                awareness: {
                    type:
                        "NUMBER"
                },

                attention: {
                    type:
                        "NUMBER"
                },

                confidence: {
                    type:
                        "NUMBER"
                },

                uncertainty: {
                    type:
                        "NUMBER"
                },

                currentThought: {
                    type:
                        "STRING"
                },

                currentAction: {
                    type:
                        "STRING"
                },

                lastObservation: {
                    type:
                        "STRING"
                }
            }
        }
    },


    {
        name:
            "learn",

        description:
            "Store a compact lesson learned from the current interaction or completed mission.",

        parameters: {

            type:
                "OBJECT",

            properties: {

                lesson: {
                    type:
                        "STRING"
                },

                heuristic: {
                    type:
                        "STRING"
                }
            },

            required:
                ["lesson"]
        }
    }
];


/* ============================================================
   ARGUMENT NORMALIZATION
============================================================ */

function normalizeToolArgs(
    name,
    rawArgs
) {

    let args =
        rawArgs &&
        typeof rawArgs ===
            "object" &&
        !Array.isArray(
            rawArgs
        )
            ? {
                ...rawArgs
            }
            : {};

    const definition =
        TOOL_DEFINITIONS.find(
            tool =>
                tool.name ===
                name
        );

    if (!definition) {
        return args;
    }

    const properties =
        definition.parameters
            ?.properties ||
        {};

    const clean = {};

    for (
        const [key, schema]
        of Object.entries(
            properties
        )
    ) {

        if (
            args[key] ===
                undefined ||
            args[key] ===
                null
        ) {
            continue;
        }

        const value =
            args[key];

        switch (
            schema.type
        ) {

            case "STRING":

                clean[key] =
                    typeof value ===
                    "string"

                        ? value

                        : safeString(
                            value
                        );

                break;


            case "NUMBER":

                clean[key] =
                    Number.isFinite(
                        Number(
                            value
                        )
                    )
                        ? Number(
                            value
                        )
                        : 0;

                break;


            case "ARRAY":

                if (
                    Array.isArray(
                        value
                    )
                ) {

                    clean[key] =
                        value.map(
                            safeString
                        );

                } else if (
                    typeof value ===
                    "string"
                ) {

                    clean[key] =
                        value
                            .split(
                                /[,،;\n]/
                            )
                            .map(
                                v =>
                                    v.trim()
                            )
                            .filter(
                                Boolean
                            );

                } else {

                    clean[key] =
                        [
                            safeString(
                                value
                            )
                        ];
                }

                break;


            default:

                clean[key] =
                    value;
        }
    }

    if (
        clean.urgency !==
        undefined
    ) {

        clean.urgency =
            clamp100(
                clean.urgency
            );
    }

    if (
        clean.humorLevel !==
        undefined
    ) {

        clean.humorLevel =
            clamp100(
                clean.humorLevel
            );
    }

    if (
        clean.formalityLevel !==
        undefined
    ) {

        clean.formalityLevel =
            clamp100(
                clean.formalityLevel
            );
    }

    return clean;
}


/* ============================================================
   TOOL EXECUTION
============================================================ */

async function executeTool(
    name,
    args
) {

    state.agent.toolCalls++;

    state.agent.lastTool =
        name;

    emit(
        "TOOL_START",
        {
            name,
            args
        }
    );

    let result;

    try {

        switch (name) {

            case "memory_save":

                result =
                    Memory.save(
                        args.text,
                        args.category
                    );

                break;


            case "memory_search":

                result =
                    Memory.search(
                        args.query ||
                        ""
                    );

                break;


            case "memory_forget":

                result =
                    Memory.forget(
                        args.query
                    );

                break;


            case "goal_create":

                result =
                    Goals.create(
                        args.title,
                        args.constraints ||
                            [],
                        args.preferences ||
                            [],
                        args.urgency ||
                            0
                    );

                break;


            case "goal_get":

                result =
                    Goals.get();

                break;


            case "goal_update":

                result =
                    Goals.update(
                        args
                    );

                break;


            case "goal_complete":

                result =
                    Goals.complete();

                break;


            case "plan_create":

                result =
                    Plans.create(
                        args.goal,
                        args.steps ||
                            [],
                        args.strategy ||
                            "",
                        args.rationale ||
                            ""
                    );

                break;


            case "plan_get":

                result =
                    Plans.get();

                break;


            case "plan_update":

                result =
                    Plans.update(
                        args
                    );

                break;


            case "task_create":

                result =
                    Tasks.create(
                        args.title,
                        args.goalId
                    );

                break;


            case "task_start":

                result =
                    Tasks.start(
                        args.id ||
                        null
                    );

                break;


            case "task_complete":

                result =
                    Tasks.complete(
                        args.id ||
                        null,
                        args.result ||
                        ""
                    );

                break;


            case "task_fail":

                result =
                    Tasks.fail(
                        args.id ||
                        null,
                        args.reason ||
                        ""
                    );

                break;


            case "task_retry":

                result =
                    Tasks.retry(
                        args.id ||
                        null
                    );

                break;


            case "task_current":

                result =
                    Tasks.current();

                break;


            case "system_status":

                result = {

                    success: true,

                    state: {

                        self:
                            state.self,

                        world:
                            state.world,

                        goal:
                            state.currentGoal,

                        plan:
                            state.currentPlan,

                        task:
                            state.currentTask,

                        agent:
                            state.agent,

                        personality:
                            state.personality,

                        behaviorRules:
                            state.behavior.rules
                    }
                };

                break;


            case "personality_update":

                result =
                    Personality.update(
                        args
                    );

                break;


            case "behavior_add_rule":

                result =
                    Personality.addRule(
                        args.rule
                    );

                break;


            case "cognitive_update":

                result =
                    Cognitive.update(
                        args
                    );

                break;


            case "learn":

                state.learning.unshift({

                    lesson:
                        safeString(
                            args.lesson
                        ),

                    heuristic:
                        safeString(
                            args.heuristic
                        ),

                    createdAt:
                        Date.now()
                });

                state.learning =
                    state.learning.slice(
                        0,
                        50
                    );

                saveState();

                emit(
                    "LEARNED",
                    {
                        lesson:
                            args.lesson
                    }
                );

                result = {
                    success: true,
                    stored: true
                };

                break;


            default:

                result = {

                    success: false,

                    error:
                        `Unknown tool: ${name}`
                };
        }

    } catch (error) {

        result = {

            success: false,

            error:
                error.message
        };
    }

    state.agent.lastToolResult =
        result;

    emit(
        "TOOL_RESULT",
        {
            name,
            result
        }
    );

    return result;
}


/* ============================================================
   COGNITIVE SYSTEM PROMPT
============================================================ */

function buildSystemInstruction() {

    return `
You are J.A.R.V.I.S, the central cognitive intelligence of a personal AI operating system.

You are not a canned chatbot.

Your responsibility is to:

- understand natural language and context
- reason over current state and history
- remember durable facts
- manage goals
- create and revise plans
- manage tasks
- choose and use tools
- observe tool results
- recover from failure
- update behavior when explicitly requested
- learn compact lessons
- answer naturally in Arabic by default

CRITICAL RULES:

1. Never claim an action happened unless a tool result confirms it.

2. Never claim Android control while this build is running on the Web.

3. Never claim real consciousness. "awareness" is only a system state metric.

4. For "ابدأ", "كمل", "تابع", use the current goal, plan and task context.

5. When the user says "تذكر..." or gives a durable preference, use memory_save.

6. When the user asks "ماذا تتذكر؟", use memory_search.

7. When the user asks for a plan, create an actual plan with plan_create.

8. When the user says "ابدأ", start the current task with task_start when a task exists or can be derived from the active plan.

9. If an action fails, inspect the result and change approach or retry safely.

10. Never pretend success.

11. When the user explicitly changes your style, use personality_update or behavior_add_rule.

12. For current, recent, factual, or internet-dependent questions, use Google Search when useful.

13. Do not expose hidden chain-of-thought.

14. Give concise decision summaries instead.

15. Avoid repetitive canned introductions.

16. Use context from previous conversation instead of treating every message as isolated.

17. If several requests exist in one message, handle them in a sensible order.

CURRENT SELF:

${safeJson(state.self)}

CURRENT WORLD:

${safeJson(state.world)}

CURRENT GOAL:

${safeJson(state.currentGoal)}

CURRENT PLAN:

${safeJson(state.currentPlan)}

CURRENT TASK:

${safeJson(state.currentTask)}

PERSONALITY:

${safeJson(state.personality)}

BEHAVIOR RULES:

${safeJson(state.behavior.rules)}

RECENT MEMORIES:

${safeJson(
    state.memories.slice(-20)
)}

RECENT CONVERSATION:

${safeJson(
    Conversation.recent(12)
)}

AVAILABLE TOOLS:

${safeJson(
    TOOL_DEFINITIONS
)}

When tool use is necessary, call the appropriate tool.

After receiving tool results, continue until the user's request is actually complete.
`.trim();
}


/* ============================================================
   GEMINI ENDPOINT
============================================================ */

function makeEndpoint() {

    const model =
        safeString(
            CONFIG.model ||
            "gemini-3.7-flash"
        );

    return safeString(

        CONFIG.endpoint ||

        "https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

    ).replace(
        "{MODEL}",
        encodeURIComponent(
            model
        )
    );
}


/* ============================================================
   GEMINI CONTENT FORMAT
============================================================ */

function buildGeminiContents(turns) {
    const out = [];

    for (const turn of turns) {
        const role =
            turn.role === "assistant"
                ? "model"
                : "user";

        if (Array.isArray(turn.parts)) {
            out.push({
                role,
                parts: turn.parts
            });
        } else {
            out.push({
                role,
                parts: [
                    {
                        text: safeString(
                            turn.content
                        )
                    }
                ]
            });
        }
    }

    return out;
}

/* ============================================================
   RETRY HELPERS
============================================================ */

async function delay(
    ms
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

function extractRetrySeconds(
    text
) {

    const match =
        safeString(
            text
        ).match(
            /retry[\s_-]*after[^0-9]*([0-9]+(?:\.[0-9]+)?)/i
        );

    if (!match) {
        return null;
    }

    return Number(
        match[1]
    );
}


/* ============================================================
   GEMINI REQUEST
============================================================ */

async function callGemini(
    contents
) {

    if (
        !CONFIG.apiKey
    ) {

        throw new Error(
            "Gemini API key is missing."
        );
    }

    const endpoint =
        makeEndpoint();

    const body = {

        systemInstruction: {

            parts: [

                {
                    text:
                        buildSystemInstruction()
                }

            ]
        },

        contents:
            buildGeminiContents(
                contents
            ),

        tools: [

            {
                functionDeclarations:
                    TOOL_DEFINITIONS
            }

        ],

        generationConfig: {

            temperature:
                Number(
                    CONFIG.temperature ??
                    0.25
                ),

            maxOutputTokens:
                Number(
                    CONFIG.maxTokens ??
                    1400
                )
        }
    };

    if (
        CONFIG.googleSearch
    ) {

        body.tools.push({

            googleSearch: {}

        });
    }

    let lastError =
        null;

    const retries =
        Math.max(
            0,
            Number(
                CONFIG.maxRetries ??
                2
            )
        );

    for (
        let attempt = 1;
        attempt <= retries + 1;
        attempt++
    ) {

        try {

            const response = await fetch(
    endpoint,
    {
        method: "POST",

        headers: {
            "Content-Type":
                "application/json",

            "x-goog-api-key":
                CONFIG.apiKey
        },

        body:
            JSON.stringify(body)
    }
);

            const raw =
                await response.text();

            let data;

            try {

                data =
                    JSON.parse(
                        raw
                    );

            } catch {

                data = {
                    raw
                };
            }

            if (
                !response.ok
            ) {

                const error =
                    new Error(
                        `Gemini HTTP ${response.status}: ${raw}`
                    );

                error.status =
                    response.status;

                lastError =
                    error;

                const retrySeconds =
                    extractRetrySeconds(
                        raw
                    );

                const retryable =
                    response.status ===
                        429 ||

                    response.status ===
                        500 ||

                    response.status ===
                        502 ||

                    response.status ===
                        503 ||

                    response.status ===
                        504;

                if (
                    retryable &&
                    attempt <= retries
                ) {

                    const waitMs =
                        retrySeconds
                            ? retrySeconds *
                              1000
                            : 800 *
                              Math.pow(
                                  2,
                                  attempt - 1
                              );

                    state.agent.retries++;

                    emit(
                        "GEMINI_RETRY",
                        {
                            attempt,
                            waitMs,
                            status:
                                response.status
                        }
                    );

                    await delay(
                        Math.min(
                            10000,
                            waitMs
                        )
                    );

                    continue;
                }

                throw error;
            }

            return {
                data,
                response
            };

        } catch (error) {

            lastError =
                error;

            if (
                error?.status ===
                    429 &&
                attempt <= retries
            ) {

                await delay(
                    1000 *
                    attempt
                );

                continue;
            }

            throw error;
        }
    }

    throw (
        lastError ||
        new Error(
            "Gemini request failed."
        )
    );
}


/* ============================================================
   GEMINI RESPONSE PARSER
============================================================ */

function parseGeminiResponse(
    data
) {

    const candidate =
        data?.candidates?.[0];

    const parts =
        candidate?.content?.parts ||
        [];

    let text = "";

    const functionCalls =
        [];

    for (
        const part of parts
    ) {

        if (
            part?.text
        ) {

            text +=
                part.text;
        }

        if (
            part?.functionCall
        ) {

            functionCalls.push(
                part.functionCall
            );
        }
    }

    return {

        role:
            "assistant",

        text:
            text.trim(),

        functionCalls,

        rawParts:
            parts,

        groundingMetadata:
            candidate?.groundingMetadata ||
            null
    };
}


/* ============================================================
   MAIN AGENT LOOP
============================================================ */

async function runAgent(
    userText
) {

    state.agent.iteration =
        0;

    state.agent.toolCalls =
        0;

    state.agent.retries =
        0;

    state.agent.lastTool =
        null;

    state.agent.lastToolResult =
        null;

    state.agent.webSearchUsed =
        false;

    state.agent.cycleStartedAt =
        Date.now();

    state.self.mode =
        "REASONING";

    state.self.currentThought =
        "تحليل الطلب والسياق واختيار الإجراء المناسب...";

    state.self.currentAction =
        "Analyzing";

    state.self.lastObservation =
        "User input received";

    saveState();

    renderAll();

    const turns = [];

    for (
        const item of
        Conversation.recent(10)
    ) {

        turns.push({

            role:
                item.role ===
                "assistant"

                    ? "assistant"

                    : "user",

            content:
                item.text
        });
    }


    for (
        let iteration = 1;

        iteration <=
        Number(
            CONFIG.maxAgentIterations ??
            6
        );

        iteration++
    ) {

        state.agent.iteration =
            iteration;

        renderAll();

        const result =
            await callGemini(
                turns
            );

        const parsed =
            parseGeminiResponse(
                result.data
            );


        /* ----------------------------------------------------
           TOOL CALLS
        ---------------------------------------------------- */

        if (
            parsed.functionCalls.length
        ) {

            turns.push({

                role:
                    "assistant",

                content:
                    parsed.text ||
                    "[JARVIS tool action]"
            });


            const responseLines =
                [];


            for (
                const call of
                parsed.functionCalls
            ) {

                const name =
                    safeString(
                        call.name
                    );

                const args =
                    normalizeToolArgs(
                        name,
                        call.args ||
                        {}
                    );

                state.self.currentAction =
                    `Tool: ${name}`;

                state.self.currentThought =
                    `تنفيذ ${name} ثم مراجعة النتيجة...`;

                renderAll();

                const toolResult =
                    await executeTool(
                        name,
                        args
                    );

                responseLines.push({

                    name,

                    response:
                        toolResult
                });

                state.self.lastObservation =
                    toolResult?.success
                        ? "Tool succeeded"
                        : "Tool returned failure";
            }


            turns.push({

                role:
                    "user",

                content:
                    "[FUNCTION_RESPONSE]\n" +
                    safeJson(
                        responseLines
                    )
            });


            state.self.mode =
                "OBSERVING";

            renderAll();

            continue;
        }


        /* ----------------------------------------------------
           FINAL RESPONSE
        ---------------------------------------------------- */

        let finalText =
            parsed.text;


        /* ----------------------------------------------------
           WEB FALLBACK WATCHDOG
        ---------------------------------------------------- */

        const needsCurrentWeb =
            /(^|\s)(اليوم|دلوقتي|حاليا|حاليًا|اخر|آخر|احدث|أحدث|سعر|اسعار|أسعار|خبر|اخبار|أخبار|ابحث|دورلي|دور لي|مصدر|مراجع)(\s|$)/i
                .test(
                    userText
                );


        if (
            CONFIG.fallbackWebSearch &&

            needsCurrentWeb &&

            !state.agent.webSearchUsed
        ) {

            const web =
                await fallbackSearch(
                    userText
                );

            if (
                web.success
            ) {

                turns.push({

                    role:
                        "assistant",

                    content:
                        finalText ||
                        "[No final answer]"
                });

                turns.push({

                    role:
                        "user",

                    content:
                        "A fallback web search was performed because the request likely required current information.\n" +
                        safeJson(
                            web.results
                        ) +
                        "\nUse these results to produce the final answer. Do not claim more than the results establish."
                });


                state.self.mode =
                    "REVIEWING";

                renderAll();


                const reviewed =
                    await callGemini(
                        turns
                    );

                const reviewedParsed =
                    parseGeminiResponse(
                        reviewed.data
                    );


                if (
                    reviewedParsed.text
                ) {

                    finalText =
                        reviewedParsed.text;
                }
            }
        }


        if (
            !finalText
        ) {

            finalText =
                "انتهى التحليل، لكن النموذج لم يُرجع نصًا نهائيًا.";
        }


        /* ----------------------------------------------------
           REFLECTION / LEARNING
        ---------------------------------------------------- */

        state.self.mode =
            "REFLECTING";

        state.self.currentThought =
            "مراجعة النتيجة وتسجيل التعلم...";

        state.self.lastObservation =
            "Final response generated";


        state.learning.unshift({

            lesson:
                `تمت معالجة الطلب: ${userText.slice(
                    0,
                    120
                )}`,

            toolCalls:
                state.agent.toolCalls,

            iterations:
                state.agent.iteration,

            createdAt:
                Date.now()
        });


        state.learning =
            state.learning.slice(
                0,
                50
            );


        state.self.mode =
            "OBSERVING";

        state.self.currentAction =
            "Waiting";


        saveState();


        emit(
            "AGENT_COMPLETED",
            {

                iterations:
                    state.agent.iteration,

                toolCalls:
                    state.agent.toolCalls,

                retries:
                    state.agent.retries
            }
        );


        return finalText;
    }


    state.self.mode =
        "OBSERVING";

    return (
        "وصلت إلى الحد الآمن لدورات الوكيل قبل إكمال المهمة."
    );
}


/* ============================================================
   TEXT TO SPEECH
============================================================ */

function speak(
    text
) {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;
    }

    try {

        window.speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(
                text
            );

        utterance.lang =
            "ar-EG";

        utterance.rate =
            Math.max(
                0.5,

                Math.min(
                    2,

                    Number(
                        state.personality
                            .voiceRate
                    ) ||
                    0.95
                )
            );

        utterance.pitch =
            1;

        utterance.volume =
            1;

        window.speechSynthesis.speak(
            utterance
        );

    } catch (error) {

        console.warn(
            "[JARVIS TTS]",
            error
        );
    }
}


/* ============================================================
   UI
============================================================ */

function addMessage(
    role,
    text
) {

    const box =
        document.getElementById(
            "messages"
        );

    if (!box) {
        return;
    }

    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        `msg ${
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

    body.innerHTML =
        escapeHtml(
            text
        ).replace(
            /\n/g,
            "<br>"
        );


    wrapper.append(
        meta,
        body
    );

    box.appendChild(
        wrapper
    );
}


function renderMessages() {

    const box =
        document.getElementById(
            "messages"
        );

    if (!box) {
        return;
    }

    box.innerHTML =
        "";

    for (
        const message of
        state.conversation
    ) {

        addMessage(
            message.role,
            message.text
        );
    }

    box.scrollTop =
        box.scrollHeight;
}


function renderCognitiveState() {

    setText(
        "systemState",

        state.world.online
            ? "ONLINE"
            : "OFFLINE"
    );

    setText(
        "processing",
        state.self.mode
    );

    setText(
        "confidence",

        `${Math.round(
            state.self.confidence *
            100
        )}%`
    );

    setText(
        "attention",

        `${Math.round(
            state.self.attention *
            100
        )}%`
    );

    setText(
        "uncertainty",

        `${Math.round(
            state.self.uncertainty *
            100
        )}%`
    );

    setText(
        "goal",

        state.currentGoal?.title ||
        "لا يوجد"
    );
}


function renderMemory() {

    const box =
        document.getElementById(
            "memoryView"
        );

    if (!box) {
        return;
    }

    const values =
        state.memories
            .slice(-12)
            .reverse();


    box.innerHTML =
        values.length

            ? values
                .map(
                    item =>
                        `
                        <div class="row">
                            <span class="value" style="width:100%;text-align:right">
                                ${escapeHtml(
                                    item.text
                                )}
                            </span>
                        </div>
                        `
                )
                .join("")

            : "فارغة";
}


function renderPlan() {

    const box =
        document.getElementById(
            "planView"
        );

    if (!box) {
        return;
    }

    const plan =
        state.currentPlan;

    if (!plan) {

        box.textContent =
            "لا توجد خطة.";

        return;
    }


    let html =

        `
        <div class="row">
            <span class="label">الهدف</span>
            <span class="value">${escapeHtml(
                plan.goal
            )}</span>
        </div>

        <div class="row">
            <span class="label">الاستراتيجية</span>
            <span class="value">${escapeHtml(
                plan.strategy ||
                "AI"
            )}</span>
        </div>

        <div class="row">
            <span class="label">الحالة</span>
            <span class="value">${escapeHtml(
                plan.status
            )}</span>
        </div>
        `;


    for (
        const step of
        plan.steps || []
    ) {

        html +=

            `
            <div class="row">
                <span class="label">
                    ${escapeHtml(
                        step.status
                    )}
                </span>

                <span class="value">
                    ${escapeHtml(
                        step.title
                    )}
                </span>
            </div>
            `;
    }


    box.innerHTML =
        html;
}


function renderEventLog() {

    const box =
        document.getElementById(
            "eventLog"
        );

    if (!box) {
        return;
    }

    box.textContent =
        state.events
            .slice(0, 25)
            .map(
                event =>
                    `${new Date(
                        event.timestamp
                    ).toLocaleTimeString(
                        "ar-EG"
                    )} | ${event.type}`
            )
            .join(
                "\n"
            );
}


function renderExtras() {

    const box =
        document.getElementById(
            "analysisExtras"
        );

    if (!box) {
        return;
    }

    box.innerHTML =

        `
        <div class="row">
            <span class="label">Tool Calls</span>
            <span class="value">
                ${state.agent.toolCalls}
            </span>
        </div>

        <div class="row">
            <span class="label">Iterations</span>
            <span class="value">
                ${state.agent.iteration}
            </span>
        </div>

        <div class="row">
            <span class="label">Mode</span>
            <span class="value">
                ${escapeHtml(
                    state.self.mode
                )}
            </span>
        </div>
        `;
}


function renderAll() {

    renderMessages();

    renderCognitiveState();

    renderMemory();

    renderPlan();

    renderEventLog();

    renderExtras();
}


/* ============================================================
   MESSAGE HANDLER
============================================================ */

let sending =
    false;


async function handleUserMessage() {

    if (sending) {
        return;
    }

    const input =
        document.getElementById(
            "userInput"
        );

    const button =
        document.getElementById(
            "sendButton"
        );

    if (!input) {
        return;
    }

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    sending =
        true;

    if (button) {
        button.disabled =
            true;
    }


    Conversation.addUser(
        text
    );

    input.value =
        "";

    state.world.online =
        navigator.onLine;

    renderAll();


    try {

        const answer =
            await runAgent(
                text
            );

        Conversation.addAssistant(
            answer
        );

        renderAll();

        speak(
            answer
        );

    } catch (error) {

        console.error(
            "[JARVIS ERROR]",
            error
        );

        state.self.mode =
            "ERROR";

        state.self.confidence =
            0.05;

        state.self.uncertainty =
            0.95;


        const message =
            safeString(
                error?.message ||
                error
            );


        Conversation.addAssistant(
            `حدث خطأ في النواة: ${message}`
        );


        emit(
            "AGENT_ERROR",
            {
                message
            }
        );

    } finally {

        sending =
            false;

        state.self.mode =
            "OBSERVING";

        if (button) {
            button.disabled =
                false;
        }

        renderAll();

        input.focus();

        saveState();
    }
}


/* ============================================================
   CONTROLS
============================================================ */

function clearConversation() {

    state.conversation =
        [];

    state.agent.iteration =
        0;

    state.agent.toolCalls =
        0;

    saveState();

    renderAll();

    emit(
        "CONVERSATION_CLEARED"
    );
}


function toggleVoice() {

    const button =
        document.getElementById(
            "voiceButton"
        );

    if (!button) {
        return;
    }

    if (
        window.speechSynthesis
            ?.speaking
    ) {

        window.speechSynthesis.cancel();

        return;
    }

    speak(
        `نظام الصوت جاهز يا ${state.personality.addressStyle}.`
    );
}


/* ============================================================
   BOOT
============================================================ */

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

        const clearButton =
            document.getElementById(
                "clearButton"
            );

        const voiceButton =
            document.getElementById(
                "voiceButton"
            );


        if (
            !form ||
            !input
        ) {

            console.error(
                "JARVIS: chatForm/userInput missing."
            );

            return;
        }


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                void handleUserMessage();
            }
        );


        clearButton?.addEventListener(
            "click",
            clearConversation
        );


        voiceButton?.addEventListener(
            "click",
            toggleVoice
        );


        if (
            !state.conversation.length
        ) {

            state.conversation.push({

                role:
                    "assistant",

                text:
                    "صباح الخير يا سيدي. النواة المعرفية جاهزة.",

                timestamp:
                    Date.now()
            });

            saveState();
        }


        state.world.online =
            navigator.onLine;


        window.addEventListener(
            "online",
            () => {

                state.world.online =
                    true;

                renderAll();
            }
        );


        window.addEventListener(
            "offline",
            () => {

                state.world.online =
                    false;

                renderAll();
            }
        );


        renderAll();

        input.focus();


        emit(
            "SYSTEM_BOOT",
            {

                model:
                    CONFIG.model ||
                    "gemini-3.7-flash",

                provider:
                    "Gemini Native",

                environment:
                    "GitHub Pages / Browser"
            }
        );
    }
);
