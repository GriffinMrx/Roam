# Seed Sanity from the provided seed files

## Goal

Load the provided content into the `production` dataset with the Sanity CLI import, using `studio/scripts/seed/seed.ndjson` and `studio/scripts/seed/videos.json` as given. Do not generate content, and do not modify either file. Verify document counts afterwards.

## Skills and docs read

- AGENTS.md: §8 (content model), §12 (private dataset, token server-only), §13 (checks: import content)
- sanity-best-practices `schema.md` (safe schema updates, validation) and `SKILL.md` global rules
- `sanity dataset import --help`

## What the files contain (inspected read-only)

- `seed.ndjson`: 141 documents, valid JSON on every line, no duplicate `_id`s, no drafts.
  - 6 `category`, 5 `instructor`, 10 `course`, 120 `lesson`
  - Each course has 4 modules with 12 lessons in total.
  - 140 references, all resolving inside the file.
  - Explicit IDs such as `course.nextjs-app-router-in-depth` and `lesson.<slug>`.
  - 135 images as `_sanityAsset: "image@<url>"`: 5 instructor portraits (randomuser.me), 10 course covers (picsum.photos), 120 lesson thumbnails (i.ytimg.com). The CLI import downloads and uploads these.
  - All 120 lesson `videoUrl`s are `https://www.youtube.com/watch?v=<id>`.
- `videos.json`: 120 entries keyed by lesson slug, with `{ id, title, channel, duration, query }`. It is source metadata, **not Sanity documents**. Every key matches a lesson slug, every `id` matches that lesson's `videoUrl`, and every `duration` equals the seed's lesson `duration`. It isn't imported. It's verified against the imported lessons and kept for the transcript and chapter ingestion step (AGENTS.md §9).

## Schema mismatches found

The seed uses different names and shapes than the schema built in `prompts/sanity-content-model-and-data-layer.md`:

| Seed | Current schema |
|---|---|
| `lesson.duration` (seconds, number) | `lesson.durationSeconds` |
| `course.learningOutcomes[]` with `_type: "learningOutcome"` | `course.outcomes[]` with `_type: "outcome"` |
| `instructor.expertise`: array of strings (`["React", "Next.js", …]`) | `string` |
| `instructor.bio`: Portable Text blocks | `text` |
| outcome icons `layers, workflow, gauge, rocket, sparkles, shield, puzzle, code` | list lacks `workflow`, `sparkles`, `puzzle` (and has unused `database`, `cloud`, `book`) |
| resource `type: "link"` | list lacks `link` |
| lesson has no `summary` | optional `summary`, so no conflict |

## Decision

Because the files are the source of truth and must stay unchanged, **align the schema and queries to the seed**. The alternative, transforming the data during import, would mean the dataset no longer matches the provided files. The dataset is empty apart from system documents, so renaming fields loses no content.

- `lesson`: rename `durationSeconds` to `duration` (same validation: integer, positive, required; title "Duration (seconds)").
- `course`: rename `outcomes` to `learningOutcomes` (title "What you'll learn"). Rename the object type `outcome` to `learningOutcome` (file `objects/learning-outcome.ts`).
- Outcome icon list: exactly the 8 icons the seed uses, plus `database`, `cloud`, `book` for authoring. Adding `workflow`, `sparkles`, `puzzle` only adds options.
- `resource.type`: add `link` (title "Link") and keep the others.
- `instructor.expertise`: `array` of `string` with the tags layout. `instructor.bio`: `blockContent`.
- Data layer: update `sanity/lib/queries.ts` to the new names (`duration`, `learningOutcomes`), and keep the derived `durationSeconds` aliases in projections, so the query result shapes the pages will use don't change. Regenerate `sanity.types.ts`.
- Redeploy the schema.

## Import

- From `studio/`, run `npx sanity dataset import scripts/seed/seed.ndjson production`.
- I won't use `--replace` or `--missing`. Import fails on any existing ID instead of overwriting, which is safe on this empty dataset.
- The CLI uploads the 135 `_sanityAsset` images.

## Files expected to touch

- `studio/schemaTypes/documents/lesson.ts`, `course.ts`, `instructor.ts`
- `studio/schemaTypes/objects/outcome.ts` → `learning-outcome.ts`, `resource.ts`, `index.ts`
- `sanity/lib/queries.ts`, `sanity.types.ts` (generated)
- **Not touched:** `studio/scripts/seed/seed.ndjson`, `studio/scripts/seed/videos.json`. A SHA-256 hash of each is recorded before and after to prove they're unchanged.

## Security considerations

- The import runs with the CLI's logged-in user session. No new tokens are created and no secrets are written.
- The dataset stays private. Verification reads use the existing server-only read token, and nothing is printed from `.env.local`.
- Image URLs come from public placeholder services in the provided file. The CLI fetches them once at import time.

## Acceptance criteria

- Counts in `production` match the file: category 6, instructor 5, course 10, lesson 120 (141 total), and 135 `sanity.imageAsset` documents, or fewer if identical images are deduplicated.
- 0 broken references. 0 lessons outside a course. Each course has 4 modules and 12 lessons.
- `sanity documents validate` reports no errors against the updated schema.
- For every lesson, its YouTube ID and duration match `videos.json`.
- The data-layer queries return populated results: `COURSES_QUERY` returns 10 with lesson counts and durations, and `LESSON_QUERY` resolves its parent course.
- Both seed files have identical hashes before and after.
- Studio type check, lint, and build pass. Web type check, lint, and build pass.

## Checks to run

- Hash the seed files before and after
- `npx sanity schema deploy`, `npm run typegen`, `npx sanity build`
- `npx sanity dataset import …`
- Count queries with the read token, the `videos.json` cross-check, and `npx sanity documents validate -y`
- Web: `npx tsc --noEmit`, `npm run lint`, `npm run build`

## Manual test steps

1. Run `cd studio && npm run dev`, then open http://localhost:3333.
2. Open **Courses**. There are 10. Open "Next.js App Router in Depth": cover image, 4 learning outcomes, and 4 modules with 3 lessons each.
3. Open **Lessons** and pick one. There's a YouTube URL, a thumbnail, a duration in seconds, notes, key points, and resources.
4. Open **Instructors**. There are 5, with photos, expertise tags, and a rich-text bio.
5. In Vision, run `{ "courses": count(*[_type=="course"]), "lessons": count(*[_type=="lesson"]) }`. Expect `{ "courses": 10, "lessons": 120 }`.

## Execution notes

- The first import (no flags) created all 141 documents and uploaded 134 images. It then aborted on one asset: `https://i.ytimg.com/vi/AOXMDbc11AE/hqdefault.jpg` returned 404. Because of the abort, no document got its image references.
- Video `AOXMDbc11AE`, used by `lesson.practical-web-security-sql-injection` ("How Do Parameterized Queries Prevent SQL Injection?"), no longer exists on YouTube. oEmbed returns 404, and so does every thumbnail size.
- Recovery: re-ran `sanity dataset import scripts/seed/seed.ndjson --dataset production --replace --allow-failing-assets`. `--replace` only overwrote the 141 documents the first run had just created from the same file. Assets are deduplicated by content hash. That lesson is the only document without an image.
- Seed file SHA-256 values are identical before and after:
  - `seed.ndjson` 10b9f805…3951
  - `videos.json` 1c3fb7ed…1ecc
