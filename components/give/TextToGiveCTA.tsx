"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  keyword: string;
  number: string;
}

export default function TextToGiveCTA({ keyword, number }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const openModal = (qrMode = false) => {
    setOpen(true);
    setAmount("");
    setIsMonthly(false);
    setShowQR(qrMode);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      document.body.style.overflow = "";
    }, 350);
  };

  const handleCTAClick = (defaultAmount?: string) => {
    if (isDesktop) {
      openModal(true);
    } else {
      sendTextMessage(defaultAmount);
    }
  };

  const sendTextMessage = (defaultAmount?: string) => {
    const finalAmount = defaultAmount || amount;
    if (!finalAmount || isNaN(Number(finalAmount))) {
      alert("Please enter a valid amount");
      return;
    }

    const message = `${keyword} give ${finalAmount}${isMonthly ? "/mo" : ""}`;
    window.location.href = `sms:${number}?body=${encodeURIComponent(message)}`;
    closeModal();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Primary CTA: £10 */}
        <button
          onClick={() => handleCTAClick("10")}
          className="group flex items-center gap-4 rounded-2xl bg-destiny-orange px-7 py-4 text-left shadow-xl shadow-destiny-orange/30 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-2xl text-white">sms</span>
          <span>
            <span className="block text-sm font-black text-white">Text to Give £10</span>
            <span className="block text-xs text-white/60">Send instantly</span>
          </span>
          <span className="material-symbols-rounded ml-auto text-lg text-white/60 transition group-hover:translate-x-1">arrow_forward</span>
        </button>

        {/* Secondary CTA: Custom Amount */}
        <button
          onClick={() => {
            if (isDesktop) {
              openModal(true);
            } else {
              openModal(false);
            }
          }}
          className="group flex items-center gap-4 rounded-2xl bg-destiny-grey px-7 py-4 text-left shadow-xl shadow-destiny-grey/30 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-2xl text-white">edit</span>
          <span>
            <span className="block text-sm font-black text-white">Custom Amount</span>
            <span className="block text-xs text-white/60">Choose your amount</span>
          </span>
          <span className="material-symbols-rounded ml-auto text-lg text-white/60 transition group-hover:translate-x-1">arrow_forward</span>
        </button>
      </div>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{
            background: visible ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
            backdropFilter: visible ? "blur(6px)" : "blur(0px)",
            transition: "background 0.35s ease, backdrop-filter 0.35s ease",
          }}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            style={{
              transform: visible ? "scale(1)" : "scale(0.92)",
              opacity: visible ? 1 : 0,
              transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
              <p className="font-black text-destiny-grey">{showQR ? "Scan to Give" : "Custom Amount"}</p>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
                aria-label="Close"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>
            </div>

            <div className="p-8">
              {showQR ? (
                <div className="flex flex-col items-center gap-6">
                  <p className="text-center text-sm text-destiny-grey/60">
                    Scan this QR code with your phone to open the giving page
                  </p>
                  <div className="rounded-2xl border-8 border-white bg-white p-4">
                    <QRCodeSVG
                      value={typeof window !== "undefined" ? window.location.href : ""}
                      size={256}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </div>
              ) : (
                <>
              <div className="mb-6">
                <label htmlFor="amount" className="block mb-2 text-sm font-bold text-destiny-grey">
                  Amount (£)
                </label>
                <input
                  id="amount"
                  type="number"
                  min="0"
                  max="30"
                  step="0.01"
                  placeholder="e.g. 25"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-lg font-bold text-destiny-grey placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:outline-none focus:ring-2 focus:ring-destiny-orange/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendTextMessage();
                  }}
                />
              </div>

              <div className="mb-6 flex items-center gap-3">
                <input
                  id="monthly"
                  type="checkbox"
                  checked={isMonthly}
                  onChange={(e) => setIsMonthly(e.target.checked)}
                  className="h-4 w-4 rounded border-black/10 text-destiny-orange focus:ring-destiny-orange/30 cursor-pointer"
                />
                <label htmlFor="monthly" className="text-sm font-bold text-destiny-grey cursor-pointer">
                  Make this a monthly gift
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-bold text-destiny-grey transition hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendTextMessage()}
                  className="flex-1 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Send Text
                </button>
              </div>
              </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
