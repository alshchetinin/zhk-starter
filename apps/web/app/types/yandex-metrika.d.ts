declare global {
  interface Window {
    ym?: ((counterId: number | string, action: string, ...args: unknown[]) => void) & {
      a?: unknown[];
      l?: number;
    };
  }
}

export {};
