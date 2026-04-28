# UP Board Multi-College Result Analyzer

Production-ready full-stack web application for analyzing UP Board Class 12 results across multiple colleges and multiple academic years using only user-provided data.

## Highlights

- Next.js App Router with React + TypeScript frontend and API routes
- PostgreSQL + Prisma schema for colleges, years, students, results, subject marks, import batches, and settings
- Excel/CSV upload preview with flexible column detection and duplicate roll number detection
- Smart paste parser for copied result text
- Dashboard analytics, year-over-year trends, weak subject analysis, and college comparison scoring
- Manual student entry with dynamic subjects
- Export to Excel, CSV, PDF, and printable summaries
- Configurable college performance score weightages and subject normalization map

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Recharts, TanStack Table
- Backend: Next.js API routes
- Database: PostgreSQL, Prisma ORM
- Forms and validation: React Hook Form, Zod
- File export/import: SheetJS (`xlsx`), jsPDF

## Folder Structure

```text
app/
  api/
  dashboard/
  reports/
  settings/
  students/
  upload/
components/
  charts/
  dashboard/
  forms/
  layout/
  reports/
  students/
  upload/
lib/
prisma/
public/
types/
```

## Setup

1. Install dependencies.

```bash
npm install
```

2. Copy the environment file and set your PostgreSQL connection string.

```bash
cp .env.example .env
```

3. Generate Prisma client and apply the schema.

```bash
npx prisma migrate dev --name init
```

4. Seed sample data.

```bash
npm run seed
```

5. Start the development server.

```bash
npm run dev
```

## Deploy Online

Recommended production setup:

- App hosting: Vercel
- Database: PostgreSQL on Neon, Supabase, Railway, or another managed provider
- ORM migrations: Prisma `migrate deploy`

### 1. Push the code to GitHub

Create a GitHub repository and push this project.

### 2. Create a production PostgreSQL database

Create a managed Postgres database and copy its connection string.

### 3. Add production environment variables

In your hosting platform, add:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/up_board_analyzer?schema=public"
```

### 4. Deploy the app

For Vercel:

1. Import the GitHub repository
2. Keep the default Next.js framework detection
3. Add the `DATABASE_URL` environment variable
4. Deploy

### 5. Run database migrations in production

After the first deploy, run:

```bash
npm run db:deploy
```

If you want starter production data, run:

```bash
npm run seed
```

### 6. Verify health

After deployment, open:

```text
/api/health
```

It should return JSON with `ok: true`.

## Basic Security Included

- Frame embedding blocked with `X-Frame-Options: DENY`
- MIME sniffing disabled with `X-Content-Type-Options: nosniff`
- Referrer policy enabled
- Camera, microphone, and geolocation permissions disabled by default

## Recommended Next Security Improvements

- Add admin authentication before public launch
- Add role-based access for staff
- Add audit logs for imports and deletes
- Add rate limiting for write APIs
- Add input size limits for upload/import routes
- Add backups for the production database
- Add monitoring and error reporting

## Main User Flow

1. Create a college from the Settings page.
2. Create one or more academic years for that college.
3. Upload Excel/CSV data or use the smart paste panel.
4. Review the preview and validation results.
5. Save the import batch.
6. Explore the dashboard, student directory, and reports.

## Notes

- The platform does not scrape UPMSP or bypass captcha protections.
- Bulk analysis works only from manually entered, pasted, or uploaded data supplied by the user.
- `public/sample-results.csv` is included as a starter import sample.

## Key Data Model

- `College`
- `AcademicYear`
- `Student`
- `Subject`
- `Result`
- `SubjectMarks`
- `ImportBatch`
- `AppSettings`

## Future Enhancements

- Authentication and role-based access
- Background jobs for heavy imports and PDF generation
- Audit trails and soft deletes
- S3-compatible file storage for import archives
