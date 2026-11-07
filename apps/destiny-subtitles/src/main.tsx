import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import "./styles.css";

interface CaptionFormat {
  name: string;
  layout: string;
  lines: number;
  chars_per_line: number;
  font_px: number;
  reveal: string;
}

function App() {
  const [formats, setFormats] = useState<CaptionFormat[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    invoke<CaptionFormat[]>("list_formats").then(setFormats);
    invoke<number>("active_format").then(setActive);
  }, []);

  const choose = (index: number) => {
    setActive(index);
    invoke("set_active_format", { index });
  };

  return (
    <main className="shell">
      <h1>Destiny Subtitles</h1>
      <p className="muted">Caption format</p>
      <div className="formats">
        {formats.map((f, i) => (
          <button key={f.name} className={i === active ? "format on" : "format"} onClick={() => choose(i)}>
            <strong>{f.name}</strong>
            <span>
              {f.lines} lines, {f.chars_per_line} characters
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
