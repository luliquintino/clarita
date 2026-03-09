# CLARITA

**Longitudinal Mental Health Monitoring Platform**

CLARITA connects patients, psychologists, and psychiatrists through a unified system for tracking emotional states, symptoms, treatments, and life events over time.

---

## Architecture

| Component | Technology | Port |
|---|---|---|
| **Backend API** | Node.js + Express | 3001 |
| **Professional Dashboard** | Next.js + React + TypeScript | 3000 |
| **Patient Mobile App** | React Native (Expo) | — |
| **AI Insight Engine** | Python + Flask + scikit-learn | 5001 |
| **Database** | PostgreSQL 16 | 5432 |

## Quick Start with Docker

```bash
# Clone and start all services
cd Clarita
docker compose up --build
```

This starts:
- PostgreSQL with schema and seed data auto-loaded
- Backend API at http://localhost:3001
- Professional Dashboard at http://localhost:3000
- AI Engine at http://localhost:5001

## Manual Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 16+

### 1. Database

```bash
# Create database
createdb clarita

# Run schema and seed
psql clarita < backend/db/schema.sql
psql clarita < backend/db/seed.sql
```

### 2. Backend API

```bash
cd backend
cp .env.example .env   # Edit with your database credentials
npm install
npm run dev             # Starts on port 3001
```

### 3. Professional Dashboard

```bash
cd dashboard
npm install
npm run dev             # Starts on port 3000
```

### 4. AI Engine

```bash
cd ai-engine
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m src.main      # Starts on port 5001
```

### 5. Mobile App

```bash
cd mobile
npm install
npx expo start          # Scan QR code with Expo Go
```

## Project Structure

```
Clarita/
├── backend/              # Node.js + Express API
│   ├── db/               # SQL schema and seed data
│   └── src/
│       ├── config/       # Database connection
│       ├── middleware/    # Auth + RBAC
│       ├── routes/       # REST endpoints
│       ├── services/     # Business logic
│       └── validators/   # Input validation
├── dashboard/            # Next.js professional dashboard
│   └── src/
│       ├── app/          # Pages (login, patients, alerts)
│       ├── components/   # UI components
│       └── lib/          # API client
├── mobile/               # React Native patient app
│   └── src/
│       ├── screens/      # App screens
│       ├── components/   # Reusable components
│       ├── navigation/   # Tab + stack navigators
│       └── services/     # API + auth services
├── ai-engine/            # Python analysis service
│   └── src/
│       ├── feature_engineering.py
│       ├── pattern_detection.py
│       ├── anomaly_detection.py
│       ├── dsm_patterns.py
│       ├── insight_generation.py
│       └── alert_rules.py
└── docker-compose.yml
```

## Database Schema

17 tables covering users, profiles, care relationships, emotional logs, symptoms, medications, assessments, life events, clinical notes, AI insights, and alerts. All tables use UUID primary keys with proper foreign keys, indexes, and constraints.

## API Endpoints

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Patients | `GET /api/patients`, `GET /api/patients/:id/timeline` |
| Emotional Logs | `POST /api/emotional-logs`, `GET /api/emotional-logs/trends` |
| Symptoms | `GET /api/symptoms`, `POST /api/patient-symptoms` |
| Medications | `POST /api/patient-medications`, `POST /api/medication-logs` |
| Assessments | `GET /api/assessments`, `POST /api/assessment-results` |
| Life Events | `POST /api/life-events` |
| Clinical Notes | `POST /api/clinical-notes` |
| AI Insights | `GET /api/insights`, `GET /api/insights/:patientId` |
| Alerts | `GET /api/alerts`, `PUT /api/alerts/:id/acknowledge` |

## AI Engine

The AI service runs scheduled analysis every 6 hours:

- **Feature Engineering** - rolling averages, slopes, adherence rates
- **Pattern Detection** - correlations, trends, cyclical patterns
- **Anomaly Detection** - z-score, sudden changes, Isolation Forest
- **DSM-Inspired Patterns** - depressive episodes, anxiety patterns, rapid cycling
- **Alert Generation** - risk-based alerts with severity levels

The system flags patterns for professional review. It does **not** diagnose conditions.

## Clinical Assessments

Built-in scoring for:
- **PHQ-9** - Depression screening (0-27 scale, 5 severity levels)
- **GAD-7** - Anxiety screening (0-21 scale, 4 severity levels)

## User Roles

| Role | Capabilities |
|---|---|
| **Patient** | Daily check-ins, symptom tracking, medication logs, assessments, view insights |
| **Psychologist** | View patient data, timeline, notes, insights, alerts |
| **Psychiatrist** | All psychologist features + prescribe/adjust medications |

## Security

- JWT authentication with role-based access control
- Care relationship verification for cross-user data access
- Data permission system (patients control what professionals can see)
- Parameterized SQL queries (injection prevention)
- Helmet security headers
- Input validation on all endpoints

## License

Private - All rights reserved.
