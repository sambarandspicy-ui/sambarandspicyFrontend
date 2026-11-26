"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { ArrowRight, Lock, User as UserIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { dataMode } from "@/services/api";
import { ApiError } from "@/types/api";
import { WorkspaceLoading } from "@/components/shared/WorkspaceLoading";
import { ResetDemoDialog } from "@/components/shared/ResetDemoDialog";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { useAuth } from "@/providers/auth-provider";
import type { Role } from "@/types/auth";

const subscribeLocation = () => () => {};
const schema = z.object({
  username: z.string().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export default function Login() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [banner, setBanner] = useState("");
  const [pending, setPending] = useState<"form" | Role | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const reason = useSyncExternalStore(
    subscribeLocation,
    () => new URLSearchParams(window.location.search).get("reason") ?? "",
    () => "",
  );
  const notice =
    banner ||
    (reason === "session_expired"
      ? "Your session has expired. Please sign in again."
      : reason === "demo_reset"
        ? "Demo data was reset successfully."
        : "");

  useEffect(() => {
    if (ready && user) router.replace("/billing");
  }, [ready, user, router]);

  async function demo(role: Role) {
    if (pending) return;
    setPending(role);
    const username = {
      ADMIN: "admin",
      BILLING: "cashier",
      READ_ONLY: "viewer",
    }[role];
    try {
      setError("");
      await login(username, "demo");
      router.replace("/billing");
    } catch {
      setPending(null);
      setError(
        "Demo login failed. The account may be inactive or its credentials changed.",
      );
    }
  }

  async function submit(values: Values) {
    if (pending) return;
    setPending("form");
    try {
      setError("");
      await login(values.username, values.password);
      router.replace("/billing");
    } catch (error) {
      setPending(null);
      setError(
        error instanceof ApiError && (error.status === 0 || error.status >= 500)
          ? "Could not reach the server. Check your connection and try again."
          : "Invalid username or password, or account inactive.",
      );
    }
  }

  if (!ready || user) {
    return (
      <WorkspaceLoading
        message={user ? "Opening workspace..." : "Loading workspace..."}
      />
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <OfflineBanner />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 sm:px-6">
        <Card className="overflow-hidden border-[#b99a46]/40 shadow-xl">
          <div className="border-b border-[#b99a46]/40 bg-[#103b20] px-5 py-5 text-[#fff9e9] sm:px-6">
            <div className="flex items-center gap-3.5">
              <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-[#d6b45e] bg-[#092b16] shadow-md">
                <Image
                  src="/images/Sambar&SpicyRestaurantLogo.png"
                  alt="Sambar & Spicy Logo"
                  width={48}
                  height={48}
                  className="size-full object-cover"
                  priority
                />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ebc96f]">
                  Restaurant Workspace
                </p>
                <p className="truncate text-lg font-bold tracking-tight text-[#fff7dc]">
                  Sambar &amp; Spicy
                </p>
              </div>
            </div>
          </div>

          <CardHeader className="pb-3">
            <CardTitle className="text-xl sm:text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access counter billing, inventory, and reports.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {notice && (
              <Alert variant="info" role="status" className="mb-4">
                {notice}
              </Alert>
            )}
            <form
              onSubmit={handleSubmit(submit)}
              noValidate
              className="space-y-4"
            >
              <FormField
                label="Username"
                htmlFor="username"
                required
                error={errors.username?.message}
              >
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="Enter your username"
                  leadingIcon={<UserIcon className="size-4" />}
                  error={Boolean(errors.username)}
                  {...register("username")}
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="password"
                required
                error={errors.password?.message}
              >
                <Input
                  id="password"
                  type="password"
                  showPasswordToggle
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  leadingIcon={<Lock className="size-4" />}
                  error={Boolean(errors.password)}
                  {...register("password")}
                />
              </FormField>

              {error && (
                <Alert variant="destructive" role="alert">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={pending === "form"}
                disabled={pending !== null}
                rightIcon={<ArrowRight size={17} aria-hidden="true" />}
              >
                {pending === "form" ? "Signing in..." : "Sign in"}
              </Button>
              <span className="sr-only" role="status">
                {pending === "form" ? "Signing in, please wait." : ""}
              </span>
            </form>

            {dataMode === "mock" && (
              <div className="mt-6 border-t border-border pt-5">
                <div className="flex justify-between gap-2 text-sm font-semibold">
                  <span>Quick demo login</span>
                  <span className="font-normal text-muted-foreground">
                    Choose a role
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    className="h-auto min-h-16 flex-col gap-1 whitespace-normal py-2"
                    aria-label="Admin"
                    disabled={pending !== null}
                    onClick={() => void demo("ADMIN")}
                  >
                    <strong>{pending === "ADMIN" ? "Signing in..." : "Admin"}</strong>
                    <small>Store Admin</small>
                    <span className="text-xs font-normal text-muted-foreground">
                      Full access
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto min-h-16 flex-col gap-1 whitespace-normal py-2"
                    aria-label="Billing"
                    disabled={pending !== null}
                    onClick={() => void demo("BILLING")}
                  >
                    <strong>{pending === "BILLING" ? "Signing in..." : "Billing"}</strong>
                    <small>Counter Cashier</small>
                    <span className="text-xs font-normal text-muted-foreground">
                      Billing only
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto min-h-16 flex-col gap-1 whitespace-normal py-2"
                    aria-label="Read only"
                    disabled={pending !== null}
                    onClick={() => void demo("READ_ONLY")}
                  >
                    <strong>{pending === "READ_ONLY" ? "Signing in..." : "Read only"}</strong>
                    <small>Account Viewer</small>
                    <span className="text-xs font-normal text-muted-foreground">
                      View access
                    </span>
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Demo credentials: admin, cashier or viewer / demo
                </p>
                <Button
                  variant="link"
                  className="mt-2 h-auto min-h-0 p-0"
                  onClick={() => setResetOpen(true)}
                >
                  Reset Demo Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Single outlet <span className="px-1">&middot;</span> Counter operations
        </p>
      </div>
      {dataMode === "mock" && (
        <ResetDemoDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          onDone={() => setBanner("Demo data was reset successfully.")}
        />
      )}
    </main>
  );
}
