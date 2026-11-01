# Chat, phase 1: slide-out messages with lesson and timestamp cards

## Goal
Learners can chat one-to-one and in small groups from a slide-out panel opened by a new **Messages** button next to the bell. Beyond plain text, a message can be:
- a **lesson card** carrying a timestamp: clicking **Watch from 3:12** opens the lesson at that second, or seeks the player when you're already on it
- emoji, and emoji reactions

Updates arrive live. The panel is built from React Bits and Aceternity components, adapted to Roam's tokens and its Motion setup.

## Skills and docs read
- **AGENTS.md:**
  - §1 explicitly includes realtime chat ("share courses, discuss them, and exchange timestamps").
  - §5 and §12: the browser holds no token and never writes; writes go through server routes; secrets stay server only.
- **Neon Realtime skill** (`neon-realtime`) and its references:
  - **queries:** read-only deterministic SQL; authorize inside the query; sealed queries are 60-second bearer tokens.
  - **reactivity:** `RealtimeProvider`, `useLiveQuery` with `refreshQuery`, new sealed query per conversation.
  - **mutations:** the write returns its txid from `RETURNING pg_current_xact_id()`, and `awaitTxId` takes a timeout.
  - **ssr:** create the client in the browser; `NEON_REALTIME_SECRET` never goes to the client.
- **React Bits** (reactbits.dev): Animated List, Counter.
- **Aceternity UI** (ui.aceternity.com): Placeholders and Vanish Input, Animated Tabs, Animated Tooltip, Animated Modal. Both libraries are copy-paste Tailwind + Motion.

## Code inspected
- `components/site-header.tsx`: TeachButton, the bell, and the gear inside Suspense.
- `components/hover-border-gradient.tsx`: an Aceternity component already adapted to `LazyMotion strict` with `m`, the pattern for adapting more.
- `components/video-player.tsx`: `SEEK_EVENT` (`roam:seek`) lets anything ask the player to jump to a second.
- `components/comments/comment-body.tsx`: the time-chip pattern.
- `lib/comments.ts` and `lib/comments-route.ts`:
  - session guard, same-origin, strict Zod, rate limits
  - author snapshot at post time, which chat reuses
- `lib/db` (node-postgres + Drizzle): the `neon.ts` / `.neon` link exists for project `calm-art-94363961`, branch `production`.
- Lesson lookups:
  - **editorial lessons:** Sanity
  - **teacher lessons:** `publishedLessonInfo` in `lib/teach/store.ts`, approved courses only
- `lib/admin.ts` and the admin console, for chat reports.

## Decisions

### Realtime: Neon Realtime
- **Setup:** enable Realtime on the `production` branch with `neon realtime enable --allowed-origin http://localhost:3000`, then `neon env pull` writes `NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` into `.env.local`.
  - This changes your Neon project settings, so it's part of this approval.
  - The production origin must be added before launch.
- **Region risk:** if Realtime isn't available for the project's region, I stop and report back before building anything that depends on it.
- **Env vars:**
  - `NEXT_PUBLIC_NEON_REALTIME_URL`: the WebSocket URL, which isn't a secret.
  - `NEON_REALTIME_SECRET`: server only.
- **Packages:** `@neon/realtime`, `@neon/realtime-react`.
- **Live queries:** raw SQL with `$n` placeholders (`rawSql`), since our Drizzle keys are camelCase and the Drizzle adapter needs snake_case. Every query joins through `chat_members` on the session user, so removing someone or blocking them cuts their view immediately.
- **Client:** one realtime client per browser, created in a `useState` initializer inside the chat provider, and only while signed in. Signing out unmounts it.

### Who can message whom: message requests (spam-safe default)
- **Finding people:** search by name, which returns only name and avatar (never email), up to 8 results, from 2 characters. You can also tap **Message** on a commenter's avatar in a lesson discussion.
- **First message:** it opens a *request*. The other person sees it under **Requests** and can Accept, Decline or Block. Nothing more can be sent until they accept, and a pending request allows 1 message.
- **Groups (up to 20):** the creator adds people they already have an accepted one-to-one chat with. The owner can rename the group or remove members; anyone can leave.
- **Block:** hides you from each other's search, and ends one-to-one chats both ways.

### Data (Neon, migration 0005, all with primary keys for Realtime)
- **`chat_conversations`:**
  - id, kind (`direct` / `group`), title
  - `direct_key` (the sorted user-id pair, unique, so a pair can't open two one-to-one chats)
  - created_by, created_at, last_message_at
- **`chat_members`:**
  - conversation_id, user_id
  - role (`owner` / `member`), status (`pending` / `active`)
  - last_read_at, joined_at
- **`chat_messages`:**
  - id (a client-generated uuid, so the message can show instantly before the server confirms), conversation_id, author_id
  - author_name and author_image snapshot
  - kind (`text` / `lesson`), body (≤ 2000)
  - lesson snapshot (jsonb: id, slug, title, course title, "Lesson 3.2" label, thumbnail, duration, seconds)
  - reply_to, created_at, deleted_at
- **`chat_reactions`:** message_id, user_id, emoji (an allow-list of 6), created_at.
- **`chat_blocks`:** blocker_id, blocked_id.
- **`chat_reports`:** message_id, reporter_id, reason, created_at.
- **Lesson cards:** validated on the server at send time. The lesson must exist and be visible (editorial, or an approved teacher course), and the seconds must be within its duration. Only server-built fields are stored.

### Live queries (sealed per user, renewed every ~50 seconds through `POST /api/chat/live`)
1. **Inbox:**
   - your conversations: title, or the other person's name and avatar
   - last message preview and time
   - unread count (messages after your `last_read_at`, not your own)
   - your status (pending or active)
   - The navbar badge sums the unread counts.
2. **Conversation:** the newest 100 messages of one conversation you're an active member of, with the reaction counts and your own reactions aggregated into each row.

### Writes (server routes, signed in, same-origin, strict Zod, rate limited 10/min and 200/hour)
- `POST /api/chat/conversations`: start a one-to-one (creates a request) or a group.
- `POST /api/chat/conversations/[id]/messages`: send a text or lesson message. Returns the `txid`.
- `POST /api/chat/conversations/[id]`: accept, decline, leave, rename, add or remove a member, or mark as read.
- `POST /api/chat/messages/[id]`: react or unreact, delete your own message, report.
- `POST /api/chat/blocks`: block or unblock.
- `GET /api/chat/people?q=`: name search (excludes you and anyone blocked either way).
- Every write checks membership and status in SQL. The acting user always comes from the Clerk session.

### UI (slide-out panel; adapted components)
- **Navbar Messages button:**
  - chat icon next to the bell, signed-in only
  - unread badge using **React Bits Counter** (rolling digits)
  - opens the panel
- **Panel:**
  - slides in from the right with a Motion spring over a dimmed, blurred backdrop
  - 420px wide on desktop, full screen on mobile
  - Esc, the backdrop or ✕ closes it
  - focus is trapped while open and returns to the button
  - the open conversation is remembered while you browse the site
- **Inbox:**
  - **Aceternity Animated Tabs:** Chats / Requests (with a count)
  - rows enter with **React Bits Animated List**: avatar, name, preview, time, unread dot
  - **New chat** opens an **Aceternity Animated Modal** with people search and a "New group" tab
- **Conversation:**
  - **header:** back, name; for groups, member avatars with **Aceternity Animated Tooltip** and a members menu
  - **messages:**
    - bubbles: yours in brand purple, others neutral
    - new ones animate in with Animated List
    - grouped by author and day
  - **lesson cards:** thumbnail, course, "Lesson 3.2 · Title", and a **▶ Watch from 3:12** pill
  - **times typed in a message** (like `4:05`) become chips when the conversation's latest lesson card is for the lesson you're watching
  - **reactions:** hover a message for 6 quick reactions, with counts shown as small pills
  - **composer:** **Aceternity Placeholders and Vanish Input**, with rotating hints ("Share the moment that clicked…", "Say hi 👋"). The text vanishes into particles on send. It sits next to an emoji button that opens the **Frimousse** emoji picker (headless and small, styled with our tokens).
  - **"Share this moment" button:** shown when you're on a lesson. It attaches the current lesson at the player's current second, which the player reports through a new `roam:current-time` event, the same pattern as `roam:seek`.
- **Lesson page:** a **Share** button next to Bookmark opens the panel's share sheet. You pick a conversation and the lesson card is sent with the current second.
- **Requests:** sender name and first message, with Accept / Decline / Block.
- **Animation rules:** all Motion components use `LazyMotion` + `m` (strict), matching `hover-border-gradient.tsx`. `prefers-reduced-motion` turns the slides into fades and turns off the vanish particles.

### Moderation
- **Report:** users can report a message.
- **Admin console:** a new **Chat reports** tab shows only reported messages, each with up to 5 messages of context, and the reason. Admins can delete the message or ban the author through the existing user actions. Opening a report is audit-logged ("viewed chat report").
- **Privacy:** admins have no way to browse other private chats.

### Out of scope (phase 2)
- typing indicators and online presence
- replies UI (the column exists)
- @mentions, GIFs, image uploads
- push or email notifications
- course rooms

## Files
- **New:**
  - `lib/chat/` (schema helpers, queries, live queries, write functions, lesson snapshot)
  - `lib/realtime.ts` (server `createRealtime`)
  - `app/api/chat/**`
  - `components/chat/` (provider, panel, inbox, conversation, message, lesson-card, composer, emoji picker, new-chat modal, share sheet, messages button)
  - `components/ui/animated-tabs.tsx`, `animated-list.tsx`, `counter.tsx`, `vanish-input.tsx`, `animated-tooltip.tsx`, `animated-modal.tsx` (library ports)
  - `app/admin/chat/page.tsx`
  - migration `drizzle/0005_*`
- **Changed:**
  - `lib/db/schema.ts`
  - `components/site-header.tsx` (Messages button)
  - `app/layout.tsx` (chat provider, signed-in only)
  - `components/video-player.tsx` (answers `roam:current-time`)
  - the lesson page (Share button)
  - `components/comments/discussion.tsx` (Message on avatar)
  - `components/admin/admin-shell.tsx` (Chat reports tab)
  - `components/ui/icon.tsx` (a chat-bubble icon if needed; asking you for a duotone one if none fits)
  - `.env.example`
  - `package.json`

## Security
- **Secret:** `NEON_REALTIME_SECRET` is server only. The browser gets a sealed query that expires in 60 seconds and is never stored or put in a URL.
- **Authorization inside every query:** each live query is limited to the session user's own memberships. Requests, blocks and removals take effect live.
- **Writes:** all writes go through server routes, with the user from the Clerk session, same-origin, strict Zod, rate limits, length caps, membership checks in SQL and an emoji allow-list.
- **Lesson cards:** built from server data only. Users can't send arbitrary links or titles as cards, and message text is rendered as plain text (no HTML or markdown).
- **Search:** people search returns only name and avatar.
- **Admins:** see only reported messages, and every view is logged.

## Acceptance
- **Requests:** with two accounts, A sends B a request. It appears live in B's Requests. B accepts. Their messages then arrive in each other's open panels within about a second, and the navbar badge counts unread messages.
- **Lesson sharing:** A shares a lesson at 3:12 from the lesson page. B clicks **Watch from 3:12** and the lesson opens at 3:12, or seeks if already open.
- **Reactions:** they show for both people live.
- **Blocking:** it hides each person from the other's search and stops messages.
- **Reports:** a reported message appears in Admin → Chat reports, and viewing it is audit-logged.
- **Signed out:** no Messages button, and every chat API returns 401.

## Checks
- tsc, lint and build.
- Migration applied.
- A live two-account test in headless Chrome against the dev server, with temporary accounts deleted afterwards.
- Screenshots of the panel in both themes, desktop and mobile.

## Manual test
1. Sign in as account A in one browser and B in another (or a private window).
2. A: Messages → New chat → search for B → send "hi 👋". B: the badge shows 1, and Requests shows A → Accept.
3. A: open any lesson, play to 3:12, click Share → pick B. B: the card shows **Watch from 3:12**; click it and the lesson opens at 3:12.
4. React to a message from both sides; the counts update live.
5. Report a message as B; as an admin, open `/admin/chat`.
