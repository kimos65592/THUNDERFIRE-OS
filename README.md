# J.A.R.V.I.S — Cognitive OS (Merged Core)

This build keeps the original J.A.R.V.I.S web UI and local agent state, while moving Gemini calls to the server-side cognitive layer taken from the working Google AI Studio project.

## Architecture

Browser UI -> `/api/jarvis/cognition` -> Gemini server runtime -> structured cognitive response -> local state/memory/learning

The browser does NOT contain the Gemini API key.

## Secret

Set `GEMINI_API_KEY` in the server environment / AI Studio Secrets.

Do not put the key in `index.html` or `app.js`.

## Main endpoints

- `POST /api/jarvis/cognition` — cognitive perception/reasoning response
- `POST /api/jarvis/evolve` — self-evolution cycle
- `POST /api/jarvis/simulate-threat` — defensive simulation lab
- `GET /api/health` — server health

## First tests

1. أهلا
2. احفظ أنني أحب البرمجة
3. ماذا تتذكر عني؟
4. خطط لي للمذاكرة
5. لماذا اخترت الخطة دي؟
6. خليك مختصر

The Android actions returned by the current web build are still simulated until a real Android Bridge is connected. The system must never report a phone action as actually executed unless the bridge returns a successful result.
