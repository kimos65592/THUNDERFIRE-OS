import type {
  Goal,
  Memory,
  Plan,
  Prediction,
  Decision
} from "./types.js";

export function generatePlans(
  goal: Goal,
  memories: Memory[],
  constraints: string[]
): Plan[] {
  const previousFailure = memories.some(
    (memory) =>
      memory.type === "FAILURE" &&
      /سريع|fast|خطة|plan|مذاكرة|study/i.test(memory.text)
  );

  const context =
    constraints.length > 0
      ? ` مع مراعاة: ${constraints.join("، ")}`
      : "";

  return [
    {
      id: crypto.randomUUID(),
      label: "FAST",
      steps: [
        `تحديد الحد الأدنى القابل للإنجاز${context}`,
        "تنفيذ أهم خطوة أولًا",
        "مراجعة سريعة"
      ],
      dependencies: [],
      estimatedEffort: 30,
      expectedOutcome: "إنجاز جوهر الهدف بسرعة",
      risk: previousFailure ? 0.45 : 0.35,
      confidence: 0.72,
      recoveryStrategy:
        "تقليل النطاق والانتقال إلى أول نتيجة مكتملة"
    },
    {
      id: crypto.randomUUID(),
      label: "BALANCED",
      steps: [
        `تحديد النتيجة النهائية${context}`,
        "تقسيم الهدف إلى خطوات",
        "تنفيذ مع نقاط تحقق",
        "مراجعة النتيجة"
      ],
      dependencies: [],
      estimatedEffort: 60,
      expectedOutcome: "توازن بين السرعة والجودة",
      risk: 0.20,
      confidence: 0.84,
      recoveryStrategy:
        "إعادة ترتيب الخطوات وتقليل تكلفة الخطوة الأعلى"
    },
    {
      id: crypto.randomUUID(),
      label: "DEEP",
      steps: [
        `جمع السياق${context}`,
        "تحليل البدائل",
        "تنفيذ متدرج",
        "التحقق",
        "استخراج درس قابل لإعادة الاستخدام"
      ],
      dependencies: [],
      estimatedEffort: 100,
      expectedOutcome: "جودة أعلى وفهم أعمق",
      risk: 0.15,
      confidence: 0.87,
      recoveryStrategy:
        "توقيف المسار عند الفشل وتحويله إلى فرضية جديدة"
    }
  ];
}

export function predict(
  plan: Plan,
  _goal: Goal
): Prediction {
  return {
    planId: plan.id,
    benefit: Math.min(1, plan.confidence + 0.1),
    cost: Math.min(1, plan.estimatedEffort / 100),
    risk: plan.risk,
    probabilityOfSuccess: Math.max(
      0,
      Math.min(
        1,
        plan.confidence - plan.risk * 0.35
      )
    ),
    dependencies: plan.dependencies,
    failureModes:
      plan.label === "FAST"
        ? ["ضغط زمني", "جودة أقل"]
        : ["توسع النطاق", "إرهاق"],
    recoveryPossibilities: [
      plan.recoveryStrategy
    ]
  };
}

export function decide(
  plans: Plan[],
  predictions: Prediction[],
  preferences: {
    speed: number;
    quality: number;
    riskAversion: number;
  },
  memories: Memory[]
): Decision {
  const previousFailure =
    memories.filter(
      (memory) => memory.type === "FAILURE"
    ).length > 0;

  const ranked = predictions
    .map((prediction) => {
      const plan = plans.find(
        (item) => item.id === prediction.planId
      )!;

      const score =
        plan.confidence * 0.35 +
        prediction.benefit * 0.25 +
        prediction.probabilityOfSuccess * 0.2 +
        (1 - prediction.risk) * 0.1 +
        (1 - prediction.cost) *
          preferences.speed *
          0.05 -
        prediction.risk *
          preferences.riskAversion *
          0.05 +
        (plan.label === "DEEP"
          ? preferences.quality * 0.03
          : 0) -
        (previousFailure &&
        plan.label === "FAST"
          ? 0.08
          : 0);

      return {
        plan,
        score
      };
    })
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0];

  return {
    planId: selected.plan.id,
    score: selected.score,
    reasons: [
      "توافق جيد مع الهدف الحالي",
      previousFailure &&
      selected.plan.label !== "FAST"
        ? "تم تخفيض أولوية السرعة بسبب فشل سابق"
        : "لا توجد إشارة قوية لتغيير الأولوية",
      `المخاطرة المقدرة ${(
        selected.plan.risk * 100
      ).toFixed(0)}%`
    ],
    confidence: selected.plan.confidence,
    reversible: true
  };
}
