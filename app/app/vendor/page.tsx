import Link from "next/link";
import { VendorOnboardingExperience } from "../components/vendor-onboarding-experience";

export default function VendorOnboardingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans text-zinc-950">
      <div className="border-b border-zinc-200 bg-white px-6 py-3">
        <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-950">
          ← Back to GTM Brief
        </Link>
      </div>
      <main className="flex flex-1 flex-col">
        <VendorOnboardingExperience />
      </main>
    </div>
  );
}
