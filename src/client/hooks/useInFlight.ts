import { useCallback, useRef, useState } from "react";

// Keys with a request in flight. `start` answers false when the key is already running — checked
// against a ref, so two clicks in the same tick (a double click) cannot both pass — and the state
// copy lets rows render their buttons disabled.
export function useInFlight() {
  const running = useRef(new Set<string>());
  const [keys, setKeys] = useState<ReadonlySet<string>>(new Set());

  const start = useCallback((key: string) => {
    if (running.current.has(key)) return false;
    running.current.add(key);
    setKeys(new Set(running.current));
    return true;
  }, []);

  const finish = useCallback((key: string) => {
    running.current.delete(key);
    setKeys(new Set(running.current));
  }, []);

  return { busy: keys, start, finish };
}
