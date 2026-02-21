# CLAUDE.md

This file provides guidance for AI assistants working with the Prepity codebase.

## Project Overview

Prepity is an AI-powered multiple-choice question (MCQ) generator web application. Users select a category and topic, and the app generates practice questions using OpenAI (GPT-5.2) or Google Gemini (for PDF-based requests). Questions are stored in PostgreSQL and can be practiced with hints, explanations, and progress tracking.

## Tech Stack

- **Framework**: Next.js 16.1 (Pages Router, not App Router)
- **Language**: TypeScript 5.9 (strict mode)
- **Runtime**: React 19
- **Styling**: Tailwind CSS 4.1 with CSS variables (OKLCH color format)
- **UI Components**: shadcn/ui (New York style) + Radix UI primitives
- **Database**: PostgreSQL with Prisma ORM 7.2 (using `@prisma/adapter-pg` for connection pooling)
- **AI SDKs**: Vercel AI SDK (`ai` package) with `@ai-sdk/openai` and `@ai-sdk/google`
- **Forms**: React Hook Form + Zod validation
- **Package Manager**: pnpm 10.26.1
- **Icons**: Lucide React
- **Fonts**: Google Sans Flex (sans), Google Sans Code (mono)

## Commands

```bash
pnpm install          # Install dependencies (auto-runs prisma generate via postinstall)
pnpm dev              # Start dev server on port 3000 (uses Turbopack)
pnpm build            # Production build
pnpm start            # Start production server on port 3010
pnpm lint             # Run ESLint (next lint)
pnpm format           # Format all files with Prettier
pnpm prisma:generate  # Regenerate Prisma client
pnpm prisma:push      # Push schema changes to database (no migrations)
pnpm prisma:studio    # Open Prisma Studio GUI
```

## Project Structure

```
prepity/
├── pages/                    # Next.js Pages Router
│   ├── _app.tsx              # App wrapper (theme, context, analytics)
│   ├── _document.tsx         # HTML document (meta tags, OpenGraph)
│   ├── index.tsx             # Homepage with question generation form
│   ├── requests/[id].tsx     # Dynamic request detail/practice page
│   └── api/                  # API routes
│       ├── requests/         # Request CRUD + processing
│       │   ├── create.ts     # POST - Create new request
│       │   ├── read.ts       # GET - Read request by ID or slug
│       │   ├── list.ts       # GET - Paginated request listing
│       │   ├── delete.ts     # DELETE - Delete request by slug
│       │   ├── process.ts    # POST - Start background question generation
│       │   ├── retry.ts      # POST - Retry failed/stuck requests
│       │   └── star.ts       # PATCH - Toggle star on request
│       ├── questions/        # Question operations
│       │   ├── list.ts       # GET - List questions for a request
│       │   ├── submit-answer.ts  # POST - Submit answer for a question
│       │   ├── mark-answer.ts    # POST - (deprecated, use submit-answer)
│       │   ├── star.ts           # PATCH - Toggle star on question
│       │   └── mark-for-later.ts # PATCH - Mark question for later
│       └── upload.ts         # POST - Upload PDF via Google Gemini
├── components/
│   ├── atoms/                # Small reusable components (logo, theme-switcher)
│   ├── blocks/forms/         # Feature-level form components
│   ├── layout/               # Layout components (client-layout, sidebar)
│   └── ui/                   # shadcn/ui component library (60+ components)
├── lib/
│   ├── client/               # Client-side code
│   │   ├── constants.ts      # Category list, menu items
│   │   ├── requests.ts       # API helper functions
│   │   └── contexts/         # React Context providers
│   │       └── requests-context.tsx
│   ├── server/               # Server-side code
│   │   ├── prisma.ts         # Prisma singleton with pg adapter
│   │   └── helpers/
│   │       └── questions/
│   │           └── generate.ts   # Core question generation logic
│   ├── markdown/             # Custom markdown processing pipeline
│   │   ├── parseMarkdown.ts
│   │   ├── processBlockquotes.ts
│   │   ├── processInlineMarkdown.ts
│   │   ├── processTables.ts
│   │   └── processLists.ts
│   └── utils.ts              # cn() utility (clsx + tailwind-merge)
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── prisma.config.ts      # Prisma configuration
├── styles/
│   └── globals.css           # Global styles, Tailwind config, CSS variables
└── public/                   # Static assets (logos, favicons)
```

## Database Schema

Two models with a one-to-many relationship (Request -> Questions, cascade delete):

**Request**: Represents a question generation job. Key fields: `category`, `query`, `status` (PENDING/PROCESSING/PARTIALLY_CREATED/CREATED/FAILED), `difficulty` (EASY/MEDIUM/HARD), `initQuestionsCount`, `requestSlug` (unique UUID), `isStarred`, `title` (AI-generated), `fileUri`/`mimeType` (for PDF uploads).

**Question**: An individual MCQ. Key fields: `question`, `option1`-`option4`, `correctOption` (1-4), `explanation`, `hint`, `hint2`, `isAnswered`, `userAnswer`, `isStarred`, `isMarkedForLater`, `citation`.

The database uses `prisma db push` (not migrations) for schema changes.

## Architecture Patterns

### API Design
- RESTful API routes under `pages/api/`
- Input validation with Zod schemas
- Prisma for all database operations
- API helpers in `lib/client/requests.ts` for frontend consumption

### Question Generation Flow
1. User submits form -> `POST /api/requests/create` creates a Request (PENDING)
2. Client calls `POST /api/requests/process` which uses `waitUntil()` (Vercel Functions) for background processing
3. Generation splits into up to 5 concurrent chunks via `Promise.all`
4. Uses OpenAI GPT-5.2 by default; switches to Gemini when a PDF file is attached
5. Questions are streamed and saved to DB as they arrive
6. Client polls request status (75 attempts, 3-second interval) until CREATED or FAILED

### State Management
- `RequestsProvider` (React Context) manages the global requests list
- `localStorage` for scribble notes persistence (per request ID)
- `sessionStorage` for timer state

### Component Organization
- **atoms/**: Minimal, reusable components (logo, theme toggle)
- **blocks/**: Feature-level composite components (forms)
- **layout/**: Page structure (sidebar, main layout wrapper)
- **ui/**: shadcn/ui primitives (do not edit directly unless customizing)

## Path Aliases

Defined in `tsconfig.json`:
- `@/*` -> project root
- `@workspace/ui/components/*` -> `./components/ui/*`
- `@workspace/ui/lib/*` -> `./lib/*`
- `@workspace/ui/hooks/*` -> `./hooks/*`

## Code Style

### Prettier Configuration
- Semicolons: yes
- Single quotes: yes
- Tab width: 2 spaces
- Trailing commas: es5
- Print width: 80
- Arrow parens: always
- End of line: LF

### Conventions
- Use `pnpm` exclusively (never npm or yarn)
- Prisma config is at `prisma/prisma.config.ts` — all prisma CLI commands require `--config prisma/prisma.config.ts`
- Server-side code goes in `lib/server/`, client-side in `lib/client/`
- UI components use the `cn()` utility from `lib/utils.ts` for conditional class merging
- Toast notifications use Sonner (`sonner` package)
- Icons come from `lucide-react`
- Zod is used for both API validation and AI SDK structured output schemas

## Environment Variables

Required (see `.env.example`):
- `NEXT_PUBLIC_BASE_URL` — Application base URL (e.g., `http://localhost:3000`)
- `DATABASE_URL` — PostgreSQL connection string
- `OPENAI_API_KEY` — OpenAI API key for question generation
- `GEMINI_API_KEY` — Google Gemini API key for PDF-based generation

## Important Notes

- This project uses the **Pages Router** (not App Router). All routes are in `pages/`.
- React Server Components are **not used** (`rsc: false` in `components.json`).
- The Prisma client uses a **pg adapter** with connection pooling for PostgreSQL — not the default Prisma connection.
- There are no test files or test framework configured in this project.
- No CI/CD GitHub Actions workflows exist — only Dependabot for dependency updates.
- The `mark-answer.ts` API endpoint is deprecated in favor of `submit-answer.ts`.
