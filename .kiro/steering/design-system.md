---
inclusion: always
---

# Gradellence Design System — UI Rules

All UI work in this project **must** follow the Gradellence Design System v1.0.

## Stack
- React + TypeScript + Tailwind CSS
- Lucide React (icons — exclusively)
- Recharts (charts)
- Framer Motion (when animation is needed beyond CSS transitions)

## Component Library
**Always import from `@/components/ui`** (barrel export):
```ts
import { Button, Card, Badge, DataTable, EmptyState } from '../components/ui';
```

## Colors

| Role | Token / Class | Hex |
|---|---|---|
| Brand Primary | `primary-600` | `#2563EB` |
| Background | `bg-background` | `#F8FAFC` |
| Surface (card/modal) | `bg-surface` | `#FFFFFF` |
| Surface Alt | `bg-surface-alt` | `#F1F5F9` |
| Border | `border-border` | `#E2E8F0` |
| Success | `success-500` | `#22C55E` |
| Warning | `warning-500` | `#F59E0B` |
| Danger | `danger-500` | `#EF4444` |
| Info | `info-500` | `#0EA5E9` |

For chart colors, import `chartColors` or `chartColorArray` from `src/lib/tokens.ts`.

## Typography

| Style | Class | Size / Weight |
|---|---|---|
| Page title | `text-page-title` | 30px / 700 |
| Section title | `text-section-title` | 24px / 600 |
| Card title | `text-card-title` | 18px / 600 |
| Body | `text-body` or `text-sm` | 14px / 400 |
| Caption | `text-caption` | 12px / 500 |

## Spacing
Use the 4px-based scale: `p-1(4px) p-2(8px) p-3(12px) p-4(16px) p-5(20px) p-6(24px) p-8(32px) p-10(40px) p-12(48px) p-16(64px)`

## Components — Key Rules

### Buttons
- Use `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg">`
- Default height: 48px (`h-12`) for `md`
- Border radius: `rounded-btn` (10px)
- Always use `loading` prop for async actions

### Inputs & Selects
- Height: 48px (`h-input`)
- Padding: 16px (`px-4`)
- Border radius: `rounded-input` (10px)
- Focus ring: 2px primary blue

### Cards
- Use `<Card>` — white, `rounded-card` (18px), `p-6`, `shadow-sm`
- **No exceptions** — every dashboard card uses this spec

### Modals
- Use `<Modal>` — `rounded-modal` (20px), max-width 640px
- Primary action in footer, bottom-right
- Cancel = secondary/ghost variant

### Tables
- Use `<DataTable>` — header uses `bg-gray-100`, rows hover `bg-gray-50`
- Always provide an `emptyState` prop using `<EmptyState>`
- Use `loading` prop with skeleton rows instead of spinners

### Status Badges
- Use `<Badge variant="success|warning|danger|info|gray|primary">`
- Use `statusToBadgeVariant(status)` helper for dynamic mapping

### Empty States
- **Never show blank pages** — always use `<EmptyState>` with icon, title, description, and CTA

### Skeleton Loaders
- Use `<SkeletonCard>`, `<SkeletonTable>`, `<SkeletonChart>`, `<SkeletonListItem>`, `<SkeletonKpiCard>`
- **Never use spinners** for page-level loading

### Toasts
- Use `useToastStore().addToast(type, message, title?)`
- Types: `success | error | warning | info`
- Auto-dismiss at 4 seconds

### Icons
- **Lucide React exclusively** — `import { IconName } from 'lucide-react'`
- Icon button: use `<IconButton aria-label="...">`

## Layout Constants
- Sidebar: 280px expanded, 88px collapsed
- Top nav: 72px height
- Container max-width: 1440px
- Grid: 12 columns, 24px gap

## Motion
- Transitions: 150–200ms, ease-out
- Card lift on hover: `hover:-translate-y-1`
- Use `animate-fade-in` and `animate-slide-in` Tailwind utilities
- No flashy effects

## Responsive
- Desktop ≥1280px: full sidebar, multi-column
- Tablet 768–1279px: collapsible sidebar, stacked analytics  
- Mobile <768px: drawer nav, single-column, simplified tables
