import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/**
 * useState que recuerda su valor en localStorage. Arranca con `initial` (igual en servidor y
 * cliente) y aplica el valor guardado al montar; si el almacenamiento falla, se comporta como useState.
 */
export function useStoredState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratar tras el montaje evita desajustes SSR
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}
