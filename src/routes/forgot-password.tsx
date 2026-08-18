import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — MaintainX Consulting Group" },
      {
        name: "description",
        content: "Request a password reset link for your MaintainX staff account.",
      },
      { property: "og:title", content: "Reset your password — MaintainX Consulting Group" },
      {
        property: "og:description",
        content: "Request a password reset link for your MaintainX staff account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    // Errors are intentionally not surfaced: never reveal whether an account exists.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between p-4">
        <Link to="/">
          <Brand />
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email address associated with your account and we'll send you a password reset
          link.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-md border border-border bg-muted/40 p-4 text-sm font-medium">
              Check your email for a password reset link.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending || !email.trim()}>
              {pending && <Loader2 className="size-4 animate-spin" />} Send Reset Link
            </Button>
            <Link
              to="/auth"
              className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}