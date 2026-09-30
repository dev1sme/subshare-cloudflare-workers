import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.tsx";
import { ChunkErrorBoundary } from "./components/ChunkErrorBoundary";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { MotionProvider } from "./components/MotionProvider";
import { SessionProvider } from "./components/SessionProvider";
import { Toaster } from "./components/ui/sonner";
import "./i18n";
import "./index.css";

// Declarative <BrowserRouter>, not a data router: a data router's own errorElement would catch
// lazy-chunk failures before ChunkErrorBoundary could reload the page.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChunkErrorBoundary>
      <MotionProvider>
        <BrowserRouter>
          <SessionProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </SessionProvider>
        </BrowserRouter>
      </MotionProvider>
      <Toaster />
    </ChunkErrorBoundary>
  </StrictMode>,
);
