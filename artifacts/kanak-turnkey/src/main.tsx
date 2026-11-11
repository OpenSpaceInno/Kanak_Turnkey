import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Configure API base URL if provided via environment variable (for separate domain deployment)
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

// Register Turnkey Field Operations Service Worker
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[Turnkey PWA] Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[Turnkey PWA] Service Worker registration failed:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
