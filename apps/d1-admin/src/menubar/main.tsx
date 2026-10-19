import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MenuBar } from "@/menubar/MenuBar";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MenuBar />
  </StrictMode>,
);
