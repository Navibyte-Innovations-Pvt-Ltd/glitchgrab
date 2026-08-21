# Form Inputs — `InputField` is the only one

Every form control in this app is `InputField` from
`@/components/AppInputFields/InputField`. Reach for a raw shadcn primitive
(`<Input>`, `<InputOTP>`, `<Select>`, `<Checkbox>`, `<Textarea>`…) and you have
opted out of validation wiring, error rendering, labels, the required asterisk,
icon slots and the project's input styling — all of which then have to be
rebuilt by hand and drift from every other form.

If a control looks like it belongs in a form, it goes through `InputField`.

---

## The one rule that trips people up

**`InputField` reads its value, its error and its dirty state from react-hook-form
context.** It calls `useFormContext()` internally. There is no `value` or
`onChange` prop, and passing one does nothing.

So it must be rendered inside a `<FormProvider>` — *even for a single field in a
dialog*. Without one it throws at runtime (`Cannot destructure property
'control' of useFormContext(...)`).

```tsx
"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import InputField from "@/components/AppInputFields/InputField";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email().optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export function AddBusinessForm({ onSaved }: { onSaved: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    /* …persist… */
    onSaved();
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <InputField<FormValues>
          name="name"
          label="Business Name"
          type="text"
          placeholder="e.g. Acme Solutions Pvt Ltd"
          required
        />
        <InputField<FormValues> name="email" label="Email" type="email" />

        <Button type="submit" disabled={!form.formState.isDirty}>
          Save
        </Button>
      </form>
    </FormProvider>
  );
}
```

Three details in that snippet that matter:

- **`<InputField<FormValues>>`** — pass the form type. `name` is then checked
  against your schema, so a typo is a build error rather than a field that
  silently never binds.
- **`required`** renders the red asterisk. It does **not** validate; the schema
  does. Keep the two in agreement or the UI promises something Zod does not
  enforce.
- **A page already inside `<Form {...form}>`** (the shadcn wrapper) is also
  fine — that renders a `FormProvider` itself. Do not nest both.

### One field, no form of its own

A dialog that needs a single input still needs the provider. This is real code
from the revision approval bar:

```tsx
const otpForm = useForm<{ otp: string }>({ defaultValues: { otp: "" } });
// `useWatch`, never `otpForm.watch()` — see "React Compiler" below.
const otp = useWatch({ control: otpForm.control, name: "otp" }) ?? "";

<FormProvider {...otpForm}>
  <InputField
    name="otp"
    type="OTP"
    label=""
    onComplete={(value) => submitOtp(value)}
  />
</FormProvider>;
```

---

## Types

`type` selects the control. The full union lives in `InputField.tsx`; these are
the ones with behaviour worth knowing:

| `type` | Notes |
| --- | --- |
| `text` `email` `password` `number` | `number` accepts `min` / `max` / `step`. |
| `OTP` | Single hidden input under the boxes. `onComplete(value)` fires on the last digit — use it to auto-submit. |
| `phone` | Country selector included. Value is stored E.164 (`+9198…`). Never `.clear()` it in tests — that wipes the country code. |
| `select` | `options={[{ value, label }]}`. Search turns itself on at 8+ options (`SEARCHABLE_OPTION_THRESHOLD` in `lib/select-search.ts`) — pass `isSearchable` only to force it on for a shorter list or off for a long one. `onCreateOption` + `createOptionLabel` render an inline "create new" row. `emptyOptionsAction={{ label, href }}` gives an empty list somewhere to go. |
| `multiSelect` `multiCheckbox` `radio` `yes_no_radio` | Same `options` shape. |
| `checkbox` `switch` | Boolean. |
| `date` `datetime-local` `multiple-dates` | |
| `text-area` | Plain. `maxLength` supported. |
| `ai-text-area` | Adds an AI write button. `generationPrompt`, `context`, `aiButtonText`. |
| `editor` | Rich text (TipTap). `minHeight`, `compactToolbar`, `growToFit`, `context`. Pass `label=""` to suppress the label — it renders no stray asterisk. |
| `places_autocomplete` | Google address. `autoDetectLocation`. Writes `{ address, position: { lat, lng } }`. |
| `google-business-search` | Business lookup; `onBusinessSelect(details)`. Does not bind a value itself. |
| `services-selection` | Services + packages picker. Needs `packageIdsName` and `serviceCurrency`. |
| `avatar` `modern-image` `multiSelect_images` `file` | Uploads. `uploadLabel`. |
| `slug` | Auto-slugifies from a sibling field. |
| `rating` `list` `color-picker` | |

Shared props: `label`, `placeholder`, `description`, `footerNote`, `Icon`
(lucide or react-icons), `iconClassName`, `className`, `disabled`, `required`,
`autoComplete`.

---

## Gotchas that have actually bitten

**Empty `label` still rendered an asterisk.** The required marker is a CSS
`after:content-['*']` on the label element. `label=""` with `required` used to
paint a lone red `*`. Editor inputs now skip the element entirely when there is
no label — do the same if you add a new control type.

**React Compiler bans `form.watch()`.** It returns a function that cannot be
memoized, so eslint fails the build with *"Compilation Skipped: Use of
incompatible library"*. Use `useWatch({ control, name })` instead. This is not
style — it will not compile.

**`useWatch` on the whole form re-renders on every keystroke.** Watch the field
you need. If you must watch everything (auto-save), memoise on
`JSON.stringify(values)` — there are existing examples in
`proposal-form-lengthy.tsx`.

**react-select needs `classNamePrefix` for Cypress.** `InputSelect` already sets
`classNamePrefix="rs"`, so tests target `.rs__control` / `.rs__option` /
`.rs__menu`. Do not remove it.

**Radix dialogs put `pointer-events: none` on `<body>`.** Cypress clicks inside
a dialog need `{ force: true }`.

**Auto-save must re-baseline.** After a successful save call
`form.reset(savedValues)`. Skip it and `isDirty` stays true forever, so
"Unsaved changes" never clears — a bug that shipped on the proposal editor.

---

## Checklist for a new form

1. Zod schema → `useForm({ resolver: zodResolver(schema), defaultValues })`.
   Always give `defaultValues`, including `""` for optional strings; an
   `undefined` field makes the input uncontrolled and React warns.
2. Wrap in `<FormProvider {...form}>` (or shadcn `<Form {...form}>`).
3. One `InputField<FormValues>` per field, typed.
4. `required` on the field **and** in the schema.
5. Submit button disabled on `!form.formState.isDirty || isSubmitting`, with a
   spinner and changed text while pending (see `agent_docs/forms.md`).
6. On success: `form.reset(values)`, invalidate through
   `lib/query-invalidation.ts`, toast.
