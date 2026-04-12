# Redesign UI Auth (Login & Reset Password)

## 1. Objective
Redesign the existing `login/` and `reset-password/` pages to make them **elegant, beautiful, and visually pleasing**. 
This redesign is strictly for the UI/UX layer. **Do NOT change any existing business logic**.

## 2. Requirements & Constraints
- **Visual Style**: Elegant and beautiful, easy on the eyes. Use a clean, modern aesthetic with ample whitespace, good typography, and appropriate contrast (following `ui-ux-pro-max` guidelines).
- **Loading States**: ALL loading states MUST include a spinner. Provide clear feedback when a request is in progress.
- **Input Icons**: ALL form inputs MUST have an icon indicating their purpose (e.g., envelope for email).
- **Password Input**: 
  - MUST use an eye icon for the show/hide password toggle.
  - Remove the current text/button show/hide implementation.
- **Icon Library**: Use `@gravity-ui/icons` for ALL icons in the UI.
- **Component Library**: Use `HeroUI v3.x` components with `tailwindcss v4.x`.
- **Form Handling**: Maintain the existing `react-hook-form` and `zod` implementation for validation.

## 3. UI/UX Guidelines (ui-ux-pro-max & heroui-react)
- **Accessibility**: Ensure minimum 4.5:1 contrast ratio for text. Form inputs must have visible labels and clear error states.
- **Touch & Interaction**: Inputs must have a minimum height of 44px. Buttons must have clear hover, focus, and disabled states. Disable buttons and show spinners during async operations.
- **Typography & Spacing**: Use a consistent spacing scale (4/8/16/24/32px). Maintain readable line lengths and line heights (1.5 for body).
- **HeroUI v3 specifics**: 
  - Do NOT use v2 patterns. No `<HeroUIProvider>`.
  - Use compound components (e.g., `<Card><Card.Header>...`).
  - Use semantic variants (primary, secondary, ghost, etc.) instead of raw colors.
  - Ensure correct BEM naming or Tailwind v4 utility classes.

## 4. Implementation Details

### Icons Needed (from `@gravity-ui/icons`)
- Email Input: `Envelope` (or similar email icon)
- Password Input: `Lock` or `Key` (or similar password icon)
- Password Toggle: `Eye` (to show), `EyeSlash` (to hide)
- Loading: Use HeroUI's built-in `Spinner` component or a custom animated SVG if preferred, but HeroUI's is recommended for consistency.

### Component Structure (HeroUI v3)
Example Card structure for Auth pages:
```tsx
import { Card, Input, Button, Spinner } from "@heroui/react";
import { Envelope, Lock, Eye, EyeSlash } from "@gravity-ui/icons";

// Inside the component...
<div className="flex min-h-screen items-center justify-center bg-background p-4">
  <Card className="w-full max-w-md shadow-lg rounded-2xl">
    <Card.Header className="flex flex-col gap-2 items-center text-center pt-8">
      <Card.Title className="text-2xl font-bold">Welcome Back</Card.Title>
      <Card.Description className="text-foreground-500">Sign in to continue</Card.Description>
    </Card.Header>
    <Card.Content className="pb-8">
      <form className="flex flex-col gap-4">
        {/* Email Input */}
        <Input 
          label="Email" 
          placeholder="Enter your email"
          startContent={<Envelope className="text-foreground-400" />}
          // ... RHF props
        />
        
        {/* Password Input */}
        <Input 
          label="Password" 
          type={isVisible ? "text" : "password"}
          placeholder="Enter your password"
          startContent={<Lock className="text-foreground-400" />}
          endContent={
            <button type="button" onClick={toggleVisibility} aria-label="toggle password visibility">
              {isVisible ? <EyeSlash className="text-foreground-400" /> : <Eye className="text-foreground-400" />}
            </button>
          }
          // ... RHF props
        />
        
        {/* Submit Button */}
        <Button 
          type="submit" 
          variant="primary" 
          className="w-full mt-4"
          isDisabled={isLoading}
        >
          {isLoading ? <Spinner size="sm" color="current" /> : "Sign In"}
        </Button>
      </form>
    </Card.Content>
  </Card>
</div>
```

## 5. Execution Steps
1. Identify the existing `login/` and `reset-password/` page components.
2. Replace existing layout with a centered, elegant `Card` layout using HeroUI v3.
3. Update all `<Input>` components to include `startContent` with `@gravity-ui/icons`.
4. Update the password `<Input>` to use `endContent` with a button containing the `Eye`/`EyeSlash` icon. Remove the old text button.
5. Update the submit `<Button>` to include a `<Spinner>` when the form is submitting (`isSubmitting` from `react-hook-form` or custom loading state).
6. Verify that `zod` validation messages are properly displayed using the `errorMessage` and `isInvalid` props of HeroUI's `Input` component.
7. Ensure dark mode and light mode aesthetics are maintained seamlessly.
