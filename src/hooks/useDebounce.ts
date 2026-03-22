import { useEffect, useRef, useState } from "react";

/**
 * Hook de debounce para valores que mudam frequentemente (ex: search query).
 * Retorna o valor atual e o valor debounced separado.
 *
 * @param value - Valor que muda frequentemente
 * @param delayMs - Delay em ms (padrão: 300)
 * @returns [valorDebounced, valorOriginal]
 */
export function useDebounce<T>(value: T, delayMs = 300): [debouncedValue: T, setValue: (value: T) => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const valueRef = useRef<T>(value);

  useEffect(() => {
    valueRef.current = value;

    const timer = setTimeout(() => {
      if (valueRef.current !== undefined) {
        setDebouncedValue(valueRef.current);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return [debouncedValue, setDebouncedValue];
}

/**
 * Hook de debounce específico para search query.
 * Já aplica trim() e toLowerCase() automaticamente.
 *
 * @param initialQuery - Query inicial (padrão: "")
 * @param delayMs - Delay em ms (padrão: 300)
 * @returns { query, setQuery, debouncedQuery }
 */
export function useSearchQuery(initialQuery = "", delayMs = 300) {
  const [query, setQueryState] = useState(initialQuery);
  const [debouncedQuery] = useDebounce(query.trim().toLowerCase(), delayMs);

  const setQuery = (value: string) => {
    setQueryState(value);
  };

  return { query, setQuery, debouncedQuery };
}
