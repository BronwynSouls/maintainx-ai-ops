# MaintainX Foundation

Build the FIRST SPRINT of our continuous AI-powered Business Operations Platform called MaintainX Consulting Group.

IMPORTANT:

This is NOT a standalone prototype. It is the FOUNDATION of a single application that will be continuously expanded over Sprints 2, 3 and 4. Build Sprint 1 only, but structure the code, database and navigation so future features can be added without rebuilding the application.

CURRENT PRODUCT:

MaintainX is an AI-powered hotel maintenance operations platform.

TARGET USERS:

• Hotels

• Hotel maintenance companies

The platform will eventually support other industries such as apartments, property management and large businesses, so use scalable naming and database relationships where appropriate. However, the current UI and business flow must focus on HOTELS.

SPRINT 1 REQUIREMENTS:

• User Interface

• Login/Signup System

• Business Maintenance Request Form

• Supabase + PostgreSQL Database

• AI Ticket Classification

• Maintenance Request Categories

• GitHub-ready project structure

TECH STACK:

• React + TypeScript

• Supabase

• PostgreSQL

• Supabase Authentication

• Supabase Storage

• Modular AI service layer

DO NOT BUILD FUTURE SPRINT FEATURES YET.

Do not spend credits building advanced analytics, automated escalation, email automation, approvals, predictive maintenance or advanced scheduling. Only create the foundation/hooks needed for those features later.

--------------------------------------------------

BRAND & DESIGN

--------------------------------------------------

Brand:

MaintainX Consulting Group

Use the supplied MaintainX logo.

Font:

Inter

Colours:

Primary Blue: #668DB8

Dark Navy: #0C162C

Pastel Azure: #A4D8EF

Vivid Blue: #155AC1

Use a professional, trustworthy SaaS/maintenance-management appearance.

Support:

• Light mode

• Dark mode

• Theme toggle

Status colours:

• Critical = Red

• Low = Grey

• Resolved = Green

• In Progress = Purple

• New Ticket = White

• Pending = Mustard

• Scheduled = Grey-blue

• Assigned = Yellow

Do not rely on colour alone; always display the status text.

--------------------------------------------------

APPLICATION NAVIGATION

--------------------------------------------------

Create a navy sidebar using #0C162C.

Navigation:

Dashboard

Tickets

Technicians

Clients

Assets

AI

Schedule

Reports

Settings

These pages should exist as the permanent application structure because future sprints will expand them.

For Sprint 1, fully implement Dashboard, Tickets, authentication and maintenance request functionality.

Other pages can contain simple foundation/placeholder states rather than unfinished fake functionality.

--------------------------------------------------

AUTHENTICATION

--------------------------------------------------

Use Supabase Authentication.

Users who require accounts:

• Hotel Manager

• Receptionist

• Technician

Guests DO NOT require accounts.

Signup must include:

Full Name

Email

Password

Confirm Password

Role dropdown

Role dropdown options:

• Hotel Manager

• Receptionist

• Technician

The dropdown must have a visible arrow.

If Hotel Manager or Receptionist is selected:

→ select Hotel

If Technician is selected:

→ select Maintenance Company

Login must include:

• Email

• Password

• Show/hide password eye button

• Forgot password

• Sign in

• Create account

Implement role-based access/navigation.

--------------------------------------------------

GUEST QR MAINTENANCE REPORTING

--------------------------------------------------

Guests report maintenance problems without creating accounts.

A hotel room/location will have a QR code.

When scanned, the QR code opens a simple mobile-first MaintainX maintenance reporting page.

The QR page must explain:

1. Open your phone camera.

2. Point it at the QR code.

3. Tap the link.

4. Describe the maintenance problem.

5. Add a photo or voice input if needed.

6. Submit the request.

Also show:

"Don't have a smartphone? Please contact the hotel receptionist and they can report the issue for you."

The QR code should identify the relevant hotel/location/room where possible.

--------------------------------------------------

MAINTENANCE REQUEST FORM

--------------------------------------------------

Create a simple, professional ticket/request form.

Fields:

• Hotel

• Room/location

• Description

• Optional image

• Optional voice input

• Optional email for updates

Support three reporting methods:

TEXT

VOICE

IMAGE

Use English for Sprint 1, but structure the application so additional languages can be added later.

Image uploads should use Supabase Storage.

Voice input should use browser/API speech capabilities where available. If unavailable, text input must still work.

Guests can optionally enter an email to receive future maintenance updates.

--------------------------------------------------

TICKET CREATION

--------------------------------------------------

Every request becomes a maintenance ticket.

Generate a unique ticket number such as:

MX-2026-00001

Initial status:

New Ticket

Store the ticket in PostgreSQL.

Tickets must contain at least:

• Ticket ID

• Ticket number

• Hotel

• Location

• Reporter type

• Description

• Image URL

• Audio/transcription where available

• Category

• Priority

• Status

• Created date

• Updated date

--------------------------------------------------

AI TICKET CLASSIFICATION

--------------------------------------------------

This is the main AI feature for Sprint 1.

When a ticket is created, AI should classify the maintenance request.

Initial categories:

• Plumbing

• Electrical

• HVAC / Air Conditioning

• Appliance

• Furniture

• Bathroom

• Lighting

• Doors / Locks

• Carpentry

• Structural

• Water / Leakage

• Cleaning / Facilities

• Safety

• Other

AI should also suggest priority:

• Critical

• Medium

• Low

Show the result clearly:

AI Classification

Category: HVAC / Air Conditioning

Suggested Priority: Critical

Reason: ...

AI classification is a recommendation, not a final decision.

If AI is unavailable, the ticket MUST still be created and marked for manual classification.

Do not fake AI results.

Create a modular AI service so future sprints can add:

• AI-generated responses

• Image analysis

• Voice transcription

• Workflow automation

• Escalation

• Analytics

without rebuilding the application.

--------------------------------------------------

DASHBOARD

--------------------------------------------------

Create the first operational MaintainX dashboard.

Show:

• Open Tickets

• Critical Tickets

• Assigned

• In Progress

• Pending

• Resolved

Also show:

Recent Maintenance Requests

and

Critical Maintenance

Use ticket status and priority badges consistently.

Dashboard should feel like a real hotel maintenance operations platform, not a generic student project.

--------------------------------------------------

TICKETS

--------------------------------------------------

Create a functional Tickets page.

Include:

• Search

• Status filter

• Priority filter

• Category filter

Ticket table:

Ticket

Hotel

Location

Issue

Category

Priority

Status

Technician

Created

Action

Create a Ticket Details page showing:

• Issue

• Location

• Description

• Image

• AI classification

• Priority

• Status

• Assignment

• Activity/history

--------------------------------------------------

DATABASE

--------------------------------------------------

Use Supabase PostgreSQL.

Create a relational foundation for:

• Users

• Hotels

• Maintenance Companies

• Hotel Locations

• Maintenance Categories

• Maintenance Requests/Tickets

• Technicians

• Assets

• Ticket Assignments

• Ticket Activity

Use proper foreign keys and relationships.

Guests should not have unrestricted database access.

Use Supabase Row Level Security where appropriate.

Never expose service-role keys or API secrets in frontend code.

--------------------------------------------------

ROLE PURPOSE

--------------------------------------------------

HOTEL MANAGER:

Monitor hotel maintenance operations, tickets and status.

RECEPTIONIST:

Report issues for guests and track maintenance requests.

TECHNICIAN:

View and update assigned maintenance tickets.

GUEST:

Report a maintenance issue through QR code without an account.

MAINTENANCE COMPANY:

Receives/handles maintenance work through its technicians. Build the database foundation for this relationship now; advanced company workflow will come in later sprints.

--------------------------------------------------

SPRINT BOUNDARY

--------------------------------------------------

This is SPRINT 1.

The application must be designed as a continuous project.

SPRINT 1:

Foundation + UI + authentication + database + request form + AI classification.

SPRINT 2:

AI-generated responses + analytics + reports + business insights.

SPRINT 3:

Workflow automation + notifications + approvals + user management + AI governance/compliance.

SPRINT 4:

Deployment + testing + documentation + final professionalisation.

Do NOT implement the full Sprint 2–4 functionality now.

Only create clean extension points for them.

--------------------------------------------------

QUALITY REQUIREMENTS

--------------------------------------------------

The application must be:

• Responsive

• Mobile friendly for guests

• Desktop friendly for staff

• Accessible

• Professional

• Component-based

• Reusable

• Secure

• GitHub-ready

• Easy to extend in future sprints

Include loading states, validation and error handling.

If an AI service fails, the maintenance request must still be saved.

If image or voice functionality is unavailable, the normal text request must still work.

--------------------------------------------------

MOST IMPORTANT USER FLOW

--------------------------------------------------

Build and test this complete flow:

GUEST

↓

SCAN HOTEL QR CODE

↓

REPORT MAINTENANCE ISSUE

↓

TEXT / VOICE / IMAGE

↓

SUBMIT

↓

TICKET CREATED

↓

AI CLASSIFICATION

↓

CATEGORY + SUGGESTED PRIORITY

↓

TICKET APPEARS IN STAFF DASHBOARD

↓

MANAGER / RECEPTIONIST CAN TRACK IT

This is the most important Sprint 1 workflow.

Do not overbuild.

Do not create fake functionality.

Do not replace working functionality with placeholders.

Build the actual Sprint 1 foundation and preserve the architecture for the remaining three sprints.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://maintainx-ai-ops.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f424335e-6ba8-41d5-8c34-52aa31e0bf45).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
