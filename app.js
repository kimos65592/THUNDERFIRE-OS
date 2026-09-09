"use strict";

/*
=============================================================
 J.A.R.V.I.S — AGENT CORE V2
=============================================================

 USER
   ↓
 AI UNDERSTANDING
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
 TOOL CALL
   ↓
 EXECUTE
   ↓
 OBSERVE
   ↓
 AI REFLECTION
   ↓
 RETRY / REPLAN
   ↓
 LEARN
   ↓
 FINAL RESPONSE

=============================================================

IMPORTANT:

The model is responsible for understanding and deciding.

JavaScript is responsible for:
- state
- persistence
- tools
- validation
- execution
- observation
- safety boundaries

=============================================================
*/


/* =========================================================
   CONFIG
========================================================= */

const AI_CONFIG =
    window.JARVIS_AI_CONFIG || {

        enabled:
            false,

        provider:
            "gemini",

        endpoint:
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",

        apiKey:
            "",

        model:
            "gemini-3.8-flash",

        temperature:
            0.35,

        maxTokens:
            1600,

        reasoningEffort:
            "medium",

        browserSearch:
            true,

        fallbackWebSearch:
            true,

        parallelToolCalls:
            false,

        fallbackSearchEndpoint:
            "",

        maxAgentIterations:
            6,

        maxRetries:
            2
    };


/* =========================================================
   DEFAULT STATE
========================================================= */

const DEFAULT_STATE = {

    system: {

        online:
            true,

        environment:
            "web",

        version:
            "AGENT-V2",

        cognitiveState:
            "idle",

        model:
            AI_CONFIG.model

    },

    conversation: [],

    memories: [],

    goals: [],

    tasks: [],

    currentGoal:
        null,

    currentPlan:
        null,

    currentTask:
        null,

    lastAnalysis:
        null,

    self: {

        confidence:
            0.5,

        uncertainty:
            0.5,

        attention:
            0.85,

        awareness:
            0.80,

        emotionEstimate:
            "neutral"

    },

    personality: {

        address:
            "يا سيدي",

        tone:
            "calm",

        concise:
            false,

        formal:
            0.65,

        humor:
            0.25,

        proactive:
            true,

        warmth:
            0.75,

        voiceRate:
            0.95

    },

    agent: {

        iteration:
            0,

        toolCalls:
            0,

        retries:
            0,

        lastTool:
            null,

        lastToolResult:
            null,

        webSearchUsed:
            false,

        cycleStartedAt:
            null

    },

    learning: {

        episodes:
            []

    },

    events: []
};


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY =
    "JARVIS_AGENT_CORE_V2";


function deepMerge(
    target,
    source
) {

    if (
        !source ||
        typeof source !== "object"
    ) {

        return target;

    }


    for (
        const key
        of Object.keys(source)
    ) {

        const value =
            source[key];


        if (
            value &&
            typeof value ===
                "object" &&
            !Array.isArray(value)
        ) {

            target[key] =
                deepMerge(
                    target[key] || {},
                    value
                );

        } else {

            target[key] =
                value;

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

            return structuredClone(
                DEFAULT_STATE
            );

        }


        const saved =
            JSON.parse(
                raw
            );


        return deepMerge(
            structuredClone(
                DEFAULT_STATE
            ),
            saved
        );

    } catch (
        error
    ) {

        console.error(
            "[STATE LOAD]",
            error
        );


        return structuredClone(
            DEFAULT_STATE
        );

    }

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

    } catch (
        error
    ) {

        console.error(
            "[STATE SAVE]",
            error
        );

    }

}


/* =========================================================
   HELPERS
========================================================= */

function normalizeArabic(
    text
) {

    return String(
        text || ""
    )

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
            Number(
                value
            ) || 0
        )
    );

}


function safeJson(
    value
) {

    try {

        return JSON.stringify(
            value,
            null,
            2
        );

    } catch {

        return String(
            value
        );

    }

}


function escapeHtml(
    text
) {

    return String(
        text ?? ""
    )
        .replace(
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
                }[char])
        );

}


/* =========================================================
   EVENT BUS
========================================================= */

const EventBus = {

    emit(
        type,
        data = {}
    ) {

        state.events.unshift({

            type,

            data,

            timestamp:
                Date.now()

        });


        state.events =
            state.events.slice(
                0,
                150
            );


        console.log(
            `[EVENT] ${type}`,
            data
        );


        renderEventLog();

    }

};


/* =========================================================
   CONVERSATION
========================================================= */

const Conversation = {

    addUser(
        text
    ) {

        state.conversation.push({

            role:
                "user",

            text,

            timestamp:
                Date.now()

        });


        state.conversation =
            state.conversation.slice(
                -100
            );


        saveState();

    },


    addJarvis(
        text
    ) {

        state.conversation.push({

            role:
                "assistant",

            text,

            timestamp:
                Date.now()

        });


        state.conversation =
            state.conversation.slice(
                -100
            );


        saveState();

    },


    recent(
        count = 16
    ) {

        return state.conversation
            .slice(
                -count
            );

    },


    context(
        count = 16
    ) {

        return this
            .recent(
                count
            )
            .map(
                message =>
                    `${
                        message.role ===
                        "user"
                            ? "USER"
                            : "JARVIS"
                    }: ${message.text}`
            )
            .join("\n");

    }

};


/* =========================================================
   MEMORY ENGINE
========================================================= */

const MemoryEngine = {

    save(
        text,
        category =
            "user_fact"
    ) {

        const clean =
            String(
                text || ""
            ).trim();


        if (!clean) {

            return {

                success:
                    false,

                message:
                    "Empty memory."

            };

        }


        const normalized =
            normalizeArabic(
                clean
            );


        const exists =
            state.memories.some(
                memory =>
                    normalizeArabic(
                        memory.text
                    ) ===
                    normalized
            );


        if (!exists) {

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

                accessCount:
                    0,

                lastAccess:
                    null

            });

        }


        saveState();


        EventBus.emit(
            "MEMORY_SAVE",
            {
                text:
                    clean,

                category
            }
        );


        renderMemory();


        return {

            success:
                true,

            message:
                "Memory saved."

        };

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
            !query.trim()
        ) {

            return memories
                .slice(
                    -20
                )
                .reverse();

        }


        const words =
            normalizeArabic(
                query
            )
                .split(" ")
                .filter(
                    Boolean
                );


        return memories

            .map(
                memory => {

                    const content =
                        normalizeArabic(
                            memory.text
                        );


                    let score =
                        0;


                    for (
                        const word
                        of words
                    ) {

                        if (
                            word.length >
                            1 &&
                            content.includes(
                                word
                            )
                        ) {

                            score++;

                        }

                    }


                    return {

                        ...memory,

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


    recall(
        query
    ) {

        const results =
            this.search(
                query
            );


        for (
            const item
            of results
        ) {

            const memory =
                state.memories.find(
                    m =>
                        m.id ===
                        item.id
                );


            if (memory) {

                memory.accessCount++;

                memory.lastAccess =
                    Date.now();

            }

        }


        saveState();


        return results;

    },


    forget(
        query
    ) {

        const q =
            normalizeArabic(
                query
            );


        if (!q) {

            return {

                success:
                    false,

                removed:
                    0

            };

        }


        const before =
            state.memories.length;


        state.memories =
            state.memories.filter(
                memory =>
                    !normalizeArabic(
                        memory.text
                    ).includes(
                        q
                    )
            );


        const removed =
            before -
            state.memories.length;


        saveState();


        EventBus.emit(
            "MEMORY_FORGET",
            {
                query,
                removed
            }
        );


        renderMemory();


        return {

            success:
                true,

            removed

        };

    }

};


/* =========================================================
   GOAL ENGINE
========================================================= */

const GoalEngine = {

    create(
        title,
        meta = {}
    ) {

        const goal = {

            id:
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2),

            title:
                String(
                    title
                ).trim(),

            status:
                "active",

            urgency:
                clamp(
                    meta.urgency ||
                    0
                ),

            constraints:
                Array.isArray(
                    meta.constraints
                )
                    ? meta.constraints
                    : [],

            preferences:
                Array.isArray(
                    meta.preferences
                )
                    ? meta.preferences
                    : [],

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


        EventBus.emit(
            "GOAL_CREATED",
            goal
        );


        return goal;

    },


    getCurrent() {

        return state.currentGoal;

    },


    update(
        changes = {}
    ) {

        if (
            !state.currentGoal
        ) {

            return {

                success:
                    false,

                message:
                    "No active goal."

            };

        }


        Object.assign(
            state.currentGoal,
            changes,
            {
                updatedAt:
                    Date.now()
            }
        );


        saveState();


        EventBus.emit(
            "GOAL_UPDATED",
            changes
        );


        return {

            success:
                true,

            goal:
                state.currentGoal

        };

    },


    complete() {

        if (
            !state.currentGoal
        ) {

            return {

                success:
                    false

            };

        }


        state.currentGoal.status =
            "completed";


        state.currentGoal.updatedAt =
            Date.now();


        saveState();


        EventBus.emit(
            "GOAL_COMPLETED",
            state.currentGoal
        );


        return {

            success:
                true,

            goal:
                state.currentGoal

        };

    }

};


/* =========================================================
   TASK ENGINE
========================================================= */

const TaskEngine = {

    create(
        title,
        goalId = null
    ) {

        const task = {

            id:
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2),

            title:

                String(
                    title
                ).trim(),

            goalId:
                goalId ||
                state.currentGoal?.id ||
                null,

            status:
                "pending",

            attempts:
                0,

            createdAt:
                Date.now(),

            updatedAt:
                Date.now()

        };


        state.tasks.push(
            task
        );


        saveState();


        EventBus.emit(
            "TASK_CREATED",
            task
        );


        return task;

    },


    start(
        id
    ) {

        const task =
            state.tasks.find(
                item =>
                    item.id === id
            );


        if (!task) {

            return {

                success:
                    false,

                message:
                    "Task not found."

            };

        }


        task.status =
            "running";


        task.attempts++;


        task.updatedAt =
            Date.now();


        state.currentTask =
            task;


        saveState();


        EventBus.emit(
            "TASK_STARTED",
            task
        );


        return {

            success:
                true,

            task

        };

    },


    complete(
        id,
        result = null
    ) {

        const task =
            state.tasks.find(
                item =>
                    item.id === id
            );


        if (!task) {

            return {

                success:
                    false

            };

        }


        task.status =
            "completed";


        task.result =
            result;


        task.completedAt =
            Date.now();


        task.updatedAt =
            Date.now();


        if (
            state.currentTask?.id ===
            id
        ) {

            state.currentTask =
                null;

        }


        saveState();


        EventBus.emit(
            "TASK_COMPLETED",
            task
        );


        return {

            success:
                true,

            task

        };

    },


    fail(
        id,
        reason
    ) {

        const task =
            state.tasks.find(
                item =>
                    item.id === id
            );


        if (!task) {

            return {

                success:
                    false

            };

        }


        task.status =
            "failed";


        task.failure =
            String(
                reason ||
                "Unknown failure."
            );


        task.updatedAt =
            Date.now();


        saveState();


        EventBus.emit(
            "TASK_FAILED",
            task
        );


        return {

            success:
                true,

            task

        };

    },


    retry(
        id
    ) {

        const task =
            state.tasks.find(
                item =>
                    item.id === id
            );


        if (!task) {

            return {

                success:
                    false

            };

        }


        if (
            task.attempts >=
            AI_CONFIG.maxRetries
        ) {

            return {

                success:
                    false,

                message:
                    "Maximum retry limit reached."

            };

        }


        task.status =
            "pending";


        task.attempts++;


        task.updatedAt =
            Date.now();


        state.agent.retries++;


        saveState();


        EventBus.emit(
            "TASK_RETRY",
            task
        );


        return {

            success:
                true,

            task

        };

    },


    current() {

        return state.currentTask;

    }

};


/* =========================================================
   PLAN ENGINE
========================================================= */

const PlanEngine = {

    create(
        goal,
        options = {}
    ) {

        const plan = {

            id:
                Date.now() +
                "_" +
                Math.random()
                    .toString(36)
                    .slice(2),

            goal,

            rationale:
                options.rationale ||
                "",

            steps:
                Array.isArray(
                    options.steps
                )
                    ? options.steps
                    : [],

            alternatives:
                Array.isArray(
                    options.alternatives
                )
                    ? options.alternatives
                    : [],

            selectedStrategy:
                options.selectedStrategy ||
                null,

            status:
                "ready",

            createdAt:
                Date.now(),

            updatedAt:
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


        return {

            success:
                true,

            plan

        };

    },


    update(
        changes = {}
    ) {

        if (
            !state.currentPlan
        ) {

            return {

                success:
                    false,

                message:
                    "No active plan."

            };

        }


        Object.assign(
            state.currentPlan,
            changes,
            {
                updatedAt:
                    Date.now()
            }
        );


        saveState();


        EventBus.emit(
            "PLAN_UPDATED",
            changes
        );


        renderPlan();


        return {

            success:
                true,

            plan:
                state.currentPlan

        };

    },


    get() {

        return state.currentPlan;

    }

};


/* =========================================================
   WEB SEARCH FALLBACK
========================================================= */

const WebSearchFallback = {

    async search(
        query
    ) {

        const clean =
            String(
                query || ""
            ).trim();


        if (!clean) {

            return {

                success:
                    false,

                message:
                    "Empty search query."

            };

        }


        /*
        -----------------------------------------------------
        1) Custom endpoint
        -----------------------------------------------------
        */

        if (
            AI_CONFIG.fallbackSearchEndpoint
        ) {

            try {

                const response =
                    await fetch(
                        AI_CONFIG
                            .fallbackSearchEndpoint +
                        "?q=" +
                        encodeURIComponent(
                            clean
                        )
                    );


                if (
                    response.ok
                ) {

                    const data =
                        await response.json();


                    state.agent
                        .webSearchUsed =
                        true;


                    return {

                        success:
                            true,

                        source:
                            "custom_search_endpoint",

                        query:
                            clean,

                        results:
                            data

                    };

                }

            } catch (
                error
            ) {

                console.warn(
                    "[FALLBACK SEARCH]",
                    error
                );

            }

        }


        /*
        -----------------------------------------------------
        2) DuckDuckGo Instant Answer
        -----------------------------------------------------
        */

        try {

            const response =
                await fetch(

                    "https://api.duckduckgo.com/" +

                    "?q=" +
                    encodeURIComponent(
                        clean
                    ) +

                    "&format=json" +

                    "&no_html=1" +

                    "&skip_disambig=1"

                );


            if (
                response.ok
            ) {

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


                for (
                    const item
                    of
                    flattenDuckTopics(
                        data.RelatedTopics ||
                        []
                    ).slice(
                        0,
                        8
                    )
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


                state.agent
                    .webSearchUsed =
                    true;


                EventBus.emit(
                    "WEB_SEARCH_FALLBACK",
                    {
                        query:
                            clean,

                        resultCount:
                            results.length
                    }
                );


                return {

                    success:
                        true,

                    source:
                        "duckduckgo",

                    query:
                        clean,

                    results

                };

            }

        } catch (
            error
        ) {

            console.warn(
                "[DUCK SEARCH]",
                error
            );

        }


        return {

            success:
                false,

            message:
                "Fallback web search failed."

        };

    }

};


function flattenDuckTopics(
    topics,
    output = []
) {

    for (
        const topic
        of topics || []
    ) {

        if (
            topic.Topics
        ) {

            flattenDuckTopics(
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


/* =========================================================
   TIME TOOL
========================================================= */

function getCurrentTime() {

    const date =
        new Date();


    return {

        iso:
            date.toISOString(),

        local:
            date.toLocaleString(
                "ar-EG"
            ),

        hour:
            date.getHours(),

        minute:
            date.getMinutes(),

        day:
            date.toLocaleDateString(
                "ar-EG",
                {
                    weekday:
                        "long"
                }
            )

    };

}


/* =========================================================
   TOOL REGISTRY
========================================================= */

const Tools = {

    definitions() {

        return [

            {
                type:
                    "function",

                function: {

                    name:
                        "memory_search",

                    description:
                        "Search long-term user memory.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            query: {

                                type:
                                    "string"

                            }

                        },

                        required: [
                            "query"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "memory_save",

                    description:
                        "Save durable information about the user.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            text: {

                                type:
                                    "string"

                            },

                            category: {

                                type:
                                    "string"

                            }

                        },

                        required: [
                            "text"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "memory_forget",

                    description:
                        "Remove information from memory.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            query: {

                                type:
                                    "string"

                            }

                        },

                        required: [
                            "query"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "goal_create",

                    description:
                        "Create the user's active goal.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            title: {

                                type:
                                    "string"

                            },

                            urgency: {

                                type:
                                    "number"

                            },

                            constraints: {

                                type:
                                    "array",

                                items: {
                                    type:
                                        "string"
                                }

                            },

                            preferences: {

                                type:
                                    "array",

                                items: {
                                    type:
                                        "string"
                                }

                            }

                        },

                        required: [
                            "title"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "goal_get",

                    description:
                        "Get current active goal.",

                    parameters: {

                        type:
                            "object",

                        properties: {}

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "goal_update",

                    description:
                        "Update active goal.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            title: {
                                type:
                                    "string"
                            },

                            urgency: {
                                type:
                                    "number"
                            },

                            constraints: {
                                type:
                                    "array",
                                items: {
                                    type:
                                        "string"
                                }
                            },

                            preferences: {
                                type:
                                    "array",
                                items: {
                                    type:
                                        "string"
                                }
                            }

                        }

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "goal_complete",

                    description:
                        "Mark current goal complete.",

                    parameters: {

                        type:
                            "object",

                        properties: {}

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "plan_create",

                    description:
                        "Create or replace the active plan.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            goal: {
                                type:
                                    "string"
                            },

                            rationale: {
                                type:
                                    "string"
                            },

                            selectedStrategy: {
                                type:
                                    "string"
                            },

                            steps: {
                                type:
                                    "array",
                                items: {
                                    type:
                                        "string"
                                }
                            },

                            alternatives: {
                                type:
                                    "array",
                                items: {
                                    type:
                                        "object"
                                }
                            }

                        },

                        required: [
                            "goal",
                            "steps"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "plan_get",

                    description:
                        "Get active plan.",

                    parameters: {

                        type:
                            "object",

                        properties: {}

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "plan_update",

                    description:
                        "Modify the active plan.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            steps: {
                                type:
                                    "array",
                                items: {
                                    type:
                                        "string"
                                }
                            },

                            rationale: {
                                type:
                                    "string"
                            },

                            selectedStrategy: {
                                type:
                                    "string"
                            },

                            status: {
                                type:
                                    "string"
                            }

                        }

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "task_create",

                    description:
                        "Create a task.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            title: {
                                type:
                                    "string"
                            },

                            goalId: {
                                type:
                                    "string"
                            }

                        },

                        required: [
                            "title"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "task_start",

                    description:
                        "Start a task.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            id: {
                                type:
                                    "string"
                            }

                        },

                        required: [
                            "id"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "task_complete",

                    description:
                        "Complete a task and store its result.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            id: {
                                type:
                                    "string"
                            },

                            result: {
                                type:
                                    "string"
                            }

                        },

                        required: [
                            "id"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "task_fail",

                    description:
                        "Mark a task as failed.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            id: {
                                type:
                                    "string"
                            },

                            reason: {
                                type:
                                    "string"
                            }

                        },

                        required: [
                            "id",
                            "reason"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "task_retry",

                    description:
                        "Retry a failed task within retry limits.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            id: {
                                type:
                                    "string"
                            }

                        },

                        required: [
                            "id"
                        ]

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "task_current",

                    description:
                        "Get current task.",

                    parameters: {

                        type:
                            "object",

                        properties: {}

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "system_status",

                    description:
                        "Get current JARVIS system state.",

                    parameters: {

                        type:
                            "object",

                        properties: {}

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "time_now",

                    description:
                        "Get current local time.",

                    parameters: {

                        type:
                            "object",

                        properties: {}

                    }

                }

            },


            {
                type:
                    "function",

                function: {

                    name:
                        "web_search",

                    description:
                        "Search the web when current, external, recent or unknown information is required. This is the application fallback search tool.",

                    parameters: {

                        type:
                            "object",

                        properties: {

                            query: {
                                type:
                                    "string"
                            }

                        },

                        required: [
                            "query"
                        ]

                    }

                }

            }

        ];

    },


    async execute(
        name,
        args = {}
    ) {

        state.agent.toolCalls++;


        state.agent.lastTool =
            name;


        EventBus.emit(
            "TOOL_START",
            {
                name,
                args
            }
        );


        let result;


        switch (
            name
        ) {

            case "memory_search":

                result =
                    MemoryEngine.recall(
                        args.query ||
                        ""
                    );

                break;


            case "memory_save":

                result =
                    MemoryEngine.save(
                        args.text,
                        args.category
                    );

                break;


            case "memory_forget":

                result =
                    MemoryEngine.forget(
                        args.query
                    );

                break;


            case "goal_create":

                result =
                    GoalEngine.create(
                        args.title,
                        {
                            urgency:
                                args.urgency,

                            constraints:
                                args.constraints,

                            preferences:
                                args.preferences
                        }
                    );

                break;


            case "goal_get":

                result =
                    GoalEngine.getCurrent();

                break;


            case "goal_update":

                result =
                    GoalEngine.update(
                        args
                    );

                break;


            case "goal_complete":

                result =
                    GoalEngine.complete();

                break;


            case "plan_create":

                result =
                    PlanEngine.create(
                        args.goal,
                        args
                    );

                break;


            case "plan_get":

                result =
                    PlanEngine.get();

                break;


            case "plan_update":

                result =
                    PlanEngine.update(
                        args
                    );

                break;


            case "task_create":

                result =
                    TaskEngine.create(
                        args.title,
                        args.goalId
                    );

                break;


            case "task_start":

                result =
                    TaskEngine.start(
                        args.id
                    );

                break;


            case "task_complete":

                result =
                    TaskEngine.complete(
                        args.id,
                        args.result
                    );

                break;


            case "task_fail":

                result =
                    TaskEngine.fail(
                        args.id,
                        args.reason
                    );

                break;


            case "task_retry":

                result =
                    TaskEngine.retry(
                        args.id
                    );

                break;


            case "task_current":

                result =
                    TaskEngine.current();

                break;


            case "system_status":

                result = {

                    system:
                        state.system,

                    self:
                        state.self,

                    goal:
                        state.currentGoal,

                    plan:
                        state.currentPlan,

                    task:
                        state.currentTask,

                    agent:
                        state.agent

                };

                break;


            case "time_now":

                result =
                    getCurrentTime();

                break;


            case "web_search":

                result =
                    await WebSearchFallback
                        .search(
                            args.query
                        );

                break;


            default:

                result = {

                    success:
                        false,

                    message:
                        `Unknown tool: ${name}`

                };

        }


        state.agent.lastToolResult =
            result;


        EventBus.emit(
            "TOOL_RESULT",
            {
                name,
                result
            }
        );


        saveState();


        renderAll();


        return result;

    }

};


/* =========================================================
   MODEL SYSTEM PROMPT
========================================================= */

function buildSystemPrompt() {

    const personality =
        state.personality;


    return `
You are J.A.R.V.I.S, an AI cognitive agent.

You are NOT a basic chatbot.

Your job is to understand, reason, decide, use tools, observe results,
revise plans when necessary, learn from outcomes, and then communicate
naturally with the user.

IMPORTANT:

1. Never pretend you performed an action when no tool/result proves it.
2. Never claim Android/device access while running in the Web environment.
3. Never claim real consciousness.
4. Use memory when relevant.
5. Use the current goal and plan as working context.
6. If the user gives a short command like "ابدأ", resolve it using context.
7. If a task fails, analyze the failure and consider retrying or replanning.
8. Use web_search when current external information is needed.
9. Do not ask unnecessary clarification when context makes the intent clear.
10. Do not dump internal chain-of-thought. Give concise decision summaries instead.
11. Think step-by-step internally, but only expose useful conclusions, reasons, and actions.
12. Speak naturally, not like a form or a command parser.
13. Do not repeat information unnecessarily.
14. When the user changes your style, preserve the preference.
15. Use the user's history and preferences when they materially help.

PERSONALITY:

Address:
${personality.address}

Tone:
${personality.tone}

Concise:
${personality.concise}

Formality:
${personality.formal}

Humor:
${personality.humor}

Warmth:
${personality.warmth}

CURRENT WORLD:

${safeJson({

    system:
        state.system,

    self:
        state.self,

    goal:
        state.currentGoal,

    plan:
        state.currentPlan,

    task:
        state.currentTask,

    agent:
        state.agent

})}

RECENT MEMORY:

${safeJson(
    MemoryEngine
        .all()
        .slice(-30)
)}

RECENT CONVERSATION:

${Conversation.context(16)}

AVAILABLE LOCAL TOOLS:

memory_search
memory_save
memory_forget

goal_create
goal_get
goal_update
goal_complete

plan_create
plan_get
plan_update

task_create
task_start
task_complete
task_fail
task_retry
task_current

system_status
time_now

web_search

When a tool is needed, call it.

After receiving tool results, continue reasoning and act again if necessary.

Complete the user's request when the evidence is sufficient.
`.trim();

}


/* =========================================================
   GEMINI NATIVE API
   Uses GenerateContent + x-goog-api-key.
========================================================= */

function geminiSchema(schema) {
    if (!schema || typeof schema !== "object") {
        return { type: "OBJECT", properties: {} };
    }

    const out = {
        type: String(schema.type || "object").toUpperCase()
    };

    if (schema.description) out.description = schema.description;
    if (schema.required) out.required = [...schema.required];

    if (schema.properties) {
        out.properties = {};
        for (const [key, value] of Object.entries(schema.properties)) {
            out.properties[key] = geminiSchema(value);
        }
    }

    if (schema.items) out.items = geminiSchema(schema.items);
    if (schema.enum) out.enum = [...schema.enum];

    return out;
}

function geminiFunctionDeclarations() {
    return Tools.definitions().map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: geminiSchema(tool.function.parameters)
    }));
}

function messagesToGeminiContents(messages) {
    const contents = [];

    for (const message of messages) {
        if (!message || message.role === "system") continue;

        if (message.role === "user") {
            contents.push({
                role: "user",
                parts: [{ text: String(message.content ?? "") }]
            });
            continue;
        }

        if (message.role === "assistant") {
            // Prior assistant messages are plain text unless this cycle stores native parts.
            if (Array.isArray(message.parts)) {
                contents.push({ role: "model", parts: message.parts });
            } else {
                contents.push({
                    role: "model",
                    parts: [{ text: String(message.content ?? "") }]
                });
            }
        }
    }

    return contents;
}

async function callGeminiNative(messages) {
    if (!AI_CONFIG.enabled) {
        throw new Error("Gemini AI is disabled.");
    }

    if (!AI_CONFIG.apiKey) {
        throw new Error("Gemini API key is missing.");
    }

    const model = AI_CONFIG.model || "gemini-3.7-flash";
    const base =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    // Official Gemini Native REST authentication.
    const response = await fetch(base, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": String(AI_CONFIG.apiKey).trim()
        },
        body: JSON.stringify({
            contents: messagesToGeminiContents(messages),
            systemInstruction: {
                parts: [{
                    text: String(
                        messages.find(m => m.role === "system")?.content || ""
                    )
                }]
            },
            tools: [{
                functionDeclarations: geminiFunctionDeclarations()
            }],
            generationConfig: {
                temperature: AI_CONFIG.temperature ?? 0.25,
                maxOutputTokens: AI_CONFIG.maxTokens ?? 1200
            }
        })
    });

    if (!response.ok) {
        const text = await response.text();
        const error = new Error(`Gemini Native HTTP ${response.status}: ${text}`);
        error.status = response.status;
        const retryAfter = response.headers.get("retry-after");
        error.retryAfter = retryAfter ? Number(retryAfter) : null;
        throw error;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const content = candidate?.content;

    if (!content) {
        throw new Error("Gemini returned no candidate content.");
    }

    let text = "";
    const functionCalls = [];

    for (const part of content.parts || []) {
        if (typeof part?.text === "string") {
            text += part.text;
        }
        if (part?.functionCall) {
            functionCalls.push({
                id: part.functionCall.id || `gemini_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                name: part.functionCall.name,
                args: part.functionCall.args || {},
                rawPart: part
            });
        }
    }

    return {
        data,
        candidate,
        content,
        text: text.trim(),
        functionCalls
    };
}

async function callGeminiWithRetry(messages) {
    const maxAttempts = Math.max(1, Number(AI_CONFIG.maxRetries ?? 2) + 1);
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await callGeminiNative(messages);
        } catch (error) {
            lastError = error;
            const retryable =
                error?.status === 429 ||
                error?.status === 500 ||
                error?.status === 502 ||
                error?.status === 503 ||
                error?.status === 504;

            if (!retryable || attempt >= maxAttempts) {
                throw error;
            }

            let waitMs = Math.min(10000, 700 * 2 ** (attempt - 1));
            if (Number.isFinite(error.retryAfter) && error.retryAfter > 0) {
                waitMs = Math.max(waitMs, error.retryAfter * 1000);
            }

            state.agent.retries++;
            EventBus.emit("GEMINI_RETRY", { attempt, waitMs, status: error.status });
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }
    }

    throw lastError || new Error("Unknown Gemini error.");
}

/* =========================================================
   WEB SEARCH WATCHDOG
========================================================= */

function shouldSearchWeb(
    message
) {

    const n =
        normalizeArabic(
            message
        );


    const freshness = [

        "اليوم",

        "دلوقتي",

        "حاليا",

        "احدث",

        "اخر",

        "هذا الاسبوع",

        "النهارده",

        "اسعار",

        "سعر",

        "الطقس",

        "اخبار",

        "اخبار اليوم",

        "من هو",

        "ما الجديد",

        "ابحث",

        "دور لي",

        "دورلي",

        "ابحث لي",

        "مصدر",

        "مراجع"

    ];


    return freshness.some(
        word =>
            n.includes(
                word
            )
    );

}


/* =========================================================
   AGENT LOOP
========================================================= */

const Agent = {
    async run(userMessage) {
        state.agent.iteration = 0;
        state.agent.toolCalls = 0;
        state.agent.retries = 0;
        state.agent.lastTool = null;
        state.agent.lastToolResult = null;
        state.agent.webSearchUsed = false;
        state.agent.cycleStartedAt = Date.now();

        state.self.confidence = 0.5;
        state.self.uncertainty = 0.5;
        state.self.cognitiveState = "reasoning";

        EventBus.emit("AGENT_START", { message: userMessage });

        // The current user message is already in Conversation. Do not duplicate it.
        const messages = [
            { role: "system", content: buildSystemPrompt() },
            ...Conversation.recent(12).map(m => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.text
            }))
        ];

        // Ensure the model sees the current request even if conversation persistence was interrupted.
        const recentUser = [...messages].reverse().find(m => m.role === "user")?.content;
        if (recentUser !== userMessage) {
            messages.push({ role: "user", content: userMessage });
        }

        for (let iteration = 1; iteration <= Number(AI_CONFIG.maxAgentIterations ?? 6); iteration++) {
            state.agent.iteration = iteration;
            renderAll();

            const result = await callGeminiWithRetry(messages);

            // Preserve the native model content exactly, including Gemini 3 thought signatures.
            // This is important when function calling is used.
            if (result.functionCalls.length) {
                messages.push({
                    role: "assistant",
                    parts: result.content.parts
                });

                for (const call of result.functionCalls) {
                    const normalizedArgs = normalizeToolArguments(call.name, call.args);
                    let toolResult;

                    try {
                        toolResult = await Tools.execute(call.name, normalizedArgs);
                    } catch (error) {
                        toolResult = {
                            success: false,
                            error: error?.message || String(error)
                        };
                    }

                    messages.push({
                        role: "user",
                        parts: [{
                            functionResponse: {
                                name: call.name,
                                id: call.id,
                                response: toolResult && typeof toolResult === "object"
                                    ? toolResult
                                    : { result: toolResult }
                            }
                        }]
                    });

                    state.agent.lastToolResult = toolResult;
                }

                state.self.cognitiveState = "observing";
                renderAll();
                continue;
            }

            let finalText = result.text || "";

            // Search watchdog: only as a fallback when a current/fresh query obviously needs web data.
            if (
                AI_CONFIG.fallbackWebSearch &&
                shouldSearchWeb(userMessage) &&
                !state.agent.webSearchUsed
            ) {
                const fallback = await WebSearchFallback.search(userMessage);

                if (fallback.success) {
                    state.agent.webSearchUsed = true;

                    messages.push({
                        role: "assistant",
                        parts: result.content.parts
                    });

                    messages.push({
                        role: "user",
                        parts: [{
                            text:
                                `نتيجة بحث احتياطية:\n${safeJson(fallback.results)}\n\nحللها وأعطني الإجابة النهائية بشكل طبيعي ومختصر، ولا تختلق معلومات غير موجودة.`
                        }]
                    });

                    state.self.cognitiveState = "reviewing";
                    const reviewed = await callGeminiWithRetry(messages);
                    finalText = reviewed.text || finalText;
                }
            }

            if (!finalText) {
                finalText = "لم أحصل على رد نهائي من Gemini.";
            }

            state.self.cognitiveState = "reflecting";
            state.self.confidence = 0.85;
            state.self.uncertainty = 0.15;

            EventBus.emit("AGENT_REFLECTION", {
                iteration,
                toolCalls: state.agent.toolCalls,
                webSearchUsed: state.agent.webSearchUsed
            });

            LearningEngine.record({
                userMessage,
                goal: state.currentGoal,
                plan: state.currentPlan,
                toolCalls: state.agent.toolCalls,
                retries: state.agent.retries,
                webSearchUsed: state.agent.webSearchUsed,
                response: finalText
            });

            state.self.cognitiveState = "idle";
            saveState();
            return finalText;
        }

        state.self.cognitiveState = "idle";
        return "توقفت عند الحد الآمن لدورات الوكيل قبل إنهاء المهمة.";
    }
};

/* =========================================================
   LEARNING ENGINE
========================================================= */

const LearningEngine = {

    record(
        episode
    ) {

        state.learning
            .episodes
            .push({

                id:
                    Date.now() +
                    "_" +
                    Math.random()
                        .toString(36)
                        .slice(2),

                ...episode,

                createdAt:
                    Date.now()

            });


        state.learning
            .episodes =
            state.learning
                .episodes
                .slice(
                    -100
                );


        saveState();


        EventBus.emit(
            "LEARNING_EPISODE_RECORDED",
            {

                goal:
                    episode.goal?.title ||
                    null,

                toolCalls:
                    episode.toolCalls,

                retries:
                    episode.retries

            }
        );

    }

};


/* =========================================================
   NATURAL RESPONSE / VOICE
========================================================= */

function speak(
    text
) {

    if (
        !window.speechSynthesis
    ) {

        return;

    }


    try {

        window.speechSynthesis
            .cancel();


        const utterance =
            new SpeechSynthesisUtterance(
                text
            );


        utterance.lang =
            "ar-EG";


        utterance.rate =
            clamp(
                state.personality
                    .voiceRate,

                0.5,

                2
            );


        /*
        نبرة طبيعية بدون محاولة تقليد
        صوت شخصية حقيقية بعينها.
        */

        utterance.pitch =
            1;


        utterance.volume =
            1;


        window.speechSynthesis
            .speak(
                utterance
            );

    } catch (
        error
    ) {

        console.warn(
            "[TTS]",
            error
        );

    }

}


/* =========================================================
   MESSAGE UI
========================================================= */

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
            role ===
            "user"
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
        role ===
        "user"
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

}


/* =========================================================
   RENDER
========================================================= */

function renderMessages() {

    const box =
        document.getElementById(
            "messages"
        );


    if (!box)
        return;


    box.innerHTML =
        "";


    for (
        const message
        of state.conversation
    ) {

        addMessage(
            message.role ===
                "assistant"
                ? "jarvis"
                : "user",

            message.text
        );

    }


    box.scrollTop =
        box.scrollHeight;

}


function renderState() {

    setText(
        "systemState",
        state.system.online
            ? "ONLINE"
            : "OFFLINE"
    );


    setText(
        "processing",
        state.self.cognitiveState
    );


    setText(
        "confidence",
        `${Math.round(
            state.self.confidence *
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


function renderAnalysis() {

    const analysis =
        state.lastAnalysis;


    setText(
        "intent",
        analysis?.intent ||
        "AI"
    );


    setText(
        "analysisGoal",
        analysis?.goal ||
        state.currentGoal?.title ||
        "—"
    );


    setText(
        "memoryAction",
        analysis?.memoryAction ||
        "tool-driven"
    );


    setText(
        "urgency",
        `${Math.round(
            (
                analysis?.urgency ||
                state.currentGoal
                    ?.urgency ||
                0
            ) * 100
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
            .slice(
                -10
            )
            .reverse();


    if (
        !memories.length
    ) {

        box.textContent =
            "لا توجد ذكريات.";

        return;

    }


    box.innerHTML =
        memories
            .map(
                memory =>
                    `
                    <div class="row">

                        <span
                            class="value"
                            style="
                                max-width:100%;
                                text-align:right
                            "
                        >

                            ${escapeHtml(
                                memory.text
                            )}

                        </span>

                    </div>
                    `
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


    const plan =
        state.currentPlan;


    if (!plan) {

        box.textContent =
            "لا توجد خطة.";

        return;

    }


    box.innerHTML = `

        <div class="row">

            <span class="label">
                الهدف
            </span>

            <span class="value">
                ${escapeHtml(
                    plan.goal
                )}
            </span>

        </div>


        <div class="row">

            <span class="label">
                الاستراتيجية
            </span>

            <span class="value">
                ${escapeHtml(
                    plan.selectedStrategy ||
                    "AI selected"
                )}
            </span>

        </div>


        <div class="row">

            <span class="label">
                الحالة
            </span>

            <span class="value">
                ${escapeHtml(
                    plan.status
                )}
            </span>

        </div>


        ${
            Array.isArray(
                plan.steps
            )

                ? plan.steps
                    .map(
                        (
                            step,
                            index
                        ) =>
                            `
                            <div class="row">

                                <span class="label">
                                    ${index + 1}
                                </span>

                                <span class="value">
                                    ${escapeHtml(
                                        step
                                    )}
                                </span>

                            </div>
                            `
                    )
                    .join("")

                : ""
        }

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
            .slice(
                0,
                40
            )
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


/* =========================================================
   USER MESSAGE PIPELINE
========================================================= */

let sending =
    false;


async function handleUserMessage() {

    if (
        sending
    ) {

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


    if (!input)
        return;


    const text =
        input.value.trim();


    if (!text)
        return;


    sending =
        true;


    if (button) {

        button.disabled =
            true;

    }


    /*
    Add to conversation immediately.
    */

    Conversation.addUser(
        text
    );


    input.value =
        "";


    renderAll();


    try {

        const response =
            await Agent.run(
                text
            );


        /*
        Store ONLY once.
        */

        Conversation.addJarvis(
            response
        );


        renderAll();


        speak(
            response
        );


    } catch (
        error
    ) {

        console.error(
            "[JARVIS AGENT ERROR]",
            error
        );


        state.self.cognitiveState =
            "error";


        state.self.confidence =
            0.05;


        state.self.uncertainty =
            0.95;


        const errorMessage =
            `حدث خطأ في النواة: ${
                error.message
            }`;


        Conversation.addJarvis(
            errorMessage
        );


        EventBus.emit(
            "AGENT_ERROR",
            {
                message:
                    error.message
            }
        );


        renderAll();


    } finally {

        sending =
            false;


        state.self.cognitiveState =
            "idle";


        if (button) {

            button.disabled =
                false;

        }


        renderAll();


        input.focus();


        saveState();

    }

}


/* =========================================================
   STARTUP
========================================================= */

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


        if (
            !form ||
            !input
        ) {

            console.error(
                "JARVIS: Required UI elements are missing."
            );

            return;

        }


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                void
                    handleUserMessage();

            }
        );


        renderAll();


        if (
            !state.conversation.length
        ) {

            Conversation.addJarvis(

                "صباح الخير يا سيدي. النواة الوكيلة جاهزة. أنا الآن أستطيع الفهم، استخدام الأدوات، الملاحظة، إعادة التخطيط، والتعلم من نتائج المهام."

            );

        }


        renderAll();


        input.focus();


        EventBus.emit(
            "SYSTEM_BOOT",
            {

                version:
                    state.system.version,

                model:
                    state.system.model

            }
        );

    }
);
