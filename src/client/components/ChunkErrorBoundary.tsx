import { RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

// A tab left open across a deploy asks for chunk hashes that no longer exist. The SPA fallback
// answers index.html, the import fails on its MIME type, and React would unmount to a white
// screen. Reload once; show a button only if it fails again within RETRY_WINDOW_MS.
// Not a general error boundary: anything that is not a chunk error is rethrown.

const RELOADED_AT_KEY = "chunk-reload-at";
const RETRY_WINDOW_MS = 10_000;

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|is not a valid JavaScript MIME type/i;

function isChunkError(error: unknown): boolean {
  return error instanceof Error && (error.name === "ChunkLoadError" || CHUNK_ERROR.test(error.message));
}

function reloadedRecently(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0) < RETRY_WINDOW_MS;
  } catch {
    // Without storage there is no loop guard, so never reload automatically.
    return true;
  }
}

function reload() {
  try {
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    // Reloading still helps; only the loop guard is lost.
  }
  window.location.reload();
}

type State = { error: unknown; hasError: boolean };

export class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (isChunkError(error) && !reloadedRecently()) reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (!isChunkError(this.state.error)) throw this.state.error;
    return <ChunkErrorScreen />;
  }
}

function ChunkErrorScreen() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">{t("chunkError.title")}</h1>
      <p className="text-muted-foreground">{t("chunkError.body")}</p>
      <Button onClick={reload}>
        <RefreshCw aria-hidden="true" />
        {t("chunkError.reload")}
      </Button>
    </main>
  );
}
