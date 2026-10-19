"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MAX_WAIT = 15000;

function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const startedAtRef = useRef(0);
  const lastLocationRef = useRef("");

  const finish = useCallback(() => {
    if (!startedAtRef.current) return;
    setProgress(100);
    clearInterval(timerRef.current);
    timerRef.current = null;
    clearTimeout(finishTimerRef.current);
    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      startedAtRef.current = 0;
    }, 220);
  }, []);

  const start = useCallback(() => {
    if (startedAtRef.current) return;
    startedAtRef.current = Date.now();
    setVisible(true);
    setProgress(8);
    timerRef.current = setInterval(() => {
      setProgress((current) => current >= 88 ? current : Math.min(88, current + Math.max(0.4, (88 - current) * 0.08)));
    }, 180);
    finishTimerRef.current = setTimeout(finish, MAX_WAIT);
  }, [finish]);

  useEffect(() => {
    const handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      start();
    };
    const handlePopState = () => start();
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [start]);

  useEffect(() => {
    const location = `${pathname}?${searchParams.toString()}`;
    if (lastLocationRef.current && location !== lastLocationRef.current) finish();
    lastLocationRef.current = location;
  }, [pathname, searchParams, finish]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(finishTimerRef.current);
  }, []);

  return (
    <div
      className={`navigation-progress${visible ? " navigation-progress--visible" : ""}`}
      role="progressbar"
      aria-label="Page loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-hidden={!visible}
      style={{ transform: `scaleX(${progress / 100})` }}
    />
  );
}

export default function NavigationProgress() {
  return <Suspense fallback={null}><NavigationProgressBar /></Suspense>;
}
