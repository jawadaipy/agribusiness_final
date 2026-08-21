import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

/**
 * OfflineBanner
 *
 * Detects loss of network connectivity and shows an amber warning bar.
 * Auto-dismisses 3 seconds after the user reconnects.
 * Common scenario for farmers on mobile data in rural areas.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      setVisible(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Auto-dismiss the "reconnected" message after 3 seconds
      setTimeout(() => {
        setVisible(false);
        setShowReconnected(false);
      }, 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Show on mount if already offline
    if (!navigator.onLine) {
      setIsOnline(false);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-3",
        "text-sm font-bold text-center transition-all duration-500",
        isOnline && showReconnected
          ? "bg-primary text-white"
          : "bg-amber-500 text-amber-950"
      )}
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        {isOnline ? "wifi" : "wifi_off"}
      </span>
      <span>
        {isOnline && showReconnected
          ? t("offline_reconnected")
          : t("offline_banner")}
      </span>
      {!isOnline && (
        <button
          onClick={() => setVisible(false)}
          className="ml-auto opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss offline notice"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}
