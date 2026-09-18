"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/components/ToastProvider";
import Button from "@/components/ui/Button";
import { useHydrated } from "@/lib/useHydrated";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useScrollLock } from "@/lib/useScrollLock";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface Props {
  keyword: string;
  number: string;
}

export default function TextToGiveCTA({ keyword, number }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const mounted = useHydrated();
  const [amount, setAmount] = useState("");
  const [isMonthly, setIsMonthly] = useState(false);
  // Only read inside click handlers, so the false server snapshot never reaches
  // the markup. A resize listener plus useState(true) used to send the first tap
  // on a phone to the QR modal instead of the messaging app.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [showQR, setShowQR] = useState(false);

  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useScrollLock(mounted && open);

  const openModal = (qrMode = false, defaultAmount = "") => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setOpen(true);
    setAmount(defaultAmount);
    setIsMonthly(false);
    setShowQR(qrMode);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };

  const closeModal = useCallback(() => {
    setVisible(false);
    closeTimeout.current = setTimeout(() => {
      setOpen(false);
      closeTimeout.current = null;
    }, 350);
  }, []);

  // `visible` rather than `open`: the panel is still in the DOM during its
  // 350ms exit animation, and trapping focus through that window means Tab
  // still cycles inside a dialog that is visually gone.
  useFocusTrap(panelRef, mounted && visible, closeModal);

  // The pending close must not outlive the component, or fire against a modal
  // that has since been reopened.
  useEffect(() => () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }, []);

  // The "sms:" link the QR code should hand off to a phone's own messaging
  // app — mirrors the message sendTextMessage() sends directly on mobile.
  const smsHref = (finalAmount: string) =>
    `sms:${number}?body=${encodeURIComponent(
      `${keyword} give ${finalAmount}${isMonthly ? "/mo" : ""}`,
    )}`;

  const handleCTAClick = (defaultAmount?: string) => {
    if (isDesktop) {
      openModal(true, defaultAmount ?? "");
    } else {
      sendTextMessage(defaultAmount);
    }
  };

  const sendTextMessage = (defaultAmount?: string) => {
    const finalAmount = defaultAmount || amount;
    if (!finalAmount || isNaN(Number(finalAmount))) {
      toast.error("Please enter a valid amount", "Invalid amount");
      return;
    }

    window.location.href = smsHref(finalAmount);
    closeModal();
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Primary CTA: £10 */}
        <Button
          variant="primary"
          shape="card"
          size="cta"
          onClick={() => handleCTAClick("10")}
          className="group text-left"
        >
          <span className="material-symbols-rounded text-2xl text-white" aria-hidden="true">sms</span>
          <span>
            <span className="block text-sm font-black text-white">Text to Give £10</span>
            <span className="block text-xs text-on-dark-muted">Send instantly</span>
          </span>
          <span className="material-symbols-rounded ml-auto text-lg text-white/60 transition group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
        </Button>

        {/* Secondary CTA: Custom Amount */}
        <Button
          variant="secondary"
          shape="card"
          size="cta"
          onClick={() => {
            if (isDesktop) {
              openModal(true);
            } else {
              openModal(false);
            }
          }}
          className="group text-left"
        >
          <span className="material-symbols-rounded text-2xl text-white" aria-hidden="true">edit</span>
          <span>
            <span className="block text-sm font-black text-white">Custom Amount</span>
            <span className="block text-xs text-on-dark-muted">Choose your amount</span>
          </span>
          <span className="material-symbols-rounded ml-auto text-lg text-white/60 transition group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
        </Button>
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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            style={{
              transform: visible ? "scale(1)" : "scale(0.92)",
              opacity: visible ? 1 : 0,
              transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
              <p id={titleId} className="font-black text-destiny-grey">{showQR ? "Scan to Give" : "Custom Amount"}</p>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-subtle transition hover:bg-gray-100 hover:text-destiny-grey"
                aria-label="Close"
              >
                <span className="material-symbols-rounded text-xl" aria-hidden="true">close</span>
              </button>
            </div>

            <div className="p-8">
              {showQR ? (
                <div className="flex flex-col items-center gap-6">
                  <p className="text-center text-sm text-muted">
                    Scan this QR code with your phone to send the gift text
                  </p>
                  <div className="rounded-2xl border-8 border-white bg-white p-4">
                    <QRCodeSVG
                      value={smsHref(amount || "10")}
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
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-lg font-bold text-destiny-grey placeholder:text-subtle focus:border-destiny-orange focus:outline-none focus:ring-2 focus:ring-destiny-orange/30"
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
                <Button
                  variant="outline"
                  shape="soft"
                  size="sm"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  shape="soft"
                  size="sm"
                  onClick={() => sendTextMessage()}
                  className="flex-1"
                >
                  Send Text
                </Button>
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
