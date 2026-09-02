"use strict";
/*
=========================================================
J.A.R.V.I.S V5.2
BRAIN LAB
=========================================================

CORE:

PERCEPTION
    ↓
UNDERSTANDING
    ↓
WORLD MODEL
    ↓
MEMORY
    ↓
GOAL SYSTEM
    ↓
PLANNER
    ↓
DECISION
    ↓
POLICY
    ↓
TOOL ENGINE
    ↓
OBSERVATION
    ↓
MEMORY / REFLECTION

NO ANDROID
NO API
NO MIC
NO EXTERNAL DEPENDENCIES
=========================================================
*/
=========================================================
*/


/* =========================================================
   UTILITIES
========================================================= */

function normalizeArabic(text) {

    if (!text) {
        return "";
    }

    return String(text)
        .toLowerCase()

        // Arabic letter normalization
        .replace(/[إأآٱ]/g, "ا")
        .replace(/[ى]/g, "ي")
        .replace(/[ؤ]/g, "و")
        .replace(/[ئ]/g, "ي")

        // Keep ة as ة.
        // We normalize it later for semantic matching.
        .replace(/[ًٌٍَُِّْـ]/g, "")

        // Arabic numbers
        .replace(/[٠-٩]/g, d =>
            String(
                "٠١٢٣٤٥٦٧٨٩".indexOf(d)
            )
        )

        // Extra spaces
        .replace(/\s+/g, " ")
        .trim();
}


/*
Semantic normalization.

This creates a second representation
used by the Brain for matching concepts.
*/

function semanticArabic(text) {

    return normalizeArabic(text)
        .replace(/ة/g, "ه")
        .replace(/ال/g, "")
        .replace(/\s+/g, " ")
        .trim();
}


function containsAny(text, words) {

    return words.some(
        word =>
            text.includes(
                semanticArabic(word)
            )
    );
}


/* =========================================================
   UI
========================================================= */

const UI = {

    chat:
        document.getElementById("chat"),

    input:
        document.getElementById("input"),

    form:
        document.getElementById("command-form"),

    status:
        document.getElementById("status"),

    system:
        document.getElementById("system-state"),

    time:
        document.getElementById("time-state"),

    idle:
        document.getElementById("idle-state"),

    battery:
        document.getElementById("battery-state"),

    goal:
        document.getElementById("goal-state")
};


function addMessage(type, text) {

    const box =
        document.createElement("div");

    box.className =
        `message ${type}`;


    const sender =
        document.createElement("span");

    sender.className =
        "sender";


    sender.textContent =
        type === "user"
            ? "YOU"
            : type === "jarvis"
                ? "J.A.R.V.I.S"
                : "SYSTEM";


    const body =
        document.createElement("div");

    body.textContent =
        text;


    box.append(
        sender,
        body
    );


    UI.chat.appendChild(box);

    UI.chat.scrollTop =
        UI.chat.scrollHeight;
}


/* =========================================================
   VOICE OUTPUT
========================================================= */

class VoiceOutput {

    constructor() {

        this.enabled =
            "speechSynthesis" in window;
    }


    speak(text) {

        if (
            !this.enabled ||
            !text
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
                0.95;

            utterance.pitch =
                0.9;

            utterance.volume =
                1;


            window.speechSynthesis.speak(
                utterance
            );

        } catch (error) {

            console.error(
                "[TTS]",
                error
            );
        }
    }
}


const voice =
    new VoiceOutput();


function jarvisSay(text) {

    addMessage(
        "jarvis",
        text
    );

    voice.speak(
        text
    );
}


/* =========================================================
   WORLD MODEL
========================================================= */

class WorldModel {

    constructor() {

        this.state = {

            time:
                new Date(),

            environment:
                "web",

            pageVisible:
                document.visibilityState ===
                "visible",

            idleSeconds:
                0,

            battery:
                null,

            activeGoal:
                null,

            activePlan:
                null,

            currentTask:
                null,

            lastAction:
                null,

            lastResult:
                null,

            cognitiveState:
                "idle"
        };
    }


    update(data) {

        Object.assign(
            this.state,
            data
        );
    }


    get(key) {

        return this.state[key];
    }


    snapshot() {

        return {
            ...this.state
        };
    }
}


const world =
    new WorldModel();


/* =========================================================
   MEMORY
========================================================= */

class MemorySystem {

    constructor() {

        this.key =
            "jarvis_v5_memory";

        this.data =
            this.load();
    }


    load() {

        try {

            const raw =
                localStorage.getItem(
                    this.key
                );


            return raw
                ? JSON.parse(raw)
                : {
                    facts: [],
                    events: []
                };

        } catch {

            return {
                facts: [],
                events: []
            };
        }
    }


    save() {

        try {

            localStorage.setItem(
                this.key,
                JSON.stringify(
                    this.data
                )
            );

        } catch (error) {

            console.warn(
                "[MEMORY]",
                error
            );
        }
    }


    rememberFact(
        key,
        value
    ) {

        const existing =
            this.data.facts.find(
                item =>
                    item.key === key
            );


        if (existing) {

            existing.value =
                value;

            existing.updatedAt =
                Date.now();

        } else {

            this.data.facts.push({

                key,

                value,

                createdAt:
                    Date.now()
            });
        }


        this.save();
    }


    recall(key) {

        const item =
            this.data.facts.find(
                item =>
                    item.key === key
            );


        return item
            ? item.value
            : null;
    }


    allFacts() {

        return [
            ...this.data.facts
        ];
    }


    recordEvent(
        type,
        data = {}
    ) {

        this.data.events.push({

            type,

            data,

            timestamp:
                Date.now()
        });


        if (
            this.data.events.length >
            300
        ) {

            this.data.events =
                this.data.events.slice(
                    -300
                );
        }


        this.save();
    }
}


const memory =
    new MemorySystem();


/* =========================================================
   GOAL SYSTEM
========================================================= */

class GoalSystem {

    constructor(
        worldModel
    ) {

        this.world =
            worldModel;

        this.goals = [];

        this.counter = 0;
    }


    create(
        description,
        priority = 50,
        metadata = {}
    ) {

        const goal = {

            id:
                ++this.counter,

            description,

            priority,

            metadata,

            status:
                "active",

            createdAt:
                Date.now()
        };


        this.goals.push(
            goal
        );


        this.world.update({

            activeGoal:
                goal
        });


        memory.recordEvent(
            "goal_created",
            goal
        );


        return goal;
    }


    complete(goal) {

        goal.status =
            "completed";

        goal.completedAt =
            Date.now();


        if (
            this.world.get(
                "activeGoal"
            )?.id === goal.id
        ) {

            this.world.update({

                activeGoal:
                    null
            });
        }


        memory.recordEvent(
            "goal_completed",
            goal
        );
    }


    fail(
        goal,
        reason
    ) {

        goal.status =
            "failed";

        goal.failureReason =
            reason;


        memory.recordEvent(
            "goal_failed",
            {
                goal,
                reason
            }
        );
    }
}


const goalSystem =
    new GoalSystem(
        world
    );


/* =========================================================
   TOOL ENGINE
========================================================= */

class ToolEngine {

    constructor() {

        this.tools =
            new Map();
    }


    register(
        name,
        executor,
        metadata = {}
    ) {

        this.tools.set(
            name,
            {
                executor,
                metadata
            }
        );
    }


    has(name) {

        return this.tools.has(
            name
        );
    }


    getMetadata(name) {

        return this.tools.get(
            name
        )?.metadata || {};
    }


    async execute(
        name,
        payload
    ) {

        const tool =
            this.tools.get(
                name
            );


        if (!tool) {

            throw new Error(
                `Unknown tool: ${name}`
            );
        }


        return await tool.executor(
            payload
        );
    }
}


const tools =
    new ToolEngine();


/* =========================================================
   WEB TOOLS
========================================================= */

tools.register(

    "focus_mode",

    async state => {

        console.log(
            "[TOOL] focus_mode:",
            state
        );


        return {

            success:
                true,

            message:
                state === "on"
                    ? "تم تفعيل وضع التركيز."
                    : "تم إيقاف وضع التركيز."
        };

    },

    {
        risk:
            "low",

        reversible:
            true
    }
);


tools.register(

    "development_environment",

    async () => {

        console.log(
            "[TOOL] development_environment"
        );


        return {

            success:
                true,

            message:
                "بيئة البرمجة جاهزة — محاكاة Web."
        };

    },

    {
        risk:
            "low",

        reversible:
            true
    }
);


tools.register(

    "timer",

    async minutes => {

        const value =
            Number(minutes);


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            return {

                success:
                    false,

                message:
                    "مدة المؤقت غير صالحة."
            };
        }


        console.log(
            `[TOOL] Timer: ${value} minutes`
        );


        return {

            success:
                true,

            message:
                `تم إنشاء مؤقت لمدة ${value} دقيقة.`
        };

    },

    {
        risk:
            "low",

        reversible:
            true
    }
);


tools.register(

    "announce",

    async text => {

        jarvisSay(
            text
        );


        return {

            success:
                true,

            message:
                text
        };

    },

    {
        risk:
            "low",

        reversible:
            true
    }
);


/* =========================================================
   INTENT MODEL
========================================================= */

class Intent {

    constructor(
        type,
        data = {},
        confidence = 0
    ) {

        this.type =
            type;

        this.data =
            data;

        this.confidence =
            confidence;
    }
}


/* =========================================================
   COMMAND UNDERSTANDING
========================================================= */

function understand(raw) {

    const original =
        String(raw || "").trim();


    const text =
        normalizeArabic(
            original
        );


    const semantic =
        semanticArabic(
            original
        );


    if (!text) {

        return new Intent(
            "empty"
        );
    }


    /*
    =====================================================
    MEMORY
    =====================================================
    */

    const rememberMatch =
        text.match(
            /^تذكر(?:\s+انني|\s+اني|\s+أنني|\s+أني|\s+ان)\s+(.+)$/
        );


    if (rememberMatch) {

        return new Intent(

            "remember",

            {
                value:
                    rememberMatch[1].trim()
            },

            0.99
        );
    }


    /*
    More flexible memory syntax.
    */

    if (
        semantic.startsWith(
            "تذكر "
        )
    ) {

        const value =
            text
                .replace(
                    /^تذكر\s*/,
                    ""
                )
                .replace(
                    /^(انني|اني|ان)\s*/,
                    ""
                )
                .trim();


        if (value) {

            return new Intent(

                "remember",

                {
                    value
                },

                0.92
            );
        }
    }


    /*
    =====================================================
    RECALL
    =====================================================
    */

    if (
        containsAny(
            semantic,
            [
                "ماذا تتذكر",
                "ايه اللي فاكره",
                "ماذا تعرف عني",
                "معلوماتي",
                "ذاكرتك"
            ]
        )
    ) {

        return new Intent(
            "recall",
            {},
            0.98
        );
    }


    /*
    =====================================================
    STATUS
    =====================================================
    */

    if (
        containsAny(
            semantic,
            [
                "حالة النظام",
                "حالتك",
                "حاله النظام",
                "ما حالتك",
                "النظام عامل ايه",
                "وضع النظام"
            ]
        )
    ) {

        return new Intent(
            "status",
            {},
            0.98
        );
    }


    /*
    =====================================================
    GOAL DETECTION
    =====================================================

    Instead of requiring one exact phrase,
    detect goal language semantically.
    */

    const goalPatterns = [

        /^جهزني(?:\s+ل|\s+لي|\s+على)?\s+(.+)$/,

        /^جهز لي\s+(.+)$/,

        /^اعمل لي\s+(.+)$/,

        /^اعمل ليا\s+(.+)$/,

        /^خطط لي\s+(.+)$/,

        /^خطط ليا\s+(.+)$/,

        /^عايز ابدأ\s+(.+)$/,

        /^اريد ان ابدأ\s+(.+)$/,

        /^ساعدني في\s+(.+)$/,

        /^ساعدني على\s+(.+)$/,

        /^خليني ابدأ\s+(.+)$/
    ];


    for (
        const pattern of goalPatterns
    ) {

        const match =
            text.match(
                pattern
            );


        if (match) {

            return new Intent(

                "goal",

                {
                    description:
                        match[1].trim()
                },

                0.96
            );
        }
    }


    /*
    =====================================================
    DIRECT STUDY INTENT
    =====================================================
    */

    if (
        containsAny(
            semantic,
            [
                "مذاكرة البرمجة",
                "مذاكره البرمجه",
                "مذاكرة برمجة",
                "مذاكره برمجه",
                "اذاكر برمجة",
                "اذاكر البرمجة",
                "ابدأ مذاكرة البرمجة",
                "ابدأ مذاكره البرمجه"
            ]
        )
    ) {

        return new Intent(

            "goal",

            {
                description:
                    "مذاكرة البرمجة"
            },

            0.94
        );
    }


    /*
    =====================================================
    HELP
    =====================================================
    */

    if (
        containsAny(
            semantic,
            [
                "مساعدة",
                "ساعدني",
                "الاوامر",
                "اوامر"
            ]
        )
    ) {

        return new Intent(
            "help",
            {},
            0.99
        );
    }


    /*
    =====================================================
    UNKNOWN
    =====================================================
    */

    return new Intent(

        "unknown",

        {
            text:
                original
        },

        0
    );
}


/* =========================================================
   GOAL CLASSIFICATION
========================================================= */

class GoalClassifier {

    classify(description) {

        const text =
            semanticArabic(
                description
            );


        if (
            containsAny(
                text,
                [
                    "مذاكرة البرمجة",
                    "مذاكرة برمجة",
                    "مذاكر برمجة",
                    "اذاكر برمجة",
                    "تعلم البرمجة",
                    "برمجة"
                ]
            )
        ) {

            return {

                domain:
                    "programming_study",

                priority:
                    80,

                confidence:
                    0.95
            };
        }


        if (
            containsAny(
                text,
                [
                    "مذاكرة",
                    "مذاكر",
                    "دراسة",
                    "دراسه"
                ]
            )
        ) {

            return {

                domain:
                    "study",

                priority:
                    75,

                confidence:
                    0.85
            };
        }


        return {

            domain:
                "general",

            priority:
                50,

            confidence:
                0.50
        };
    }
}


const goalClassifier =
    new GoalClassifier();


/* =========================================================
   PLANNER
========================================================= */

class Planner {

    build(goal) {

        const classification =
            goalClassifier.classify(
                goal.description
            );


        console.log(
            "[PLANNER] Classification:",
            classification
        );


        /*
        =====================================================
        PROGRAMMING STUDY PLAN
        =====================================================
        */

        if (
            classification.domain ===
            "programming_study"
        ) {

            return {

                goalId:
                    goal.id,

                strategy:
                    "focused_programming_session",

                steps: [

                    {
                        id:
                            1,

                        tool:
                            "focus_mode",

                        payload:
                            "on"
                    },

                    {
                        id:
                            2,

                        tool:
                            "development_environment",

                        payload:
                            null
                    },

                    {
                        id:
                            3,

                        tool:
                            "timer",

                        payload:
                            120
                    },

                    {
                        id:
                            4,

                        tool:
                            "announce",

                        payload:
                            "تم تجهيز جلسة مذاكرة البرمجة. التركيز الآن على هدفك. لنبدأ."
                    }
                ]
            };
        }


        /*
        =====================================================
        GENERIC STUDY PLAN
        =====================================================
        */

        if (
            classification.domain ===
            "study"
        ) {

            return {

                goalId:
                    goal.id,

                strategy:
                    "focused_study_session",

                steps: [

                    {
                        id:
                            1,

                        tool:
                            "focus_mode",

                        payload:
                            "on"
                    },

                    {
                        id:
                            2,

                        tool:
                            "timer",

                        payload:
                            60
                    },

                    {
                        id:
                            3,

                        tool:
                            "announce",

                        payload:
                            `تم تجهيز جلسة مذاكرة لمدة ساعة لهدف: ${goal.description}`
                    }
                ]
            };
        }


        /*
        =====================================================
        GENERAL PLAN
        =====================================================
        */

        return {

            goalId:
                goal.id,

            strategy:
                "acknowledge_goal",

            steps: [

                {

                    id:
                        1,

                    tool:
                        "announce",

                    payload:
                        `حللت الهدف: ${goal.description}. أحتاج حاليًا إلى أدوات إضافية لتنفيذه فعليًا.`
                }
            ]
        };
    }
}


const planner =
    new Planner();


/* =========================================================
   SECURITY POLICY
========================================================= */

class SecurityPolicy {

    canExecute(
        toolName,
        payload
    ) {

        if (
            !tools.has(
                toolName
            )
        ) {

            return {

                allowed:
                    false,

                reason:
                    "الأداة غير مسجلة."
            };
        }


        if (
            typeof payload ===
                "string" &&
            /<script|javascript:|eval\(|document\.cookie|localStorage\.clear/i
                .test(payload)
        ) {

            return {

                allowed:
                    false,

                reason:
                    "تم رفض الحمولة لأسباب أمنية."
            };
        }


        const metadata =
            tools.getMetadata(
                toolName
            );


        if (
            metadata.risk ===
            "high"
        ) {

            return {

                allowed:
                    false,

                reason:
                    "هذه الأداة تحتاج طبقة تأكيد مستقبلية."
            };
        }


        return {

            allowed:
                true,

            reason:
                null
        };
    }
}


const security =
    new SecurityPolicy();


/* =========================================================
   DECISION ENGINE
========================================================= */

class DecisionEngine {

    decide(
        goal,
        plan
    ) {

        if (!goal) {

            return {

                action:
                    "wait",

                reason:
                    "لا يوجد هدف."
            };
        }


        if (
            !plan ||
            !Array.isArray(
                plan.steps
            ) ||
            plan.steps.length === 0
        ) {

            return {

                action:
                    "ask",

                reason:
                    "لم يتم العثور على خطة قابلة للتنفيذ."
            };
        }


        return {

            action:
                "execute",

            reason:
                "الخطة قابلة للتنفيذ ضمن صلاحيات Web Lab."
        };
    }
}


const decisionEngine =
    new DecisionEngine();


/* =========================================================
   PLAN EXECUTOR
========================================================= */

class PlanExecutor {

    constructor() {

        this.running =
            false;
    }


    async execute(
        plan,
        goal
    ) {

        if (this.running) {

            return {

                success:
                    false,

                message:
                    "هناك خطة أخرى قيد التنفيذ."
            };
        }


        this.running =
            true;


        world.update({

            activePlan:
                plan,

            cognitiveState:
                "executing"
        });


        memory.recordEvent(
            "plan_started",
            {
                goalId:
                    goal.id,

                plan
            }
        );


        try {

            for (
                const step of
                    plan.steps
            ) {

                world.update({

                    currentTask:
                        step.tool
                });


                console.log(
                    "[EXECUTOR] Step:",
                    step
                );


                const policy =
                    security.canExecute(
                        step.tool,
                        step.payload
                    );


                if (
                    !policy.allowed
                ) {

                    memory.recordEvent(
                        "security_block",
                        {
                            step,
                            reason:
                                policy.reason
                        }
                    );


                    goalSystem.fail(
                        goal,
                        policy.reason
                    );


                    return {

                        success:
                            false,

                        message:
                            policy.reason
                    };
                }


                const result =
                    await tools.execute(
                        step.tool,
                        step.payload
                    );


                world.update({

                    lastAction:
                        step.tool,

                    lastResult:
                        result
                });


                memory.recordEvent(
                    "tool_execution",
                    {
                        tool:
                            step.tool,

                        payload:
                            step.payload,

                        result
                    }
                );


                if (
                    !result ||
                    !result.success
                ) {

                    goalSystem.fail(
                        goal,
                        `فشلت الخطوة: ${step.tool}`
                    );


                    return {

                        success:
                            false,

                        message:
                            `فشلت الخطوة: ${step.tool}`
                    };
                }
            }


            goalSystem.complete(
                goal
            );


            memory.recordEvent(
                "plan_completed",
                {
                    goalId:
                        goal.id
                }
            );


            return {

                success:
                    true,

                message:
                    "اكتملت الخطة."
            };

        } finally {

            this.running =
                false;


            world.update({

                currentTask:
                    null,

                activePlan:
                    null,

                cognitiveState:
                    "idle"
            });
        }
    }
}


const executor =
    new PlanExecutor();


/* =========================================================
   REFLECTION ENGINE
========================================================= */

class ReflectionEngine {

    reflect(
        goal,
        result
    ) {

        memory.recordEvent(
            "reflection",
            {

                goal:
                    goal.description,

                success:
                    result.success,

                message:
                    result.message,

                timestamp:
                    Date.now()
            }
        );


        console.log(
            "[REFLECTION]",
            {
                goal,
                result
            }
        );
    }
}


const reflection =
    new ReflectionEngine();


/* =========================================================
   BRAIN
========================================================= */

class JarvisBrain {

    async process(
        rawText
    ) {

        world.update({

            cognitiveState:
                "thinking"
        });


        /*
        PERCEPTION
        */

        memory.recordEvent(
            "user_input",
            {
                text:
                    rawText
            }
        );


        /*
        UNDERSTANDING
        */

        const understanding =
            understand(
                rawText
            );


        console.log(
            "[UNDERSTANDING]",
            understanding
        );


        switch (
            understanding.type
        ) {


            /* =============================================
               MEMORY
            ============================================= */

            case "remember":

                memory.rememberFact(
                    "user_fact",
                    understanding.data.value
                );


                memory.recordEvent(
                    "memory_write",
                    {
                        value:
                            understanding.data.value
                    }
                );


                world.update({

                    cognitiveState:
                        "idle"
                });


                jarvisSay(
                    "تم حفظ المعلومة في ذاكرتي."
                );

                return;


            /* =============================================
               RECALL
            ============================================= */

            case "recall":

                this.reportMemory();

                return;


            /* =============================================
               STATUS
            ============================================= */

            case "status":

                this.reportStatus();

                return;


            /* =============================================
               HELP
            ============================================= */

            case "help":

                this.showHelp();

                return;


            /* =============================================
               GOAL
            ============================================= */

            case "goal":

                await this.handleGoal(
                    understanding.data.description
                );

                return;


            /* =============================================
               UNKNOWN
            ============================================= */

            default:

                world.update({

                    cognitiveState:
                        "idle"
                });


                jarvisSay(
                    "لم أفهم الهدف بشكل كافٍ لأتخذ قرارًا آمنًا. يمكنك قول: «جهزني لمذاكرة البرمجة»."
                );
        }
    }


    async handleGoal(
        description
    ) {

        /*
        CLASSIFY
        */

        const classification =
            goalClassifier.classify(
                description
            );


        console.log(
            "[GOAL CLASSIFIER]",
            classification
        );


        /*
        CREATE GOAL
        */

        const goal =
            goalSystem.create(
                description,
                classification.priority,
                {
                    domain:
                        classification.domain,

                    confidence:
                        classification.confidence
                }
            );


        jarvisSay(
            `تم تحديد الهدف: ${description}`
        );


        /*
        PLAN
        */

        const plan =
            planner.build(
                goal
            );


        jarvisSay(
            `حللت الهدف وبنيت خطة من ${plan.steps.length} خطوات.`
        );


        /*
        DECISION
        */

        const decision =
            decisionEngine.decide(
                goal,
                plan
            );


        console.log(
            "[DECISION]",
            decision
        );


        if (
            decision.action !==
            "execute"
        ) {

            world.update({

                cognitiveState:
                    "idle"
            });


            jarvisSay(
                `لم أنفذ الخطة: ${decision.reason}`
            );

            return;
        }


        /*
        EXECUTION
        */

        const result =
            await executor.execute(
                plan,
                goal
            );


        /*
        REFLECTION
        */

        reflection.reflect(
            goal,
            result
        );


        if (
            result.success
        ) {

            jarvisSay(
                "اكتملت المهمة بنجاح."
            );

        } else {

            jarvisSay(
                `توقفت الخطة: ${result.message}`
            );
        }
    }


    reportMemory() {

        const facts =
            memory.allFacts();


        if (
            facts.length === 0
        ) {

            jarvisSay(
                "لا توجد لدي معلومات محفوظة حتى الآن."
            );

            return;
        }


        const lines =
            facts.map(
                fact =>
                    `• ${fact.value}`
            );


        jarvisSay(
            "هذه المعلومات التي أتذكرها:\n" +
            lines.join("\n")
        );
    }


    reportStatus() {

        const state =
            world.snapshot();


        const goal =
            state.activeGoal;


        jarvisSay(

            [

                `النظام: يعمل`,

                `البيئة: ${state.environment}`,

                `الحالة المعرفية: ${state.cognitiveState}`,

                `الخمول: ${state.idleSeconds} ثانية`,

                `الهدف الحالي: ${
                    goal?.description ||
                    "لا يوجد"
                }`,

                `المهمة الحالية: ${
                    state.currentTask ||
                    "لا يوجد"
                }`

            ].join("\n")
        );
    }


    showHelp() {

        jarvisSay(

            [

                "الأوامر الأساسية:",

                "",

                "• تذكر انني احب البرمجة",

                "• ماذا تتذكر",

                "• حالة النظام",

                "• جهزني لمذاكرة البرمجة",

                "• ساعدني في مذاكرة البرمجة",

                "• اعمل لي خطة لمذاكرة البرمجة"

            ].join("\n")
        );
    }
}


const brain =
    new JarvisBrain();


/* =========================================================
   CONSCIOUSNESS ENGINE
========================================================= */

class ConsciousnessEngine {

    constructor() {

        this.interval =
            null;

        this.lastInteraction =
            Date.now();

        this.lastProactive =
            {};
    }


    start() {

        if (
            this.interval
        ) {

            return;
        }


        this.interval =
            setInterval(
                () => this.tick(),
                10000
            );


        this.tick();
    }


    updateInteraction() {

        this.lastInteraction =
            Date.now();
    }


    tick() {

        const now =
            new Date();


        const idle =
            Math.floor(

                (
                    Date.now() -
                    this.lastInteraction

                ) / 1000
            );


        world.update({

            time:
                now,

            idleSeconds:
                idle,

            pageVisible:
                document.visibilityState ===
                "visible"
        });


        this.updateUI();


        /*
        PROACTIVE LAYER

        This is intentionally conservative.
        */

        if (
            idle >= 300 &&
            document.visibilityState ===
                "visible"
        ) {

            const last =
                this.lastProactive.idle ||
                0;


            if (
                Date.now() -
                last >
                1800000
            ) {

                this.lastProactive.idle =
                    Date.now();


                memory.recordEvent(
                    "proactive_observation",
                    {
                        reason:
                            "user_idle"
                    }
                );


                jarvisSay(
                    "أنا ما زلت هنا يا سيدي. إذا احتجت شيئًا فأنا جاهز."
                );
            }
        }
    }


    updateUI() {

        const state =
            world.snapshot();


        if (UI.time) {

            UI.time.textContent =
                state.time
                    .toLocaleTimeString(
                        "ar-EG"
                    );
        }


        if (UI.idle) {

            UI.idle.textContent =
                `${state.idleSeconds} sec`;
        }


        if (UI.battery) {

            UI.battery.textContent =

                state.battery === null

                    ? "غير متاح في هذا المتصفح"

                    : `${state.battery}%`;
        }


        if (UI.goal) {

            UI.goal.textContent =

                state.activeGoal
                    ?.description ||
                "None";
        }


        if (UI.status) {

            UI.status.textContent =
                state.cognitiveState;
        }
    }
}


const consciousness =
    new ConsciousnessEngine();


/* =========================================================
   BATTERY SENSOR
========================================================= */

async function initializeBattery() {

    if (
        typeof navigator.getBattery !==
        "function"
    ) {

        return;
    }


    try {

        const battery =
            await navigator.getBattery();


        function update() {

            world.update({

                battery:
                    Math.round(
                        battery.level *
                        100
                    )
            });


            consciousness.updateUI();
        }


        update();


        battery.addEventListener(
            "levelchange",
            update
        );

    } catch (error) {

        console.warn(
            "[Battery]",
            error
        );
    }
}


/* =========================================================
   VISIBILITY
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        world.update({

            pageVisible:
                document.visibilityState ===
                "visible"
        });


        memory.recordEvent(
            "visibility_change",
            {
                visible:
                    document.visibilityState ===
                    "visible"
            }
        );
    }
);


/* =========================================================
   USER ACTIVITY
========================================================= */

[
    "click",
    "keydown",
    "touchstart",
    "pointerdown"
].forEach(
    event => {

        document.addEventListener(
            event,
            () =>
                consciousness
                    .updateInteraction(),

            {
                passive:
                    true
            }
        );
    }
);


/* =========================================================
   FORM
========================================================= */

if (UI.form) {

    UI.form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const text =
                UI.input.value.trim();


            if (!text) {

                return;
            }


            UI.input.value =
                "";


            consciousness
                .updateInteraction();


            addMessage(
                "user",
                text
            );


            await brain.process(
                text
            );
        }
    );
}


/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

    console.log(
        "================================="
    );


    console.log(
        "J.A.R.V.I.S V5.2"
    );


    console.log(
        "BRAIN LAB ONLINE"
    );


    console.log(
        "================================="
    );


    addMessage(
        "jarvis",

        "صباح الخير يا سيدي. نظام العقل V5.2 يعمل. الإدراك والذاكرة والأهداف والتخطيط والتنفيذ جاهزة."
    );


    initializeBattery();


    consciousness.start();


    if (UI.input) {

        UI.input.focus();
    }
}


initialize();
