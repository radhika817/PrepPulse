# PrepPulse: System Design

This document describes the architecture, data model, API and core logic for the PrepPulse MVP. Items marked *later* are planned but not part of the first release.

---

## 1. Goals and scope

**MVP goals**
- Let a student practise questions, see the answer, and rate their own recall.
- Serve a daily set of five questions and track streaks.
- Show progress and weak topics, and bring missed questions back for revision.

**Out of scope for the MVP:** company pages, AI generation, mock interviews, code execution, leaderboards.

**Assumptions**
- Single region, a few hundred to a few thousand users at most.
- Question bank of roughly 300 to 2,000 questions, loaded from JSON files.
- Users are mostly in India; default time zone is `Asia/Kolkata`.

---

## 2. High-level architecture

```text
┌──────────────────────┐
│   React + Vite SPA   │   Vercel
└──────────┬───────────┘
           │ HTTPS / REST (JSON)
           ▼
┌──────────────────────┐
│  Express API server  │   Render
│  ┌────────────────┐  │
│  │ Routes         │  │
│  │ Middleware     │  │  auth, Zod validation, rate limit, errors
│  │ Controllers    │  │
│  │ Services       │  │  dailyChallenge, streak, progress, revision
│  └────────────────┘  │
└───────┬──────────┬───┘
        │          │ (later)
        ▼          ▼
┌──────────────┐  ┌──────────────┐
│ MongoDB Atlas│  │  LLM API     │
└──────────────┘  └──────────────┘
```

**Layering on the server**
- **Routes:** map URLs to controllers.
- **Controllers:** parse the request, call services, shape the response.
- **Services:** business rules (streaks, daily set, accuracy). No Express objects here, so they are easy to unit test.
- **Models:** Mongoose schemas and indexes.

---

## 3. Data model (MVP)

Five collections. Source and review info are embedded in `questions`; separate collections are added only when needed.

### 3.1 `users`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | |
| `email` | String | unique, lowercase |
| `passwordHash` | String | bcrypt |
| `role` | `"student"` \| `"admin"` | default `student` |
| `timezone` | String | default `Asia/Kolkata` |
| `streak.current` | Number | |
| `streak.longest` | Number | |
| `streak.lastCompletedDate` | String | `YYYY-MM-DD` in the user's time zone |
| `createdAt`, `updatedAt` | Date | |

### 3.2 `questions`

| Field | Type | Notes |
|---|---|---|
| `category` | enum | DSA, DBMS, OS, CN, OOP, SQL, WEB, APTITUDE, HR |
| `topic` | String | e.g. Deadlock, Normalisation |
| `difficulty` | `easy` \| `medium` \| `hard` | |
| `type` | `mcq` \| `short` \| `coding_link` \| `hr` | |
| `question` | String | |
| `options` | String[] | only for `mcq` |
| `answer` | String | model answer; for MCQ the correct option |
| `explanation` | String | |
| `link` | String | only for `coding_link` |
| `tags` | String[] | |
| `sourceType` | `own` \| `ai_draft` \| `licensed` | |
| `sourceNote` | String | licence name or reference, if any |
| `reviewStatus` | `draft` \| `approved` \| `rejected` | only `approved` are served |
| `companyTags` | String[] | *later* |
| `createdAt`, `updatedAt` | Date | |

**Indexes:** `{ reviewStatus, category, topic, difficulty }`, text index on `question` and `tags` for search.

### 3.3 `attempts`

One row per time a user answers or reveals a question.

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | |
| `questionId` | ObjectId | |
| `mode` | `daily` \| `practice` \| `study` \| `revision` | |
| `challengeId` | ObjectId | set when `mode = daily` |
| `selectedOption` | String | MCQ only |
| `isCorrect` | Boolean | MCQ only, computed on the server |
| `selfRating` | `knew` \| `partly` \| `missed` | required for non-MCQ |
| `revealedFirst` | Boolean | answer was shown before the user attempted |
| `timeSpentSec` | Number | |
| `createdAt` | Date | |

**Indexes:** `{ userId, createdAt }`, `{ userId, questionId }`.

### 3.4 `userQuestionState`

Per-user state for each question: bookmark and revision schedule.

| Field | Type | Notes |
|---|---|---|
| `userId`, `questionId` | ObjectId | unique together |
| `bookmarked` | Boolean | |
| `lastRating` | `knew` \| `partly` \| `missed` | |
| `box` | Number | 0 to 3, revision stage |
| `nextReviewAt` | Date | null when the question is mastered |
| `timesSeen` | Number | |

### 3.5 `dailyChallenges`

Generated on demand the first time a user opens today's challenge.

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | |
| `date` | String | `YYYY-MM-DD` in the user's time zone |
| `questionIds` | ObjectId[] | exactly 5 |
| `completedQuestionIds` | ObjectId[] | |
| `completed` | Boolean | true when all 5 are done |

**Unique index:** `{ userId, date }`.

### 3.6 Added later
`companies`, `achievements` / `userAchievements`, `questionSubmissions` (student-submitted questions), `mockInterviews`.

---

## 4. REST API (MVP)

Base path `/api/v1`. All routes except register and login require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Return JWT |
| GET | `/users/me` | Current profile and streak |
| PATCH | `/users/me` | Update name or time zone |
| GET | `/questions` | List with filters: `category`, `topic`, `difficulty`, `q`, `page` |
| GET | `/questions/:id` | One question **without** the answer |
| POST | `/questions/:id/reveal` | Return answer and explanation |
| POST | `/questions/:id/attempt` | Submit an answer or self-rating |
| POST | `/questions/:id/bookmark` | Toggle bookmark |
| GET | `/bookmarks` | Saved questions |
| GET | `/daily` | Today's five (creates if missing) |
| GET | `/revision` | Questions due for review |
| GET | `/progress/summary` | Totals, accuracy, streak |
| GET | `/progress/topics` | Per-topic accuracy and weak topics |
| GET | `/progress/activity` | Daily activity for the calendar |

**Admin (role `admin`)** *(Phase 12)*

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/questions` | Create question |
| PATCH | `/admin/questions/:id` | Edit or change review status |
| GET | `/admin/questions?reviewStatus=draft` | Review queue |

**Conventions:** JSON in and out; errors as `{ "error": { "code", "message" } }`; pagination as `page` and `limit`; all bodies validated with Zod.

---

## 5. Core flows and algorithms

### 5.1 Show answer and self-rating

The answer is never sent with the question. It is returned only by the reveal or attempt endpoint.

```text
GET  /questions/:id            -> question, options (no answer)
POST /questions/:id/reveal     -> answer, explanation; marks revealedFirst if no attempt yet
POST /questions/:id/attempt    -> { selectedOption | selfRating }
```

- **MCQ:** server compares `selectedOption` with `answer` and sets `isCorrect`.
- **Short, HR and coding-link:** user submits `selfRating` after reading the model answer.
- If the user revealed before attempting, `revealedFirst = true`. These attempts count toward activity but are excluded from accuracy, so stats are not inflated.
- A question counts as done in a daily challenge only after an attempt is saved.

### 5.2 Daily challenge generation

When `GET /daily` is called and no row exists for `(userId, today)`:

1. Compute `today` in the user's time zone.
2. Find the user's two weakest topics (section 5.4). New users with no data skip this step.
3. Pick 2 unseen approved questions from those topics.
4. Pick 3 more from the general pool: not already in the set, preferring questions the user has not seen, with a mix of categories and difficulty.
5. If the pool runs short, fill with least recently seen questions.
6. Save the five ids in `dailyChallenges` and return them.

Calling the endpoint again the same day returns the same five.

### 5.3 Streak calculation

Done on the server when an attempt completes the fifth question of today's challenge.

```text
today     = date in user's timezone
last      = user.streak.lastCompletedDate

if challenge not fully completed:   no change
else if last == today:              no change
else if last == yesterday(today):   current += 1
else:                               current = 1

longest = max(longest, current)
last    = today
```

Rules:
- A day counts only when all 5 questions are completed.
- The client never sends a streak value; it only submits attempts.
- A streak freeze is a possible later addition.
- A missed day is detected lazily: when the user opens the app and `last` is older than yesterday, `current` is displayed as 0 and reset on the next completion.

### 5.4 Weak topics

For each topic, over the user's attempts excluding `revealedFirst`:

```text
score per attempt:  MCQ correct = 1, wrong = 0
                    knew = 1, partly = 0.5, missed = 0
topic accuracy   = sum(score) / number of attempts
```

A topic is **weak** when it has at least 5 attempts and accuracy below 60%. Weak topics are ordered by lowest accuracy and feed the daily challenge and the dashboard. Computed with a MongoDB aggregation on `attempts` joined to `questions`.

### 5.5 Revision queue

Simple spaced repetition in `userQuestionState`:

| Rating | Effect |
|---|---|
| `missed` | `box = 0`, `nextReviewAt = now + 1 day` |
| `partly` | `box = max(box, 1)`, `nextReviewAt = now + 3 days` |
| `knew` | `box += 1`; next review after 1, 3, 7 days by box; after box 3, `nextReviewAt = null` |

`GET /revision` returns questions where `nextReviewAt <= now`, oldest first.

---

## 6. Frontend design

**Pages:** Landing, Login, Register, Dashboard, Daily Challenge, Question Bank, Question Practice, Revision, Bookmarks, Profile.

**Practice screen states:** `question` → (optional own answer) → `Show answer` → `answer visible` → `rate yourself` → `next`.

**State:** React Context for auth; server data fetched through small hooks around Axios. Add React Query later if caching becomes a pain.

**Charts (Recharts):** topic accuracy bars, weekly activity, streak calendar.

---

## 7. Security

- Passwords: bcrypt with a cost factor of 10 or higher.
- JWT in an `Authorization` header; short expiry (7 days for MVP). Consider refresh tokens or httpOnly cookies later.
- Zod validation on every body and query; reject unknown fields.
- Rate limiting: strict on `/auth/*`, moderate on the rest.
- Helmet, CORS restricted to `CLIENT_URL`.
- Mongo injection: validate types and never pass raw request objects into queries.
- Admin routes protected by a role check middleware.
- Secrets only in environment variables.
- Answers never included in list or detail responses.

---

## 8. Testing and quality

- **Unit tests:** streak logic, daily challenge selection, weak topic scoring, revision scheduling. These matter most.
- **API tests:** Supertest for auth, attempts and daily challenge using an in-memory MongoDB.
- **CI:** GitHub Actions running lint and tests on every push.
- **Seed validation:** the seed script validates every question with the same Zod schema and rejects duplicates by normalised question text.

---

## 9. Deployment

| Part | Host | Notes |
|---|---|---|
| Frontend | Vercel | `VITE_API_URL` points to the backend |
| Backend | Render | Free tier sleeps; expect a slow first request |
| Database | MongoDB Atlas | Free cluster is enough for the MVP |

Environments: `development` (local) and `production`. Seed data is loaded with `npm run seed`, which is safe to re-run (upserts by a content hash).

---

## 10. Scaling and later extensions

- **Admin and question review:** admin routes and a draft/approve screen, then AI-drafted questions inserted as `draft`.
- **Company pages:** add `companies`, link through `companyTags`, show source notes and disclaimers.
- **AI features:** call the LLM only from the backend, rate-limit per user, store prompts and results for debugging.
- **Mock interviews:** a `mockInterviews` collection holding a transcript, scores and feedback.
- **Performance:** add Redis for caching progress summaries only if the dashboard becomes slow.

---

## 11. Open decisions

- Does the daily challenge allow a streak freeze or grace day?
- Should self-rated "knew it" on non-MCQ questions count the same as a correct MCQ?
- Email verification: in the MVP or right after it?
- Which licence will the project use before it goes public?
