"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/session/", "/join/"];

type DeferredBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const INSTALL_DISMISS_KEY = "kokmanager_pwa_install_dismissed";
const IOS_DISMISS_KEY = "kokmanager_pwa_ios_dismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

function wasDismissedRecently(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(key);

    if (!stored) {
      return false;
    }

    const dismissedAt = Number(stored);

    if (!Number.isFinite(dismissedAt)) {
      window.localStorage.removeItem(key);
      return false;
    }

    if (Date.now() - dismissedAt < DISMISS_DURATION_MS) {
      return true;
    }

    window.localStorage.removeItem(key);
    return false;
  } catch {
    return false;
  }
}

function dismissForOneDay(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    // Ignore storage failures.
  }
}

function getPwaEnvironment() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      isMobile: false,
      isIOS: false,
      isSafari: false,
      isStandalone: false,
      isInAppBrowser: false,
    };
  }

  const userAgent = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isMobile = isIOS || isAndroid;
  const isSafari =
    isIOS &&
    /Safari/i.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|Instagram|KAKAOTALK/i.test(userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const isInAppBrowser =
    /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|Line|NAVER|DaumApps|WebView|; wv\)/i.test(
      userAgent
    );

  return {
    isMobile,
    isIOS,
    isSafari,
    isStandalone,
    isInAppBrowser,
  };
}

export default function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] =
    useState<DeferredBeforeInstallPromptEvent | null>(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const env = useMemo(getPwaEnvironment, []);

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!env.isMobile || env.isStandalone) {
      return;
    }

    const installDismissed = wasDismissedRecently(INSTALL_DISMISS_KEY);
    const iosDismissed = wasDismissedRecently(IOS_DISMISS_KEY);

    if (env.isIOS && env.isSafari && !iosDismissed) {
      setIosVisible(true);
    }

    if (env.isInAppBrowser && !installDismissed) {
      setInstallVisible(true);
    }
  }, [env]);

  useEffect(() => {
    if (!env.isMobile || env.isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredBeforeInstallPromptEvent);
      setInstallVisible(!wasDismissedRecently(INSTALL_DISMISS_KEY));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [env]);

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      if (result.outcome === "accepted") {
        setInstallVisible(false);
        try {
          window.localStorage.removeItem(INSTALL_DISMISS_KEY);
        } catch {
          // Ignore storage failures.
        }
      }
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }

  if (!env.isMobile || env.isStandalone || isPublicPage) {
    return null;
  }

  const showInstallBanner = installVisible && (deferredPrompt || env.isInAppBrowser);

  return (
    <>
      {showInstallBanner ? (
        <div className="sticky top-[57px] z-[95] px-4 pt-3 sm:top-[61px] sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[1.4rem] border border-slate-200 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">
                  콕매니저🏸를 홈 화면 앱으로 설치해보세요
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  {env.isInAppBrowser
                    ? env.isIOS
                      ? "카카오톡 브라우저에서는 바로 설치가 어려워요. 하단 공유 버튼에서 Safari로 연 뒤 홈 화면에 추가해주시면 됩니다."
                      : "카카오톡 브라우저에서는 바로 설치가 어려워요. 우측 상단 메뉴에서 Chrome으로 연 뒤 홈 화면에 추가해주시면 됩니다."
                    : "링크를 다시 찾지 않고, 앱처럼 바로 실행할 수 있습니다."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!env.isInAppBrowser ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleInstall();
                    }}
                    disabled={installing}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {installing ? "설치 준비 중.." : "앱 설치"}
                  </button>
                ) : env.isInAppBrowser && !env.isIOS ? (
                  <a
                    href={
                      typeof window !== "undefined"
                        ? `intent://${window.location.href.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`
                        : "#"
                    }
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    Chrome에서 열기
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    dismissForOneDay(INSTALL_DISMISS_KEY);
                    setInstallVisible(false);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  나중에
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {iosVisible ? (
        <div className="sticky top-[57px] z-[94] px-4 pt-3 sm:top-[61px] sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[1.4rem] border border-amber-200 bg-amber-50/95 p-4 shadow-[0_20px_60px_rgba(245,158,11,0.10)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">
                  아이폰에서는 Safari에서 홈 화면에 추가해주세요
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
                  하단 공유 버튼에서{" "}
                  <span className="font-bold text-slate-900">
                    홈 화면에 추가
                  </span>
                  를 누르면 콕매니저🏸를 앱처럼 바로 실행할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  dismissForOneDay(IOS_DISMISS_KEY);
                  setIosVisible(false);
                }}
                className="shrink-0 rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-amber-100"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
