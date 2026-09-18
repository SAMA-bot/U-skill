# U-Skill (FacultyUp)

> A role-based faculty capacity-building and performance management
> platform for higher-education institutions.

U-Skill is a web application designed to help faculty members build
skills, complete structured learning paths, track performance, manage
professional documents, and receive personalized insights. It also
provides department-level and institution-level dashboards for Heads of
Department (HoD) and administrators.

The application combines a React/TypeScript frontend with Supabase
authentication, database, storage, realtime capabilities, and Edge
Functions. AI-powered features are exposed through secured Supabase Edge
Functions.

------------------------------------------------------------------------

## ✨ Key Features

### Faculty Workspace

-   Personal faculty dashboard with performance and capacity metrics
-   Capacity/skill tracking and growth visualization
-   Performance assessment and performance reports
-   Learning tracks, courses, modules, and lessons
-   Course enrollment, progress, completion, XP, levels, badges, and
    learning streaks
-   Achievement and motivation features
-   Personalized recommendations
-   Activity logging and progress tracking
-   Faculty feedback and performance history
-   Calendar and notifications
-   Document upload for certificates, publications, and other
    verification material
-   Profile and account settings

### Learning & Capacity Building

-   Learning tracks organized around training categories
-   Published learning paths containing chapters/modules and lessons
-   Course enrollment and progress management
-   Lesson completion and XP rewards
-   Difficulty, duration, target audience, and course metadata
-   Admin-managed learning paths and training programs
-   AI-generated learning paths

### HoD Dashboard

-   Department performance overview
-   Faculty performance review
-   Training participation metrics
-   Feedback analytics
-   Training and completion tracking
-   Department-level document approvals
-   Learning-path oversight
-   Performance reports and faculty comparison

### Administrator Dashboard

-   Institution-wide performance overview
-   Faculty and department management
-   Role management and access controls
-   Learning path and course management
-   Document review and approvals
-   Performance reports
-   Achievement management
-   Feedback analytics
-   Department performance analysis
-   Performance heatmaps
-   Predictive analytics
-   Audit logs
-   Data export and administrative action tools

### AI-Powered Capabilities

The project includes multiple AI-backed workflows implemented as
Supabase Edge Functions:

-   **AI Insights:** analyzes recent faculty activities, performance
    metrics, course enrollments, feedback, motivation scores, and
    profile information to generate structured insights.
-   **AI Report Insights:** generates report-level insights and
    recommended training paths based on reported performance data.
-   **AI Learning Path Generation:** creates structured learning paths
    containing lessons and practical teaching notes.
-   **Predictive Analytics:** analyzes institutional performance,
    training, activity, feedback, and skill data to produce structured
    predictions, risk factors, training needs, and an overall outlook.

AI responses include fallback handling for unavailable services, rate
limits, exhausted AI credits, and malformed responses.

------------------------------------------------------------------------

## 🛠️ Tech Stack

### Frontend

-   React 18
-   TypeScript
-   Vite
-   React Router
-   Tailwind CSS
-   shadcn/ui and Radix UI
-   Framer Motion
-   Recharts
-   React Hook Form
-   Zod
-   TanStack React Query
-   Lucide React

### Backend & Data

-   Supabase
    -   Authentication
    -   PostgreSQL database
    -   Storage
    -   Realtime/data access
    -   Edge Functions
-   Supabase JavaScript client

### AI

-   Supabase Edge Functions
-   Lovable AI Gateway
-   OpenAI-compatible AI endpoints
-   Structured AI responses for insights, reports, learning paths, and
    predictive analytics

### Tooling

-   ESLint
-   TypeScript
-   Vitest
-   Testing Library
-   PostCSS
-   Tailwind CSS

------------------------------------------------------------------------

## 🏗️ Architecture

``` text
┌─────────────────────────────────────────────┐
│                 React Client                │
│                                             │
│  Landing Page                               │
│  Authentication                             │
│  Faculty Dashboard                          │
│  HoD Dashboard                              │
│  Admin Dashboard                            │
│  Learning Paths / Courses / Lessons         │
│  Reports / Analytics / Documents            │
└──────────────────────┬──────────────────────┘
                       │
                       │ Supabase JS Client
                       ▼
┌─────────────────────────────────────────────┐
│                  Supabase                   │
│                                             │
│  Auth        PostgreSQL       Storage       │
│  Roles       Faculty Data     Avatars       │
│  RLS         Learning Data    Documents     │
│  Realtime    Analytics Data                 │
└──────────────────────┬──────────────────────┘
                       │
                       │ Edge Functions
                       ▼
┌─────────────────────────────────────────────┐
│              Server-side Workflows          │
│                                             │
│  AI Insights                                │
│  AI Report Insights                         │
│  AI Learning Path Generation                │
│  Predictive Analytics                       │
│  Course Actions                             │
│  User / Role Management                     │
│  Avatar Upload                              │
│  Signup Telemetry                           │
└─────────────────────────────────────────────┘
```

------------------------------------------------------------------------

## 👥 Application Roles

The application contains role-aware routing and dashboards for:

  -----------------------------------------------------------------------
  Role                                Main Responsibility
  ----------------------------------- -----------------------------------
  **Faculty**                         Learning, performance tracking,
                                      achievements, documents,
                                      activities, and personal insights

  **HoD**                             Department-level oversight,
                                      reviews, approvals, training
                                      participation, and feedback

  **Admin**                           Institution-level management,
                                      users, roles, learning programs,
                                      reports, analytics, and auditing
  -----------------------------------------------------------------------

Protected routes are implemented through the application's
`ProtectedRoute` component and role checks.

------------------------------------------------------------------------

## 📁 Project Structure

``` text
U-skill-main/
├── public/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── faculty/
│   │   ├── hod/
│   │   ├── layout/
│   │   ├── search/
│   │   └── ui/
│   ├── contexts/
│   ├── hooks/
│   ├── integrations/
│   │   └── supabase/
│   ├── lib/
│   ├── pages/
│   │   ├── auth/
│   │   └── dashboard/
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   ├── ai-insights/
│   │   ├── ai-report-insights/
│   │   ├── course-actions/
│   │   ├── create-user/
│   │   ├── delete-user/
│   │   ├── generate-learning-path/
│   │   ├── predictive-analytics/
│   │   ├── signup-telemetry/
│   │   ├── update-user-role/
│   │   └── upload-avatar/
│   ├── migrations/
│   └── config.toml
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

------------------------------------------------------------------------

## 🚀 Getting Started

### Prerequisites

Install the following before running the project:

-   Node.js
-   npm
-   A Supabase project
-   Supabase CLI if you want to manage migrations/functions locally

The repository also contains Bun lockfiles, so Bun can be used if
preferred.

### 1. Clone the repository

``` bash
git clone <your-repository-url>
cd U-skill-main
```

### 2. Install dependencies

Using npm:

``` bash
npm install
```

Or using Bun:

``` bash
bun install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

``` env
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

Do not commit secret keys or production credentials to source control.

The frontend Supabase client reads these values through Vite's
`import.meta.env`.

### 4. Set up the database

The repository includes Supabase migrations under:

``` text
supabase/migrations/
```

If using a linked Supabase project, apply the migrations through the
Supabase CLI according to your deployment workflow.

### 5. Configure Edge Function secrets

The AI-related Edge Functions require server-side configuration such as
the AI gateway key and Supabase service credentials.

Keep server-side secrets in Supabase's secret management system rather
than exposing them through `VITE_*` frontend variables.

### 6. Start the development server

``` bash
npm run dev
```

The Vite development server will print the local URL in the terminal.

------------------------------------------------------------------------

## 📜 Available Scripts

  Command               Purpose
  --------------------- --------------------------------------
  `npm run dev`         Start the Vite development server
  `npm run build`       Create a production build
  `npm run build:dev`   Create a development-mode build
  `npm run lint`        Run ESLint
  `npm run preview`     Preview the production build locally

------------------------------------------------------------------------

## 🔐 Authentication & Security

Authentication is handled through Supabase Auth.

The application includes:

-   Login and signup flows
-   Email verification
-   Password reset flow
-   Strong password validation
-   Protected routes
-   Role-based access control
-   Session persistence and token refresh
-   Server-side authentication checks in Edge Functions
-   Supabase database access controls
-   Protected administrative operations
-   Audit logging
-   Upload validation for avatar handling
-   Rate limiting for course actions
-   Signup telemetry for diagnosing registration failures

Edge Functions validate authenticated user claims before performing
privileged operations.

------------------------------------------------------------------------

## 🔄 Course & Learning Flow

A typical faculty learning workflow is:

``` text
Learning Track
      │
      ▼
Learning Path
      │
      ▼
Modules / Chapters
      │
      ▼
Lessons
      │
      ▼
Start Lesson
      │
      ▼
Complete Lesson
      │
      ▼
XP / Progress / Achievements
```

For course-based training, the application also supports enrollment,
starting, progress updates, and completion through the `course-actions`
Edge Function.

------------------------------------------------------------------------

## 🤖 AI Workflow

AI functionality is kept behind Supabase Edge Functions rather than
placing AI credentials in the browser.

A simplified flow is:

``` text
Authenticated User
        │
        ▼
React Dashboard
        │
        ▼
Supabase Edge Function
        │
        ├── Validate user/session
        ├── Read relevant application data
        ├── Build structured prompt
        │
        ▼
AI Gateway
        │
        ▼
Structured AI Response
        │
        ▼
Dashboard / Report / Learning Path
```

This design keeps sensitive service credentials out of the frontend and
allows the application to validate access before AI workflows are
executed.

------------------------------------------------------------------------

## 📊 Data & Analytics

The application works with data such as:

-   Faculty profiles
-   Departments and roles
-   Capacity skills
-   Performance metrics
-   Activities
-   Course enrollments
-   Learning paths and lessons
-   Faculty feedback
-   Motivation scores
-   Achievements
-   Documents
-   Notifications
-   Audit logs

Administrative and HoD dashboards aggregate these records to display
department and institution-level metrics.

------------------------------------------------------------------------

## 🧪 Testing & Quality

The project includes testing dependencies for:

-   Vitest
-   Testing Library
-   JSDOM

There is also a signup test under:

``` text
src/pages/auth/Signup.test.tsx
```

Run linting with:

``` bash
npm run lint
```

Run a production build with:

``` bash
npm run build
```

------------------------------------------------------------------------

## 🌐 Routing

Important application routes include:

  Route                         Purpose
  ----------------------------- -------------------------
  `/`                           Public landing page
  `/auth/login`                 Login
  `/auth/signup`                Account registration
  `/auth/forgot-password`       Password recovery
  `/auth/verify-email`          Email verification
  `/select-role`                Role selection
  `/dashboard`                  Faculty dashboard
  `/dashboard/settings`         Profile settings
  `/admin`                      Administrator dashboard
  `/hod`                        HoD dashboard
  `/learning-track/:trackKey`   Learning track
  `/courses/:courseId`          Course details
  `/learning-paths/:pathId`     Learning path details

------------------------------------------------------------------------

## 📱 UX & Accessibility

The frontend includes:

-   Responsive dashboard layouts
-   Light/dark theme support
-   Animated page transitions
-   Loading skeletons
-   Error boundaries
-   Offline status indication
-   Accessible sidebar behavior
-   Keyboard-friendly UI components
-   Toast notifications
-   Empty-state guidance
-   Onboarding tour
-   Global command/search interface

Route-level code splitting is used so dashboard and authentication pages
can be loaded separately instead of shipping the entire application in
the initial bundle.

------------------------------------------------------------------------

## ⚠️ Configuration Notes

The uploaded project contains an existing `.env` file with project
configuration. When publishing this project to GitHub or another public
repository:

1.  Do not expose private credentials.
2.  Replace real environment values with placeholders.
3.  Use a `.env.example` file for documented configuration.
4.  Store Supabase service-role and AI credentials only on the
    server/Edge Function side.
5.  Review Supabase policies and Edge Function permissions before
    deploying to production.

------------------------------------------------------------------------

## 🔮 Future Scope

Potential areas for further development include:

-   Additional learning content and institutional integrations
-   More advanced faculty competency models
-   Expanded analytics and reporting
-   Deeper predictive modeling
-   Additional AI-assisted recommendations
-   More configurable institutional workflows
-   Integration with external academic/LMS systems
-   Expanded notification and collaboration features

------------------------------------------------------------------------

## 👨‍💻 Project

**U-Skill / FacultyUp**\
Faculty Capacity Building & Performance Management Platform

Built with React, TypeScript, Vite, Supabase, Tailwind CSS, and
AI-powered Edge Functions.

------------------------------------------------------------------------

## 📄 License

No explicit license file was identified in the provided project archive.
Add a license appropriate to your intended distribution before
publishing the repository publicly.
