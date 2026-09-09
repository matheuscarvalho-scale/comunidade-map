import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { SEOHead } from "@/components/SEOHead";
import { useFeatureGateAdminBar } from "@/components/FeatureGate";
import { useAnalytics } from "@/hooks/useAnalytics";
import { MentoriasMigrationNoticeModal } from "@/components/MentoriasMigrationNoticeModal";
import { useMentoriasMigrationNotice } from "@/hooks/useMentoriasMigrationNotice";
import { CnpjRegularizationModal } from "@/components/CnpjRegularizationModal";
import { useCnpjRegularization } from "@/hooks/useCnpjRegularization";
import { AccountingRegularizationModal } from "@/components/AccountingRegularizationModal";
import { useAccountingRegularization } from "@/hooks/useAccountingRegularization";
import { useAttributionSync } from "@/hooks/useAttributionSync";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const adminBar = useFeatureGateAdminBar();
  useAnalytics();
  useAttributionSync();
  const { shouldShow, dismiss, isDismissing } = useMentoriasMigrationNotice();
  const cnpjNotice = useCnpjRegularization();
  const accountingNotice = useAccountingRegularization();


  return (
    <div className="flex min-h-screen w-full bg-background">
      <SEOHead title="MAP Acelera" />
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-x-hidden">
        <AppHeader />
        <main className="flex-1">
          <div className="container mx-auto max-w-7xl px-4 pt-20 pb-6 md:px-6 md:pt-20 md:pb-8 md:pl-8">
            {adminBar}
            {children}
          </div>
        </main>
      </div>
      <MentoriasMigrationNoticeModal open={shouldShow} onDismiss={dismiss} disabled={isDismissing} />
      <CnpjRegularizationModal
        open={!shouldShow && cnpjNotice.shouldShow}
        onSave={cnpjNotice.save}
        saving={cnpjNotice.isSaving}
      />
      <AccountingRegularizationModal
        open={!shouldShow && !cnpjNotice.shouldShow && accountingNotice.shouldShow}
        initialUsesAccounting={accountingNotice.initialUsesAccounting}
        initialAccountingService={accountingNotice.initialAccountingService}
        onSave={accountingNotice.save}
        saving={accountingNotice.isSaving}
      />

    </div>
  );
}

