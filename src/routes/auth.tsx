import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/app/brand";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/app/password-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getDirectory } from "@/lib/directory.functions";
import { completeSignup } from "@/lib/account.functions";
import { ROLE_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff sign in — MaintainX Consulting Group" },
      {
        name: "description",
        content:
          "Sign in or create a MaintainX staff account for hotel managers, receptionists and maintenance technicians.",
      },
      { property: "og:title", content: "Staff sign in — MaintainX Consulting Group" },
      {
        property: "og:description",
        content: "Access the MaintainX hotel maintenance operations dashboard.",
      },
    ],
  }),
  component: AuthPage,
});

const ROLES = ["hotel_manager", "receptionist", "technician"] as const;
const TECHNICIAN_TYPES = [
  { value: "in_house", label: "In-house" },
  { value: "external", label: "Outsourced / External" },
] as const;

function AuthPage() {
  const navigate = useNavigate();
  const loadDirectory = useServerFn(getDirectory);
  const finishSignup = useServerFn(completeSignup);
  const { data: directory } = useQuery({
    queryKey: ["directory"],
    queryFn: () => loadDirectory(),
    staleTime: 5 * 60_000,
  });

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("hotel_manager");
  const [hotelId, setHotelId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [technicianType, setTechnicianType] =
    useState<(typeof TECHNICIAN_TYPES)[number]["value"] | "">("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);

  const isTechnician = role === "technician";
  const needsHotel = !isTechnician || technicianType === "in_house";
  const needsCompany = isTechnician && technicianType === "external";

  function toggleService(id: string, checked: boolean) {
    setServiceIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((s) => s !== id)));
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (signInError) {
      setPending(false);
      return setError(
        /confirm/i.test(signInError.message)
          ? "Please verify your email address first — check your inbox for the verification link."
          : signInError.message,
      );
    }

    // Finish account setup that was deferred until the email was verified.
    const stored = window.localStorage.getItem(PENDING_SIGNUP_KEY);
    if (stored) {
      try {
        await finishSignup({ data: JSON.parse(stored) });
      } catch {
        /* profile may already exist */
      }
      window.localStorage.removeItem(PENDING_SIGNUP_KEY);
    }
    setPending(false);
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (isTechnician && !technicianType)
      return setError("Please select whether you are in-house or outsourced.");
    if (needsHotel && !hotelId) return setError("Please select your hotel.");
    if (needsCompany && !companyId) return setError("Please select your maintenance company.");
    if (isTechnician && serviceIds.length === 0)
      return setError("Please select at least one service you provide.");

    setPending(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });

    if (signUpError) {
      setPending(false);
      return setError(signUpError.message);
    }

    const profilePayload = {
      fullName: fullName.trim(),
      role,
      hotelId: needsHotel ? hotelId : null,
      companyId: needsCompany ? companyId : null,
      technicianType: isTechnician ? technicianType || null : null,
      serviceIds: isTechnician ? serviceIds : [],
    };

    if (!data.session) {
      window.localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(profilePayload));
      setPending(false);
      toast.success(
        "Account created — verify your email address using the link we just sent, then sign in.",
      );
      return;
    }


    try {
      await finishSignup({
        data: {
          fullName: fullName.trim(),
          role,
          hotelId: needsHotel ? hotelId : null,
          companyId: needsCompany ? companyId : null,
          technicianType: isTechnician ? technicianType || null : null,
          serviceIds: isTechnician ? serviceIds : [],
        },
      });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish creating your account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-hero hidden flex-col justify-between p-10 lg:flex">
        <Brand inverted />
        <div>
          <h2 className="max-w-sm text-3xl font-extrabold tracking-tight text-white">
            One operations platform for every maintenance request.
          </h2>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            Guests report. AI classifies. Your team resolves — with full visibility from ticket
            creation to sign-off.
          </p>
        </div>
        <p className="text-xs text-white/50">MaintainX Consulting Group</p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2 p-4">
          <Link to="/" className="lg:hidden">
            <Brand />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <ArrowLeft className="size-4" aria-hidden /> Back to Home
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md flex-1 px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">Staff access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hotel managers, receptionists and technicians only. Guests can{" "}
            <Link to="/report" className="font-medium text-primary underline-offset-4 hover:underline">
              report an issue without an account
            </Link>
            .
          </p>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Work email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Password</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Work email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm password</Label>
                  <PasswordInput
                    id="signup-confirm-password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as (typeof ROLES)[number])}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isTechnician && (
                  <div className="space-y-2">
                    <Label htmlFor="technician-type">Technician type</Label>
                    <Select
                      value={technicianType}
                      onValueChange={(v) => {
                        setTechnicianType(v as (typeof TECHNICIAN_TYPES)[number]["value"]);
                        setHotelId("");
                        setCompanyId("");
                      }}
                    >
                      <SelectTrigger id="technician-type">
                        <SelectValue placeholder="Select in-house or outsourced" />
                      </SelectTrigger>
                      <SelectContent>
                        {TECHNICIAN_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {needsCompany && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Maintenance company</Label>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger id="company">
                        <SelectValue placeholder="Select your company" />
                      </SelectTrigger>
                      <SelectContent>
                        {(directory?.companies ?? []).map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {needsHotel && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-hotel">Hotel</Label>
                    <Select value={hotelId} onValueChange={setHotelId}>
                      <SelectTrigger id="signup-hotel">
                        <SelectValue placeholder="Select your hotel" />
                      </SelectTrigger>
                      <SelectContent>
                        {(directory?.hotels ?? []).map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isTechnician && (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Services provided</legend>
                    <div className="space-y-2 rounded-md border border-input p-3">
                      {(directory?.services ?? []).map((service) => (
                        <div key={service.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`service-${service.id}`}
                            checked={serviceIds.includes(service.id)}
                            onCheckedChange={(checked) =>
                              toggleService(service.id, checked === true)
                            }
                          />
                          <Label htmlFor={`service-${service.id}`} className="font-normal">
                            {service.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Select at least one service.</p>
                  </fieldset>
                )}

                {error && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
