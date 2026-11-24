"use client";
import { useState } from "react";
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
export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-12 gap-2 px-1 text-left sm:px-2"
            aria-label="Account menu"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {user?.full_name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((x) => x[0])
                .join("")
                .toUpperCase()}
            </span>
            <span className="hidden sm:block">
              <strong>{user?.username}</strong>
              <small className="block text-xs font-normal text-muted-foreground">
                {user?.role.replace("_", " ")}
              </small>
            </span>
            <ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8}>
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Signed in as <strong>{user?.username}</strong>
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
