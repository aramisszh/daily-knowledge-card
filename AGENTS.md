# Project Instructions

## Scope

This file applies to the whole `daily-knowledge-card` project.

## Project Goal

Build an MVP daily knowledge-card system:

- Generate one structured knowledge card per day.
- Generate and store one poster-style image for that card.
- Keep the structured content in the database for detail pages, review questions, search, and future expansion.
- Keep the first version single-user with `USER_ID = default_user`.

## Current Direction

- Use Next.js, Supabase, and OpenAI.
- Use OpenAI image generation directly for the MVP card image.
- Do not switch to HTML template rendering unless the product direction is explicitly changed.
- Keep `content_json`; it is the source for details, review, and search.
- The current UI is an MVP prototype. Prioritize connecting data and making the system run before redesigning.
- The current operational mode is hybrid:
  - card content comes from `data/cards.json`
  - card images come from `public/generated-cards/`
  - study actions and progress come from Supabase
  - `knowledge_cards` currently acts as a UUID bridge for study records, not yet as the primary content source

## Local Development

- Install dependencies with `npm install`.
- Run tests with `npm test`.
- Run a production build with `npm run build`.
- Run the app locally with `npm run dev`.

## Environment

- Do not commit `.env.local`, secrets, API keys, tokens, or service-role keys.
- Required environment variables are documented in `.env.example`.
- Supabase Storage bucket is currently designed as public bucket `knowledge-cards`.

## Engineering Rules

- Follow existing file structure and naming conventions.
- Keep changes small and focused on running the MVP.
- Do not remove mock data until the API-backed flow has been verified.
- Do not switch the card-reading source away from `data/cards.json` unless the full local card set has been intentionally migrated into Supabase.
- Do not restore writes to `data/study-records.json`; study state must stay on Supabase.
- Do not introduce authentication, multi-user support, admin dashboards, or major UI redesign before the MVP data flow is working.
- Preserve Singapore date logic for daily card and streak calculations.
- After code changes, run the relevant verification commands before reporting completion.

## Weekly Batch Workflow

The standard production update flow for this project is now the external weekly pack mode below. Follow this exact order unless the product direction is explicitly changed.

1. ChatGPT web produces the new weekly pack outside this repo.
   - Mac-side Codex does not generate topics.
   - Mac-side Codex does not generate card body content.
   - Mac-side Codex does not generate `image2` prompts.
   - Mac-side Codex does not generate podcast scripts.
2. The user places the external weekly handoff zip under `automation/exchange/inbox/`.
   - The standard filename is `dkc-handoff__<weekKey>__<weekStart>_to_<weekEnd>.zip`.
   - The zip must contain at least `weekly-plan.json`, `cards-draft.json`, `package-manifest.json`, `images/` or `image-assets/`, and `podcast_jobs/done/`.
   - The weekly key is the external pack key, for example `2026-W22`.
3. If Windows-side audio production is part of the batch, the user completes it outside this repo and puts the finished handoff zip back into that inbox location.
4. Mac-side Codex must then run the repo-side receiving and publish workflow:
   - `npm run weekly:receive -- <weekKey>`
   - `npm run weekly:publish -- <weekKey>`
   - `npm run weekly:validate`
   - `npm run site:capacity`
5. During publish, Codex must:
   - unzip the handoff into `automation/exchange/staging/<weekKey>/`
   - normalize source materials into `automation/weekly/<weekKey>/source/`
   - keep previous workflow materials under `automation/archive/` or `docs/archive/`
   - validate `weekly-plan.json`, `cards-draft.json`, images, transcripts, audio, and metadata alignment
   - keep exchange evidence under `automation/exchange/processed/` or `automation/exchange/failed/`
   - import images into `public/generated-cards/`
   - import audio into `public/audio/published/`
   - import transcripts into `public/transcripts/published/`
   - merge `cards-draft.json` into `data/cards.json`
   - update `data/podcast-manifest.json`
   - update `data/archive-manifest.json` when archive state changes
   - verify Chinese text in `data/cards.json` was preserved correctly and did not degrade into `?` or mojibake
   - run the required verification commands before any release conclusion
6. After local verification passes, Codex should continue the release flow when the user wants the weekly update published:
   - complete local Git commit work
   - push to the remote repository
   - verify Vercel project linkage, environment-variable readiness, and deployment status
7. After deployment is ready, Codex must explicitly ask the user to perform final acceptance on production.

Legacy note:

- `automation/archive/legacy-incoming/`
- `automation/archive/legacy-weekly-workspaces/`
- `docs/archive/weekly-workflow-history/`
- `npm run legacy:weekly:create`
- `npm run legacy:weekly:continue`

These legacy assets are retained for compatibility and local history only. They are not the standard workflow and should not be expanded in new work unless the user explicitly asks for legacy support.

For this workflow, Vercel deployment readiness means all of the following are true:

- `data/cards.json` contains the new weekly batch from the external pack
- all referenced images exist in `public/generated-cards/`
- all referenced audio files exist in `public/audio/published/`
- all referenced transcript files exist in `public/transcripts/published/`
- `npm test` passes
- `npm run typecheck` passes
- `npm run build` passes, or if sandbox limitations interfere, an equivalent no-sandbox or Vercel build passes
- the remote Git push succeeds
- the latest Vercel production deployment is `Ready`

When updating Chinese-heavy weekly content, do not rely on a shell path that can corrupt UTF-8 text while writing JSON. After writing `data/cards.json`, always run a direct regression check against the newly added cards before pushing.

## Git Rules

- Do not commit generated dependency folders such as `node_modules`.
- Do not commit local environment files.
- Do not run `git push`, `git rebase`, `git reset --hard`, or force operations without explicit user approval.
