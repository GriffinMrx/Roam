# Sanity content model, standalone Studio, and server-side data layer

## Goal

Model Roam's core content (course, module, lesson, instructor, category) in a standalone Sanity Studio, and give the Next.js app a server-only, token-authenticated read client plus a typed data layer the pages will use next. Pages are not wired to Sanity in this step.

## Skills and docs read

- AGENTS.md: sections 5, 6, 7, 8, 12, 13
- sanity-best-practices: `SKILL.md`, `references/project-structure.md`, `schema.md`, `typegen.md`, `nextjs.md`
- Next.js 16 docs: `01-getting-started/08-caching.md` (`'use cache'`, `cacheLife`, `cacheTag` with `cacheComponents`)

## Code inspected

- `sanity init` was just run in embedded mode. It added `app/studio/[[...tool]]/page.tsx`, `sanity.config.ts`, `sanity.cli.ts`, `sanity/env.ts`, `sanity/structure.ts`, `sanity/schemaTypes/index.ts` (empty), `sanity/lib/{client,image,live}.ts`, and the root deps `sanity`, `@sanity/vision`, `styled-components`, `next-sanity`, `@sanity/image-url`.
- `.env.local` has `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` (I checked the names only, not the values). There is no read token yet.
- `sanity/lib/client.ts`: public, `useCdn: true`, no token. That isn't allowed for a private dataset.
- `next.config.ts`: `cacheComponents: true`, so the data layer uses `'use cache'`.
- `app/page.tsx`: course cards are hardcoded today. They get wired to Sanity in a later step.
- Designs `design/vertex-home.png`, `vertex-course.png`, `vertex-lesson.png`: show which fields each screen needs (see the model below).

## Decisions

1. **Standalone Studio in `studio/`** (AGENTS.md §5, and the skill marks embedded Studios as legacy). Scaffold it with `npm create sanity@latest -- --project <id> --dataset <dataset> --template clean --typescript --output-path studio`, reusing the existing project and dataset (looked up with `sanity projects list` / `datasets list`). Then remove the embedded parts from the web app: `app/studio/`, the root `sanity.config.ts`, `sanity.cli.ts`, `sanity/structure.ts`, `sanity/schemaTypes/`, and the root deps `sanity`, `@sanity/vision`, `styled-components`. Keep `next-sanity` and `@sanity/image-url`. The Next app stays at the repo root (no move into `web/`).
2. The Studio reads `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` from `studio/.env`, with a committed `studio/.env.example`.
3. **Private dataset with a server-only token.** Set the dataset visibility to private. Create a Viewer token named "Roam web read" with the CLI and write it straight into `.env.local` as `SANITY_API_READ_TOKEN`, without printing it.
4. **No `defineLive`**: live updates in the browser need a browser token, which isn't allowed. Delete `sanity/lib/live.ts`. Freshness comes from `'use cache'` + `cacheLife` + `cacheTag(<type>)`, so an on-demand revalidation webhook can be added later without changing callers.
5. **Durations are stored in seconds** on the lesson. Module and course totals, module counts, and the "Module 5" / "Lesson 5.1" labels are derived in GROQ or code, never stored.
6. **Outcome icons** are a fixed string list (`layers`, `database`, `gauge`, `cloud`, `code`, `shield`, `rocket`, `book`). The UI maps them to glyphs later. A lesson's level is the course's level.
7. **Portable Text** (`blockContent`): normal, h2, h3, quote; bullet and numbered lists; strong, em, code marks; link annotation; inline image with alt. No code-block plugin.
8. Video documents, the Context document, and progress records are **out of scope** for this step.

## Content model (`studio/schemaTypes`)

- `category` (document, TagIcon): `title`*, `slug`*, `description` (text)
- `instructor` (document, UserIcon): `name`*, `slug`*, `photo` (image, hotspot, alt), `expertise` (string), `bio` (text)
- `course` (document, BookIcon):
  - Main: `title`*, `slug`*, `summary`* (text), `coverImage`* (image + alt), `level`* (beginner / intermediate / advanced, radio), `price` (number ≥ 0, 0 = free), `popular` (boolean), `studentCount` (number ≥ 0)
  - `outcomes` (array of `outcome` objects `{icon, title, description}`, max 6)
  - `instructor`* (reference), `category`* (reference)
  - `modules` (array of `module` objects, min 1)
  - Organized into groups: Content / Marketing / Curriculum
- `module` (object): `title`*, `summary` (text), `lessons` (array of lesson references, unique, min 1). Preview shows the lesson count.
- `lesson` (document, PlayIcon):
  - `title`*, `slug`*, `summary` (text)
  - `videoUrl`* (url, must be a YouTube, Vimeo, or Bunny host), `thumbnail` (image + alt), `durationSeconds`* (number > 0), `freePreview` (boolean), `studentCount` (number)
  - `notes` (blockContent), `keyPoints` (array of strings, max 6), `proTip` (text)
  - `resources` (array of `resource` objects: `type` from documentation / guide / repository / article / download, plus `title`*, `description`, `url`*)
- Shared: `blockContent`, `outcome`, `module`, `resource`
- Studio structure: Courses, Lessons, Instructors, Categories. Vision tool enabled.

## Web data layer (`sanity/`)

- `sanity/env.ts`: keep it (projectId, dataset, apiVersion).
- `sanity/lib/token.ts`: `import 'server-only'`, asserts `SANITY_API_READ_TOKEN`.
- `sanity/lib/client.ts`: `import 'server-only'`, client with the token, `useCdn: false`, `perspective: 'published'`.
- `sanity/lib/fetch.ts`: `sanityFetch({ query, params, tags })` with `'use cache'`, `cacheLife('minutes')`, and `cacheTag(...tags)`.
- `sanity/lib/image.ts`: keep `urlFor`. It's safe in the browser because it only builds URLs.
- `sanity/lib/queries.ts` (`defineQuery`):
  - `COURSES_QUERY`: catalog cards, with derived module count, lesson count, and total seconds
  - `COURSE_QUERY`: detail page, with the instructor, category, outcomes, and modules → lessons (title, slug, duration, free preview) plus a per-module total
  - `LESSON_QUERY`: lesson page, with the parent course via `references(^._id)` (title, slug, level, cover image, instructor, modules → lessons for the sidebar and previous/next)
  - `INSTRUCTOR_QUERY`: the instructor plus their courses
  - `CATEGORIES_QUERY`
  - Slug lists for `generateStaticParams`
- `sanity/data.ts`: typed functions `getCourses`, `getCourse(slug)`, `getLesson(slug)`, `getInstructor(slug)`, `getCategories`, and slug helpers. All are server-only.
- `next.config.ts`: allow `cdn.sanity.io` in `images.remotePatterns`.
- TypeGen: configured in `studio/sanity.cli.ts` to scan `../{app,components,lib,sanity}/**/*.{ts,tsx}` and generate `../sanity.types.ts`, so `client.fetch` results are typed. Studio scripts: `typegen`.
- Root `tsconfig.json` and ESLint ignore `studio/`, which has its own tsconfig and lint setup.
- `.env.example` adds `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, and `SANITY_API_READ_TOKEN` (server only).

## Files expected to touch

- New: `studio/**`, `sanity/lib/token.ts`, `sanity/lib/fetch.ts`, `sanity/lib/queries.ts`, `sanity/data.ts`, `sanity.types.ts`
- Edit: `sanity/lib/client.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.env.example`, `package.json`, `package-lock.json`, `.env.local` (token only, written by the CLI)
- Delete: `app/studio/`, `sanity.config.ts`, `sanity.cli.ts`, `sanity/structure.ts`, `sanity/schemaTypes/`, `sanity/lib/live.ts`

## Security considerations

- The read token lives only in `.env.local` / host env, is imported only from `server-only` modules, and is never `NEXT_PUBLIC_`.
- The dataset is set to private, so anonymous API reads fail.
- No write token is created in this step.
- `studio/.env` holds only the project ID and dataset, which aren't secrets.

## Acceptance criteria

- `cd studio && npm run dev` opens the Studio at http://localhost:3333 with Courses, Lessons, Instructors, and Categories, and all the fields above, with their validation.
- The schema is deployed (`sanity schema deploy`).
- The dataset is private, and an anonymous query to the API is rejected.
- The web app has no embedded Studio, and `/studio` returns 404.
- Importing `sanity/data.ts` from a client component fails the build (`server-only`).
- `getCourses()` runs against the live dataset and returns an array, which is empty until content exists.
- Type check, lint, and build pass in the web app, and the Studio builds.

## Checks to run

- Web: `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Studio: `npx tsc --noEmit`, `npx sanity build`, `npx sanity schema deploy`, `npm run typegen`
- Live check: a short server-side script that calls the data layer's query with the token, plus an anonymous `curl` that should be rejected

## Manual test steps

1. Run `cd studio && npm run dev`, then open http://localhost:3333.
2. Create a category, then an instructor, then two lessons with YouTube URLs and durations.
3. Create a course that references them, with one module containing both lessons.
4. Try saving a lesson with a non-video URL. Validation should block it.
5. Publish everything. Open Vision and run `*[_type == "course"]{title, "lessons": count(modules[].lessons[])}`.
6. Open http://localhost:3000/studio. It should be a 404.

## Not in this step (follow-ups)

- Wiring the home, course, lesson, and instructor pages to the data layer
- Seed content import
- `sanity deploy` (needs a Studio hostname you choose; required before the Context MCP search work)
- Revalidation webhook
