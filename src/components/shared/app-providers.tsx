"use client";

import type { ReactNode } from "react";

import { AppToaster } from "@/components/shared/app-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/components/shared/query-provider";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import type { PreferencesState } from "@/stores/preferences/preferences-store";

type AppProvidersProps = {
  children: ReactNode;
  preferences: {
    themeMode: PreferencesState["themeMode"];
    themePreset: PreferencesState["themePreset"];
    font: PreferencesState["font"];
    contentLayout: PreferencesState["contentLayout"];
    navbarStyle: PreferencesState["navbarStyle"];
  };
};

export function AppProviders({ children, preferences }: Readonly<AppProvidersProps>) {
  return (
    <TooltipProvider>
      <PreferencesStoreProvider
        themeMode={preferences.themeMode}
        themePreset={preferences.themePreset}
        contentLayout={preferences.contentLayout}
        navbarStyle={preferences.navbarStyle}
        font={preferences.font}
      >
        <QueryProvider>
          {children}
          <AppToaster />
        </QueryProvider>
      </PreferencesStoreProvider>
    </TooltipProvider>
  );
}
