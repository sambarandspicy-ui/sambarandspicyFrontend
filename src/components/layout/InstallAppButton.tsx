"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Download, Check, Laptop, FileDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function triggerDirectDownload() {
  if (typeof window === "undefined") return;
  const origin = window.location.origin || "http://localhost:3000";
  const shortcutContent = `[InternetShortcut]\r\nURL=${origin}/billing\r\nIconFile=${origin}/favicon.ico\r\nIconIndex=0\r\n[{000214A0-0000-0000-C000-000000000046}]\r\nProp3=19,11\r\n`;
  const blob = new Blob([shortcutContent], {
    type: "application/internet-shortcut",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Sambar & Spicy - Desktop.url";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type PwaWindow = Window & {
  __pwaPrompt?: BeforeInstallPromptEvent | null;
};

const emptySubscribe = () => () => {};

function getStandaloneSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    (typeof window.navigator !== "undefined" &&
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true)
  );
}

function subscribeStandalone(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : null;
  media?.addEventListener?.("change", onStoreChange);
  window.addEventListener("appinstalled", onStoreChange);
  return () => {
    media?.removeEventListener?.("change", onStoreChange);
    window.removeEventListener("appinstalled", onStoreChange);
  };
}

function getDeferredPromptSnapshot(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as PwaWindow).__pwaPrompt ?? null;
}

function subscribeDeferredPrompt(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const globalWindow = window as unknown as PwaWindow;

  const handleBeforeInstall = (e: Event) => {
    e.preventDefault();
    globalWindow.__pwaPrompt = e as BeforeInstallPromptEvent;
    onStoreChange();
  };

  const handlePromptAvailable = () => {
    onStoreChange();
  };

  const handleAppInstalled = () => {
    globalWindow.__pwaPrompt = null;
    onStoreChange();
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstall);
  window.addEventListener("pwa-prompt-available", handlePromptAvailable);
  window.addEventListener("appinstalled", handleAppInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
    window.removeEventListener("appinstalled", handleAppInstalled);
  };
}

export function InstallAppButton() {
  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const standaloneInstalled = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    () => false,
  );
  const deferredPrompt = useSyncExternalStore(
    subscribeDeferredPrompt,
    getDeferredPromptSnapshot,
    () => null,
  );
  const [installedByPrompt, setInstalledByPrompt] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const isInstalled = standaloneInstalled || installedByPrompt;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleAppInstalled = () => {
      setInstalledByPrompt(true);
      setDialogOpen(false);
    };
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    const globalWindow =
      typeof window !== "undefined" ? (window as unknown as PwaWindow) : null;
    const prompt = deferredPrompt || globalWindow?.__pwaPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalledByPrompt(true);
          if (globalWindow) {
            globalWindow.__pwaPrompt = null;
            window.dispatchEvent(new Event("pwa-prompt-available"));
          }
          setDialogOpen(false);
          return;
        }
      } catch {
        // Fall back to direct download if prompt invocation fails
      }
    }

    // Directly trigger download of the desktop application shortcut
    triggerDirectDownload();
    setDownloaded(true);
    setDialogOpen(true);
  }

  if (!isReady) return null;

  // If already installed and running standalone, display a subtle indicator
  if (isInstalled) {
    return (
      <span
        className="hidden items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground lg:inline-flex"
        title="Running as installed desktop application"
      >
        <Check size={13} className="text-success" aria-hidden="true" />
        <span>Installed</span>
      </span>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstall}
        className="min-h-9 gap-1.5 rounded-lg border-primary/30 bg-primary/5 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 hover:text-primary sm:inline-flex"
        title="Install or direct download Sambar & Spicy as a Desktop / Laptop application"
        aria-label="Install App"
      >
        <Download size={14} className="stroke-[2.5]" aria-hidden="true" />
        <span className="hidden sm:inline">Install App</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex-row items-center gap-3 bg-muted/40">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-white shadow-xs">
              <Image
                src="/images/icon-192.png"
                alt="Sambar & Spicy App Icon"
                width={48}
                height={48}
                className="size-full object-cover"
                priority
              />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold">
                {downloaded ? "Desktop App Downloaded" : "Install Sambar & Spicy"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Desktop, laptop and mobile app installation
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-4 text-sm">
            {downloaded && (
              <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs text-success">
                <Check size={17} className="mt-0.5 shrink-0 stroke-[2.5]" />
                <div className="space-y-0.5">
                  <strong className="block font-semibold">
                    Desktop Shortcut Downloaded!
                  </strong>
                  <span className="text-foreground/80">
                    Check your browser&apos;s Downloads bar. Drag{" "}
                    <strong>Sambar &amp; Spicy - Desktop.url</strong> to your
                    desktop for instant 1-click counter billing.
                  </span>
                </div>
              </div>
            )}

            {/* Desktop Screenshot Preview */}
            <div className="overflow-hidden rounded-xl border border-border bg-muted/40 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Laptop size={13} className="text-primary" />
                  Desktop App Preview
                </span>
                <span className="text-[10px] text-muted-foreground">1280 × 720</span>
              </div>
              <Image
                src="/images/screenshot-desktop.png"
                alt="Sambar & Spicy Desktop Preview"
                width={400}
                height={225}
                className="w-full object-cover"
              />
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Sparkles size={14} className="text-primary" />
                <span>Benefits of installing on Desktop &amp; Laptop:</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-muted-foreground">
                <li>Instant 1-click launch from desktop icon and taskbar</li>
                <li>Clean standalone window without browser tabs or address bar</li>
                <li>Direct thermal printer integration for fast counter billing</li>
              </ul>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                onClick={() => {
                  triggerDirectDownload();
                  setDownloaded(true);
                }}
                className="w-full min-h-11 gap-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90"
              >
                <FileDown size={17} aria-hidden="true" />
                {downloaded ? "Download Desktop Shortcut Again" : "Direct Download Desktop App"}
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-semibold text-foreground">
                Browser installation options:
              </p>
              <div className="space-y-2.5 rounded-lg border border-border p-3 text-muted-foreground">
                <div>
                  <strong className="block text-foreground">
                    💻 Chrome / Edge (Desktop &amp; Laptop):
                  </strong>
                  Look for the <strong>Install</strong> icon in the right side of the address bar, or click{" "}
                  <strong>Menu (⋮ / …) &gt; Apps &gt; Install Sambar &amp; Spicy</strong>.
                </div>
                <div className="border-t border-border/60 pt-2">
                  <strong className="block text-foreground">
                    🍎 Safari (macOS Sonoma+):
                  </strong>
                  Click <strong>File &gt; Add to Dock...</strong> from the top system menu bar.
                </div>
                <div className="border-t border-border/60 pt-2">
                  <strong className="block text-foreground">
                    📱 Mobile (Android / iOS):
                  </strong>
                  Tap browser menu and select <strong>Add to Home screen</strong> or <strong>Install</strong>.
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            {deferredPrompt && (
              <Button size="sm" onClick={handleInstall} className="gap-1.5">
                <Download size={14} /> Install via Browser
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
