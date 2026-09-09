import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureAttribution } from "./lib/attribution";

// Captura UTMs / gclid / fbclid / referrer no primeiro acesso (antes de haver sessão).
captureAttribution();

createRoot(document.getElementById("root")!).render(<App />);

