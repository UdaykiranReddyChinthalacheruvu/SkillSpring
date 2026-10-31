# SkillSpring — Job Skill Extraction & Candidate Matching

SkillSpring is a small, full-stack Java + React + MySQL course project. Enter candidate profiles, paste a job description, and review an explainable shortlist based on shared skills.

## What you can do

- Add candidate names and emails, then select skills from the approved catalog or enter their exact names.
- Reject typos and arbitrary words before saving a candidate; skill matching is case-insensitive and stores catalog spelling.
- Extract known skill names from a job description with case-insensitive keyword matching.
- Save job descriptions and detected skills to MySQL.
- Rank every candidate by matched skills and show the score and matching skill names.
- Search the candidate library and remove profiles.
- Open **DBMS Tables** to inspect every row in the six project tables: candidates, skills, skill catalog, jobs, and the two relationship tables.
- Use **Delete search history** in DBMS Tables to remove saved job analyses and their extracted-skill links after confirming; candidate profiles and the skill catalog stay in place.
- Click the three dashboard summary cards to inspect candidate profiles, active skill usage, or recent job analyses.
- Click the green matching card to see how scores are calculated; click the empty shortlist panel to jump to the job description input.
- Use the responsive dashboard on desktop or mobile.

SkillSpring is designed for a class project. Skill detection uses approved catalog terms currently assigned to candidate profiles; it does not use AI or infer synonyms. The score is transparent: `matched required skills ÷ extracted job skills × 100`.

## Project structure

```text
server/src/          Java HTTP API and JSON codec
frontend/src/        React dashboard and styling
schema.sql           MySQL schema with normalized many-to-many tables
lib/                 MySQL Connector/J driver
run_windows.bat      Windows setup/build/start command
run_linux_mac.sh     Linux/macOS setup/build/start command
```

## Requirements

- Java JDK 17 or newer
- Node.js 20 or newer with npm (only needed to rebuild the included frontend; internet is needed for the first package install)
- MySQL Server 8.0 or newer

The MySQL Connector/J driver is included in `lib`. If you remove the included production build, the run script uses Node/npm to rebuild it.

## First-time setup

1. Start MySQL Server.
2. Open `schema.sql` in MySQL Workbench and run it. This creates the `job_matcher` database and empty tables.
3. Copy `.env.example` to `.env` and update `DB_USER` and `DB_PASSWORD` for your MySQL account. The default is `root` with a blank password for a local development server only. Keep `.env` private and do not commit real credentials.
4. Start the app:
   - **Windows:** double-click `run_windows.bat`, or run it from Command Prompt.
   - **Linux/macOS:** run `chmod +x run_linux_mac.sh` once, then `./run_linux_mac.sh`.
5. Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Keep the terminal window open while using the app.

The app binds to loopback for local coursework use. It is not configured for public hosting.

## Using the app

1. Select **Add candidate**, enter a name and email, and choose skills from **Browse approved skills**. You may also type the exact catalog names, separated by commas (for example, `Java, SQL, DBMS`).
   - Names and typos are not skills: anything outside the approved catalog is rejected, and the candidate is not partially saved.
2. Add the candidate profiles you want to compare.
3. Paste a job title and description into **Analyze a job description**.
4. Review the detected skills and ranked candidates. The app shows matched skill names beside every score.

A job description needs to contain catalog skill names currently assigned to at least one candidate profile. To support another term, add it to `skill_catalog` in MySQL and then assign it to a candidate.

## Database design

- `candidates`: one row per candidate.
- `skill_catalog`: approved skills and their categories. This controls what can be assigned in a candidate profile.
- `skills`: unique skill dictionary used by candidate and job links.
- `candidate_skills`: candidate-to-skill many-to-many relationship.
- `jobs`: submitted job title and description.
- `job_skills`: extracted job-to-skill many-to-many relationship.

The junction tables use composite primary keys to prevent duplicate links. Foreign keys keep linked records consistent. The server creates and seeds the catalog on startup for an existing database; `schema.sql` also includes the catalog and its starter list for a fresh setup. To add an approved skill, insert it into `skill_catalog` with a category.

## Troubleshooting

- **Communications link failure:** start MySQL Server and check `DB_URL` in `.env`.
- **Access denied:** confirm `DB_USER` and `DB_PASSWORD` in `.env`.
- **Unknown database:** run `schema.sql` in MySQL Workbench.
- **Address already in use:** change `PORT` in `.env` (for example, `PORT=8001`) and open that port in your browser.
- **Frontend build error:** confirm Node.js/npm are installed and internet access is available for the first `npm install`.

## Coursework notes

This project demonstrates Java methods, HTTP/JSON communication, JDBC prepared statements, relational normalization, primary/foreign keys, joins, aggregation, and a React user interface. It is a local educational prototype; use a separately secured database account and perform a security review before any wider deployment.


