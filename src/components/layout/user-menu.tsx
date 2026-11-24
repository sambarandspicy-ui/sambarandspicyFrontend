"use client";
import { useState, useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { dataMode } from "@/services/api";
import { ResetDemoDialog } from "@/components/shared/ResetDemoDialog";
import { Button } from "@/components/ui/button";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-12 gap-2 px-1 text-left sm:px-2"
            aria-label="Account menu"
          >
            <div className="relative shrink-0">
              <span className="grid size-9 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {user?.full_name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((x) => x[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <span
                className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card ${
                  online ? "bg-emerald-500" : "bg-destructive"
                }`}
                title={online ? "Online" : "Offline"}
                aria-label={online ? "Online" : "Offline"}
              />
            </div>
            <span className="hidden sm:block">
              <strong>{user?.username}</strong>
              <small className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span>{user?.role.replace("_", " ")}</span>
                <span className="text-[10px] opacity-70">•</span>
                <span className={online ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-destructive font-medium"}>
                  {online ? "Online" : "Offline"}
                </span>
              </small>
            </span>
            <ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8}>
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  online ? "bg-emerald-500" : "bg-destructive"
                }`}
              />
              <span>{online ? "Connected (Online)" : "Disconnected (Offline)"}</span>
            </div>
            <span className="mt-1 block">
              Signed in as <strong>{user?.username}</strong>
            </span>
          </div>
          <DropdownMenuSeparator />
          {dataMode === "mock" && (
            <DropdownMenuItem onSelect={() => setResetOpen(true)}>
              <RotateCcw size={16} /> Reset Demo Data
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              void logout().then(() => router.replace("/login"));
            }}
          >
            <LogOut size={16} /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dataMode === "mock" && (
        <ResetDemoDialog
          open={resetOpen}
          onOpenChange={setResetOpen}
          onDone={() => router.replace("/login?reason=demo_reset")}
        />
      )}
    </>
  );
}
