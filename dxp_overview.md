# DXP.Web PR Review Conventions

This document outlines the coding conventions, standards, and best practices for the DXP.Web repository. This should be used as a reference guide for PR reviews.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Code Style & Formatting](#code-style--formatting)
3. [TypeScript Configuration](#typescript-configuration)
4. [ESLint Rules](#eslint-rules)
5. [Import Order & Organization](#import-order--organization)
6. [File & Folder Structure](#file--folder-structure)
7. [Naming Conventions](#naming-conventions)
8. [Component Conventions](#component-conventions)
9. [Testing Standards](#testing-standards)
10. [Commit Message Standards](#commit-message-standards)
11. [Branching Strategy](#branching-strategy)
12. [Git Hooks & Pre-commit Checks](#git-hooks--pre-commit-checks)
13. [Internationalization (i18n)](#internationalization-i18n)
14. [Navigation & Routing](#navigation--routing)
15. [Constants Organization](#constants-organization)
16. [Logging & Analytics](#logging--analytics)
17. [Next.js Specific Conventions](#nextjs-specific-conventions)
18. [Dependencies & Package Management](#dependencies--package-management)

---

## Project Overview

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context, Redux (slices)
- **Package Manager**: pnpm
- **Node Version**: >= 22.11.0
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Cypress
- **Component Library**: Bit.dev (`@fintech-com/*`)

---

### Path Aliases

Use the following path aliases for imports:

```typescript
"@shared_features/*"     → "shared_features/*"
"@component_library/*"   → "component_library/*"
"@core_components/*"     → "core_components/*"
"@src/*"                 → "src/*"
"@models_nve/*"          → "core_components/models/NVE/*"
```

**Example:**

```typescript
// ✅ Correct
import { Button } from "@shared_features/buttons/button";
import { useRouter } from "@core_components/navigation";

// ❌ Incorrect
import { Button } from "../../shared_features/buttons/button";
```

---

## ESLint Rules

### Global Rules

```javascript
{
  "no-console": ["error"],  // Console statements are forbidden
  "no-debugger": ["error"], // Debugger statements are forbidden
  "@typescript-eslint/no-unused-vars": ["error", {
    "argsIgnorePattern": "^_[^_].*$|^_$",
    "varsIgnorePattern": "^_[^_].*$|^_$",
    "caughtErrorsIgnorePattern": "^_[^_].*$|^_$"
  }]
}
```

**Key Rules:**

- ❌ **No console.log**: Use `sendToHeap` for logging instead
- ❌ **No debugger statements**
- ✅ Unused variables must be prefixed with `_` if intentionally unused
- ✅ Follow Next.js and TypeScript recommended rules

### Shared Features Specific Rules

For files in `shared_features/**/*.{ts,tsx}`:

```javascript
{
  "@typescript-eslint/no-explicit-any": ["off"],
  "customRules/allow-union-any": ["error"]  // 'any' must be in a union type
}
```

**Important:**

- `any` type is allowed in `shared_features` **only if** it's part of a union type
- Example: `string | any` ✅, `any` ❌

---

## Import Order & Organization

### Import Sorting Plugin

Uses `@trivago/prettier-plugin-sort-imports` with the following order:

```javascript
[
  "^react", // 1. React imports first
  "^@mui/(.*)$", // 2. MUI imports
  "^@fintech-com/(.*)$", // 3. Fintech component library
  "^@core_components/(.*)$", // 4. Core components
  "^@component_library/(.*)$", // 5. Component library
  "^@shared_features/(.*)$", // 6. Shared features
  "^@models_nve/(.*)$", // 7. Models
  "^@src/(.*)$", // 8. Source files
  "^[./]", // 9. Relative imports last
];
```

**Example:**

```typescript
// ✅ Correct import order
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Button } from "@fintech-com/reactjs.form_elements.button";
import { useRouter } from "@core_components/navigation";
import { SomeUtil } from "@shared_features/utils/helpers";
import { localHelper } from "./helpers";

// ❌ Incorrect - wrong order
import { localHelper } from "./helpers";
import React from "react";
import { Box } from "@mui/material";
```

---

## File & Folder Structure

### Directory Organization

```
DXP.Web/
├── src/                          # Next.js App Router pages
│   └── app/
│       └── [lang]/               # Locale-based routing
├── shared_features/              # Reusable features across apps
│   ├── buttons/
│   ├── cards/
│   ├── form_elements/
│   ├── hooks/
│   └── utils/
├── component_library/            # Application-specific components
│   ├── banking/
│   ├── distributors/
│   ├── portal_plus/
│   └── vendor/
├── core_components/              # Core infrastructure
│   ├── api/
│   ├── authentication/
│   ├── contexts/
│   ├── hooks/
│   ├── lang/                     # i18n system
│   ├── navigation/               # Navigation wrapper
│   └── router/                   # Router wrapper
└── __test__/                     # Test files
```

### Component File Structure

Each component should follow this structure:

```
component_name/
├── component_name.tsx            # Main component
├── component_name.composition.tsx # Bit compositions (examples)
├── component_name.spec.tsx       # Tests
└── index.ts                      # Re-export
```

---

## Naming Conventions

### Files & Folders

- ✅ Use **snake_case** for all file and folder names
- ✅ Component files: `component_name.tsx`
- ✅ Test files: `component_name.spec.tsx` or `component_name.test.tsx`
- ✅ Composition files: `component_name.composition.tsx`
- ✅ Type files: `component_name.types.ts`

**Examples:**

```
✅ multi_check_box_with_search.tsx
✅ contact_card.tsx
✅ use_feature_flag.ts

❌ MultiCheckBoxWithSearch.tsx
❌ ContactCard.tsx
❌ useFeatureFlag.ts
```

### Components & Functions

- ✅ Use **PascalCase** for component names
- ✅ Use **PascalCase** for type names
- ✅ Use **camelCase** for functions and variables
- ✅ Use **UPPER_SNAKE_CASE** for constants

**Examples:**

```typescript
// ✅ Correct
export function MultiCheckBoxWithSearch() {}
export type MultiCheckBoxWithSearchProps = {};
export const handleChange = () => {};
export const MAX_RETRY_COUNT = 3;

// ❌ Incorrect
export function multiCheckBoxWithSearch() {}
export type multiCheckBoxWithSearchProps = {};
export const HandleChange = () => {};
export const maxRetryCount = 3;
```

### Props Types

- ✅ Always suffix component props with `Props`
- ✅ Export props types for reusability

```typescript
// ✅ Correct
export type ButtonProps = {
  label: string;
  onClick: () => void;
};

export function Button({ label, onClick }: ButtonProps) {
  // ...
}

// ❌ Incorrect
type Props = {
  label: string;
};
```

---

## Component Conventions

### Component Structure

```typescript
// 1. React imports
import React, { useState, useEffect } from "react";

// 2. External library imports (MUI, etc.)
import { Box, Typography } from "@mui/material";

// 3. Internal imports (following import order)
import { useRouter } from "@core_components/navigation";
import { localHelper } from "./helpers";

// 4. Type definitions
export type MyComponentProps = {
  title: string;
  onSubmit: () => void;
};

// 5. Component implementation
export function MyComponent({ title, onSubmit }: MyComponentProps) {
  // Hooks first
  const [state, setState] = useState("");
  const router = useRouter();

  // Event handlers
  const handleClick = () => {
    // ...
  };

  // Render helpers
  const renderContent = () => {
    // ...
  };

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Return JSX
  return (
    <Box>
      <Typography>{title}</Typography>
    </Box>
  );
}
```

### Props Documentation

Use inline comments for prop types:

```typescript
export type MultiCheckBoxWithSearchProps = {
  /** Unique ID for component */
  id?: string;
  /** Placeholder to display */
  placeholder: string;
  /** Size of checkbox */
  size?: "small" | "medium";
  /** List of values to select in dropdown */
  dropDownValues: OptionType[];
  /** Show search box's Label */
  showSearchLabel?: boolean;
};
```

---

## Testing Standards

### Jest Configuration

- ✅ Test files: `*.spec.tsx` or `*.test.tsx`
- ✅ Place tests next to the component file
- ✅ Use React Testing Library for component tests

### Test Structure

```typescript
import { render, screen } from "@testing-library/react";
import React from "react";
import { MyComponent } from "./my_component";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText("Test")).toBeTruthy();
  });

  it("handles user interaction", () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);
    // Test interaction
  });
});
```

### Cypress E2E Tests

- ✅ E2E tests located in `cypress/e2e/`
- ✅ Use `npm run cy:open` to run Cypress interactively
- ✅ Use `npm run cy:create` to scaffold new tests

---

### Best Practices

- ✅ Make **atomic commits** (small, focused changes)
- ✅ One logical change per commit
- ✅ Write descriptive messages
- ❌ Avoid huge commits with many unrelated changes

---

## Constants Organization

### Structure

```
shared_features/utils/constants/
├── index.ts                  # Barrel export (maintains backward compatibility)
├── shared/
│   ├── constants.ts          # Cross-application constants
│   └── index.ts
├── retailer/
│   ├── constants.ts          # Retailer-only constants
│   └── index.ts
├── vendor/
│   ├── constants.ts          # Vendor-only constants
│   └── index.ts
├── e-vite/
│   ├── constants.ts          # E-vite-only constants
│   └── index.ts
└── portal-plus/
    ├── constants.ts          # Portal Plus-only constants
    └── index.ts
```

### Where to Add Constants

- **Shared across apps** → `shared/constants.ts`
- **Retailer only** → `retailer/constants.ts`
- **Vendor only** → `vendor/constants.ts`
- **E-vite only** → `e-vite/constants.ts`
- **Portal Plus only** → `portal-plus/constants.ts`

### Import Usage

```typescript
// All constants available through main barrel
import { SOME_CONSTANT } from "@shared_features/utils/constants";
// Or import from specific domain
import { RETAILER_CONSTANT } from "@shared_features/utils/constants/retailer";
```

### Best Practices

- ✅ Group related constants with comment headers
- ✅ Use `const enum` for type-safe string unions
- ✅ Keep constants side-effect free (no React imports)
- ✅ Use `UPPER_SNAKE_CASE` for constant names
- ❌ Don't create large unorganized constant files

---

## Logging & Analytics

### Heap Event Logging

**Use `sendToHeap` instead of `console.log`:**

```typescript
import { sendToHeap } from "@core_components/hooks/useheap";

// Info logging
sendToHeap("info", "feature-context", { input: data }, { result: response });

// Error logging
try {
  // ...
} catch (err) {
  sendToHeap("scripterror", "feature-x-action", inputPayload, err);
}

// API error logging
sendToHeap("apierror", "api-endpoint", request, error);
```

### Severity Levels

- `info` - General information logging
- `warning` - Warning messages
- `apierror` - API-related errors
- `scripterror` - Script/runtime errors

### Migration from console.log

**Before:**

```typescript
console.log("User clicked button", data);
```

**After:**

```typescript
sendToHeap("info", "button_click", { data }, "");
```

### Deprecated Hook

⚠️ **`UseHeapHook` is deprecated** - Use `sendToHeap` directly instead.

---

## Next.js Specific Conventions

### App Router Structure

```
src/app/
├── [lang]/                   # Locale-based routes
│   ├── page.tsx              # Home page
│   ├── layout.tsx            # Root layout
│   ├── loading.tsx           # Loading UI
│   ├── error.tsx             # Error UI
│   └── not-found.tsx         # 404 page
└── api/                      # API routes
```

### Server vs Client Components

#### Server Components (Default)

```typescript
// No "use client" directive
// Can use async/await, fetch data directly

export default async function MyPage() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

#### Client Components

```typescript
"use client"; // Must be at the top

import { useState } from "react";

export default function MyComponent() {
  const [state, setState] = useState("");
  return <div>{state}</div>;
}
```

### When to Use "use client"

- ✅ Components using React hooks (`useState`, `useEffect`, etc.)
- ✅ Components with event handlers
- ✅ Components using browser APIs
- ✅ Third-party libraries requiring client-side rendering
- ❌ Don't use for data fetching (use Server Components instead)

### Next.js Configuration

Key settings in `next.config.mjs`:

```javascript
{
  distDir: "_next",
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: false  // Enforce ESLint during builds
  }
}
```

---

## Dependencies & Package Management

### Bit Component Library

The project uses Bit.dev for shared components:

- All Bit components are prefixed with `@fintech-com/`
- Components follow the pattern: `@fintech-com/reactjs.<category>.<component>`

**Examples:**

```typescript
import { Card } from "@fintech-com/reactjs.cards.card";
import { Button } from "@fintech-com/reactjs.form_elements.button";
import { DynamicGrid } from "@fintech-com/reactjs.grids.dynamic-grid";
```

## Additional Guidelines

### Performance

- ✅ Use Next.js Image component for images
- ✅ Implement code splitting with dynamic imports
- ✅ Use React.memo for expensive components
- ✅ Lazy load heavy components

### Accessibility

- ✅ Use semantic HTML elements
- ✅ Add proper ARIA labels
- ✅ Ensure keyboard navigation works
- ✅ Test with screen readers

### Security

- ❌ Never commit sensitive data (API keys, tokens)
- ✅ Use environment variables for configuration
- ✅ Sanitize user inputs
- ✅ Follow OWASP security guidelines

### Code Review Checklist

When reviewing PRs, ensure:

- [ ] Code follows all naming conventions
- [ ] Imports are properly ordered
- [ ] No console.log statements (use sendToHeap)
- [ ] No debugger statements
- [ ] TypeScript types are properly defined
- [ ] Component props are documented
- [ ] Tests are included for new features
- [ ] Commit messages follow the standard
- [ ] Branch name follows the convention
- [ ] No ESLint errors or warnings
- [ ] Code is formatted with Prettier
- [ ] Navigation uses core_components wrapper
- [ ] Constants are in the appropriate domain folder
- [ ] i18n is properly implemented for user-facing strings

## Revision History

- **2024-12-17**: Initial version - Comprehensive coding conventions for PR reviews
