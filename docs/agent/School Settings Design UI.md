Gradellence Redesign — School Settings
Design Goal

Transform the current form-based settings page into a modern SaaS settings experience similar to Linear, Stripe, Vercel, Notion, or Clerk while maintaining Gradellence's clean academic identity.

The redesign focuses on:

Better visual hierarchy
Improved information architecture
Faster scanning
Better spacing
Richer branding
Professional SaaS appearance
Overall Layout

Instead of a long vertical form, split the page into two columns.

---------------------------------------------------------
 Sidebar

             Breadcrumb

             School Settings

             Tabs

 --------------------------------------------------------

 Left Column (70%)

 School Identity

 Contact Details

 Branding

 Academic Settings

 --------------------------------------------------------

 Right Column (30%)

 School Preview

 Tips

 Status

 Storage

---------------------------------------------------------

The page feels significantly more balanced.

Header Redesign

Instead of only:

School Settings

Manage your school's profile...

Use

Dashboard / Settings / School Settings

School Settings

Manage your school profile, branding and preferences.

On the right

Save Changes

Always visible.

Settings Navigation

Instead of a single scrolling page.

Introduce tabs.

🏫 School Profile

🎓 Academic Settings

⚙ System Settings

🔧 Preferences

Benefits

Easier navigation
Future scalability
Less overwhelming
Better organization
School Identity Card

Convert it into a premium settings card.

Contains

School Name

Slug

Alias

Logo

Each field has helper text underneath.

Example

Slug

Used in your school's URL.

Instead of plain labels.

Contact Details

Group related fields together.

Phone

Email

Address

Use icons inside inputs.

📞 Phone

✉ Email

📍 Address

Makes scanning much faster.

Branding

Instead of only

Logo URL

Create a proper branding section.

Include

Upload Logo

Drag & Drop

PNG

SVG

JPG

Maximum 2MB

Also keep

Logo URL (Optional)

for advanced users.

School Preview Panel

New right-hand sidebar.

Shows a live preview.

School Logo

School Name

Status

Plan

Students

Teachers

Classes

Current Session

Current Term

This instantly gives administrators confidence that their information is correct.

Tips Card

Small informational card.

💡 Tips

Keep your school profile up to date.

Information entered here appears on reports, transcripts and official documents.

Useful without being intrusive.

Sticky Save Button

Keep

Save Changes

visible in the page header.

Also repeat it at the bottom.

Cancel

Save Changes

This prevents long scrolling back to the top.

Better Cards

Current cards are clean but can feel flat.

Update every settings card with:

18px border radius
24px internal padding
Soft shadow
Larger section icons
Better spacing between form groups
Icons

Each section receives its own icon.

School Identity

🏫

Contact

📞

Branding

🎨

Academic Settings

🎓

Preferences

⚙

Icons improve scanning speed.

Better Form Inputs

Every input should have:

48px height
Larger padding
Left icon
Blue focus ring
Helper text where needed

This aligns with the rest of the Gradellence design system.

Visual Hierarchy

Recommended order

Breadcrumb

↓

Page Title

↓

Settings Tabs

↓

School Identity

↓

Contact Details

↓

Branding

↓

Advanced Settings

↓

Save Actions

The flow becomes much more intuitive.

Empty States

If no logo exists.

Show

Upload School Logo

PNG

SVG

JPG

Maximum 2MB

instead of an empty URL field.

Responsive Behavior

Desktop

Two-column layout with a persistent preview panel.

Tablet

Preview moves below the main form.

Mobile

Single-column layout with stacked cards and a sticky bottom save button.

Micro-interactions
Smooth tab transitions (150–200ms)
Input focus ring in brand blue
Upload area highlights on drag
Save button shows loading state
Success toast slides in from the top-right
School preview updates live as fields change
Design Improvements Over Current Screen
✅ Added breadcrumb navigation

Provides context and improves navigation.

✅ Introduced settings tabs

Makes the page scalable as more settings are added.

✅ Added live School Preview

A richer, more confidence-inspiring experience.

✅ Upgraded Branding section

Supports drag-and-drop uploads alongside a URL option.

✅ Improved visual hierarchy

Clearer separation between sections with better spacing and iconography.

✅ Better form UX

Larger inputs, helper text, and contextual icons make the page easier to use.

✅ Persistent Save Actions

Reduces friction and prevents unnecessary scrolling.

Product Design Notes

As Gradellence grows, Settings should evolve into a complete administration hub rather than a simple profile form. Future tabs can include:

Academic Configuration (grading system, terms, sessions)
Branding & Themes
Result Templates
Notification Settings
Integrations (email, SMS, payment providers)
Security (password policies, MFA, audit preferences)
API Keys & Webhooks (Premium plan)
Custom Fields & School Preferences

Designing the page around a tabbed, scalable structure now will allow these features to be added without requiring a major redesign later.