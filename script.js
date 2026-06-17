(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {
    document.querySelectorAll(".reveal-on-scroll").forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal-on-scroll").forEach((el, i) => {
      el.style.transitionDelay = `${(i % 6) * 0.07}s`;
      observer.observe(el);
    });

    initHeroPremium();
  }

  function initHeroPremium() {
    const hero = document.getElementById("hero");
    const media = document.querySelector("[data-hero-media]");
    const photoWrap = document.querySelector("[data-hero-photo]");

    if (!hero || !media || !photoWrap) return;

    let parallaxTicking = false;
    let magneticEnabled = window.matchMedia("(pointer: fine) and (min-width: 1025px)").matches;

    function updateParallax() {
      const rect = hero.getBoundingClientRect();
      const viewHeight = window.innerHeight;
      const scrollRange = rect.height + viewHeight;
      const scrolled = viewHeight - rect.top;
      const progress = Math.min(Math.max(scrolled / scrollRange, 0), 1);

      const photoY = progress * 52;
      const imgY = progress * 24;

      photoWrap.style.setProperty("--parallax-y", `${photoY}px`);
      photoWrap.style.setProperty("--img-parallax-y", `${imgY}px`);
      parallaxTicking = false;
    }

    function onScroll() {
      if (!parallaxTicking) {
        parallaxTicking = true;
        requestAnimationFrame(updateParallax);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateParallax, { passive: true });
    updateParallax();

    if (!magneticEnabled) return;

    photoWrap.classList.add("is-magnetic");

    function setMagnetic(x, y, active) {
      photoWrap.style.setProperty("--tilt-x", `${x * 5}deg`);
      photoWrap.style.setProperty("--tilt-y", `${-y * 3.5}deg`);
      photoWrap.style.setProperty("--magnetic-x", `${x * 14}px`);
      photoWrap.style.setProperty("--magnetic-y", `${y * 14}px`);
      photoWrap.style.setProperty("--img-magnetic-x", `${x * -6}px`);
      photoWrap.style.setProperty("--img-magnetic-y", `${y * -4}px`);
      photoWrap.style.setProperty("--img-scale", active ? "1.03" : "1");
      photoWrap.style.setProperty("--base-rotate", active ? "0deg" : "1.5deg");
      photoWrap.classList.toggle("is-active", active);
    }

    function resetMagnetic() {
      setMagnetic(0, 0, false);
    }

    media.addEventListener("mousemove", (event) => {
      const rect = media.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      setMagnetic(x, y, true);
    });

    media.addEventListener("mouseleave", resetMagnetic);
  }
})();
