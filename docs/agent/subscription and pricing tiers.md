Subscription pricing tiers
Payments via stripe or paystack as options.
I would structure it like this:

# Basic Plan

### Target Customers

* Small private schools
* Nursery schools
* Primary schools
* Schools just moving from paper records

### Features

#### Academic Management

* Student Management
* Teacher Management
* Class Management
* Subject Management
* Academic Session Management
* Term Management

#### Results

* Continuous Assessment Entry
* Exam Score Entry
* Automatic Result Computation
* Grade Calculation
* Result Publishing
* Printable Report Cards

#### Analytics Dashboard

* Class Performance Analysis
* Subject Performance Analysis
* Teacher Performance Statistics
* Pass Rate Analytics

#### User Management

* School Admin
* Teachers

#### Reports

* Student Results
* Class Result Sheets

### Limits

* Up to 500 Students
* Up to 50 Staff Users
* Single School Branch
* 5GB Storage

### No AI Features

### Suggested Price

```txt
₦15,000 - ₦30,000/month
```

---

# Standard Plan

### Target Customers

* Medium-sized schools
* Secondary schools
* Schools with multiple departments

Everything in Basic PLUS:

### Advanced Academic Features

#### Parent Portal

* Parent Login
* Student Performance View
* Download Results

#### Communication

* Email Notifications
* Result Release Notifications
* Academic Alerts

#### Analytics Dashboard

* Class Performance Analysis
* Subject Performance Analysis
* Teacher Performance Statistics
* Pass Rate Analytics

#### Multi-Branch Support

* Up to 3 Branches

#### Bulk Operations

* Bulk Student Import
* Bulk Score Upload
* CSV/Excel Import
Result Broadsheet

### AI Features (Starter AI)

#### AI Result Insights

Example:

```txt
Mathematics performance declined by 12% this term.
```

#### AI Student Performance Summary

Example:

```txt
John performed exceptionally in Sciences
but requires support in English Language.
```

#### AI Teacher Performance Analysis

#### AI Generated Remarks

Instead of teachers writing:

```txt
Good performance.
```

AI generates:

```txt
Demonstrates strong analytical skills and
consistent academic progress.
```

### Limits

```txt
2,000 Students
200 Staff Users
3 Branches
50GB Storage
```

### Suggested Price

```txt
₦50,000 - ₦100,000/month
```

---

# Premium Plan

### Target Customers

* Large schools
* School groups
* Education organizations
* Enterprise institutions

Everything in Standard PLUS:

---

## Advanced AI Suite

### AI Academic Advisor

Example:

```txt
Students in SS2 Science are showing
a 20% decline in Chemistry.
Consider additional revision sessions.
```

---

### AI Risk Prediction

Predict:

```txt
Students likely to fail
Students likely to drop in ranking
Students needing intervention
```

---

### AI Performance Forecasting

Example:

```txt
Expected end-of-session average:
74%
```

---

### AI Promotion Recommendations

Example:

```txt
Recommend promotion to SS3
```

or

```txt
Recommend academic review before promotion.
```

---

### AI School Performance Reports

Generate full reports for:

```txt
Board Meetings
School Owners
Academic Directors
```

---

### AI Chat Assistant

School Admin can ask:

```txt
Show me students below 40% in Mathematics.

Which class improved the most this term?

Who are the top-performing teachers?
```

and get answers instantly.

---

### Executive Analytics

* School-wide KPI Dashboard
* Trend Analysis
* Performance Forecasting
* Comparative Analytics

---

### Enterprise Features

#### Unlimited Branches

#### Unlimited Students

#### Advanced RBAC

Custom Roles:

```txt
Principal
Vice Principal
Dean
Academic Director
```

#### Audit & Compliance

Full audit trail:

```txt
Who changed a score
When
Previous value
New value
```

#### API Access

Allow integration with:

* LMS
* School Websites
* Mobile Apps

---

### Storage

```txt
Unlimited
```

(or very high limits)

---

### Suggested Price

```txt
₦150,000 - ₦500,000+/month
```

depending on school size.

---

# AI Feature Gating Strategy

This is what I would implement architecturally:

| Feature              | Basic | Standard | Premium |
| -------------------- | ----- | -------- | ------- |
| AI Remarks           | ❌     | ✅        | ✅       |
| AI Student Summary   | ❌     | ✅        | ✅       |
| AI Teacher Insights  | ❌     | ✅        | ✅       |
| AI Academic Advisor  | ❌     | ❌        | ✅       |
| AI Risk Prediction   | ❌     | ❌        | ✅       |
| AI Forecasting       | ❌     | ❌        | ✅       |
| AI Chat Assistant    | ❌     | ❌        | ✅       |
| AI Executive Reports | ❌     | ❌        | ✅       |

---

# Feature-Gating Design for the Database

Create:

```prisma
model SubscriptionPlan {
  id          String
  name        String
  maxStudents Int?
  maxUsers    Int?
  features    Json
}
```

Example:

```json
{
  "aiRemarks": true,
  "aiForecasting": false,
  "parentPortal": true,
  "multiBranch": true
}
```


implement feature hiding and protect in the backend against unauthorized access incase a user tries calling such API  manually.: A nice SaaS touch is to optionally show one small "Available on Higher Plans" section in Settings or Billing. That way users can discover premium capabilities without having their day-to-day interface cluttered by locked features. The rest of the application remains clean and plan-specific.

This makes the SaaS scalable and easy to expand when you introduce more AI capabilities later.
