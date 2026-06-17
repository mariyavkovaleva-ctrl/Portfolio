function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function initReviewsStack() {
  const scrollEl = document.querySelector("[data-reviews-scroll]");
  const cards = Array.from(document.querySelectorAll("[data-review-card]"));

  if (!scrollEl || cards.length === 0) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (prefersReduced || isMobile) {
    scrollEl.classList.add("reviews-scroll--static");
    cards.forEach((card) => card.classList.add("cursor-target"));
    return;
  }

  const cardCount = cards.length;
  scrollEl.style.setProperty("--reviews-scroll-height", `${cardCount * 110}vh`);

  let ticking = false;

  function updateCards() {
    const rect = scrollEl.getBoundingClientRect();
    const scrollRange = scrollEl.offsetHeight - window.innerHeight;

    if (scrollRange <= 0) return;

    const progress = clamp(-rect.top / scrollRange, 0, 1);
    const scaledProgress = progress * cardCount;
    const activeIndex = Math.min(Math.floor(scaledProgress), cardCount - 1);
    const segmentProgress = scaledProgress - activeIndex;

    cards.forEach((card, index) => {
      let translateY = 0;
      let rotate = 0;
      let scale = 1;
      let opacity = 1;
      let zIndex = 10;

      if (index < activeIndex) {
        translateY = -125;
        rotate = -12;
        scale = 0.92;
        opacity = 0;
        zIndex = 1;
      } else if (index === activeIndex) {
        const isLast = activeIndex === cardCount - 1;
        const exit = isLast ? 0 : clamp((segmentProgress - 0.5) / 0.5, 0, 1);
        translateY = -exit * 115;
        rotate = -exit * 12;
        scale = 1 - exit * 0.06;
        opacity = 1 - exit;
        zIndex = 30;
      } else {
        const depth = index - activeIndex;
        const enter =
          index === activeIndex + 1 ? clamp(segmentProgress / 0.5, 0, 1) : 0;
        const stackOffset = depth * 16;

        translateY = stackOffset * (index === activeIndex + 1 ? 1 - enter : 1);
        rotate = depth * 2.5 * (index === activeIndex + 1 ? 1 - enter : 1);
        scale =
          index === activeIndex + 1
            ? 0.94 + enter * 0.06
            : 1 - depth * 0.035;
        opacity =
          index === activeIndex + 1
            ? 0.45 + enter * 0.55
            : Math.max(0.2, 0.55 - depth * 0.12);
        zIndex = 20 - depth;
      }

      card.style.transform = `translate3d(0, ${translateY}%, 0) rotate(${rotate}deg) scale(${scale})`;
      card.style.opacity = String(opacity);
      card.style.zIndex = String(zIndex);
      card.style.pointerEvents = opacity > 0.2 ? "auto" : "none";
      card.classList.toggle("is-active", index === activeIndex && segmentProgress < 0.5);
    });

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateCards);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateCards, { passive: true });
  updateCards();

  cards.forEach((card) => card.classList.add("cursor-target"));

  if (typeof markCursorTargets === "function") {
    markCursorTargets(".review-card");
  }
}

if (typeof window !== "undefined") {
  window.initReviewsStack = initReviewsStack;
}
