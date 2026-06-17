function getContainingBlock(element) {
  let node = element?.parentElement;

  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);

    if (
      style.transform !== "none" ||
      style.perspective !== "none" ||
      style.filter !== "none" ||
      style.willChange.includes("transform") ||
      style.willChange.includes("perspective") ||
      style.willChange.includes("filter") ||
      /paint|layout|strict|content/.test(style.contain)
    ) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

function getContainingBlockOffset(block) {
  if (!block) return { x: 0, y: 0 };
  const rect = block.getBoundingClientRect();
  return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
}

function isMobileDevice() {
  const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || "";
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return (hasTouchScreen && isSmallScreen) || mobileRegex.test(userAgent.toLowerCase());
}

class TargetCursor {
  constructor(options = {}) {
    this.targetSelector = options.targetSelector || ".cursor-target";
    this.spinDuration = options.spinDuration ?? 2;
    this.hideDefaultCursor = options.hideDefaultCursor !== false;
    this.hoverDuration = options.hoverDuration ?? 0.2;
    this.parallaxOn = options.parallaxOn !== false;
    this.borderWidth = 3;
    this.cornerSize = 12;

    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.cursorX = this.mouseX;
    this.cursorY = this.mouseY;
    this.activeStrength = 0;
    this.targetStrength = 0;

    this.activeTarget = null;
    this.targetCornerPositions = null;
    this.currentLeaveHandler = null;
    this.resumeTimeout = null;
    this.containingBlock = null;
    this.rafId = null;

    this.idleCorners = [
      { x: -18, y: -18 },
      { x: 6, y: -18 },
      { x: 6, y: 6 },
      { x: -18, y: 6 },
    ];

    this.cornerOffsets = this.idleCorners.map((corner) => ({ ...corner }));
    this.createElements();
    this.setWrapperPosition();
    this.updateCornerTransforms();
    this.bindEvents();
    this.loop();
  }

  createElements() {
    this.wrapper = document.createElement("div");
    this.wrapper.className = "target-cursor-wrapper is-spinning";
    this.wrapper.style.setProperty("--cursor-spin-duration", `${this.spinDuration}s`);
    this.wrapper.innerHTML = `
      <div class="target-cursor-dot"></div>
      <div class="target-cursor-corner corner-tl"></div>
      <div class="target-cursor-corner corner-tr"></div>
      <div class="target-cursor-corner corner-br"></div>
      <div class="target-cursor-corner corner-bl"></div>
    `;

    document.body.appendChild(this.wrapper);
    this.dot = this.wrapper.querySelector(".target-cursor-dot");
    this.corners = Array.from(this.wrapper.querySelectorAll(".target-cursor-corner"));
    this.containingBlock = getContainingBlock(this.wrapper);

    if (this.hideDefaultCursor) {
      document.body.classList.add("has-target-cursor");
    }
  }

  getOffset() {
    return getContainingBlockOffset(this.containingBlock);
  }

  setWrapperPosition() {
    const { x: offsetX, y: offsetY } = this.getOffset();
    this.wrapper.style.left = `${this.cursorX - offsetX}px`;
    this.wrapper.style.top = `${this.cursorY - offsetY}px`;
  }

  updateCornerTransforms() {
    this.corners.forEach((corner, index) => {
      const { x, y } = this.cornerOffsets[index];
      corner.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      corner.style.borderRight = "";
      corner.style.borderBottom = "";
      corner.style.borderLeft = "";
      corner.style.borderTop = "";

      if (index === 0) {
        corner.style.borderRight = "none";
        corner.style.borderBottom = "none";
      } else if (index === 1) {
        corner.style.borderLeft = "none";
        corner.style.borderBottom = "none";
      } else if (index === 2) {
        corner.style.borderLeft = "none";
        corner.style.borderTop = "none";
      } else {
        corner.style.borderRight = "none";
        corner.style.borderTop = "none";
      }
    });
  }

  computeTargetCorners(target) {
    const rect = target.getBoundingClientRect();
    const { borderWidth, cornerSize } = this;
    const { x: offsetX, y: offsetY } = this.getOffset();
    const anchorX = this.cursorX - offsetX;
    const anchorY = this.cursorY - offsetY;

    return [
      { x: rect.left - borderWidth - anchorX, y: rect.top - borderWidth - anchorY },
      { x: rect.right + borderWidth - cornerSize - anchorX, y: rect.top - borderWidth - anchorY },
      {
        x: rect.right + borderWidth - cornerSize - anchorX,
        y: rect.bottom + borderWidth - cornerSize - anchorY,
      },
      { x: rect.left - borderWidth - anchorX, y: rect.bottom + borderWidth - cornerSize - anchorY },
    ];
  }

  cleanupTarget(target) {
    if (this.currentLeaveHandler && target) {
      target.removeEventListener("mouseleave", this.currentLeaveHandler);
    }
    this.currentLeaveHandler = null;
  }

  leaveTarget(target) {
    this.targetStrength = 0;
    this.activeTarget = null;
    this.targetCornerPositions = null;
    this.wrapper.classList.add("is-spinning");

    if (this.resumeTimeout) {
      window.clearTimeout(this.resumeTimeout);
    }

    this.resumeTimeout = window.setTimeout(() => {
      this.resumeTimeout = null;
    }, 50);

    this.cleanupTarget(target);
  }

  enterTarget(target) {
    if (this.activeTarget === target) return;

    if (this.activeTarget) {
      this.cleanupTarget(this.activeTarget);
    }

    if (this.resumeTimeout) {
      window.clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }

    this.activeTarget = target;
    this.wrapper.classList.remove("is-spinning");
    this.targetCornerPositions = this.computeTargetCorners(target);
    this.targetStrength = 1;

    const leaveHandler = () => this.leaveTarget(target);
    this.currentLeaveHandler = leaveHandler;
    target.addEventListener("mouseleave", leaveHandler);
  }

  onMouseOver(event) {
    let current = event.target;
    let target = null;

    while (current && current !== document.body) {
      if (current.matches(this.targetSelector)) {
        target = current;
        break;
      }
      current = current.parentElement;
    }

    if (target) {
      this.enterTarget(target);
    }
  }

  onMouseMove(event) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }

  onScroll() {
    if (!this.activeTarget) return;

    const elementUnderMouse = document.elementFromPoint(this.cursorX, this.cursorY);
    const isStillOverTarget =
      elementUnderMouse &&
      (elementUnderMouse === this.activeTarget ||
        elementUnderMouse.closest(this.targetSelector) === this.activeTarget);

    if (!isStillOverTarget && this.currentLeaveHandler) {
      this.currentLeaveHandler();
    } else if (isStillOverTarget) {
      this.targetCornerPositions = this.computeTargetCorners(this.activeTarget);
    }
  }

  onMouseDown() {
    this.wrapper.style.scale = "0.92";
    this.dot.style.scale = "0.7";
  }

  onMouseUp() {
    this.wrapper.style.scale = "1";
    this.dot.style.scale = "1";
  }

  bindEvents() {
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseOverBound = this.onMouseOver.bind(this);
    this.onScrollBound = this.onScroll.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onResizeBound = () => {
      this.containingBlock = getContainingBlock(this.wrapper);
    };

    window.addEventListener("mousemove", this.onMouseMoveBound);
    window.addEventListener("mouseover", this.onMouseOverBound, { passive: true });
    window.addEventListener("scroll", this.onScrollBound, { passive: true });
    window.addEventListener("mousedown", this.onMouseDownBound);
    window.addEventListener("mouseup", this.onMouseUpBound);
    window.addEventListener("resize", this.onResizeBound, { passive: true });
  }

  loop() {
    const followSpeed = 0.18;
    const strengthSpeed = this.hoverDuration > 0 ? 1 / (this.hoverDuration * 60) : 1;

    this.cursorX += (this.mouseX - this.cursorX) * followSpeed;
    this.cursorY += (this.mouseY - this.cursorY) * followSpeed;

    if (this.activeStrength < this.targetStrength) {
      this.activeStrength = Math.min(this.targetStrength, this.activeStrength + strengthSpeed);
    } else if (this.activeStrength > this.targetStrength) {
      this.activeStrength = Math.max(this.targetStrength, this.activeStrength - strengthSpeed * 1.4);
    }

    if (this.targetCornerPositions && this.activeStrength > 0) {
      this.cornerOffsets = this.cornerOffsets.map((current, index) => {
        const target = this.targetCornerPositions[index];
        const idle = this.idleCorners[index];
        const finalX = idle.x + (target.x - idle.x) * this.activeStrength;
        const finalY = idle.y + (target.y - idle.y) * this.activeStrength;
        const lerpFactor = this.parallaxOn
          ? this.activeStrength >= 0.99
            ? 0.28
            : 0.45
          : 1;

        return {
          x: current.x + (finalX - current.x) * lerpFactor,
          y: current.y + (finalY - current.y) * lerpFactor,
        };
      });
    } else {
      this.cornerOffsets = this.cornerOffsets.map((current, index) => {
        const idle = this.idleCorners[index];
        return {
          x: current.x + (idle.x - current.x) * 0.22,
          y: current.y + (idle.y - current.y) * 0.22,
        };
      });
    }

    this.setWrapperPosition();
    this.updateCornerTransforms();
    this.rafId = window.requestAnimationFrame(() => this.loop());
  }

  destroy() {
    window.cancelAnimationFrame(this.rafId);
    window.removeEventListener("mousemove", this.onMouseMoveBound);
    window.removeEventListener("mouseover", this.onMouseOverBound);
    window.removeEventListener("scroll", this.onScrollBound);
    window.removeEventListener("mousedown", this.onMouseDownBound);
    window.removeEventListener("mouseup", this.onMouseUpBound);
    window.removeEventListener("resize", this.onResizeBound);

    if (this.activeTarget) {
      this.cleanupTarget(this.activeTarget);
    }

    this.wrapper?.remove();
    document.body.classList.remove("has-target-cursor");
  }
}

function markCursorTargets(selectors) {
  document.querySelectorAll(selectors).forEach((element) => {
    element.classList.add("cursor-target");
  });
}

function initTargetCursor(options = {}) {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

  if (prefersReduced || isMobileDevice() || !hasFinePointer) {
    return null;
  }

  markCursorTargets(
    options.autoTargets ||
      ".btn, .nav a, .logo, .contact-link, .project, .card, .badge, .footer__top, .cta, .step"
  );

  return new TargetCursor({
    targetSelector: ".cursor-target",
    spinDuration: 2,
    hideDefaultCursor: true,
    hoverDuration: 0.2,
    parallaxOn: true,
    ...options,
  });
}

if (typeof window !== "undefined") {
  window.TargetCursor = TargetCursor;
  window.initTargetCursor = initTargetCursor;
}
