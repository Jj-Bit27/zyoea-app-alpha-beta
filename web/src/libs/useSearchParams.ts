export function useSearchParams() {
  if (typeof window === "undefined") {
    return { get: () => null };
  }
  return new URLSearchParams(window.location.search);
}
