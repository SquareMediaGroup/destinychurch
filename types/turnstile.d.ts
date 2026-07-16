export {};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          size?: "invisible";
          execution?: "execute";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
        },
      ) => string;
      execute: (widgetId?: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}
