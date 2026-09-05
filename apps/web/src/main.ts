import {
  JarvisCore,
  IndexedDbStorage
} from "@jarvis/core";

import "./style.css";

const app =
  document.querySelector("#app")!;

app.innerHTML = `
<div class="shell">

  <header class="topbar">
    <div>
      <div class="brand">J.A.R.V.I.S</div>
      <div class="sub">
        COGNITIVE OPERATING SYSTEM
      </div>
    </div>

    <div id="status" class="status">
      OFFLINE
    </div>
  </header>

  <main>

    <section class="hero">
      <div>
        <h1>العقل المعرفي</h1>

        <p>
          Cognitive OS Laboratory
        </p>
      </div>

      <div class="hero-actions">
        <button id="reflect">
          Reflection
        </button>

        <button id="clear">
          مسح الذاكرة
        </button>
      </div>
    </section>

    <section class="dashboard">

      <section class="panel conversation-panel">

        <div class="panel-title">
          <h2>المحادثة</h2>
        </div>

        <div id="chat" class="chat"></div>

        <div class="composer">

          <textarea
            id="input"
            placeholder="اكتب أمرًا لـ JARVIS..."
          ></textarea>

          <button id="send">
            تنفيذ
          </button>

        </div>

      </section>

      <section class="panel">

        <div class="panel-title">
          <h2>SELF MODEL</h2>
        </div>

        <div
          id="self"
          class="data-list"
        ></div>

      </section>

      <section class="panel">

        <div class="panel-title">
          <h2>WORLD MODEL</h2>
        </div>

        <div
          id="world"
          class="data-list"
        ></div>

      </section>

      <section class="panel wide">

        <div class="panel-title">
          <h2>COGNITIVE EVENT BUS</h2>
        </div>

        <pre
          id="events"
          class="events"
        ></pre>

      </section>

      <section class="panel">

        <div class="panel-title">
          <h2>MEMORY</h2>
        </div>

        <div
          id="memory"
          class="memory"
        ></div>

      </section>

      <section class="panel">

        <div class="panel-title">
          <h2>ACTIVE GOAL</h2>
        </div>

        <div
          id="goal"
          class="goal"
        ></div>

      </section>

    </section>

  </main>

</div>
`;

const storage =
  new IndexedDbStorage(
    "jarvis-db"
  );

const core =
  new JarvisCore(storage);

const eventLog: unknown[] = [];

const $ = (selector: string) =>
  document.querySelector(selector)!;

function escapeHtml(
  value: string
): string {
  return value.replace(
    /[&<>"]/g,
    (character) => {
      const entities: Record<
        string,
        string
      > = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
      };

      return entities[
        character
      ];
    }
  );
}

function addMessage(
  speaker: "USER" | "JARVIS",
  message: string
): void {
  const element =
    document.createElement("article");

  element.className =
    `message ${speaker.toLowerCase()}`;

  element.innerHTML = `
    <strong>${speaker}</strong>
    <div>
      ${escapeHtml(message).replace(
        /\n/g,
        "<br>"
      )}
    </div>
  `;

  const chat =
    $("#chat") as HTMLElement;

  chat.appendChild(element);

  chat.scrollTop =
    chat.scrollHeight;
}

function render(): void {
  const snapshot =
    core.snapshot();

  const self =
    snapshot.self;

  const world =
    snapshot.world;

  const status =
    $("#status") as HTMLElement;

  status.textContent =
    self.currentMode === "OFFLINE"
      ? "OFFLINE"
      : "ONLINE";

  status.className =
    `status ${
      self.currentMode === "OFFLINE"
        ? "offline"
        : "online"
    }`;

  $("#self").innerHTML = `
    <div>
      <span>MODE</span>
      <strong>${self.currentMode}</strong>
    </div>

    <div>
      <span>CONFIDENCE</span>
      <strong>
        ${(self.confidence * 100).toFixed(0)}%
      </strong>
    </div>

    <div>
      <span>UNCERTAINTY</span>
      <strong>
        ${(self.uncertainty * 100).toFixed(0)}%
      </strong>
    </div>

    <div>
      <span>ATTENTION</span>
      <strong>
        ${(self.attention * 100).toFixed(0)}%
      </strong>
    </div>

    <div>
      <span>THOUGHT STATE</span>
      <strong>
        ${escapeHtml(
          self.currentThoughtState
        )}
      </strong>
    </div>

    <div>
      <span>LAST DECISION</span>
      <strong>
        ${escapeHtml(
          self.lastDecision ?? "—"
        )}
      </strong>
    </div>

    <div>
      <span>LAST OBSERVATION</span>
      <strong>
        ${escapeHtml(
          self.lastObservation ?? "—"
        )}
      </strong>
    </div>
  `;

  $("#world").innerHTML = `
    <div>
      <span>PLATFORM</span>
      <strong>
        ${world.deviceState.platform}
      </strong>
    </div>

    <div>
      <span>ONLINE</span>
      <strong>
        ${world.deviceState.online}
      </strong>
    </div>

    <div>
      <span>REQUEST</span>
      <strong>
        ${escapeHtml(
          world.currentRequest || "—"
        )}
      </strong>
    </div>

    <div>
      <span>ACTIVE TASK</span>
      <strong>
        ${escapeHtml(
          world.activeTask ?? "—"
        )}
      </strong>
    </div>

    <div>
      <span>TOOLS</span>
      <strong>
        ${world.availableTools.length}
      </strong>
    </div>
  `;

  const memories =
    snapshot.memories
      .slice(0, 10)
      .map(
        (memory) => `
          <article>
            <b>${memory.type}</b>

            <div>
              ${escapeHtml(
                memory.text
              )}
            </div>

            <small>
              أهمية:
              ${(memory.importance * 100).toFixed(0)}%
            </small>
          </article>
        `
      )
      .join("");

  $("#memory").innerHTML =
    memories ||
    "<span>لا توجد ذكريات.</span>";

  const goal =
    world.activeGoal;

  const plan =
    world.currentPlan;

  if (!goal) {
    $("#goal").innerHTML =
      "<span>لا يوجد هدف نشط.</span>";
  } else {
    $("#goal").innerHTML = `
      <h3>
        ${escapeHtml(goal.title)}
      </h3>

      <p>
        ${escapeHtml(
          goal.objective
        )}
      </p>

      ${
        plan
          ? `
            <hr>

            <b>
              PLAN ${plan.label}
            </b>

            <ol>
              ${plan.steps
                .map(
                  (step) =>
                    `<li>${escapeHtml(
                      step
                    )}</li>`
                )
                .join("")}
            </ol>

            <div class="plan-meta">
              Risk:
              ${(plan.risk * 100).toFixed(0)}%

              |

              Confidence:
              ${(plan.confidence * 100).toFixed(0)}%
            </div>
          `
          : ""
      }
    `;
  }

  (
    $("#events") as HTMLElement
  ).textContent =
    eventLog
      .slice(-60)
      .map(
        (item: any) =>
          `${new Date(
            item.timestamp
          ).toLocaleTimeString()} | ${
            item.type
          } | ${JSON.stringify(
            item.payload
          ).slice(0, 320)}`
      )
      .join("\n");
}

const eventTypes = [
  "USER_INPUT",
  "OBSERVATION",
  "MEMORY_RETRIEVED",
  "MEMORY_UPDATED",
  "GOAL_CREATED",
  "GOAL_UPDATED",
  "PLAN_CREATED",
  "PREDICTION_CREATED",
  "DECISION_MADE",
  "ACTION_REQUESTED",
  "PERMISSION_REQUIRED",
  "ACTION_STARTED",
  "ACTION_COMPLETED",
  "ACTION_FAILED",
  "VERIFICATION_COMPLETED",
  "REFLECTION_COMPLETED",
  "LESSON_LEARNED",
  "ERROR"
] as const;

async function boot(): Promise<void> {
  await core.init();

  await core.observe({
    platform: "web",
    online: navigator.onLine,
    permissions: {
      READ_DEVICE_STATE: true
    }
  });

  for (const type of eventTypes) {
    core.bus.on(
      type,
      (event) => {
        eventLog.push(event);
        render();
      }
    );
  }

  addMessage(
    "JARVIS",
    "النواة جاهزة. الحالة المعروضة ناتجة عن النظام نفسه وليست مؤشرات عشوائية."
  );

  render();
}

$("#send").addEventListener(
  "click",
  async () => {
    const input =
      (
        $("#input") as HTMLTextAreaElement
      ).value.trim();

    if (!input) return;

    addMessage(
      "USER",
      input
    );

    (
      $("#input") as HTMLTextAreaElement
    ).value = "";

    const response =
      await core.handleInput(input);

    addMessage(
      "JARVIS",
      response
    );

    render();
  }
);

$("#input").addEventListener(
  "keydown",
  (event) => {
    const keyboard =
      event as KeyboardEvent;

    if (
      keyboard.key === "Enter" &&
      keyboard.ctrlKey
    ) {
      (
        $("#send") as HTMLButtonElement
      ).click();
    }
  }
);

$("#reflect").addEventListener(
  "click",
  async () => {
    const result =
      await core.reflect();

    addMessage(
      "JARVIS",
      result
    );

    render();
  }
);

$("#clear").addEventListener(
  "click",
  async () => {
    await storage.delete(
      "memories"
    );

    await storage.delete(
      "goals"
    );

    await storage.delete(
      "world"
    );

    await storage.delete(
      "self"
    );

    location.reload();
  }
);

boot().catch(
  (error) => {
    console.error(error);

    addMessage(
      "JARVIS",
      `خطأ في تشغيل النواة: ${String(
        error
      )}`
    );
  }
);
