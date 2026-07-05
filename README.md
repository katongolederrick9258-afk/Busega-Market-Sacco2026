# Busega Market Leaders & Vendors SACCO

A production-ready SACCO management platform for Busega Market — three secured interfaces
(Admin, Mobiliser, Member), real-time balance updates and notifications, loan approvals,
transaction analytics, and a bilingual member experience (English, Luganda, Kiswahili).

**Stack:** Node.js + Express (API) · MySQL (data) · Socket.io (real-time) · HTML/CSS/JavaScript (frontend, no framework) · Chart.js (graphs)

---

## 1. Project structure

```
busega-sacco/
├── backend/
│   ├── server.js              # Express + Socket.io entry point
│   ├── config/
│   │   ├── db.js              # MySQL connection pool
│   │   └── schema.sql         # Full database schema
│   ├── middleware/auth.js     # JWT auth + role guard
│   ├── routes/                # auth, members, mobiliser, admin, notifications
│   ├── sockets/index.js       # Real-time connection + room handling
│   ├── utils/seed.js          # Seeds Admin, Mobiliser, and starter members
│   ├── utils/notify.js        # Notification creation + emit helper
│   ├── uploads/                # Member profile pictures (created at runtime)
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html              # Redirects to sign-in
│   ├── pages/
│   │   ├── login.html
│   │   ├── member.html
│   │   ├── mobiliser.html
│   │   └── admin.html
│   ├── css/                    # variables, login, dashboard, member
│   ├── js/                     # config, login, member, mobiliser, admin, sockets, i18n, notifications
│   └── assets/                 # login-bg.jpg, member-bg.jpg, contact-bg.jpg
├── render.yaml                  # Render Blueprint (optional one-click deploy)
└── README.md
```

---

## 2. What's included (mapped to your requirements)

- **Three separated, access-controlled interfaces** — Member, Mobiliser, Admin — each with its
  own login flow and JWT role check (`middleware/auth.js`). Members can never modify balances;
  only Admin and Mobiliser can (`routes/mobiliser.js`, `routes/admin.js`).
- **Sign-in** — single page, tabbed by role, Image 1 as the fancy left-panel background,
  password visibility toggle, no default passwords ever shown on screen.
- **Member interface** — hamburger menu (Dashboard, Transactions by period, Growth Graph, Pending
  Loans, History, Comments), password change with visibility toggle, profile picture upload
  (menu-only), language switch (English/Luganda/Kiswahili), light/dark switch, rotating comment
  rail before the Get In Touch section, comment posting from the menu, transaction categories
  (Loans/Deposits/Withdrawals/Shares), rise-and-fall growth graph (Chart.js, prompted from menu),
  Get In Touch section with Image 2 background, real social icons, and office hours.
- **Mobiliser interface** — add/remove members (auto-incrementing `M-0001` IDs, ascending order),
  balance adjustment tools that notify the member instantly by socket + sound, daily transactions
  by category, editable profile, and the only role that can change Admin/Mobiliser login IDs.
- **Admin interface** — daily/weekly/monthly/annual overview, loan approval/disapproval system
  with automatic notification and (on approval) automatic disbursement into the member's balance,
  members list, editable profile.
- **Real-time layer** — Socket.io rooms per user ID; balance changes, loan decisions, and new
  comments push instantly with distinct notification tones generated via the Web Audio API
  (no external audio files required).
- **Security** — bcrypt password hashing, JWT auth, rate-limited login endpoint, Helmet HTTP
  headers, role-based middleware on every sensitive route.

> **Honest scope note:** this is a fully wired, working full-stack system you can run and deploy
> today. Treat it as v1.0 of a serious SACCO platform rather than a finished, audited banking
> product — before real money moves through it, add automated tests, a second reviewer, and a
> proper security audit (see Section 6).

---

## 3. Default credentials (change immediately after first login)

| Role | ID | Password |
|---|---|---|
| Admin (SSEMANDA MIKE) | `ADMIN` | `admin123` |
| Mobiliser (KATONGOLE DERRICK) | `MOB-9258-2026` | `#Walt9258$` |
| Any member | `M-0001`, `M-0002`, … | `member123` |

These are only used the first time `npm run seed` is executed — they are hashed before storage
and are never displayed on the sign-in screen.

---

## 4. Running locally

**Prerequisites:** Node.js 18+, a MySQL 8 server (local or cloud).

```bash
# 1. Clone/unzip the project, then:
cd backend
cp .env.example .env        # fill in your real MySQL credentials + a strong JWT_SECRET
npm install

# 2. Create the database schema
mysql -u <user> -p < config/schema.sql

# 3. Seed the Admin, Mobiliser, and starter members
npm run seed

# 4. Start the server (serves both the API and the frontend)
npm start
```

Visit **http://localhost:5000** — you'll land on the sign-in page.

---

## 5. Deploying to Render (step-by-step)

### Option A — Blueprint (fastest)
1. Push this whole folder to a GitHub repository.
2. In Render, click **New → Blueprint**, point it at your repo. Render reads `render.yaml`
   and creates the web service automatically.
3. Render will ask you to fill in the `sync: false` variables: `DB_HOST`, `DB_USER`,
   `DB_PASSWORD`, `ADMIN_DEFAULT_PASSWORD`, `MOBILISER_DEFAULT_PASSWORD`. Provide your MySQL
   host details (see Option B below for where to get a MySQL database).
4. Deploy. Render builds with `npm install` and starts with `npm start`, both run inside
   `backend/` as configured by `rootDir: backend`.

### Option B — Manual setup
1. **Get a MySQL database.** Render's own Postgres is free, but Render does **not** offer a
   managed free MySQL — use one of:
   - [Aiven](https://aiven.io) (free MySQL tier)
   - [Railway](https://railway.app) MySQL plugin
   - [PlanetScale](https://planetscale.com)
   - Any VPS with MySQL installed
   Note the host, port, username, password, and database name.
2. Run `config/schema.sql` against that database (e.g. via `mysql` CLI, TablePlus, or the
   provider's web console) to create all tables.
3. In Render: **New → Web Service** → connect your GitHub repo.
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Under **Environment**, add every variable from `.env.example` with your real values.
5. Deploy. Once live, open a Render **Shell** (or run locally against the same DB) and execute:
   ```bash
   npm run seed
   ```
   This creates the Admin, Mobiliser, and starter members exactly once.
6. Your app is live at `https://<your-service-name>.onrender.com`.

### Notes for production
- `CLIENT_ORIGIN` can stay `*` since the frontend is served from the same Render service; if you
  ever split the frontend to its own static host, set this to that host's exact URL for CORS.
- Render's free tier spins down on inactivity — the first request after idle may take ~30s to
  "wake" the server, and Socket.io will reconnect automatically once it's back.
- Uploaded profile pictures are stored on local disk (`backend/uploads`), which is **not
  persistent** on Render's free tier (it resets on redeploy/restart). For production, swap the
  `multer` disk storage in `routes/members.js` for a cloud storage bucket (S3, Cloudinary, etc.).

---

## 6. Recommended next steps before handling real member funds

- Add automated tests (unit + integration) for every money-moving endpoint.
- Add audit logging (who changed what, when) beyond the `transactions` table.
- Move profile-picture storage to persistent cloud storage.
- Add 2FA for Admin and Mobiliser accounts.
- Commission an independent security review, especially around the loan disbursement and
  balance-adjustment endpoints.

---

## 7. Support

For questions about this codebase, review the inline comments in each route file — every
endpoint is documented with its purpose directly above its handler.
