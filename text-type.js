class TextType {
  constructor(element, options = {}) {
    this.el = element;
    this.texts = options.texts || [];
    this.typingSpeed = options.typingSpeed ?? 75;
    this.deletingSpeed = options.deletingSpeed ?? 50;
    this.pauseDuration = options.pauseDuration ?? 1500;
    this.initialDelay = options.initialDelay ?? 400;
    this.loop = options.loop ?? true;
    this.showCursor = options.showCursor ?? true;
    this.cursorCharacter = options.cursorCharacter ?? "_";
    this.cursorBlinkDuration = options.cursorBlinkDuration ?? 0.5;
    this.variableSpeed = options.variableSpeed ?? null;
    this.startOnVisible = options.startOnVisible ?? false;

    this.textIndex = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.isVisible = !this.startOnVisible;
    this.timeoutId = null;
    this.observer = null;

    this.fallback = this.el.querySelector(".text-type__fallback");
    this.contentEl = document.createElement("span");
    this.contentEl.className = "text-type__content";
    this.cursorEl = document.createElement("span");
    this.cursorEl.className = "text-type__cursor";
    this.cursorEl.textContent = this.cursorCharacter;
    this.cursorEl.setAttribute("aria-hidden", "true");
    this.cursorEl.style.setProperty("--cursor-blink", `${this.cursorBlinkDuration}s`);

    this.el.classList.add("text-type");
    this.el.appendChild(this.contentEl);

    if (this.showCursor) {
      this.el.appendChild(this.cursorEl);
    }

    if (this.startOnVisible) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.isVisible = true;
              this.start();
              this.observer.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );
      this.observer.observe(this.el);
      return;
    }

    this.start();
  }

  getCurrentEntry() {
    return this.texts[this.textIndex];
  }

  getFlatChars(entry) {
    const segments = entry.segments || [{ text: entry.text || "" }];
    const chars = [];

    segments.forEach((segment) => {
      for (const char of segment.text) {
        chars.push({
          char,
          tag: segment.tag || null,
          className: segment.className || "",
        });
      }
    });

    return chars;
  }

  render(chars, count) {
    this.contentEl.innerHTML = "";
    let written = 0;

    while (written < count && written < chars.length) {
      const current = chars[written];
      let groupTag = current.tag;
      let groupClass = current.className;
      let groupText = current.char;
      let next = written + 1;

      while (next < count && next < chars.length) {
        const upcoming = chars[next];
        if (upcoming.tag === groupTag && upcoming.className === groupClass) {
          groupText += upcoming.char;
          next += 1;
        } else {
          break;
        }
      }

      if (groupTag) {
        const node = document.createElement(groupTag);
        if (groupClass) node.className = groupClass;
        node.textContent = groupText;
        this.contentEl.appendChild(node);
      } else {
        this.contentEl.appendChild(document.createTextNode(groupText));
      }

      written = next;
    }
  }

  getTypingDelay() {
    if (!this.variableSpeed) return this.typingSpeed;
    const { min, max } = this.variableSpeed;
    return Math.random() * (max - min) + min;
  }

  hideFallback() {
    if (this.fallback) {
      this.el.classList.add("is-ready");
    }
  }

  start() {
    window.setTimeout(() => {
      if (!this.isVisible) return;
      this.hideFallback();
      this.tick();
    }, this.initialDelay);
  }

  tick() {
    const entry = this.getCurrentEntry();
    if (!entry) return;

    const chars = this.getFlatChars(entry);
    const fullLength = chars.length;

    if (this.isDeleting) {
      if (this.charIndex === 0) {
        this.isDeleting = false;
        this.textIndex = this.loop ? (this.textIndex + 1) % this.texts.length : Math.min(this.textIndex + 1, this.texts.length - 1);

        if (!this.loop && this.textIndex >= this.texts.length - 1 && this.charIndex === 0) {
          const lastEntry = this.getCurrentEntry();
          const lastChars = this.getFlatChars(lastEntry);
          this.render(lastChars, lastChars.length);
          this.el.classList.add("is-complete");
          return;
        }

        this.timeoutId = window.setTimeout(() => this.tick(), this.pauseDuration);
        return;
      }

      this.charIndex -= 1;
      this.render(chars, this.charIndex);
      this.timeoutId = window.setTimeout(() => this.tick(), this.deletingSpeed);
      return;
    }

    if (this.charIndex < fullLength) {
      this.charIndex += 1;
      this.render(chars, this.charIndex);
      this.timeoutId = window.setTimeout(() => this.tick(), this.getTypingDelay());
      return;
    }

    this.el.classList.add("is-complete");

    if (!this.loop && this.textIndex === this.texts.length - 1) {
      return;
    }

    this.timeoutId = window.setTimeout(() => {
      this.isDeleting = true;
      this.el.classList.remove("is-complete");
      this.tick();
    }, this.pauseDuration);
  }

  destroy() {
    if (this.timeoutId) window.clearTimeout(this.timeoutId);
    if (this.observer) this.observer.disconnect();
  }
}

function initHeroTextType() {
  const el = document.querySelector("[data-hero-text-type]");
  if (!el) return null;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    el.classList.add("is-complete");
    return null;
  }

  return new TextType(el, {
    typingSpeed: 98,
    deletingSpeed: 65,
    pauseDuration: 1800,
    initialDelay: 500,
    loop: true,
    showCursor: true,
    cursorCharacter: "_",
    cursorBlinkDuration: 0.5,
    texts: [
      {
        segments: [
          { text: "Я делаю сайты, интерфейсы и digital-проекты, которые выглядят как " },
          { text: "вайб", tag: "em", className: "hero__vibe" },
          { text: ", а работают как система" },
        ],
      },
      {
        segments: [
          { text: "Собираю ощущение, стиль и логику — от " },
          { text: "вайба", tag: "em", className: "hero__vibe" },
          { text: " до готовой страницы" },
        ],
      },
      {
        segments: [
          { text: "Digital-проекты с характером — не шаблон, а " },
          { text: "вайб", tag: "em", className: "hero__vibe" },
        ],
      },
    ],
  });
}

if (typeof window !== "undefined") {
  window.TextType = TextType;
  window.initHeroTextType = initHeroTextType;
}
