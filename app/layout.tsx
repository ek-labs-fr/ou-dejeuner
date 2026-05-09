import type { Metadata } from "next";
import "./globals.css";

import { IdentityBootstrap } from "@/app/components/IdentityBootstrap";
import { IdentityProvider } from "@/app/components/IdentityProvider";
import { ReadonlyBanner } from "@/app/components/ReadonlyBanner";
import { getTier } from "@/lib/gate-server";

export const metadata: Metadata = {
  title: "Où Déjeuner",
  description: "Lunch picker for the office",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tier = await getTier();

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {tier === "readonly" && <ReadonlyBanner />}
        {tier === "full" ? (
          <IdentityProvider>
            <IdentityBootstrap />
            {children}
          </IdentityProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
