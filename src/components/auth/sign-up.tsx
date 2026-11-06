import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from "@/domain/categories";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/orpc/client";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPES = [
  {
    id: "organization" as const,
    label: "Organization",
    hint: "Request purchases and approve quotes.",
  },
  {
    id: "vendor" as const,
    label: "Vendor",
    hint: "Receive invitations and submit quotes.",
  },
];

const signUpSchema = z
  .object({
    accountType: z.enum(["organization", "vendor"]),
    name: z.string().trim().min(1, "Name is required"),
    email: z.email("Enter a valid email address"),
    accountName: z.string().trim().min(2, "Enter the organization or company name"),
    categories: z.array(z.enum(CATEGORY_IDS)),
    regionsText: z.string().trim(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }

    if (values.accountType === "vendor" && values.categories.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "Pick at least one category.",
      });
    }

    if (values.accountType === "vendor" && values.regionsText.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["regionsText"],
        message: "Add at least one delivery region.",
      });
    }
  });

type SignUpValues = z.infer<typeof signUpSchema>;
type FieldKey =
  | "name"
  | "email"
  | "accountName"
  | "categories"
  | "regionsText"
  | "password"
  | "confirmPassword";

const initialValues: SignUpValues = {
  accountType: "organization",
  name: "",
  email: "",
  accountName: "",
  categories: [],
  regionsText: "Lagos, Nigeria",
  password: "",
  confirmPassword: "",
};

export const SignUp = ({
  signedIn = false,
  signedInName = "",
  signedInEmail = "",
}: {
  signedIn?: boolean;
  signedInName?: string;
  signedInEmail?: string;
}) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignUpValues>({
    ...initialValues,
    name: signedInName,
    email: signedInEmail,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [signedUp, setSignedUp] = useState(signedIn);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: Exclude<FieldKey, "categories">, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const toggleCategory = (category: CategoryId) => {
    setValues((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
    setFieldErrors((current) => ({ ...current, categories: undefined }));
  };

  const provision = async () => {
    const regions = values.regionsText
      .split(",")
      .map((region) => region.trim())
      .filter(Boolean);

    await client.account.provision({
      accountType: values.accountType,
      accountName: values.accountName.trim(),
      categories: values.accountType === "vendor" ? values.categories : [],
      regions: values.accountType === "vendor" ? regions : [],
    });
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = signUpSchema.safeParse(values);

    if (!parsed.success) {
      const nextErrors: Partial<Record<FieldKey, string>> = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path[0];

        if (typeof key === "string" && key in values && !nextErrors[key as FieldKey]) {
          nextErrors[key as FieldKey] = issue.message;
        }
      }

      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (!signedUp) {
        const { error } = await authClient.signUp.email({
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (error) {
          setFormError(error.message ?? "Unable to create your account.");
          return;
        }

        setSignedUp(true);
      }

      await provision();
      await navigate({ to: "/" });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not finish setting up your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVendor = values.accountType === "vendor";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Set up an organization or a vendor account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="sign-up-form" onSubmit={onSubmit}>
          <FieldGroup>
            {formError ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-sm">
                {formError}
              </p>
            ) : null}

            <div
              role="group"
              aria-label="Account type"
              className="grid grid-cols-2 gap-1 rounded-lg border p-1"
            >
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={values.accountType === type.id}
                  onClick={() => {
                    setValues((current) => ({ ...current, accountType: type.id }));
                    setFieldErrors({});
                  }}
                  className={cn(
                    "rounded-md px-3 py-2 font-medium text-sm transition-colors disabled:opacity-60",
                    values.accountType === type.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              {ACCOUNT_TYPES.find((type) => type.id === values.accountType)?.hint}
            </p>

            <Field>
              <FieldLabel htmlFor="name">Your name</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                disabled={signedUp}
              />
              {fieldErrors.name ? <p className="text-xs text-red-600">{fieldErrors.name}</p> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Work email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                disabled={signedUp}
              />
              {fieldErrors.email ? (
                <p className="text-xs text-red-600">{fieldErrors.email}</p>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="accountName">
                {isVendor ? "Company name" : "Organization name"}
              </FieldLabel>
              <Input
                id="accountName"
                name="accountName"
                type="text"
                autoComplete="organization"
                placeholder={isVendor ? "Lagos Office Supply" : "Acme Manufacturing"}
                value={values.accountName}
                onChange={(event) => update("accountName", event.target.value)}
                aria-invalid={Boolean(fieldErrors.accountName)}
              />
              {fieldErrors.accountName ? (
                <p className="text-xs text-red-600">{fieldErrors.accountName}</p>
              ) : null}
            </Field>

            {isVendor ? (
              <>
                <Field>
                  <FieldLabel>Categories</FieldLabel>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CATEGORIES.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={values.categories.includes(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                        <span>{category.label}</span>
                      </label>
                    ))}
                  </div>
                  {fieldErrors.categories ? (
                    <p className="text-xs text-red-600">{fieldErrors.categories}</p>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor="regions">Delivery regions</FieldLabel>
                  <Input
                    id="regions"
                    name="regions"
                    type="text"
                    placeholder="Lagos, Nigeria"
                    value={values.regionsText}
                    onChange={(event) => update("regionsText", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.regionsText)}
                  />
                  <FieldDescription>
                    Comma-separated. Add Nigeria to cover every region.
                  </FieldDescription>
                  {fieldErrors.regionsText ? (
                    <p className="text-xs text-red-600">{fieldErrors.regionsText}</p>
                  ) : null}
                </Field>
              </>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={values.password}
                  onChange={(event) => update("password", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  disabled={signedUp}
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
                {fieldErrors.password ? (
                  <p className="text-xs text-red-600">{fieldErrors.password}</p>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={values.confirmPassword}
                  onChange={(event) => update("confirmPassword", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  disabled={signedUp}
                />
                {fieldErrors.confirmPassword ? (
                  <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                ) : null}
              </Field>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button type="submit" form="sign-up-form" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "Setting up…"
            : signedUp
              ? "Finish setup"
              : isVendor
                ? "Create vendor account"
                : "Create organization"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button
            variant="link"
            className="h-auto p-0"
            nativeButton={false}
            render={<Link to="/login" />}
          >
            Sign in
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
};
