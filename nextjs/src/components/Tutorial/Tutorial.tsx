"use client";

import { useEffect, useRef } from "react";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

interface TutorialProps {
  steps: DriveStep[];
  /** Drive immediately on mount. Default: true. */
  autoStart?: boolean;
  /** Called once when the tour reaches its last step or is dismissed. */
  onFinished?: () => void;
}

/**
 * Thin React wrapper around driver.js. Created on mount, destroyed on
 * unmount — the underlying driver instance is not exposed to consumers
 * because the only signal we care about is "tour finished/dismissed",
 * which onFinished covers.
 *
 * Auto-respects `prefers-reduced-motion: reduce` by disabling smooth
 * scroll between steps.
 */
export default function Tutorial({ steps, autoStart = true, onFinished }: TutorialProps) {
  // Mutable ref keeps the latest callback without re-instantiating driver
  // when a parent rerender swaps the function identity.
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (!autoStart) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let firedFinished = false;
    const fireFinishedOnce = () => {
      if (firedFinished) return;
      firedFinished = true;
      onFinishedRef.current?.();
    };

    const driverObj: Driver = driver({
      showProgress: true,
      smoothScroll: !reduceMotion,
      allowClose: true,
      stagePadding: 4,
      popoverClass: "bc-tutorial",
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Próximo →",
      prevBtnText: "← Anterior",
      doneBtnText: "Concluído",
      steps,
      // User clicked the X — fire finished and let driver tear itself down.
      onDestroyStarted: () => {
        fireFinishedOnce();
        driverObj.destroy();
      },
      // Reached after the last "Concluído" click OR after destroy().
      onDestroyed: () => {
        fireFinishedOnce();
      },
    });

    driverObj.drive();

    return () => {
      // StrictMode double-mount or component unmount mid-tour — clean up
      // the overlay so it doesn't leak past the page.
      driverObj.destroy();
    };
  }, [steps, autoStart]);

  return null;
}
