import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader as Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccount } from "@/hooks/useAccount";
import { getMyAccount, updateMyProfile } from "@/lib/account.functions";
import { ROLE_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MaintainX" },
      { name: "description", content: "Update your profile details and phone number." },
      { property: "og:title", content: "Settings — MaintainX" },
      { property: "og:description", content: "Update your profile details and phone number." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { account, isLoading, isTechnician, isManager } = useAccount();
  const technicianOnly = isTechnician && !isManager;
  const saveProfile = useServerFn(updateMyProfile);
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialise form fields once the account loads
  if (!initialized && account?.profile) {
    setPhone(account.profile.phone ?? "");
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: () =>
      saveProfile({
        data: { fullName: (account?.profile?.full_name ?? "").trim(), phone: phone.trim() },
      }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Profile updated");
        queryClient.invalidateQueries({ queryKey: ["account"] });
      } else {
        setError(result.error);
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  }

  const profile = account?.profile;
  const roles = account?.roles ?? [];

  return (
    <AppShell title="Settings" description="Update your profile details">
      <div className="mx-auto max-w-xl space-y-6">
        {isLoading || !profile ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <section className="surface-panel p-5">
              <h2 className="text-sm font-semibold">Account information</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{profile.email ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium">{roles.map((r) => ROLE_LABELS[r]).join(", ")}</dd>
                </div>
                {technicianOnly && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Registered services</dt>
                    <dd className="text-right font-medium">
                      {(account?.services ?? []).length > 0
                        ? (account?.services ?? []).map((s) => s.name).join(", ")
                        : "—"}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Organisation</dt>
                  <dd className="font-medium">
                    {(profile as { hotels?: { name?: string } | null })?.hotels?.name ??
                      (profile as { maintenance_companies?: { name?: string } | null })
                        ?.maintenance_companies?.name ??
                      "—"}
                  </dd>
                </div>
              </dl>
            </section>

            {isManager && <EmailConfigPanel />}



            <form onSubmit={handleSubmit} className="surface-panel space-y-4 p-5" noValidate>
              <h2 className="text-sm font-semibold">Edit profile</h2>

              <div className="space-y-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input id="full-name" value={profile.full_name ?? ""} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  Your name is set at account creation and cannot be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+27 21 555 0100"
                  maxLength={40}
                />
                <p className="text-xs text-muted-foreground">
                  Used by the team to contact you about maintenance work.
                </p>
              </div>

              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save changes
              </Button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
