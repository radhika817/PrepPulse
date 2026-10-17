# PrepPulse 🎯
### Practice every day. Prepare with purpose.

[![CI](https://github.com/radhika817/PrepPulse/actions/workflows/ci.yml/badge.svg)](https://github.com/radhika817/PrepPulse/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-blue?style=flat&logo=vercel)](https://prep-pulse-hazel.vercel.app/)
[![API Status](https://img.shields.io/badge/API-Render-green?style=flat&logo=render)](https://preppulse-y925.onrender.com/api/v1/health)

PrepPulse is a full-stack interview preparation platform for engineering students preparing for internships, campus placements, and off-campus jobs. It combines a daily five-question challenge, a searchable question bank, self-graded "Show answer" practice, spaced repetition revision, AI feedback on typed answers, streaks, and a progress dashboard that points you at your weak topics.

> 🚀 **Live Demo:** [https://prep-pulse-hazel.vercel.app/](https://prep-pulse-hazel.vercel.app/)  
> ⚡ **Backend API Health:** [https://preppulse-y925.onrender.com/api/v1/health](https://preppulse-y925.onrender.com/api/v1/health)

---

## Why PrepPulse is different

Large sites already have big question banks. PrepPulse focuses on the daily habit and on fixing weak spots:

- **Show answer + self-rating** after every question, so open-ended theory questions work without auto-grading.
- **Adaptive daily five:** part of each day's set is picked from your weakest topics.
- **Spaced revision queue:** missed questions return in 10 minutes; mastered questions progress through Leitner intervals (1d, 3d, 7d).
- **AI Answer Feedback:** instant evaluation of typed answers for short theory, HR, and coding questions.
- **Placement-focused content:** core CS subjects, aptitude and HR rounds for campus placements.

---

## Features

### Core & Implemented Features
- **Live Cloud Deployment:** Frontend on Vercel, backend API on Render, remote database on MongoDB Atlas.
- **Authentication & Security:** JWT authentication, bcrypt password hashing, role-based access control.
- **Question Bank:** 198 curated questions across DSA, DBMS, OS, CN, OOP, SQL, Web/Cloud, Aptitude, and HR.
- **Search & Filters:** Real-time search, category/topic filters, difficulty levels, and company tags.
- **Show Answer & Self-Rating:** Reveal answers with one click and grade recall (`Knew it`, `Partly`, `Missed it`).
- **Revise Later:** Instantly add any question to your personalized revision queue.
- **AI Feedback:** On-demand AI critique of typed answers (short, HR, coding) with Groq LLM integration and rate-limiting.
- **Spaced Repetition System:** Due and Upcoming revision tabs with Leitner box scheduling and real-time badge updates.
- **Adaptive Daily Challenge:** 5 questions daily (3 general + 2 focused on your weakest topics).
- **Streaks & Activity Calendar:** Daily habit tracking with current/longest streak and interactive 7-day activity view.
- **Progress Dashboard:** Comprehensive stats on topic accuracy, weak spots, total attempts, and review progress.
- **Admin Panel:** Complete question management, CSV/JSON bulk import, and secure `make-admin` CLI utility.

### Future Enhancements
- AI mock interviews (technical and HR) with conversational follow-up questions
- Voice-based mock interviews
- Coding execution sandbox with custom test cases
- College leaderboards and peer challenge rooms
- Resume-based question generation

---

## Question bank strategy

Questions come from sources that are safe to use:

| Source | Use |
|---|---|
| Original questions written from study notes and textbooks | Main source |
| AI-drafted questions reviewed by a human before approval | Scales the bank |
| Open-licensed datasets (licence recorded per question) | Optional supplement |
| Moderated student submissions | Later |

PrepPulse does **not** scrape or copy content from other platforms. For coding problems, only a title, topic, difficulty and a link to the original problem are stored.

AI-generated questions are never presented as verified company interview questions. Company tags are shown only with a source or a clear disclaimer.

Every question follows one format:

```json
{
  "category": "OS",
  "topic": "Deadlock",
  "difficulty": "easy",
  "type": "mcq",
  "question": "Which condition is NOT required for deadlock?",
  "options": ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"],
  "answer": "Preemption",
  "explanation": "Deadlock needs no preemption, so allowing preemption breaks one of the four conditions.",
  "sourceType": "own",
  "reviewStatus": "approved"
}
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, Tailwind CSS, React Router, Axios |
| Charts | Recharts |
| Backend | Node.js + Express.js |
| Validation | Zod |
| Database | MongoDB + Mongoose |
| Auth | JWT, bcrypt password hashing |
| Testing | Vitest / Jest, Supertest |
| AI | Groq LLM API (`openai/gpt-oss-120b`, server-only, rate-limited) |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for architecture, data models, API design and core algorithms.

---

## Project structure

```text
preppulse/
├── client/                # React frontend
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── services/      # Axios API calls
│       └── context/       # Auth state
├── server/                # Express backend
│   └── src/
│       ├── config/
│       ├── models/
│       ├── routes/
│       ├── controllers/
│       ├── services/      # streak, daily challenge, progress, AI logic
│       ├── middleware/    # auth, validation, rate limiting, errors
│       ├── validators/    # Zod schemas
│       └── seed/          # question JSON files + seed script
├── SYSTEM_DESIGN.md
└── README.md
```

---

## Getting started

Follow these steps to run PrepPulse locally:

```bash
# 1. Clone the repository
git clone https://github.com/radhika817/PrepPulse.git
cd PrepPulse

# 2. Setup and run Backend
cd server
npm install
cp .env.example .env

# Note: If MONGO_URI is left empty in .env for development, PrepPulse automatically
# boots an in-memory MongoDB database and auto-loads sample questions.
# To persist questions locally, set MONGO_URI and run: npm run seed
npm run dev

# 3. Setup and run Frontend (in a separate terminal)
cd ../client
npm install
cp .env.example .env
npm run dev
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`
- **Health Check:** `http://localhost:5000/api/v1/health`

For deploying to production (MongoDB Atlas, Render, Vercel), see the complete [DEPLOYMENT.md](./DEPLOYMENT.md) guide.

---

## Roadmap

- [x] **Phase 1:** Finalise requirements, schema and question format
- [x] **Phase 2:** Set up React frontend and Express backend
- [x] **Phase 3:** Mongoose models, database connection, 15–20 test questions
- [x] **Phase 4:** Authentication and user profiles
- [x] **Phase 5:** Question list, search, filters, bookmarks
- [x] **Phase 6:** Question practice screen with Show answer and self-rating
- [x] **Phase 7:** Seed curated questions (198 approved questions across 11 topics)
- [x] **Phase 8:** Daily five-question challenge
- [x] **Phase 9:** Streak tracking and activity calendar
- [x] **Phase 10:** Progress dashboard, weak topics, revision queue
- [x] **Phase 11:** Tests (114 passing), CI workflow, and deployment documentation
- [x] **Phase 12:** Admin panel, bulk CSV/JSON import, and `make-admin` utility
- [x] **Phase 13:** Spaced repetition revision intervals & live navbar badge sync
- [x] **Phase 14 (MVP):** AI feedback on typed answers with rate limiting
- [ ] **Phase 15:** Voice-based mock interviews & college leaderboards

---

## Security and quality

- Passwords hashed with bcrypt; JWT-protected API routes
- Server-side validation of all input with Zod
- Rate limiting on authentication routes
- Role-based access for admin and question management
- Streak and daily-challenge completion calculated on the server
- API keys kept in environment variables, never in the frontend
- Licence and source recorded for every reused question
---

**PrepPulse — Practice Every Day. Prepare with Purpose.**
