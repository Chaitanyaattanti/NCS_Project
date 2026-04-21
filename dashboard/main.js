(() => {
  const body = document.body;

  // -------------------------
  // Theme toggle (persisted)
  // -------------------------
  const themeToggle = document.getElementById("themeToggle");
  const THEME_KEY = "tn_theme";
  const applyTheme = (theme) => {
    const isDark = theme === "dark";
    body.classList.toggle("theme-dark", isDark);
    if (themeToggle) {
      themeToggle.textContent = isDark ? "Light" : "Theme";
      themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }
  };

  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      applyTheme(storedTheme);
    }
  } catch {
    // Ignore localStorage failures (e.g. privacy mode)
  }

  themeToggle?.addEventListener("click", () => {
    const nextTheme = body.classList.contains("theme-dark") ? "light" : "dark";
    applyTheme(nextTheme);
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // Ignore
    }
  });

  // -------------------------
  // Lightbox for plots
  // -------------------------
  const lightbox = document.getElementById("lightbox");
  const lightboxBackdrop = document.getElementById("lightboxBackdrop");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.setAttribute("aria-hidden", "true");
    if (lightboxImage) lightboxImage.src = "";
    if (lightboxCaption) lightboxCaption.textContent = "";
  };

  const openLightbox = (imgEl) => {
    if (!lightbox || !lightboxImage) return;
    const src = imgEl.getAttribute("src");
    if (!src) return;

    lightboxImage.src = src;

    const caption = imgEl.getAttribute("data-caption") || imgEl.getAttribute("alt") || "";
    if (lightboxCaption) lightboxCaption.textContent = caption;

    lightbox.setAttribute("aria-hidden", "false");
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const img = target.closest("img[data-lightbox]");
    if (img instanceof HTMLImageElement) {
      event.preventDefault();
      openLightbox(img);
    }
  });

  lightboxBackdrop?.addEventListener("click", closeLightbox);
  lightboxClose?.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  // -------------------------
  // Back to top
  // -------------------------
  const toTopBtn = document.getElementById("toTopBtn");
  const onScroll = () => {
    if (!toTopBtn) return;
    const shouldShow = window.scrollY > 500;
    toTopBtn.classList.toggle("show", shouldShow);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTopBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();