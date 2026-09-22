Students Module (Gradellence Design System v1.0)
Design Goal

The Students page should be a modern student management workspace rather than a basic CRUD table. It should prioritize clarity, scalability, and fast student management while staying consistent with the Gradellence design language.

Page Header
Students

Manage all students enrolled in your school.

Last updated 2 minutes ago

Right-aligned actions:

Import Students

+ Add Student

Primary button:

+ Add Student

Secondary button:

Import
KPI Cards

Use four compact analytics cards directly below the page header.

┌─────────────────────────────┐
👨‍🎓 Total Students

2,547

+48 this session
└─────────────────────────────┘
┌─────────────────────────────┐
👦 Male Students

1,298

51% of students
└─────────────────────────────┘
┌─────────────────────────────┐
👧 Female Students

1,249

49% of students
└─────────────────────────────┘
┌─────────────────────────────┐
🟢 Active Students

2,541

99.7% Active
└─────────────────────────────┘

Each card should include:

Lucide icon
Large statistic
Small contextual label
Optional subtle trend line
Rounded 16px corners
Soft shadow
24px padding
Search & Filters

Replace the single search input with a full filter toolbar.

Search students...

Class ▼

Gender ▼

Status ▼

Session ▼

More Filters

Sort ▼

The toolbar should remain sticky while scrolling.

Students Table

Use a modern rounded table container.

Columns:

Student	Admission No.	Class	Gender	Status	Actions
Student Cell

Instead of showing only the student's name, display:

● Avatar

Rita Nnaji

rita.nnaji@school.edu

If email addresses are not available in your system, replace the secondary line with:

Admission No.

or simply omit it.

Admission Number
GRA/2026/018

Use a monospaced font or slightly heavier weight to improve readability.

Class
SS2

Displayed as a subtle blue badge.

Gender

Use soft badges.

Male
Female
Status

Status should use pills.

🟢 Active

Future-ready statuses:

Inactive

Graduated

Transferred

Suspended
Row Actions

Replace multiple inline links:

Edit

Summary

Transcript

Delete

with a single overflow menu.

⋮

Menu items:

View Profile

Academic Summary

Transcript

Edit Student

Transfer Student

Archive

Delete

This keeps the table clean and allows new actions to be added later without clutter.

Bulk Selection

Each row begins with a checkbox.

Selecting one or more students reveals a bulk action toolbar.

Assign Class

Export

Delete

Only include actions that exist in the current MVP.

Pagination

Footer:

Showing 1–20 of 2,547 students

< 1 2 3 ... 128 >

20 rows per page
Table Interactions

Rows should have:

Hover highlight
Pointer cursor
Soft background transition
Smooth 200ms animation

Clicking a row opens the Student Details page or drawer, depending on your implementation.

Visual Style
Background
#F8FAFC
Cards

White

16px radius

Soft shadow

0 8px 30px rgba(15,23,42,.06)
Buttons

Primary

Blue

#2563EB

Secondary

White with border

Ghost

Transparent

Danger

Red outline

Typography

Font

Inter

Hierarchy

Page Title

32px

700

Section Title

20px

600

Body

14px

400

Caption

12px

500
Icons

Use Lucide icons consistently.

Examples:

User
Search
Filter
Import
Download
More Horizontal
Graduation Cap
Spacing

Use the 8-point spacing system.

Common values:

8

16

24

32
Layout Structure
┌──────────────────────────────────────────────────────────────────────────────┐
│ Students                              Import            + Add Student        │
│ Manage all students enrolled in your school                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ KPI Cards                                                            │
│ Total │ Male │ Female │ Active                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Search │ Class │ Gender │ Status │ Session │ Filters │ Sort           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Student Table                                                        │
│ Avatar │ Admission │ Class │ Gender │ Status │ Actions               │
│                                                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Bulk Actions                                   Pagination             │
└──────────────────────────────────────────────────────────────────────────────┘
Design Principles

Every management page in Gradellence should follow the same structure:

Page Header – Title, description, and primary actions.
KPI Cards – Four compact summary cards relevant to the module.
Search & Filters – Sticky toolbar with search, filters, and sorting.
Data Table – Rounded container with consistent styling and interactions.
Bulk Actions – Contextual actions when rows are selected.
Pagination – Consistent footer with total records and page controls.

This keeps the experience predictable across Students, Teachers, Subjects, Classes, Results, and every future module, while staying within the scope of your MVP.