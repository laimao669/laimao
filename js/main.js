/* ============================================================
   LAIMAO® — 页面交互（零依赖）
   导航 / 滚动进度 / 区域高亮 / 滚动显现 / 数字滚动
   自定义光标 / 磁吸按钮 / 头像倾斜 / 首屏视差 / 复制邮箱
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- 导航状态 / 进度条 / 首屏视差（rAF 合帧） ---------- */
  var nav = document.getElementById("nav");
  var burger = document.getElementById("navBurger");
  var progress = document.querySelector(".progress");
  var hero = document.getElementById("top");
  var heroWrap = document.querySelector(".hero__title-wrap");
  var parallax = !!(hero && heroWrap && isFinePointer && !reduced);
  var ticking = false;

  function onScrollFrame() {
    ticking = false;
    var y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform =
        "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    }

    /* 首屏内容轻微滞后，制造纵深感 */
    if (parallax && y < hero.offsetHeight) {
      heroWrap.style.transform = "translate3d(0, " + y * 0.14 + "px, 0)";
    }
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScrollFrame);
      }
    },
    { passive: true }
  );
  onScrollFrame();

  /* ---------- 移动端菜单 ---------- */
  function closeMenu() {
    nav.classList.remove("nav--open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "打开菜单");
    document.body.style.overflow = "";
  }

  if (burger) {
    burger.addEventListener("click", function () {
      if (nav.classList.contains("nav--open")) {
        closeMenu();
      } else {
        nav.classList.add("nav--open");
        burger.setAttribute("aria-expanded", "true");
        burger.setAttribute("aria-label", "关闭菜单");
        document.body.style.overflow = "hidden";
      }
    });

    /* Esc 关闭并归还焦点 */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("nav--open")) {
        closeMenu();
        burger.focus();
      }
    });

    /* 旋转回桌面尺寸时自动收起 */
    window.addEventListener(
      "resize",
      function () {
        if (window.innerWidth > 860) closeMenu();
      },
      { passive: true }
    );

    nav.querySelectorAll(".nav__link").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  /* ---------- 区域高亮（Scrollspy） ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav__link")
  );
  var linkMap = {};
  navLinks.forEach(function (a) {
    var id = (a.getAttribute("href") || "").replace("#", "");
    if (id) linkMap[id] = a;
  });

  function clearActive() {
    navLinks.forEach(function (a) {
      a.classList.remove("is-active");
      a.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          clearActive();
          var link = linkMap[entry.target.id];
          if (link) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    document.querySelectorAll("section[id]").forEach(function (s) {
      spy.observe(s);
    });
  }

  /* ---------- 滚动显现（同级自动错峰） ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var parent = el.parentElement;
          var siblings = parent
            ? Array.prototype.filter.call(parent.children, function (c) {
                return c.classList && c.classList.contains("reveal");
              })
            : [];
          var idx = siblings.indexOf(el);
          if (idx > 0) el.style.setProperty("--d", Math.min(idx * 0.09, 0.5) + "s");
          el.classList.add("in-view");
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  /* ---------- 数字滚动（HTML 内置最终值，无 JS 也正确展示） ---------- */
  var counters = document.querySelectorAll("[data-count]");

  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var dur = 1400;
    var t0 = null;
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (!reduced && "IntersectionObserver" in window) {
    /* JS 可用且允许动效时，才从 0 开始滚动 */
    counters.forEach(function (el) {
      el.textContent = "0";
    });
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          cio.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) {
      cio.observe(el);
    });
  }

  /* ---------- 自定义光标 + 深浅色自适应 ---------- */
  var dot = document.querySelector(".cursor-dot");
  var ring = document.querySelector(".cursor-ring");
  var darkZones = [];
  var darkBounds = [];
  var darkDirty = true;

  function collectDarkZones() {
    darkZones = Array.prototype.slice.call(
      document.querySelectorAll(".hero, .marquee, .contact, .footer")
    );
    darkDirty = true;
  }
  collectDarkZones();
  window.addEventListener("resize", collectDarkZones, { passive: true });
  /* 滚动/缩放后标记失效，位置只在下次 mousemove 时重读一次 */
  window.addEventListener(
    "scroll",
    function () {
      darkDirty = true;
    },
    { passive: true }
  );

  if (dot && ring && isFinePointer && !reduced) {
    var cx = -100, cy = -100, rx = -100, ry = -100;

    window.addEventListener(
      "mousemove",
      function (e) {
        cx = e.clientX;
        cy = e.clientY;
        dot.style.transform =
          "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";

        if (darkDirty) {
          darkBounds = darkZones.map(function (z) {
            var r = z.getBoundingClientRect();
            return [r.top, r.bottom];
          });
          darkDirty = false;
        }
        var overDark = darkBounds.some(function (b) {
          return cy >= b[0] && cy <= b[1];
        });
        document.body.classList.toggle("on-dark", overDark);
      },
      { passive: true }
    );

    (function ringLoop() {
      rx += (cx - rx) * 0.16;
      ry += (cy - ry) * 0.16;
      ring.style.transform =
        "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(ringLoop);
    })();

    /* 事件委托：悬停可交互元素时光标环放大 */
    var HOVER_SEL = "a, button, .stack__card, .work";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(HOVER_SEL)) {
        ring.classList.add("is-active");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(HOVER_SEL)) {
        ring.classList.remove("is-active");
      }
    });
  } else if (dot && ring) {
    dot.style.display = "none";
    ring.style.display = "none";
  }

  /* ---------- 磁吸按钮 ---------- */
  if (isFinePointer && !reduced) {
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform =
          "translate(" + dx * 0.22 + "px," + dy * 0.22 + "px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  }

  /* ---------- 头像轻倾斜 ---------- */
  var portrait = document.getElementById("portraitTilt");
  if (portrait && isFinePointer && !reduced) {
    portrait.addEventListener("mousemove", function (e) {
      var r = portrait.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      portrait.style.transform =
        "perspective(900px) rotateY(" + px * 6 + "deg) rotateX(" + py * -6 + "deg)";
    });
    portrait.addEventListener("mouseleave", function () {
      portrait.style.transform = "";
    });
    portrait.style.transition = "transform 0.25s ease-out";
  }

  /* ---------- 复制邮箱 ---------- */
  var copyBtn = document.getElementById("copyMail");
  if (copyBtn) {
    var MAIL = "hello@laimao.org";
    var copyTimer = null;

    function markCopied() {
      copyBtn.textContent = "已复制 ✓";
      copyBtn.classList.add("is-copied");
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () {
        copyBtn.textContent = "复制邮箱";
        copyBtn.classList.remove("is-copied");
      }, 1800);
    }

    function fallbackCopy() {
      var ta = document.createElement("textarea");
      ta.value = MAIL;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        markCopied();
      } catch (e) {}
      document.body.removeChild(ta);
    }

    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(MAIL).then(markCopied, fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }
})();
