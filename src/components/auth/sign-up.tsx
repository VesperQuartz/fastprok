import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignUpValues = z.infer<typeof signUpSchema>;

const initialValues: SignUpValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const SignUp = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignUpValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof SignUpValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = signUpSchema.safeParse(values);

    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof SignUpValues, string>> = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path[0];

        if (typeof key === "string" && key in values && !nextErrors[key as keyof SignUpValues]) {
          nextErrors[key as keyof SignUpValues] = issue.message;
        }
      }

      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const { error } = await authClient.signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        setFormError(error.message ?? "Unable to create your account.");
        return;
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
      return;
    } finally {
      setIsSubmitting(false);
    }

    await navigate({ to: "/" });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Start running procurement requests with the agent.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="sign-up-form" onSubmit={onSubmit}>
          <FieldGroup>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? <p className="text-xs text-red-600">{fieldErrors.name}</p> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? (
                <p className="text-xs text-red-600">{fieldErrors.email}</p>
              ) : null}
            </Field>

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
              />
              {fieldErrors.confirmPassword ? (
                <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
              ) : null}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button type="submit" form="sign-up-form" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
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
