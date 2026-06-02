import { getCoverPageSettings } from "@/lib/coverPage";
import CoverPage from "@/components/cover/CoverPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminCoverPreviewPage() {
  const settings = getCoverPageSettings();
  return (
    <div>
      <div className="bg-ube-purple/10 border-b border-ube-purple/20 px-4 py-2 text-center text-xs font-bold text-ube-purple/70">
        Admin preview — cover page is shown regardless of enabled state
      </div>
      <CoverPage settings={settings} />
    </div>
  );
}
