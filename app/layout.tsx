import type React from "react"
import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"
import { ErrorReporter, ConsoleReporter, ReactErrorBoundary } from "@/components/error-reporter"
import { AppAnalytics } from "@/components/app-analytics"

export const metadata: Metadata = {
  title: "Owner Job & Estimate Workbench",
  description: "Price jobs, prepare estimates, and manage owner approvals.",
  icons: "/favicon.ico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ReactErrorBoundary>
          <TooltipProvider>{children}</TooltipProvider>
        </ReactErrorBoundary>
        <Toaster />
        <ErrorReporter />
        <ConsoleReporter />
        <AppAnalytics />
      </body>
    </html>
  );
}
