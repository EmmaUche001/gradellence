Yes. This one needs a **more substantial redesign** than Students/Teachers/Subjects.

The current page has good information, but it feels like a pricing page was placed inside an admin dashboard. The huge cards dominate the screen, the current-plan state isn't immediately clear, and there is too much repeated text.

The goal should be:

> **A premium SaaS subscription management experience—not a marketing pricing page.**

And because you already have separate **Billing** and **Subscriptions** navigation items, I would make this page specifically about **subscription/plan management**. Billing history, invoices, payment methods, etc. should live under **Billing**.

---

# Gradellence — Subscription Design

## 1. Page Header

Instead of:

```text
Subscription & Billing

Manage your plan and billing information
```

Use:

```text
Subscription

Manage your Gradellence plan and school limits.

Your subscription renews automatically based on your billing cycle.
```

Right side:

```text
Billing →
```

This creates a clear relationship between the two modules.

---

# 2. Current Plan — Make This the Hero

The current plan should be the most important thing on the page.

Instead of the enormous horizontal card:

```text
CURRENT PLAN

Standard    ACTIVE

Renews 08 August 2026

                              Cancel Subscription
```

Create a more sophisticated subscription overview:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  YOUR CURRENT PLAN                                  ● ACTIVE         │
│                                                                      │
│  ⚡ Standard                                                          │
│  ₦50,000 / 30 days                                                   │
│                                                                      │
│  Renews August 8, 2026                                               │
│                                                                      │
│  ───────────────────────────────────────────────────────────────     │
│                                                                      │
│  Students        1,247 / 2,000        ████████████░░░  62%            │
│  Staff Users       84 / 200           ███████░░░░░░░  42%            │
│  Storage           18 / 50 GB         █████░░░░░░░░░  36%            │
│                                                                      │
│  [ Manage Plan ]                         Cancel Subscription          │
└──────────────────────────────────────────────────────────────────────┘
```

### Why?

The administrator immediately knows:

* What plan they're on
* What they're paying
* When it renews
* How much of their allowance they're using
* What they can do next

That's much more useful than simply saying **"Standard — Active."**

---

# 3. Don't Show Fake Usage If It's Not Implemented

Important for Gradellence:

If the backend doesn't currently track actual usage, **do not fabricate usage numbers**.

Instead show the limits:

```text
Students       Up to 2,000
Staff Users    Up to 200
Branches       Up to 3
Storage        50 GB
```

Then later, when usage tracking exists, turn them into progress bars.

This is the same principle we applied to the Students page: **don't design functionality that doesn't exist yet.**

---

# 4. Plan Selection

The current three cards are too tall.

I'd introduce:

```text
Choose a plan

Upgrade or change your Gradellence subscription.
```

Then three much cleaner cards.

---

## BASIC

```text
┌──────────────────────────────┐
│                              │
│  □ Basic                     │
│                              │
│  For small schools           │
│                              │
│  ₦15,000                     │
│  / 30 days                   │
│                              │
│  ─────────────────────────   │
│                              │
│  500 students                │
│  50 staff users              │
│  1 branch                    │
│  10 GB storage               │
│                              │
│  ✓ Student management        │
│  ✓ Teacher management        │
│  ✓ Class management          │
│  ✓ Assessments               │
│                              │
│  [ Select Basic ]            │
│                              │
└──────────────────────────────┘
```

---

## STANDARD

This should be visually dominant because it's the current plan.

```text
┌──────────────────────────────┐
│        CURRENT PLAN          │
│                              │
│  ⚡ Standard                 │
│                              │
│  For growing schools        │
│                              │
│  ₦50,000                     │
│  / 30 days                   │
│                              │
│  ─────────────────────────   │
│                              │
│  2,000 students              │
│  200 staff users             │
│  3 branches                  │
│  50 GB storage               │
│                              │
│  ✓ Everything in Basic       │
│  ✓ Parent portal             │
│  ✓ Email notifications       │
│  ✓ Bulk student import       │
│  ✓ Result tools              │
│                              │
│  [ Current Plan ]            │
│                              │
└──────────────────────────────┘
```

Use the Gradellence blue border rather than the very strong green border currently being used.

---

## PREMIUM

```text
┌──────────────────────────────┐
│                              │
│  ✨ Premium                  │
│                              │
│  For large schools & groups  │
│                              │
│  ₦150,000                    │
│  / 30 days                   │
│                              │
│  ─────────────────────────   │
│                              │
│  99,999 students             │
│  9,999 staff users           │
│  999 branches                │
│  Unlimited storage           │
│                              │
│  ✓ Everything in Standard    │
│  ✓ AI academic advisor       │
│  ✓ AI risk prediction        │
│  ✓ Performance forecasting   │
│  ✓ Executive analytics       │
│                              │
│  [ Upgrade to Premium ]      │
│                              │
└──────────────────────────────┘
```

---

# 5. Don't List Every Feature

This is one of the biggest problems with the current screen.

You currently have:

```text
✓ Up to 500 students
✓ Student & teacher management
✓ Class & subject management
✓ Academic sessions & terms
✓ Assessment entry
✓ Automatic result computation
✓ Grade calculation
+4 more features
```

And then Standard repeats a lot of it.

That makes the cards very tall.

Instead:

### Show the important limits

```text
500 Students
50 Staff
1 Branch
10 GB Storage
```

### Then 3–5 highlighted features

```text
✓ Student management
✓ Teacher management
✓ Assessments
✓ Result computation
```

Then:

```text
View all features →
```

This reduces visual noise dramatically.

---

# 6. Add a Plan Comparison

Below the cards:

```text
Compare plans
```

Then a compact comparison table:

| Feature       | Basic | Standard |   Premium |
| ------------- | ----: | -------: | --------: |
| Students      |   500 |    2,000 |    99,999 |
| Staff users   |    50 |      200 |     9,999 |
| Branches      |     1 |        3 |       999 |
| Storage       | 10 GB |    50 GB | Unlimited |
| Parent portal |     — |        ✓ |         ✓ |
| Bulk import   |     — |        ✓ |         ✓ |
| AI features   |     — |        — |         ✓ |

This is much easier to understand than stuffing everything into three giant cards.

---

# 7. Credit/Upgrade Messaging

The current:

> ~₦8,585 credit from current plan applied

is visually awkward.

Make it a small contextual message **only when relevant**.

For example:

```text
┌──────────────────────────────────────────────────┐
│ ✓ ₦8,585 will be credited toward this upgrade.  │
└──────────────────────────────────────────────────┘
```

Or directly inside the upgrade confirmation modal.

I wouldn't show it permanently on every pricing card.

---

# 8. Cancellation

Don't give **Cancel Subscription** the same visual prominence as upgrading.

Currently:

```text
                         [ Cancel Subscription ]
```

That's too prominent.

Instead:

```text
Subscription settings
────────────────────────────

Auto-renewal                 On

Renewal date                 Aug 8, 2026

Payment method               •••• 4821

                              Manage billing →
```

And at the bottom:

```text
Cancel subscription
```

in a subtle danger-text treatment.

Clicking it opens a confirmation flow.

---

# 9. Separate Subscription From Billing

This is important because your sidebar already has:

```text
ACCOUNT

Billing

Subscriptions
```

I'd define them clearly:

### Subscriptions

```text
Current plan
Plan comparison
Upgrade / downgrade
Renewal
Subscription status
Cancellation
```

### Billing

```text
Payment method
Invoices
Transactions
Receipts
Billing information
Payment history
```

That prevents the two pages from becoming duplicates.

---

# 10. Recommended Final Layout

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Subscription                                      Billing →         │
│ Manage your Gradellence plan and school limits.                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ CURRENT PLAN                                                        │
│                                                                     │
│ ⚡ Standard                                      ● ACTIVE            │
│ ₦50,000 / 30 days                                                   │
│ Renews August 8, 2026                                               │
│                                                                     │
│ Students       Up to 2,000                                          │
│ Staff          Up to 200                                            │
│ Branches       3                                                    │
│ Storage        50 GB                                                │
│                                                                     │
│ [ Manage Plan ]                                                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Choose a plan                                                       │
│ Upgrade or change your Gradellence subscription.                   │
│                                                                     │
│ ┌──────────────┐ ┌────────────────┐ ┌────────────────┐             │
│ │ BASIC        │ │ STANDARD       │ │ PREMIUM        │             │
│ │              │ │ CURRENT PLAN   │ │                │             │
│ │ ₦15,000      │ │ ₦50,000        │ │ ₦150,000       │             │
│ │              │ │                │ │                │             │
│ │ 500 students │ │ 2,000 students │ │ 99,999         │             │
│ │ 50 staff     │ │ 200 staff      │ │ 9,999 staff    │             │
│ │ 1 branch     │ │ 3 branches     │ │ 999 branches   │             │
│ │ 10 GB        │ │ 50 GB          │ │ Unlimited      │             │
│ │              │ │                │ │                │             │
│ │ [Select]     │ │ [Current]      │ │ [Upgrade]      │             │
│ └──────────────┘ └────────────────┘ └────────────────┘             │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Compare plans                                                       │
│                                                                     │
│ Feature             Basic          Standard         Premium         │
│ Students            500            2,000            99,999          │
│ Staff               50             200              9,999           │
│ Branches            1              3                999             │
│ Storage             10 GB          50 GB            Unlimited       │
│ Parent Portal       —              ✓                ✓               │
│ AI Features         —              —                ✓               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

# Visual Direction

Keep the existing Gradellence shell, but elevate the content.

### Background

`#F8FAFC`

### Cards

`#FFFFFF`

### Primary

`#2563EB`

### Border

`#E2E8F0`

### Success

`#10B981`

### Danger

`#EF4444`

### Radius

**14–16px**

### Shadows

Very subtle.

### Typography

**Inter**

### Pricing

Make the price the visual anchor, but don't make it absurdly large.

---

## The key change

The current design says:

> **"Here are three products you can buy."**

The redesigned version should say:

> **"Here is your school's subscription, here's what you're getting, and here are your options."**

That's a much better SaaS experience.

And I'd **keep the existing sidebar/top navigation exactly as you've established it**. The redesign should focus on the subscription content itself so Gradellence continues developing one coherent visual language across Students, Teachers, Subjects, and now Subscriptions.
