# PrepPulse 🎯
### Practice every day. Prepare with purpose.

PrepPulse is a full-stack interview preparation platform for engineering students preparing for internships, campus placements and off-campus jobs. It combines a daily five-question challenge, a searchable question bank, self-graded "Show answer" practice, streaks, and a progress dashboard that points you at your weak topics.

> **Status:** Planning and early development. Built as a learning and portfolio project, and used by its author for their own placement preparation.

---

## Why PrepPulse is different

Large sites already have big question banks. PrepPulse focuses on the daily habit and on fixing weak spots:

- **Show answer + self-rating** after every question, so open-ended theory questions work without auto-grading.
- **Adaptive daily five:** part of each day's set is picked from your weakest topics.
- **Spaced revision:** questions you miss come back after 1, 3 and 7 days.
- **Placement-focused content:** core CS subjects, aptitude and HR rounds for campus placements.

---

## Features

### MVP (building now)
- Email and password authentication (JWT), user profile with time zone (default IST)
- Question bank: DSA, DBMS, OS, CN, OOP, SQL, aptitude, HR
- Search and filter by category, topic and difficulty
- **Show answer** button on every question, followed by a self-rating (Knew it / Partly / Missed it)
- MCQ auto-grading in practice mode
- Daily challenge of five questions (3 general + 2 from weak topics)
- Daily streaks: current and longest streak, completion calendar
- Bookmarks
- Revision queue with simple spaced repetition
- Progress dashboard: attempts, topic accuracy, weak topics, activity

### Next
- Admin panel to add, edit and approve questions
- Streak milestone badges (3, 7, 14, 30, 100 days)
- Company-wise preparation pages with source tracking
- AI-drafted questions with an admin approve/reject screen
- Optional email reminders

### Future
- AI mock interviews (technical and HR) with follow-up questions
- AI feedback on written answers
- Voice-based mock interviews
- Coding execution with test cases
- College leaderboards and peer challenges
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
| AI (planned) | LLM API, called only from the backend |
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
│       ├── services/      # streak, daily challenge, progress logic
│       ├── middleware/    # auth, validation, rate limiting, errors
│       ├── validators/    # Zod schemas
│       └── seed/          # question JSON files + seed script
├── SYSTEM_DESIGN.md
└── README.md
```

---

## Getting started

> Setup steps will be finalised once the first version of the app runs.

Planned flow:

```bash
# 1. Clone
git clone <your-repo-url>
cd preppulse

# 2. Backend
cd server
npm install
cp .env.example .env      # add MONGO_URI and JWT_SECRET
npm run seed              # load questions from seed/*.json
npm run dev

# 3. Frontend (new terminal)
cd client
npm install
npm run dev
```

Environment variables (`server/.env`):

```text
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## Roadmap

- [ ] **Phase 1:** Finalise requirements, schema and question format
- [ ] **Phase 2:** Set up React frontend and Express backend
- [ ] **Phase 3:** Mongoose models, database connection, 15–20 test questions
- [ ] **Phase 4:** Authentication and user profiles
- [ ] **Phase 5:** Question list, search, filters, bookmarks
- [ ] **Phase 6:** Question practice screen with Show answer and self-rating
- [ ] **Phase 7:** Seed the first ~300 curated questions
- [ ] **Phase 8:** Daily five-question challenge
- [ ] **Phase 9:** Streak tracking
- [ ] **Phase 10:** Progress dashboard, weak topics, revision queue
- [ ] **Phase 11:** Tests, CI, deployment (**MVP complete**)
- [ ] **Phase 12:** Admin panel and achievements
- [ ] **Phase 13:** Company pages and AI-drafted questions
- [ ] **Phase 14:** AI answer feedback and mock interviews

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

## Contributing

Suggestions and feedback are welcome. Contribution guidelines will be added as development progresses.

## Licence

To be decided before public release. Third-party question content is used only under applicable permissions and licences.

---

**PrepPulse — Practice Every Day. Prepare with Purpose.**
