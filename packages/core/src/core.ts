import type { ActionExecutor } from "./action.js";
import { PolicyEngine } from "./action.js";
import { EventBus } from "./eventBus.js";
import { MemoryManager } from "./memory.js";
import {
  generatePlans,
  predict,
  decide
} from "./planner.js";
import {
  LocalRuleEngine,
  ReasoningProvider
} from "./providers.js";

import type {
  DeviceState,
  Goal,
  PersonalitySettings,
  SelfModel,
  WorldModel,
  ActionRequest,
  ActionResult
} from "./types.js";

import {
  MemoryStorage,
  StorageAdapter
} from "./storage.js";

export class JarvisCore {
  readonly bus = new EventBus();

  readonly memory: MemoryManager;

  readonly policy = new PolicyEngine();

  readonly provider: ReasoningProvider;

  readonly self: SelfModel = {
    currentMode: "OFFLINE",
    currentThoughtState: "INITIALIZING",
    confidence: 0,
    uncertainty: 1,
    attention: 0,
    capabilities: [],
    limitations: []
  };

  readonly personality: PersonalitySettings = {
    tone: "professional",
    formality: 0.8,
    verbosity: 0.55,
    humor: 0.12,
    address: "سيدي",
    explanationLevel: 0.7
  };

  world: WorldModel = {
    user: "",
    time: Date.now(),
    currentRequest: "",
    availableTools: [],
    permissions: {},
    recentEvents: [],
    relevantMemory: [],
    deviceState: {
      platform: "web",
      online: false,
      permissions: {}
    },
    pendingActions: [],
    results: [],
    constraints: [],
    uncertainty: 1
  };

  private goals: Goal[] = [];

  private processing = false;

  constructor(
    private storage: StorageAdapter = new MemoryStorage(),
    private executor?: ActionExecutor,
    provider: ReasoningProvider = new LocalRuleEngine()
  ) {
    this.memory = new MemoryManager(
      storage,
      this.bus
    );

    this.provider = provider;
  }

  async init(): Promise<void> {
    await this.memory.init();

    this.goals =
      (await this.storage.get<Goal[]>("goals")) ?? [];

    const savedSelf =
      await this.storage.get<SelfModel>("self");

    if (savedSelf) {
      Object.assign(this.self, savedSelf);
    }

    const savedPersonality =
      await this.storage.get<PersonalitySettings>(
        "personality"
      );

    if (savedPersonality) {
      Object.assign(
        this.personality,
        savedPersonality
      );
    }

    const savedWorld =
      await this.storage.get<WorldModel>("world");

    if (savedWorld) {
      this.world = savedWorld;
    }

    this.self.currentMode = "IDLE";
    this.self.currentThoughtState = "READY";

    await this.persist();
  }

  async observe(
    device?: Partial<DeviceState>
  ): Promise<void> {
    if (device) {
      this.world.deviceState = {
        ...this.world.deviceState,
        ...device,
        permissions: {
          ...this.world.deviceState.permissions,
          ...(device.permissions ?? {})
        }
      };
    }

    this.world.time = Date.now();

    this.self.lastObservation =
      `platform=${this.world.deviceState.platform}, online=${this.world.deviceState.online}`;

    this.bus.emit(
      "OBSERVATION",
      this.world.deviceState
    );
  }

  async handleInput(
    input: string
  ): Promise<string> {
    if (this.processing) {
      return "أنا أعالج مهمة أخرى حاليًا؛ لم أقم بتنفيذ طلب ثانٍ حتى لا أخلط بين الحالات.";
    }

    this.processing = true;

    this.world.currentRequest = input;

    this.self.currentMode = "OBSERVING";
    this.self.currentThoughtState = "RECEIVED";
    this.self.attention = 1;

    this.bus.emit(
      "USER_INPUT",
      { text: input }
    );

    try {
      this.self.currentMode = "UNDERSTANDING";

      const understanding =
        await this.provider.understand(
          input,
          JSON.stringify({
            world: this.world,
            activeGoal: this.world.activeGoal,
            memory: this.world.relevantMemory
          })
        );

      this.self.uncertainty =
        understanding.ambiguity;

      this.self.confidence =
        1 - understanding.ambiguity;

      this.self.currentThoughtState =
        `intent=${understanding.intent}`;

      this.self.currentMode = "RECALLING";

      const memories =
        await this.memory.search(input, 8);

      this.world.relevantMemory = memories;

      if (
        !this.world.activeGoal &&
        (
          understanding.intent === "STUDY" ||
          understanding.intent === "PLANNING"
        )
      ) {
        await this.createGoal(
          input,
          input
        );
      }

      if (this.world.activeGoal) {
        this.self.currentMode = "PLANNING";

        const plans = generatePlans(
          this.world.activeGoal,
          memories,
          this.world.constraints
        );

        this.bus.emit(
          "PLAN_CREATED",
          plans
        );

        this.self.currentMode =
          "PREDICTING";

        const predictions = plans.map(
          (plan) =>
            predict(
              plan,
              this.world.activeGoal!
            )
        );

        this.bus.emit(
          "PREDICTION_CREATED",
          predictions
        );

        this.self.currentMode =
          "DECIDING";

        const decision = decide(
          plans,
          predictions,
          {
            speed: 0.8,
            quality: 0.7,
            riskAversion: 0.8
          },
          memories
        );

        const selected = plans.find(
          (plan) =>
            plan.id === decision.planId
        )!;

        this.world.currentPlan = selected;

        this.self.lastDecision =
          `${selected.label}: ${decision.reasons.join(
            " | "
          )}`;

        this.self.confidence =
          decision.confidence;

        this.bus.emit(
          "DECISION_MADE",
          {
            decision,
            predictions,
            plan: selected
          }
        );

        await this.memory.add(
          "PLAN",
          `${selected.label}: ${selected.steps.join(
            " → "
          )}`,
          {
            importance: 0.7,
            metadata: {
              goalId:
                this.world.activeGoal.id
            }
          }
        );

        const planName =
          selected.label === "FAST"
            ? "السريعة"
            : selected.label === "DEEP"
              ? "العميقة"
              : "المتوازنة";

        const response =
          `مفهوم يا ${this.personality.address}. اخترت الخطة ${planName} لأنها تحقق الهدف مع مخاطرة مقدرة ${(
            selected.risk * 100
          ).toFixed(0)}% وثقة ${(
            selected.confidence * 100
          ).toFixed(0)}%.`;

        await this.memory.add(
          "CONVERSATION",
          `${input} => ${response}`,
          {
            importance: 0.5
          }
        );

        this.self.currentMode = "IDLE";
        this.self.currentThoughtState =
          "WAITING_FOR_NEXT_EVENT";

        return response;
      }

      this.self.currentMode = "IDLE";

      const answer =
        await this.provider.answer(
          input,
          JSON.stringify({
            world: this.world,
            self: this.self,
            memories
          })
        );

      await this.memory.add(
        "CONVERSATION",
        `${input} => ${answer}`,
        {
          importance: 0.4
        }
      );

      return answer;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      this.self.currentMode = "BLOCKED";
      this.self.recentFailure = message;

      this.bus.emit(
        "ERROR",
        {
          message
        }
      );

      await this.memory.add(
        "FAILURE",
        `فشل التعامل مع الطلب: ${message}`,
        {
          importance: 0.85
        }
      );

      return `تعذر إكمال المعالجة بثقة: ${message}`;
    } finally {
      this.processing = false;

      await this.persist();
    }
  }

  async createGoal(
    title: string,
    objective: string
  ): Promise<Goal> {
    const now = Date.now();

    const goal: Goal = {
      id: crypto.randomUUID(),
      title,
      objective,
      status: "ACTIVE",
      priority: 0.7,
      createdAt: now,
      updatedAt: now
    };

    this.goals.unshift(goal);

    this.world.activeGoal = goal;

    this.bus.emit(
      "GOAL_CREATED",
      goal
    );

    await this.memory.add(
      "GOAL",
      objective,
      {
        importance: 0.9,
        metadata: {
          goalId: goal.id
        }
      }
    );

    await this.persist();

    return goal;
  }

  async execute(
    request: ActionRequest
  ): Promise<ActionResult> {
    this.bus.emit(
      "ACTION_REQUESTED",
      request
    );

    if (!this.executor) {
      const result: ActionResult = {
        id: request.id,
        success: false,
        error:
          "لا يوجد ActionExecutor متصل بهذه البيئة.",
        timestamp: Date.now()
      };

      this.bus.emit(
        "ACTION_FAILED",
        result
      );

      return result;
    }

    const device =
      await this.executor.getDeviceState();

    const policy =
      this.policy.check(
        request,
        device
      );

    if (!policy.allowed) {
      this.bus.emit(
        "PERMISSION_REQUIRED",
        {
          request,
          reason: policy.reason
        }
      );

      return {
        id: request.id,
        success: false,
        error: policy.reason,
        timestamp: Date.now()
      };
    }

    this.self.currentMode = "EXECUTING";

    this.bus.emit(
      "ACTION_STARTED",
      request
    );

    const result =
      await this.executor.execute(
        request
      );

    this.world.results.unshift(result);

    this.bus.emit(
      result.success
        ? "ACTION_COMPLETED"
        : "ACTION_FAILED",
      result
    );

    if (!result.success) {
      this.self.recentFailure =
        result.error;
    } else {
      this.self.recentSuccess =
        JSON.stringify(result.result);
    }

    await this.persist();

    return result;
  }

  async verify(
    statement: string,
    observed: unknown
  ): Promise<boolean> {
    const normalized =
      JSON.stringify(observed)
        .toLowerCase();

    const success =
      normalized.includes(
        statement.toLowerCase()
      );

    this.self.currentMode =
      "VERIFYING";

    this.bus.emit(
      "VERIFICATION_COMPLETED",
      {
        statement,
        success,
        observed
      }
    );

    await this.persist();

    return success;
  }

  async reflect(): Promise<string> {
    this.self.currentMode =
      "REFLECTING";

    const failures =
      this.memory
        .all()
        .filter(
          (memory) =>
            memory.type === "FAILURE"
        ).length;

    const successes =
      this.memory
        .all()
        .filter(
          (memory) =>
            memory.type === "SUCCESS"
        ).length;

    const lessons =
      this.memory
        .all()
        .filter(
          (memory) =>
            memory.type === "LESSON"
        ).length;

    const summary =
      `المراجعة اكتملت: ${failures} فشل، ${successes} نجاح، ${lessons} درس مسجل.`;

    this.bus.emit(
      "REFLECTION_COMPLETED",
      {
        summary
      }
    );

    this.self.currentMode =
      "LEARNING";

    await this.memory.add(
      "LESSON",
      summary,
      {
        importance: 0.65
      }
    );

    this.bus.emit(
      "LESSON_LEARNED",
      {
        summary
      }
    );

    this.self.currentMode = "IDLE";

    await this.persist();

    return summary;
  }

  async updatePersonality(
    patch: Partial<PersonalitySettings>
  ): Promise<void> {
    Object.assign(
      this.personality,
      patch
    );

    await this.persist();
  }

  async persist(): Promise<void> {
    await this.storage.set(
      "personality",
      this.personality
    );

    await this.storage.set(
      "self",
      this.self
    );

    await this.storage.set(
      "goals",
      this.goals
    );

    await this.storage.set(
      "world",
      this.world
    );
  }

  snapshot() {
    return {
      self: {
        ...this.self
      },
      world: {
        ...this.world
      },
      memories:
        this.memory.all(),
      goals: [
        ...this.goals
      ],
      personality: {
        ...this.personality
      }
    };
  }
  }
