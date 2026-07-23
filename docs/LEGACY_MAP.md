# OWNER: REPOSITORY (docs)
# LEGACY_MAP.md

This file maps Personal-OS filenames to Universal-OS core implementations and Realtor-OS configuration.

- src/services/timer.js → packages/universal-core/state-engine/timer/index.js (UNIVERSAL-OS)
- src/services/settings.js → packages/universal-core/adapters/supabaseAdapter.js (UNIVERSAL-OS)
- src/services/classify-capture.js → src/services/classify-capture.js (PERSONAL-OS shim) delegates to packages/universal-core/ai-layer/providers/googleGemini.js (UNIVERSAL-OS)
- Realtor OS config: packages/realtor-os/config/* (REALTOR-OS) — entities, states, policies, workflows
