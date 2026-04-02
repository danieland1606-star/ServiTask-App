# Design System Strategy: The Elevated Taskmaster

## 1. Overview & Creative North Star
**Creative North Star: The Architectural Editorial**

This design system moves beyond the "app-as-a-utility" mindset and enters the realm of "app-as-a-curated-experience." By utilizing **Inter Medium** across the entire typographic spectrum, we achieve a singular, authoritative voice that feels both intentional and premium. 

We break the standard grid through **Intentional Asymmetry**. In this system, we don't just center-align components; we use generous white space and overlapping elements to create a sense of movement. The goal is to make every screen feel like a page from a high-end design monograph—clean, structured, and profoundly modern.

---

## 2. Colors & Surface Philosophy
The palette centers on a high-octane Primary Blue (`#1A6BFF`) set against a sophisticated, multi-tiered neutral foundation.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Boundaries must be defined solely through background color shifts or tonal transitions.
*   Use `surface-container-low` (`#F2F4F6`) for secondary background sections.
*   Use `surface-container-highest` (`#E1E2E4`) for subtle emphasis without adding "lines."

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to define importance:
1.  **Base Layer:** `background` (`#F8F9FB`)
2.  **Section Layer:** `surface-container-low` (`#F2F4F6`)
3.  **Component Layer (Cards):** `surface-container-lowest` (`#FFFFFF`)

### The "Glass & Gradient" Rule
To escape the "flat" look, floating elements (modals, bottom sheets) should utilize **Glassmorphism**.
*   **Token:** `surface` with 80% opacity + 20px Backdrop Blur.
*   **Signature Textures:** For primary CTAs, utilize a subtle linear gradient: `primary` (`#0053D3`) to `primary-container` (`#1A6BFF`) at a 135-degree angle. This adds "soul" and depth that a flat hex code cannot provide.

---

## 3. Typography: The Monotype Power
By locking the weight to **Medium**, we rely entirely on scale and color contrast to drive hierarchy.

*   **Display (Lg/Md/Sm):** Inter Medium. Used for hero impact. Use `on-surface` (`#191C1E`) for maximum authority.
*   **Headlines:** Inter Medium. These are your "Editorial Hooks." Ensure generous letter-spacing (-0.02em) for a high-end feel.
*   **Body (Lg/Md/Sm):** Inter Medium. For readability against light backgrounds, use `on-surface-variant` (`#424655`) to soften the visual load while maintaining a premium weight.
*   **Labels:** Inter Medium. Used for tags and metadata. Always in `label-sm` or `label-md` to differentiate from body text.

---

## 4. Elevation & Depth
Hierarchy is achieved through **Tonal Layering**, not structural scaffolding.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a "soft lift" that feels architectural rather than digital.
*   **Ambient Shadows:** For floating primary actions, use a "Shadow Tint."
    *   **Blur:** 24px - 40px
    *   **Opacity:** 6%
    *   **Color:** `on-surface` (`#191C1E`)
*   **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use `outline-variant` (`#C2C6D8`) at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons
*   **Primary:** Gradient (`primary` to `primary-container`), 14px (0.875rem) rounded corners. Text: `on-primary` Inter Medium.
*   **Secondary:** `surface-container-high` background. No border. Text: `primary`.
*   **Tertiary:** Transparent background. Text: `primary`.

### Cards & Lists
*   **Rule:** Forbid divider lines. 
*   **Layout:** Use `spacing-6` (1.5rem) of vertical white space to separate items. If separation is visually required, use a subtle background shift to `surface-container-low`.
*   **Rounding:** All card corners are strictly **14px** to maintain the brand’s "Soft Modern" signature.

### Input Fields
*   **State:** Default state uses `surface-container-highest` background with no border. 
*   **Active State:** Transitions to a "Ghost Border" using the `primary` color at 20% opacity.

### Additional Component: The Floating Progress Orb
Given the "ServiTask" context, use a custom floating status indicator using the **Glassmorphism Rule** (80% surface + blur) to track active tasks without cluttering the main content area.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical margins (e.g., 24px left, 32px right) for editorial layouts.
*   **Do** embrace the Medium weight for everything; it creates a consistent "ink on paper" feel.
*   **Do** use `primary-fixed-dim` for subtle background highlights behind icons.

### Don't:
*   **Don't** use 1px dividers or solid black borders.
*   **Don't** use standard "Drop Shadows" (0, 2, 4, 0). They feel dated and cheap.
*   **Don't** use "Regular" or "Bold" weights. The Medium weight is the system’s signature; stick to it to maintain the curated aesthetic.
*   **Don't** crowd the edges. If a container feels full, increase the spacing token by one level (e.g., move from `4` to `5`).