---
inclusion: fileMatch
fileMatchPattern: "**/*.tsx,**/*.jsx,**/*.css"
---

# UI & Design Engineering — Skill Routing

This project has the full emilkowalski/skills set installed. Skills auto-activate
on matching requests, but for a web (React) project, only some are relevant.
This file doesn't restate their rules — it routes which one applies, so you
default to the right one instead of always reaching for emil-design-eng.

## Which skill for which task
- New animation from scratch → `animate`
- Reviewing an existing animation/diff → `review-animations`
- Auditing motion across the whole codebase → `improve-animations`
- Not sure if something should animate at all → `find-animation-opportunities`
- Unsure of correct motion terminology when giving feedback → `animation-vocabulary`
- About to build a toast, drawer, command menu, or similar — check for a trusted
  primitive first → `pick-ui-library`
- Working specifically with Sonner's API → `ask-sonner`
- Want to compare a few genuinely different UI approaches before committing →
  `prototype`
- General UI polish / component / interaction decisions not covered above →
  `emil-design-eng`

## Not applicable to this stack
- `animate-expo` — React Native/Expo only, this is a web app
- `write-swift` — iOS only
- `apple-design` — optional; only invoke intentionally if a specific screen
  wants that restraint aesthetic, not by default

## Review workflow
When asked to review existing UI code, respond with a Before / After / Why table,
not a silent rewrite — this is `review-animations`' own output format, kept here
only as a reminder since it's easy to forget to ask for it explicitly.
