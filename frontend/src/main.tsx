import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "./theme";
import { setupApiClient } from "@/lib/api";
import "./index.css";
import App from "./App.tsx";

// Em dev com VITE_USE_MOCK=true, carrega o mock antes do primeiro render (import dinâmico).
void setupApiClient().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  );
});
