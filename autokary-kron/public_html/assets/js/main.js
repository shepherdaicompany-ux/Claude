/* Autokary Kron — interakcje i animacje */
(() => {
  "use strict";
  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- preloader (tylko przy pierwszym wejściu w sesji) */
  const loaded = () => {
    doc.classList.add("is-loaded");
    try { sessionStorage.setItem("kron-visited", "1"); } catch (e) {}
  };
  if (doc.classList.contains("no-preloader")) requestAnimationFrame(loaded);
  else window.addEventListener("load", () => setTimeout(loaded, 900));
  setTimeout(loaded, 3500); // awaryjnie, gdyby coś się nie wczytało

  /* ---------- zdjęcia: pokaż plik, jeśli jest na serwerze; inaczej zostaw placeholder */
  const medias = $$(".media[data-img]");
  const loadMedia = (m) => {
    if (m.dataset.done) return;
    m.dataset.done = "1";
    const img = new Image();
    img.alt = m.dataset.label || "";
    img.decoding = "async";
    img.onload = () => { m.prepend(img); requestAnimationFrame(() => m.classList.add("is-img")); };
    img.src = m.dataset.img;
  };
  if ("IntersectionObserver" in window) {
    const mio = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) { loadMedia(en.target); mio.unobserve(en.target); }
    }), { rootMargin: "400px" });
    medias.forEach((m) => mio.observe(m));
  } else medias.forEach(loadMedia);

  /* ---------- nagłówek: tło po przewinięciu, chowanie przy przewijaniu w dół */
  const hdr = $(".hdr");
  const progress = $(".progress");
  const totop = $(".totop");
  const callbar = $(".callbar");
  let lastY = 0, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    const max = document.body.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(y / max, 1) : 0;
    doc.classList.toggle("is-scrolled", y > 30);
    if (!doc.classList.contains("menu-open")) hdr.classList.toggle("hdr--hidden", y > 500 && y > lastY + 4);
    if (y < lastY - 4 || y < 500) hdr.classList.remove("hdr--hidden");
    lastY = y;
    progress.style.transform = `scaleX(${p})`;
    totop.style.setProperty("--p", p);
    totop.classList.toggle("is-on", y > 700);
    if (callbar) callbar.classList.toggle("is-on", y > 400);
    parallax(y);
    stepsLine();
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- paralaksa tła w nagłówkach */
  const parBgs = $$(".hero__bg .media, .phero__bg .media");
  function parallax(y) {
    if (reduced) return;
    parBgs.forEach((el) => { if (y < innerHeight * 1.2) el.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(1.08)`; });
  }

  /* ---------- linia postępu w sekcji "Jak to działa" */
  const steps = $(".steps");
  function stepsLine() {
    if (!steps) return;
    const r = steps.getBoundingClientRect();
    const p = Math.min(Math.max((innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.3), 0), 1);
    steps.style.setProperty("--p", p.toFixed(3));
  }

  /* ---------- menu mobilne */
  const burger = $(".burger");
  const mnav = $("#mnav");
  const setMenu = (open) => {
    doc.classList.toggle("menu-open", open);
    document.body.classList.toggle("is-locked", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
    mnav.setAttribute("aria-hidden", !open);
    hdr.classList.remove("hdr--hidden");
  };
  burger.addEventListener("click", () => setMenu(!doc.classList.contains("menu-open")));
  $$("a", mnav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") { setMenu(false); closeLb(); } });

  /* ---------- podział nagłówków na słowa */
  $$("[data-split]").forEach((h) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const w = document.createElement("span");
            w.className = "w";
            w.innerHTML = `<span style="--wi:${i++}"></span>`;
            w.firstChild.textContent = part;
            // złoty gradient musi być na samym słowie, bo animowany transform gubi background-clip rodzica
            if (n.parentNode.closest && n.parentNode.closest(".gold-text")) w.firstChild.className = "gold-text";
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(h);
    $$(".gold-text", h).forEach((g) => { if (g.querySelector(".w")) g.classList.remove("gold-text"); });
  });

  /* ---------- pojawianie się elementów przy przewijaniu */
  const reveals = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add("is-in"));

  /* ---------- autokar na drodze rusza, gdy jest widoczny */
  $$(".road").forEach((r) => {
    if (!("IntersectionObserver" in window)) return r.classList.add("is-in");
    new IntersectionObserver((es) => es.forEach((en) => r.classList.toggle("is-in", en.isIntersecting))).observe(r);
  });

  /* ---------- liczniki */
  $$("[data-count]").forEach((el) => {
    const target = +el.dataset.count, suf = el.dataset.suffix || "";
    const run = () => {
      if (reduced) { el.textContent = target + suf; return; }
      const t0 = performance.now(), dur = 1600;
      const tick = (t) => {
        const k = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suf;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!("IntersectionObserver" in window)) return run();
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
  });

  /* ---------- karty 3D z odblaskiem (tylko mysz) */
  if (finePointer && !reduced) {
    $$(".tilt").forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.classList.add("is-tilting");
        c.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
        c.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
        c.style.setProperty("--gx", `${x * 100}%`);
        c.style.setProperty("--gy", `${y * 100}%`);
      });
      c.addEventListener("pointerleave", () => {
        c.classList.remove("is-tilting");
        c.style.setProperty("--rx", "0deg");
        c.style.setProperty("--ry", "0deg");
      });
    });

    /* poświata podążająca za kursorem */
    const glow = $(".cursor-glow");
    let gx = innerWidth / 2, gy = innerHeight / 2, cx = gx, cy = gy;
    addEventListener("pointermove", (e) => { gx = e.clientX; gy = e.clientY; doc.classList.add("has-cursor"); }, { passive: true });
    document.addEventListener("pointerleave", () => doc.classList.remove("has-cursor"));
    const follow = () => {
      cx += (gx - cx) * 0.12; cy += (gy - cy) * 0.12;
      glow.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(follow);
    };
    follow();
  }

  /* ---------- złoty pył w nagłówkach (canvas) */
  $$("canvas.dust").forEach((cv) => {
    if (reduced) return;
    const ctx = cv.getContext("2d");
    let w, h, parts = [], running = true;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      w = cv.offsetWidth; h = cv.offsetHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(w * h / 14000, 90));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.8 + 0.4, vy: -(Math.random() * 0.35 + 0.08), vx: (Math.random() - 0.5) * 0.15,
        a: Math.random() * 0.6 + 0.15, tw: Math.random() * Math.PI * 2,
      }));
    };
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.tw += 0.03;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        const a = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(255, 228, 150, ${a})`);
        g.addColorStop(1, "rgba(212, 164, 55, 0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    resize(); draw();
    addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => {
        const vis = es[0].isIntersecting;
        if (vis && !running) { running = true; draw(); } else if (!vis) running = false;
      }).observe(cv);
    }
  });

  /* ---------- FAQ: płynne rozwijanie */
  $$(".faq__item").forEach((d) => {
    const sum = $("summary", d), body = $(".faq__a", d);
    sum.addEventListener("click", (e) => {
      if (reduced) return;
      e.preventDefault();
      if (d.open) {
        const h = body.offsetHeight;
        body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 350, easing: "ease" }).onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 400, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
    });
  });

  /* ---------- lightbox (galerie i certyfikaty) */
  const lb = $(".lb"), stage = $(".lb__stage", lb), cap = $(".lb__cap", lb);
  let group = [], idx = 0;
  const show = (i) => {
    idx = (i + group.length) % group.length;
    const m = group[idx];
    stage.innerHTML = "";
    if (m.classList.contains("is-img")) {
      const img = new Image(); img.src = m.dataset.img; img.alt = m.dataset.label || ""; stage.append(img);
    } else {
      const clone = m.cloneNode(true); clone.removeAttribute("data-lightbox"); clone.style.transform = "";
      const r = m.offsetWidth / Math.max(m.offsetHeight, 1);
      clone.style.width = `min(900px, 100%, calc((100vh - 150px) * ${r.toFixed(3)}))`;
      clone.style.setProperty("--ratio", r.toFixed(3));
      stage.append(clone);
    }
    cap.textContent = `${m.dataset.label || ""}  ·  ${idx + 1} / ${group.length}`;
    $$(".lb__nav", lb).forEach((b) => (b.hidden = group.length < 2));
  };
  function closeLb() { lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); document.body.classList.remove("is-locked"); }
  $$("[data-lightbox]").forEach((m) => {
    m.setAttribute("tabindex", "0");
    m.setAttribute("role", "button");
    const open = () => {
      const scope = m.closest(".gal, .bus__gallery, .grid3, .split__media") || document.body;
      group = $$("[data-lightbox]", scope);
      show(group.indexOf(m));
      lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); document.body.classList.add("is-locked");
      $(".lb__close", lb).focus();
    };
    m.addEventListener("click", open);
    m.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  $(".lb__close", lb).addEventListener("click", closeLb);
  $(".lb__prev", lb).addEventListener("click", () => show(idx - 1));
  $(".lb__next", lb).addEventListener("click", () => show(idx + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target === stage) closeLb(); });
  addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });
  let tx = 0;
  lb.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1)); });

  /* ---------- formularz wyceny */
  $$("[data-form]").forEach((f) => {
    const msg = $(".form__msg", f);
    const t = f.querySelector('[name="t"]');
    if (t) t.value = Date.now();
    const say = (text, ok) => { msg.textContent = text; msg.className = "form__msg " + (ok ? "ok" : "err"); };
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      let bad = false;
      $$("[required]", f).forEach((el) => {
        const wrap = el.closest(".field, .check");
        const invalid = el.type === "checkbox" ? !el.checked : !el.value.trim();
        wrap.classList.toggle("is-err", invalid);
        if (invalid && !bad) { bad = true; el.focus(); }
      });
      const phone = f.querySelector('[name="phone"]');
      if (!bad && phone.value.replace(/\D/g, "").length < 9) { bad = true; phone.closest(".field").classList.add("is-err"); phone.focus(); }
      if (bad) return say("Uzupełnij wymagane pola (imię, telefon, zgoda).", false);
      f.classList.add("is-sending");
      say("Wysyłanie…", true);
      try {
        const res = await fetch(f.action, { method: "POST", body: new FormData(f), headers: { Accept: "application/json" } });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Błąd");
        f.reset();
        say("Dziękujemy! Zapytanie zostało wysłane — oddzwonimy najszybciej, jak to możliwe.", true);
      } catch (err) {
        say("Nie udało się wysłać formularza. Zadzwoń: 505 434 624.", false);
      } finally {
        f.classList.remove("is-sending");
        if (t) t.value = Date.now();
      }
    });
    $$("input, textarea, select", f).forEach((el) => el.addEventListener("input", () => el.closest(".field, .check")?.classList.remove("is-err")));
  });

  /* ---------- rok w stopce */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  onScroll();
})();
