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

The standard production update flow for this project is the local weekly batch mode below. Follow this exact order unless the product direction is explicitly changed.

1. The user starts a new Codex session and asks for the next week's `image2` prompts.
2. Codex generates one weekly markdown file for the 7-day batch.
   - The file must contain enough structured information for both image generation and later `data/cards.json` entry creation.
   - At minimum, each day must include date, category, title, subtitle, and the full Image2 prompt content.
   - Codex must explicitly tell the user that the next step is to generate 7 images in ChatGPT and save them into `public/generated-cards/`.
3. The user generates the 7 images in ChatGPT, saves them into `D:\codex\daily-knowledge-card\public\generated-cards`, and tells Codex the images are saved.
4. After the user confirms the images are saved, Codex must complete the whole weekly update pipeline:
   - append or update the 7 structured cards in `data/cards.json`
   - rename and align image filenames with the project's existing `YYYY-MM-DD-topic.png` convention
   - make sure every new `imageUrl` matches a real file under `public/generated-cards/`
   - verify Chinese text in `data/cards.json` was preserved correctly and did not degrade into `?` or mojibake
   - run the required verification commands before any release conclusion
5. After local verification passes, Codex should continue the release flow when the user wants the weekly update published:
   - complete local Git commit work
   - push to the remote repository
   - verify Vercel project linkage, environment-variable readiness, and deployment status
6. After deployment is ready, Codex must explicitly ask the user to perform final acceptance on production.

For this workflow, Vercel deployment readiness means all of the following are true:

- `data/cards.json` contains the new 7-day batch
- all referenced images exist in `public/generated-cards/`
- `npm test` passes
- `npm run build` passes, or if sandbox limitations interfere, an equivalent no-sandbox or Vercel build passes
- the remote Git push succeeds
- the latest Vercel production deployment is `Ready`

When updating Chinese-heavy weekly content, do not rely on a shell path that can corrupt UTF-8 text while writing JSON. After writing `data/cards.json`, always run a direct regression check against the newly added cards before pushing.

## Git Rules

- Do not commit generated dependency folders such as `node_modules`.
- Do not commit local environment files.
- Do not run `git push`, `git rebase`, `git reset --hard`, or force operations without explicit user approval.
