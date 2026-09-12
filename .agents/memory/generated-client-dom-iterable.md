---
name: Generated client DOM iterable
description: The generated React API client uses Headers.entries(), so its composite TypeScript project needs DOM.Iterable in addition to DOM.
---

Generated API client builds can fail on `Headers.entries()` even when the app code is correct if the client library TypeScript `lib` list omits `dom.iterable`.

**Why:** Orval's generated custom fetch helper iterates response headers, and TypeScript does not expose that method from `dom` alone.

**How to apply:** Keep `dom.iterable` in `lib/api-client-react/tsconfig.json` whenever regenerating the API client.