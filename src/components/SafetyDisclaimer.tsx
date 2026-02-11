/**
 * Persistent safety disclaimer shown at the bottom of identification results
 * and other safety-relevant pages.
 */
export function SafetyDisclaimer({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-red-700 text-center py-2">
        Never eat a wild mushroom based solely on this app. Always cross-reference and consult an expert.
      </p>
    );
  }

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 space-y-2">
      <p className="font-bold">Important Safety Disclaimer</p>
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>This app is a learning aid, not a definitive identification tool.</li>
        <li>Never eat any wild mushroom based solely on this app&apos;s output.</li>
        <li>Always cross-reference with at least two authoritative field guides.</li>
        <li>Consult an experienced forager before eating any wild mushroom for the first time.</li>
        <li>Some deadly species closely resemble edible ones — when in doubt, leave it out.</li>
        <li>The developers accept no liability for misidentification or poisoning.</li>
      </ul>
    </div>
  );
}
