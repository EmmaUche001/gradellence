# DESIGN SYSTEM

Gradellence Design System v1.0

Design Principles

Everything in Gradellence should follow these principles:

Clarity over decoration — information should always be easy to scan.

Consistency — identical actions look identical everywhere.

Accessibility — readable text, sufficient contrast, keyboard-friendly interactions.

Speed — users should accomplish tasks with minimal clicks.

Trust — the UI should feel professional enough for schools to trust with academic records.

---

Brand Identity

Personality

Modern

Professional

Friendly

Reliable

Academic

Premium SaaS

Not playful. Not corporate-boring.

---

Color System

Primary

Primary 50    #EFF6FF
Primary 100   #DBEAFE
Primary 200   #BFDBFE
Primary 300   #93C5FD
Primary 400   #60A5FA
Primary 500   #3B82F6
Primary 600   #2563EB   ← Brand Primary
Primary 700   #1D4ED8
Primary 800   #1E40AF
Primary 900   #1E3A8A

---

Neutral

Background      #F8FAFC
Surface         #FFFFFF
Surface Alt     #F1F5F9

Border          #E2E8F0

Gray 50         #F8FAFC
Gray 100        #F1F5F9
Gray 200        #E2E8F0
Gray 300        #CBD5E1
Gray 400        #94A3B8
Gray 500        #64748B
Gray 600        #475569
Gray 700        #334155
Gray 800        #1E293B
Gray 900        #0F172A

---

Semantic Colors

Success

#22C55E

Warning

#F59E0B

Danger

#EF4444

Info

#0EA5E9

---

Typography

Font

Inter

Fallback

Inter

system-ui

sans-serif

---

Display

40px

700

---

Page Title

30px

700

---

Section Title

24px

600

---

Card Title

18px

600

---

Body

14px

400

---

Caption

12px

500

---

Spacing Scale

4

8

12

16

20

24

32

40

48

64

Everything snaps to this spacing system.

---

Border Radius

Buttons

10px

Inputs

10px

Cards

18px

Modal

20px

Avatar

9999px

---

Shadows

Small

0 1px 3px rgba(0,0,0,.08)

Medium

0 8px 20px rgba(0,0,0,.08)

Large

0 20px 45px rgba(0,0,0,.12)

No heavy shadows.

---

Grid

Desktop

12 Columns

24px Gap

Container

Max Width

1440px

---

Buttons

Primary

Blue background

White text

Rounded

48px height

Hover

Slightly darker blue

---

Secondary

White

Blue border

Blue text

---

Ghost

Transparent

Gray text

Hover gray background

---

Danger

Red

White text

---

Icon Button

40×40

Rounded

---

Inputs

Height

48px

Padding

16px

Border

1px Gray 200

Focus

2px Primary Blue Ring

---

Cards

Every dashboard card uses

White

18px Radius

24px Padding

Soft Shadow

No exceptions.

---

Tables

Modern data tables.

Header

Gray100 Background

Semi Bold

Rows

Hover

Gray50

Selection

Primary Blue

Pagination

Bottom Right

---

Status Badges

Published

Green

Pending

Orange

Draft

Gray

Failed

Red

Archived

Slate

---

Charts

Charts should use only Gradellence colors.

Primary

Blue

Secondary

Purple

Success

Green

Warning

Orange

Danger

Red

No rainbow charts.

---

Sidebar

Width

280px

Collapsed

88px

Active item

Blue background

Blue icon

Bold text

Hover

Gray50

Grouped into sections

---

Top Navigation

Height

72px

Contains

Search

Notifications

Help

School Switcher (future)

User Profile

---

Dashboard Layout

Greeting

↓

KPI Cards

↓

Analytics

↓

Quick Actions + Activity

↓

Tables

↓

Announcements

---

Empty States

Never show blank pages.

Example

📚

No Subjects Yet

Create your first subject to begin managing academic records.

[ Add Subject ]

Every module gets an empty state.

---

Loading States

Instead of spinners

Use

Skeleton loaders

Cards

Tables

Charts

Lists

---

Modals

Rounded

20px

Width

640px

Primary button

Bottom Right

Cancel

Secondary

---

Notifications

Toast Position

Top Right

Duration

4 Seconds

Types

Success

Warning

Error

Info

---

Icons

Use Lucide React exclusively.

Examples:

LayoutDashboard

Users

GraduationCap

BookOpen

School

ClipboardCheck

BarChart3

Shield

Settings

CreditCard

Bell

Search

Plus

Download

Filter

---

Motion

Keep animations subtle and purposeful.

150–200ms transitions

Ease-out timing

Card lift on hover (2–4px)

Smooth sidebar collapse

Skeleton fade-in

No flashy effects

---

Responsive Behavior

Desktop (≥1280px): Full sidebar, multi-column dashboard.

Tablet (768–1279px): Collapsible sidebar, stacked analytics.

Mobile (<768px): Drawer navigation, single-column layout, simplified tables.

---

Component Library

We should standardize a reusable library of components before building pages:

Buttons

Icon Buttons

Inputs

Selects

Date Pickers

Search Bar

Cards

KPI Cards

Charts

Tables

Status Badges

Avatars

Tabs

Breadcrumbs

Pagination

Modals

Drawers

Toasts

Empty States

Skeleton Loaders

Command/Search Palette

Confirmation Dialogs

Final Design Direction

The goal is for someone opening Gradellence to immediately feel they're using a polished, modern SaaS product rather than a traditional school ERP. Every screen should be clean, consistent, and focused on helping administrators complete academic workflows quickly.

My recommendation is to build the UI with React + Tailwind CSS + shadcn/ui + Lucide React + Recharts + Framer Motion. That stack aligns perfectly with your existing React/Tailwind architecture, provides accessible components out of the box, and will make it easier to maintain a consistent design language across the entire application..