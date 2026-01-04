// Safe, no-op guards to prevent null access when share modal elements are absent.
const setupShareModal = () => {
  const shareButton = document.getElementById("share-btn");
  const shareModal = document.getElementById("share-modal");
  const shareClose = document.getElementById("share-close");
  const shareBackdrop = document.getElementById("share-backdrop");

  if (!shareButton || !shareModal) return;

  const open = () => shareModal.classList.remove("hidden");
  const close = () => shareModal.classList.add("hidden");

  shareButton.addEventListener("click", (event) => {
    event.preventDefault();
    open();
  });

  [shareClose, shareBackdrop].forEach((node) => {
    if (node) {
      node.addEventListener("click", close);
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupShareModal);
} else {
  setupShareModal();
}
