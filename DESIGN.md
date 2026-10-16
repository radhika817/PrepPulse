# PrepPulse Design System Specification (`DESIGN.md`)

This document defines the visual design language, theme tokens, typography, component specifications, and accessibility rules for PrepPulse. All frontend development must strictly adhere to these guidelines.

---

## 1. Brand Personality & Philosophy

- **Personality**: Friendly, focused, and motivating for engineering students preparing for technical interviews.
- **Tone**: Professional yet approachable—neither bureaucratic/corporate nor playful/childish.
- **Design Philosophy**: Calm, clean surfaces with one confident, energetic accent. The interface stays out of the user's way to foster deep concentration during problem solving and spaced recall.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Primary Brand Tones (Indigo)
Indigo represents clarity, intellect, and technical precision.

| Token | Hex Value | Usage |
|---|---|---|
| `primary-50` | `#EEF2FF` | Light mode subtle tint backgrounds |
| `primary-100` | `#E0E7FF` | Light mode chip active backgrounds |
| `primary-200` | `#C7D2FE` | Light mode border accents |
| `primary-300` | `#A5B4FC` | Dark mode muted text accents |
| `primary-400` | `#818CF8` | Dark mode primary icons and highlighted text |
| `primary-500` | `#6366F1` | Interactive elements, borders |
| `primary-600` | `#4F46E5` | **Core Brand Primary**: Default button background |
| `primary-700` | `#4338CA` | Hover state for primary buttons |
| `primary-800` | `#3730A3` | Dark mode container borders |
| `primary-900` | `#312E81` | Dark mode active selection tints |
| `primary-950` | `#1E1B4B` | Dark mode deep accents |

### 2.2 Semantic & Feedback Colors

| Concept | Light Hex | Dark Hex | Role | Contrast Ratio |
|---|---|---|---|---|
| **Streak Flame** | `#EA580C` | `#FB923C` | Daily momentum, fire icon, streak count | > 4.5:1 on surface |
| **Knew It / Correct** | `#059669` | `#34D399` | Correct answer, "Knew it" rating, success state | > 4.5:1 on surface |
| **Partly Recalled** | `#D97706` | `#FBBF24` | "Partly" rating, draft status, warnings | > 4.5:1 on surface |
| **Missed It / Danger**| `#DC2626` | `#F87171` | "Missed it" rating, rejected status, error banners | > 4.5:1 on surface |

### 2.3 Light and Dark Theme Tokens

Every background and foreground combination is audited to guarantee a minimum contrast ratio of **4.5:1** (WCAG AA).

| Element | Light Theme | Dark Theme |
|---|---|---|
| **App Background** | `#F8FAFC` (`slate-50`) | `#0B0F19` (`slate-950` customized) |
| **Card / Surface** | `#FFFFFF` (`white`) | `#111827` (`slate-900` / `gray-900`) |
| **Card Hover / Secondary** | `#F1F5F9` (`slate-100`) | `#1F2937` (`slate-800` / `gray-800`) |
| **Border / Divider** | `#E2E8F0` (`slate-200`) | `#1E293B` (`slate-800`) |
| **Text Primary** | `#0F172A` (`slate-900`) | `#F8FAFC` (`slate-50`) |
| **Text Secondary** | `#475569` (`slate-600`) | `#94A3B8` (`slate-400`) |
| **Text Muted / Placeholder** | `#64748B` (`slate-500`) | `#64748B` (`slate-500`) |
| **Focus Ring** | `#4F46E5` (`indigo-600`) | `#818CF8` (`indigo-400`) |

---

## 3. Typography

- **Font Family**: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Reading Measure**: Question text and explanation bodies are capped at **65 characters** (`max-w-prose` / ~680px) to prevent eye fatigue.

### Typography Scale

| Level | Size / Line-Height | Weight | Tracking | Usage |
|---|---|---|---|---|
| **Display / Page Title** | `1.75rem` (28px) / `2.25rem` (36px) | 800 (Extrabold) | `-0.025em` | Page main headers (`h1`) |
| **Section Title** | `1.25rem` (20px) / `1.75rem` (28px) | 700 (Bold) | `-0.015em` | Card headers, section titles (`h2`) |
| **Subsection Title** | `1.00rem` (16px) / `1.50rem` (24px) | 600 (Semibold) | `normal` | Sub-sections, modal titles (`h3`) |
| **Body Standard** | `0.875rem` (14px) / `1.375rem` (22px) | 400 (Regular) | `normal` | Paragraphs, question descriptions |
| **Body Medium** | `0.875rem` (14px) / `1.375rem` (22px) | 500 (Medium) | `normal` | Table rows, interactive options |
| **Small / Label** | `0.75rem` (12px) / `1.00rem` (16px) | 600 (Semibold) | `0.025em` | Badges, tags, form labels, timestamps |
| **Micro / Caption** | `0.6875rem` (11px) / `0.875rem` (14px) | 700 (Bold) | `0.05em` | Metric counters, category pills |

---

## 4. Spacing, Shapes & Depth

- **Spacing Grid**: Multiples of **8px** (`0.5rem` = 8px; `gap-2` = 8px, `gap-4` = 16px, `p-6` = 24px, `space-y-8` = 32px).
- **Corner Radii**: Uniform **12px** (`rounded-xl` / `0.75rem`) for cards, modal dialogs, and primary action buttons. Smaller pills and tags use `rounded-lg` (8px) or `rounded-full`.
- **Depth & Elevation**:
  - **Light mode**: Subtle, diffused shadows (`shadow-sm`, `shadow-md`) combined with 1px border (`border-slate-200`).
  - **Dark mode**: No heavy muddy drop shadows. Depth is communicated strictly via **1px crisp borders** (`border-slate-800`) against elevated surfaces (`bg-slate-900`).
- **Layout Measure**:
  - Main app viewport is centered with a max-width of **1100px** (`max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8`).
  - Standard page header on every page: Title (`h1`) paired with a descriptive single-line subtitle.

---

## 5. Motion & Micro-interactions

- **Durations**: Fast and snappy: **150ms to 200ms** (`duration-150` / `duration-200`).
- **Easings**: `ease-out` for entrances, `ease-in-out` for color transitions and focus states.
- **Hover Transitions**: Button translation capped at `-1px` on hover (`hover:-translate-y-0.5`).
- **Accessibility**: All animations and transforms must honor `prefers-reduced-motion` using Tailwind's `motion-safe:` or `motion-reduce:transition-none`.

---

## 6. Component Rules

### 6.1 Buttons (`Button.jsx`)
- **Minimum Target**: 40px height on mobile (`h-10` / `py-2.5 px-4`).
- **Variants**:
  - `primary`: Solid indigo `#4F46E5`, white text, shadow-sm, hover state `#4338CA`.
  - `secondary`: Light background (`bg-slate-100` / `dark:bg-slate-800`), bordered, subtle hover.
  - `ghost`: Transparent background, text changes on hover, ideal for navigation & cancel.
  - `danger`: Red accent (`bg-rose-600` / `hover:bg-rose-500`), white text, for destructive actions.
- **Focus State**: Visible ring with 2px offset (`focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`).

### 6.2 Cards (`Card.jsx`)
- 12px radius (`rounded-xl`), 1px border (`border-slate-200` light / `border-slate-800` dark).
- Generous, clean internal padding (`p-5` or `p-6`).
- Distinct Header, Content, and Footer subcomponents for layout uniformity.

### 6.3 Badges (`Badge.jsx`)
- Distinct shape and color mapping:
  - Difficulty: `easy` (Emerald), `medium` (Amber), `hard` (Rose).
  - Status: `approved` (Emerald), `draft` (Amber), `rejected` (Rose).
  - Category: Muted Indigo.
  - Source: `own` (Slate), `ai_draft` (Purple with Sparkles), `licensed` (Blue).
- Text label is **always** included alongside color to ensure accessible comprehension.

### 6.4 Form Inputs (`Input.jsx`, `Select.jsx`, `Textarea.jsx`)
- Every input has an associated accessible `<label>` element.
- 12px corner radius, matching the button geometry.
- Clear error state (`border-rose-500` with inline helper text below the field).
- Unified focus ring matching primary indigo.

### 6.5 Charts (Recharts Theming)
- Adapts cleanly between light and dark modes:
  - Grid lines: `#E2E8F0` (light) / `#1E293B` (dark).
  - Axis text: `#64748B` (light) / `#94A3B8` (dark).
  - Tooltips: Card surface with 1px border matching theme.
  - Bars / Line colors: Primary Indigo (`#4F46E5`), Emerald (`#10B981`), Amber (`#F59E0B`).

### 6.6 Self-Rating Buttons (Practice Recall)
- Three large, tactile buttons:
  - **Knew it** (Green): `#10B981` / `border-emerald-500`
  - **Partly** (Amber): `#F59E0B` / `border-amber-500`
  - **Missed it** (Red): `#EF4444` / `border-rose-500`
- Clear iconography and keyboard support.

---

## 7. Accessibility Checklist (WCAG AA)

1. **Color Contrast**: All text vs background combinations achieve at least 4.5:1 contrast (3:1 for large 18pt+ text).
2. **Keyboard Focus**: Visible 2px outline on every interactive element (`button`, `a`, `input`, `select`).
3. **Information Signals**: Color is never the sole differentiator; always supplemented with icons and text labels.
4. **Form Labels**: Every form field has an explicit `<label htmlFor="...">` and descriptive placeholder.
5. **Reduced Motion**: Disables transforms and animations if user prefers reduced motion.
