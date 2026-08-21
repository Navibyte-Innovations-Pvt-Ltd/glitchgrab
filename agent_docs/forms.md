# Forms

## InputField (mandatory)
- ALWAYS use `InputField` from `components/AppInputFields/InputField.tsx` — never raw shadcn inputs
- Available types: `text`, `email`, `password`, `OTP`, `number`, `select`, `multiSelect`, `multiCheckbox`, `text-area`, `ai-text-area`, `editor`, `date`, `multiple-dates`, `phone`, `checkbox`, `radio`, `switch`, `avatar`, `modern-image`, `rating`, `places_autocomplete`, `google-business-search`, `color-picker`, `list`
- Phone fields: MUST use `type="phone"` — never `type="text"`

## Form State
- Always React Hook Form + Zod + `zodResolver`. Never `useState` for form fields.
- Always use `z.nativeEnum(PrismaEnum)` from `@prisma/client` — never hardcode enum values in Zod schemas.
- Zod `.optional().transform()` trap: check `if (str === undefined) return undefined;` at start of transform, or Prisma writes `null` to DB.
- Zod error responses from API routes must be strings: `error.errors.map(e => e.message).join(", ")` — arrays crash `toast.error()`.
