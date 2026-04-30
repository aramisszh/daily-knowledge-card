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
- Do not introduce authentication, multi-user support, admin dashboards, or major UI redesign before the MVP data flow is working.
- Preserve Singapore date logic for daily card and streak calculations.
- After code changes, run the relevant verification commands before reporting completion.

## Git Rules

- Do not commit generated dependency folders such as `node_modules`.
- Do not commit local environment files.
- Do not run `git push`, `git rebase`, `git reset --hard`, or force operations without explicit user approval.
