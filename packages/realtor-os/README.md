# OWNER: REALTOR-OS (application)
# packages/realtor-os/README.md

Realtor‑OS — application layer running on the Universal‑OS foundation.

Purpose
- This package contains the Realtor‑specific configuration, domain rules, templates, checklists and metric definitions that run on top of the Universal‑OS engine.
- It is intentionally configuration-first: the Universal‑OS packages provide the engine (adapters, persistence, automation runner, AI facade, entity registry). Realtor‑OS provides the domain model and assets.

What to expect in this package
- config/entities.js — register entity types used by Realtor workflows
- config/states.js — lifecycle state definitions for Lead, Client, Transaction
- config/policies.js — business rules and validation for domain operations
- config/workflows.js — automation trigger definitions (declarative, not runtime)
- templates/ — communication and document templates
- checklists/ — verification checklists (closing checklist, onboarding checklist)
- metrics/ — metric definitions for BI

How to use
- Import the config files during application bootstrap. They register entity types and declarative workflows with the Universal‑OS engine.
- Nothing in this package performs destructive migrations; it only registers configuration and provides assets.
