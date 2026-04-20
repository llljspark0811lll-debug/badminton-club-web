"use client";

import { useEffect, useMemo, useState } from "react";

const DISMISS_KEY = "kokmanager_inapp_notice_dismissed_v2";

function getInAppBrowserState() {
  if (typeof navigator === "undefined") {
    return {
      isInAppBrowser: false,
      targetBrowser: "Chrome",
      menuHint: "우측 상단 메뉴",
    };
  }

  const userAgent = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isInAppBrowser =
    /KAKAOTALK|Instagram|FBAN|FBAV|FB_IAB|Line|NAVER|DaumApps|WebView|; wv\)/i.test(
      userAgent
    );

  return {
    isInAppBrowser: isMobile && isInAppBrowser,
    targetBrowser: isIOS ? "Safari" : "Chrome",
    menuHint: isIOS ? "하단 공유 버튼" : "우측 상단 메뉴",
  };
}

export default function InAppBrowserNotice() {
  const [visible, setVisible] = useState(false);
  const browserState = useMemo(getInAppBrowserState, []);

  useEffect(() => {
    if (!browserState.isInAppBrowser) {
      document.documentElement.removeAttribute("data-in-app-browser");
      return;
    }

    document.documentElement.setAttribute("data-in-app-browser", "true");

    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY) === "true";
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }

    return () => {
      document.documentElement.removeAttribute("data-in-app-browser");
    };
  }, [browserState.isInAppBrowser]);

  if (!browserState.isInAppBrowser || !visible) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[100] border-b border-sky-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-900 sm:text-sm">
            콕매니저🏸를 앱처럼 쓰려면 {browserState.targetBrowser}에서
            열어주세요
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">
            현재 인앱브라우저에서는 설치 메뉴가 잘 보이지 않을 수 있어요.
            <br />
            {browserState.menuHint}에서{" "}
            <span className="font-semibold text-slate-700">
              {browserState.targetBrowser}에서 열기
            </span>{" "}
            후 홈 화면에 추가하면 더 앱처럼 사용할 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(DISMISS_KEY, "true");
            } catch {
              // Ignore storage failures and just hide the banner.
            }
            setVisible(false);
          }}
          className="shrink-0 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
