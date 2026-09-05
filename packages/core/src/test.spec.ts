import {
  describe,
  it,
  expect
} from "vitest";

import {
  JarvisCore
} from "./core.js";

import {
  MemoryStorage
} from "./storage.js";

describe(
  "J.A.R.V.I.S Cognitive Core",
  () => {
    it(
      "stores and retrieves memory",
      async () => {
        const core =
          new JarvisCore(
            new MemoryStorage()
          );

        await core.init();

        await core.memory.add(
          "USER_PREFERENCE",
          "يفضل خطة مذاكرة متوازنة",
          {
            importance: 0.9
          }
        );

        const result =
          await core.memory.search(
            "خطة مذاكرة متوازنة"
          );

        expect(
          result.length
        ).toBeGreaterThan(0);
      }
    );

    it(
      "keeps follow-up context",
      async () => {
        const core =
          new JarvisCore(
            new MemoryStorage()
          );

        await core.init();

        await core.observe({
          platform: "web",
          online: false
        });

        await core.handleInput(
          "جهزني لمذاكرة البرمجة"
        );

        const id =
          core.world.activeGoal?.id;

        await core.handleInput(
          "ابدأ"
        );

        expect(
          core.world.activeGoal?.id
        ).toBe(id);
      }
    );

    it(
      "does not fake device actions",
      async () => {
        const core =
          new JarvisCore(
            new MemoryStorage()
          );

        await core.init();

        const result =
          await core.execute({
            id: "test",
            capability: "OPEN_APP",
            action: "open",
            args: {
              package: "example"
            }
          });

        expect(
          result.success
        ).toBe(false);
      }
    );
  }
);
