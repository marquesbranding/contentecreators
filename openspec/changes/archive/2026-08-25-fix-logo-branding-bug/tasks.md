## 1. Signup page logo fix

- [x] 1.1 Remove the `bg-brand-night` wrapper class around `BrandLogo` in `src/features/onboarding/components/onboarding-form-shell.tsx:63`
- [x] 1.2 Verify the logo renders without a dark box on `/sign-up`

## 2. Login page logo fixes

- [x] 2.1 Remove the `bg-brand-night` wrapper class around `BrandLogo` in the mobile header of `src/features/identity/components/auth-page-shell.tsx:82`
- [x] 2.2 Replace the `h-[4.2rem] w-[12.5rem]` override on `BrandLogo` at `src/features/identity/components/auth-page-shell.tsx:46` with a container sized to the component's native `aspect-[2857/1039]`
- [x] 2.3 Verify the logo renders uncropped and without a dark box on the login, forgot-password, and reset-password pages (all share `AuthPageShell`)

## 3. Verification

- [x] 3.1 Visually check signup and login pages in light mode for both bugs resolved
- [x] 3.2 Confirm no other `BrandLogo` consumers regressed (grep for `BrandLogo` usages)
