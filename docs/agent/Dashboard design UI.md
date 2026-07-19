Gradellence Dashboard UI Specification v1.0

 Every element has a purpose and supports the academic workflows of a **school administrator**.

---

Desktop Layout (1440px)

┌──────────────────────────────────────────────────────────────────────────────┐
│ Sidebar │ Top Navigation                                                   │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ Greeting + Quick Actions                                          │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ KPI Cards (6)                                                     │
│         ├───────────────────────────────┬───────────────────────────────────┤
│         │ Enrollment Chart             │ Academic Performance              │
│         ├───────────────────────────────┼───────────────────────────────────┤
│         │ Quick Actions                │ Recent Activity                   │
│         ├───────────────────────────────┼───────────────────────────────────┤
│         │ Classes Overview             │ School Overview                   │
│         ├───────────────────────────────┼───────────────────────────────────┤
│         │ Assessment Progress          │ Announcements                     │
└──────────────────────────────────────────────────────────────────────────────┘

---

1. Sidebar

Width: 280px

Logo

🎓

GRADELLENCE

Below it:

Kings International School

Premium Plan

---

Navigation

MAIN

Dashboard

---

ACADEMICS

Students

Teachers

Classes

Subjects

Assessments

Results

Grade Scales

---

ADMINISTRATION

Users

Roles

Analytics

Audit Logs

---

ACCOUNT

Billing

Subscriptions

Settings

---

Bottom

Avatar

School Admin

Logout

---

1. Top Navigation

Height

72px

---

Left

🔍 Search students, teachers, classes...

---

Right

Notification

Help

School Switcher (Future)

Profile

---

1. Greeting Section

Instead of

Welcome to SRMS

Use

Good Morning, Maxwell 👋

Welcome back to Kings International School.

Tuesday, July 14, 2026

Right side

Three primary actions

- Add Student
- Record Assessment

Generate Results

These are always visible.

---

1. KPI Cards

Six cards.

Each card follows exactly the same design.

---

Card

Icon

Title

Large Number

Change Indicator

Example

👨‍🎓

Students

1,254

↑ 18 new this term

---

Cards

Students

Students

Total students

Trend

---

Teachers

Teachers

Total teachers

New teachers

---

Classes

Classes

Total classes

Active classes

---

Subjects

Subjects

Across school

---

Assessments

Pending Assessments

Needs review

---

Results

Published Results

8 / 12

---

1. Analytics

Largest dashboard section.

---

Left (70%)

Student Enrollment

Large line chart.

Filters

Weekly

Monthly

Yearly

Shows

Admissions

Withdrawals

---

Right (30%)

Academic Performance

Donut chart

Excellent

Good

Average

Needs Support

Instead of Male/Female.

Much more useful.

---

1. Quick Actions

Card

Quick Actions

Grid

➕

Add Student

➕

Add Teacher

📝

Create Assessment

📊

Publish Results

⬆

Promote Students

📄

Export Broadsheet

One click.

---

1. Recent Activity

Instead of a table.

Timeline.

10 mins ago

Maxwell added Student

---

18 mins ago

Results Published

---

Yesterday

Assessment Created

---

Yesterday

Teacher Added

Each activity has

Avatar

Time

Action

Entity

---

1. Classes Overview

Modern table.

Class

Teacher

Students

Assessments

Results

Status

Example

JSS1A

Mrs Grace

42

Completed

Published

🟢

Status colors

Green

Published

Orange

Pending

Blue

In Progress

Gray

Not Started

---

1. School Overview

Card

Current Session

2026/2027

Current Term

Third

Plan

Premium

Storage

3.2GB / 10GB

Users

18 / 25

Very SaaS-like.

---

1. Assessment Progress

Instead of numbers.

Progress bars.

Teacher Submission

██████████

100%

---

Assessment Review

████████

82%

---

Results Published

███████

73%

Admins instantly know remaining work.

---

1. Announcements

Card

📢

School resumes Monday

---

WAEC moderation Friday

---

PTA Meeting

---

System maintenance

---

1. Notifications

Bell icon.

Badge.

3

Notifications

Examples

Teacher has not submitted results.

Subscription expires in 19 days.

Assessment deadline tomorrow.

---

1. Empty Dashboard

Instead of

0

0

0

Show

Welcome to Gradellence!

Let's set up your school.

[ Add Students ]

[ Create Class ]

[ Add Subjects ]

Great first-run experience.

---

1. Visual Hierarchy

Greeting

↓

KPI Cards

↓

Analytics

↓

Quick Actions

↓

Operational Tables

↓

Announcements

Exactly in that order.

---

1. Card Specifications

Padding

24px

Radius

18px

Border

1px Gray200

Shadow

Soft

Gap

24px

---

1. Animations

Cards

Hover

TranslateY(-2px)

Buttons

150ms

Sidebar

Collapse

Expand

Numbers

Animate from

0

to

1,254

Charts

Fade

Draw

On Load

---

1. Dashboard Metrics (Future)

As Gradellence evolves, the dashboard can become even more insightful with additional academic KPIs:

Student attendance rate

Teacher submission completion

Results awaiting approval

Average class performance

Top-performing class

Lowest-performing class

Recently admitted students

Upcoming assessment deadlines

Recent result publications

System health and subscription status

---

Wireframe (Low-Fidelity)

┌────────────────────────────────────────────────────────────────────────────┐
│ Search...                             🔔 Help 👤 Maxwell                  │
├────────────────────────────────────────────────────────────────────────────┤
│ Good Morning Maxwell 👋        [+ Student] [Assessment] [Results]         │
├────────────────────────────────────────────────────────────────────────────┤
│ Students │ Teachers │ Classes │ Subjects │ Assessments │ Results          │
├───────────────────────────────────────┬────────────────────────────────────┤
│ Student Enrollment Chart             │ Academic Performance Donut          │
├───────────────────────────────────────┼────────────────────────────────────┤
│ Quick Actions                        │ Recent Activity Timeline            │
├───────────────────────────────────────┼────────────────────────────────────┤
│ Classes Overview                     │ School Overview                     │
├───────────────────────────────────────┼────────────────────────────────────┤
│ Assessment Progress                  │ Announcements                       │
└───────────────────────────────────────┴────────────────────────────────────┘

Product Manager Notes

A few recommendations tailored specifically to Gradellence:

Don't display all six KPI cards when they have no data. During onboarding, replace them with a guided setup experience that walks administrators through creating classes, subjects, teachers, and students. #we will do this at the end of the project when discussing onboarding.

Promote "Generate Results" only when prerequisites are met. If assessments haven't been recorded or teachers haven't submitted scores, the button should guide users to complete those steps instead of leading to an error.

!School Admin dashboard 

School Admin dashboard 

Use role-aware dashboards. A School Admin, Teacher, and Principal should not all see the same dashboard. The admin dashboard above should be the most comprehensive, while teachers should see their classes, pending assessments, and timetable.

Keep the dashboard actionable. Every card should link directly to its related module (e.g., clicking "Students" opens the Students page with relevant filters).

This specification provides a strong foundation for a dashboard that feels modern, scalable, and purpose-built for academic management rather than a generic admin template.