import type { Metadata, Viewport } from "next";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ScrollIndicators } from "@/components/shared/ScrollIndicators";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
export const metadata: Metadata = {
  title: "Sambar & Spicy",
  description: "Restaurant workspace",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sambar & Spicy",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#17552f",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.classList.toggle("dark",localStorage.getItem("sambar-spicy-theme")==="dark")}catch(e){}
window.__pwaPrompt=null;
window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__pwaPrompt=e;window.dispatchEvent(new Event("pwa-prompt-available"));});
if("serviceWorker" in navigator){var r=function(){navigator.serviceWorker.register("/sw.js").catch(function(){});};if(document.readyState==="complete"||document.readyState==="interactive"){r();}else{window.addEventListener("load",r);}}`,
          }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <ScrollIndicators />
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
