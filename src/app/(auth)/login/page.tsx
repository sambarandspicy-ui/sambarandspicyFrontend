"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
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
import { Label } from "@/components/ui/label";
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
  const [showPassword, setShowPassword] = useState(false);
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
  if (!ready || user)
    return <WorkspaceLoading message={user ? "Opening workspace..." : "Loading workspace..."} />;
  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6">
      <OfflineBanner />
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-7 flex items-center justify-center gap-3 text-lg font-bold">
          <span className="relative grid size-12 place-items-center overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-md">
            <Image
              src="/images/Sambar&SpicyRestaurantLogo.png"
              alt="Sambar & Spicy Logo"
              width={48}
              height={48}
              className="size-full object-cover"
              priority
            />
          </span>
          <span>Sambar &amp; Spicy</span>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <span className="text-xs font-bold tracking-widest text-primary">
              RESTAURANT WORKSPACE
            </span>
            <CardTitle className="mt-1 text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to manage your restaurant.
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
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="Enter your username"
                  aria-invalid={!!errors.username}
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    aria-invalid={!!errors.password}
                    className="pr-12"
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 size-11 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-controls="password"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              {error && (
                <Alert variant="destructive" role="alert">
                  {error}
                </Alert>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={pending !== null} aria-busy={pending === "form"}>
                {pending === "form" ? <><LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Signing in...</> : <>Sign in <ArrowRight size={17} aria-hidden="true" /></>}
              </Button>
              <span className="sr-only" role="status">{pending === "form" ? "Signing in, please wait." : ""}</span>
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
                    className="h-auto min-h-16 flex-col gap-1 whitespace-normal"
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
                    className="h-auto min-h-16 flex-col gap-1 whitespace-normal"
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
                    className="h-auto min-h-16 flex-col gap-1 whitespace-normal"
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
                  className="mt-2 h-auto p-0"
                  onClick={() => setResetOpen(true)}
                >
                  Reset Demo Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Single outlet <span className="px-1">&middot;</span> Counter
          operations
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
