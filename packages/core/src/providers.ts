export interface Understanding {
  intent: string;
  entities: string[];
  constraints: string[];
  urgency: number;
  emotionalStateEstimate: {
    label: string;
    confidence: number;
  };
  ambiguity: number;
}

export interface ReasoningProvider {
  name: string;

  understand(
    input: string,
    context: string
  ): Promise<Understanding>;

  answer(
    prompt: string,
    context: string
  ): Promise<string>;
}

export class LocalRuleEngine
  implements ReasoningProvider
{
  name = "LOCAL_RULE_ENGINE";

  async understand(
    input: string,
    _context: string
  ): Promise<Understanding> {
    const text = input.toLowerCase();

    let intent = "GENERAL";

    if (/ذاكر|مذاكرة|دراسة|study/.test(text)) {
      intent = "STUDY";
    } else if (/خطط|خطة|plan/.test(text)) {
      intent = "PLANNING";
    } else if (
      /افتح|شغل|تشغيل|launch|open/.test(text)
    ) {
      intent = "DEVICE_ACTION";
    }

    const urgency =
      /دلوقتي|الآن|عاجل|urgent|asap|متأخر/.test(text)
        ? 0.9
        : 0.3;

    const stressed =
      /متأخر|مضغوط|قلقان|قلق|ضغط/.test(text);

    return {
      intent,
      entities: [],
      constraints: [],
      urgency,
      emotionalStateEstimate: {
        label: stressed ? "STRESSED" : "NEUTRAL",
        confidence: 0.55
      },
      ambiguity: 0.15
    };
  }

  async answer(
    prompt: string,
    _context: string
  ): Promise<string> {
    return [
      "مفهوم يا سيدي.",
      "حللت الطلب كسياق معرفي بدل اعتباره رسالة منفصلة.",
      "",
      prompt
    ].join("\n");
  }
}
