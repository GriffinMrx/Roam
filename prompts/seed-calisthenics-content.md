# Seed calisthenics content in Sanity

## Goal
Add sample calisthenics and training content to the Sanity dataset next to the existing tech courses:
- **New categories:** 4
- **New instructors:** 4
- **Courses:** 6 (you asked for at least 4)
- **Lessons:** each course has 3 modules of 3 lessons, so 54 in total

Every lesson plays a **real, embeddable video** that teaches exactly that lesson's topic.

## Skills and docs read
- AGENTS.md:
  - §7: content is coherent top to bottom (a module's lessons genuinely cover its topic); structured Portable Text, never markdown
  - §8: the content model
  - §9: supported video providers
  - §13: import content from the Studio workspace
- sanity-best-practices (Portable Text shape, `_key`s, references; import with `sanity dataset import`).

## Code inspected
- `studio/schemaTypes`:
  - **course:** required fields are title, slug, summary (≤ 240), coverImage, level, instructor and category refs, and modules (≥ 1). Price, popular, studentCount and learningOutcomes (≤ 6, with icon keys from `OUTCOME_ICONS`) are optional.
  - **lesson:** `videoUrl` is required and must be a YouTube, Vimeo or Bunny https URL. `duration` (seconds) is required. Thumbnail, notes (blockContent), keyPoints (≤ 6), proTip and resources are optional.
  - **module:** an object with a title, a summary and lesson refs (≥ 1, unique).
  - **instructor:** name, slug, photo, expertise and bio. **category:** title, slug and description.
- `studio/scripts/seed/seed.ndjson`, the existing seed of 141 docs:
  - deterministic ids (`course.<slug>`, `lesson.<course>-<topic>`)
  - images through `_sanityAsset: "image@<url>"`
  - instructor photos from randomuser.me, lesson thumbnails from i.ytimg.com
  - Portable Text notes with intro, h2 and point blocks
- `studio/scripts/seed/videos.json`: the record of which real video backs each lesson (id, title, channel, duration, query).

## Content plan
**Categories:**
| Category | What it covers |
|---|---|
| Calisthenics | bodyweight strength basics |
| Mobility & Flexibility | joint prep, stretching and range of motion for training |
| Gymnastic Skills | balance and static or dynamic skills |
| Conditioning | bodyweight HIIT and work capacity |

**Instructors:** 4 fictional coaches (like the existing seed), each with a randomuser.me portrait, expertise tags and a 2-paragraph bio.

**Courses (3 modules × 3 lessons each):**
| Course | Level | Category | Modules |
|---|---|---|---|
| Calisthenics Foundations: Your First Pull-Up | Beginner | Calisthenics | Movement prep and form · Push fundamentals · Pull fundamentals |
| Bodyweight Legs and Core | Beginner | Calisthenics | Squat patterns · Single-leg strength · Core and hollow body |
| Mobility for Calisthenics | Beginner | Mobility & Flexibility | Wrists and shoulders · Hips and hamstrings · Spine and bridge |
| Handstand Mastery | Intermediate | Gymnastic Skills | Wall handstand · Kick-up and balance · Handstand push-up path |
| Muscle-Up and Front Lever | Advanced | Gymnastic Skills | Explosive pulling · The muscle-up transition · Front lever progressions |
| Calisthenics Conditioning | Intermediate | Conditioning | Work capacity · Bodyweight HIIT · Recovery and programming |

That's 6 courses (more than the 4 you asked for), so all 4 categories get at least one. Each lesson has a title, slug, summary, real video, real duration, video thumbnail, notes (intro, "What this lesson covers", points), 3–4 key points and a pro tip. Every course gets a price, a student count, 3–4 "what you'll learn" items (existing icon keys only) and a popular flag on two courses.

## Videos (grounded, not invented)
- **Script:** `studio/scripts/seed/calisthenics.mjs` searches YouTube per lesson with a specific query (for example "scapular pull ups tutorial"). It takes the first result that:
  - runs 2–20 minutes
  - allows embedding (checked through YouTube's public oEmbed endpoint)
  - isn't already used by another lesson
- **Recorded:** the picked id, title, channel and real duration go to `calisthenics-videos.json`. Duration and thumbnail come from the video itself.
- **Review before import:** I read every picked title and replace any off-topic pick with a better query.
- YouTube only: all three providers are supported, but only YouTube has public search. The schema accepts the others if you want to swap any later.

## Images
- **Instructor photos:** randomuser.me portraits, as in the existing seed.
- **Course covers:** the course's first lesson video thumbnail (an on-topic training image). The existing seed's picsum images are unrelated photos.

## Import
- **Files:** the script writes `studio/scripts/seed/calisthenics.ndjson` with deterministic ids (`category.calisthenics`, `course.handstand-mastery`, `lesson.handstand-mastery-wall-walks` and so on).
- **Command:** `sanity dataset import calisthenics.ndjson <dataset> --replace` from `studio/`, using the server-side write token.
  - Re-running replaces only these documents.
  - It doesn't touch the existing courses, progress or bookmarks.
- **Verify:** a GROQ count of each type, and a check that every module's lesson refs resolve.

## Not included
- **Video documents** (transcripts and chapters, AGENTS §9): the ingestion pipeline doesn't exist yet, so these lessons aren't searchable by moment. The same is true of the existing lessons.
- **New category chip icons:** the 4 new chips on the home page show empty icon slots until you upload icons (names listed at the end).

## Security
- The write token stays in `.env.local` and is used only by this offline import command.
- Nothing is added to the web app, and no secrets are written to the seed files.

## Acceptance
- `/courses` lists the 6 new courses under their categories (Calisthenics, Mobility & Flexibility, Gymnastic Skills, Conditioning). The category filters work.
- Each new course page shows 3 modules × 3 lessons, the instructor and its learning outcomes.
- Every new lesson page plays its embedded video, which matches the lesson title; the duration matches the video.
- Each instructor page lists that instructor's courses.
- The home category chips include the 4 new categories.

## Checks
- Run the script and review all 54 picks.
- Import, then run GROQ checks (counts and unresolved references = 0).
- `npm run build` in web: the new slugs prerender.

## Manual test
1. Run `npm run dev` and open `/courses`. Filter by "Gymnastic Skills" and open "Handstand Mastery".
2. Open a lesson: the video plays on-site and teaches the lesson's topic.
3. Open an instructor from the course page: their courses are listed.
4. On `/`, the chip row includes the new categories and "Calisthenics" filters the grid.

## Icons to upload later (optional)
`calisthenics`, `mobility-flexibility`, `gymnastic-skills` and `conditioning` (any names; I'll map them as before).
