import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
