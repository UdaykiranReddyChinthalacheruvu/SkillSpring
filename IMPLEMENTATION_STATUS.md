# Implementation status

## Included

- Java 17+ local HTTP server and JDBC API.
- React dashboard source and production build.
- MySQL schema for candidates, an approved categorized skill catalog, candidate-skill links, jobs, and extracted job-skill links.
- Windows and Linux/macOS launch scripts.
- MySQL Connector/J driver.
- DBMS Tables view displays all rows and column types from the six project tables; clearing analysis history requires confirmation and removes only jobs and their extracted-skill links.
- Clickable dashboard summary cards with detail views for candidates, active skill usage, and recent job analyses.
- Added concise matching guidance to the green dashboard card and removed the analyzer header's extra sparkle button.

## Verified

- Java backend compiled successfully.
- React production build completed successfully.
- The updated dashboard bundle serves from the local Java server.
- Local API health endpoint connected to MySQL.
- Database tables endpoint returned all six tables and their row data; the browser view rendered the headers, types, and rows.
- Full dashboard returned HTTP 200.
- Browser check confirmed all three summary cards open the correct detail view, including the empty candidate and skill states and the recent job list.
- Browser check confirmed the matching card opens the matching explanation and the empty shortlist panel focuses the job description.
- Twenty API regression checks passed in an isolated test database, including rejecting a person's name and typos as skills, atomic rejection of mixed valid/invalid input, canonical casing, duplicate skills and emails, matching, word boundaries, and profile deletion.
- Browser workflow confirmed deleting a profile clears the old shortlist and resets the active skill count.
- Regression data was isolated and removed; existing job history was preserved.

## Matching scope

Candidate skills must match the approved `skill_catalog` (case-insensitive; stored using the catalog spelling). Skill extraction uses case-insensitive keyword matching against catalog skills linked to current candidate profiles. Stored historical skill rows are ignored if no active profile uses them. The server binds to `127.0.0.1`; this coursework project is not intended for public deployment.
