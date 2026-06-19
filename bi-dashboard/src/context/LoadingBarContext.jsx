import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

const LoadingBarContext = createContext(null);

const NAV_PULSE_MS = 420;

/**
 * Fixed indeterminate bar at top of viewport during route changes or tracked async work.
 */
function TopLoadingBar({ active }) {
  return (
    <div
      className="bi-top-loading-bar"
      data-active={active ? "true" : "false"}
      role="progressbar"
      aria-hidden={!active}
      aria-valuemin={0}
      aria-valuemax={1}
    >
      <div className="bi-top-loading-bar__track">
        <div className="bi-top-loading-bar__chunk" />
      </div>
    </div>
  );
}

function NavigationPulse({ onPulse }) {
  const location = useLocation();
  const onPulseRef = useRef(onPulse);
  onPulseRef.current = onPulse;

  useEffect(() => {
    onPulseRef.current(true);
    const t = window.setTimeout(() => onPulseRef.current(false), NAV_PULSE_MS);
    return () => {
      window.clearTimeout(t);
      onPulseRef.current(false);
    };
  }, [location.key]);

  return null;
}

export function LoadingBarProvider({ children }) {
  const [taskCount, setTaskCount] = useState(0);
  const [navPulse, setNavPulse] = useState(false);

  const beginTask = useCallback(() => {
    setTaskCount((c) => c + 1);
  }, []);

  const endTask = useCallback(() => {
    setTaskCount((c) => Math.max(0, c - 1));
  }, []);

  const setNavPulseStable = useCallback((v) => {
    setNavPulse(Boolean(v));
  }, []);

  const value = useMemo(
    () => ({ beginTask, endTask }),
    [beginTask, endTask]
  );

  const barActive = taskCount > 0 || navPulse;

  return (
    <LoadingBarContext.Provider value={value}>
      <NavigationPulse onPulse={setNavPulseStable} />
      <TopLoadingBar active={barActive} />
      {children}
    </LoadingBarContext.Provider>
  );
}

/**
 * Increments global loading bar while `active` is true (e.g. fetch in progress).
 */
export function useTrackPageLoading(active) {
  const ctx = useContext(LoadingBarContext);

  useEffect(() => {
    if (!ctx || !active) return undefined;
    ctx.beginTask();
    return () => ctx.endTask();
  }, [active, ctx]);
}
