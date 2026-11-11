import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/interaction-system.css";
import { initTheme } from "./hooks/useTheme";

initTheme();
// A recovery URL is only needed for the initial fresh document request.
const startupUrl = new URL(location.href);
if (startupUrl.searchParams.has('_app_refresh')) {
  startupUrl.searchParams.delete('_app_refresh');
  history.replaceState(history.state, '', startupUrl.href);
}

createRoot(document.getElementById("root")!).render(<App />);
