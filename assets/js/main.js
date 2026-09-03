"use strict";

/* ---------------- helpers ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SC_LABEL = {
  h2h: "Human → Human",
  h2r: "Human → Robot",
  r2r: "Robot → Robot"
};

const DEMOS = {
  h2h: ["0004", "0005", "0006", "0009", "0012", "0018", "0028"],
  h2r: ["0001", "0010", "0011", "0012", "0014"],
  r2r: ["0009", "0017", "0019", "0027", "0029", "0035"]
};

const KINDS = [
  { k: "input",  label: "Reference",  tag: "01" },
  { k: "flow",   label: "Motion Plan", tag: "02" },
  { k: "output", label: "Result",      tag: "03" }
];

/* ---------------- reveal on scroll ---------------- */
const revealIO = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      revealIO.unobserve(e.target);
    }
  }),
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
);
$$("[data-reveal]").forEach(el => revealIO.observe(el));

/* ---------------- sticky nav active link ---------------- */
const navLinks = $$(".nav-links a");
const sectionIO = new IntersectionObserver(
  entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = "#" + e.target.id;
        navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === id));
      }
    });
  },
  { rootMargin: "-38% 0px -55% 0px", threshold: 0 }
);
["idea", "method", "demos", "data", "results", "cite"].forEach(id => {
  const sec = document.getElementById(id);
  if (sec) sectionIO.observe(sec);
});

/* ---------------- stat counters ---------------- */
function animateNumber(el, target, decimals) {
  if (reducedMotion) {
    el.textContent = target.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return;
  }
  const dur = 1200;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = target * eased;
    el.textContent = val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statIO = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      const box = e.target;
      const num = $(".stat-num", box);
      const target = parseFloat(box.dataset.count);
      const decimals = parseInt(box.dataset.decimals || "0", 10);
      animateNumber(num, target, decimals);
      statIO.unobserve(box);
    }
  }),
  { threshold: 0.6 }
);
$$(".stat").forEach(el => statIO.observe(el));

/* ---------------- media: load, hover, play ---------------- */
function mediaIO() {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      const card = e.target;
      const videos = $$("video", card);
      if (e.isIntersecting) {
        videos.forEach(v => { if (!v.dataset.loaded) { v.src = v.dataset.src; v.dataset.loaded = "1"; } });
      } else {
        setCardPlaying(card, false);
      }
    }),
    { threshold: 0.08, rootMargin: "260px 0px 260px 0px" }
  );
  return io;
}

function setCardPlaying(card, on) {
  const videos = $$("video", card);
  if (on) {
    videos.forEach(v => { const p = v.play(); if (p) p.catch(() => {}); });
  } else {
    videos.forEach(v => v.pause());
  }
  $$(".vbox", card).forEach(b => b.classList.toggle("paused", !on));
  card._playing = on;
}

function bindCard(card, hero) {
  const vboxes = $$(".vbox", card);
  vboxes.forEach(box => {
    box.addEventListener("click", () => {
      const next = !card._playing;
      setCardPlaying(card, next);
      card._interacted = true;
    });
  });
  if (hero) return;
  card.addEventListener("mouseenter", () => {
    if (!card._interacted && !reducedMotion && !card._playing) setCardPlaying(card, true);
  });
  card.addEventListener("mouseleave", () => {
    if (!card._interacted && card._playing) setCardPlaying(card, false);
  });
}

/* hero stage */
const heroCard = $(".tri-hero");
if (heroCard) {
  $$("video", heroCard).forEach(v => {
    v.src = v.dataset.src;
    v.dataset.loaded = "1";
    const p = v.play();
    if (p) p.catch(() => {});
  });
  heroCard._interacted = true;
  bindCard(heroCard, true);
}

/* ---------------- demo grid + tabs ---------------- */
const demoGrid = $("#demoGrid");
const demoIO = mediaIO();
const mediaObserved = new WeakSet();

function demoVideosHtml(sc, id) {
  return KINDS.map(kind => `
    <div class="vcell">
      <div class="vbox">
        <video muted loop playsinline preload="metadata"
               poster="assets/img/poster/${sc}-${id}-${kind.k}.jpg"
               data-src="assets/media/demo/${sc}/${id}-${kind.k}.mp4"
               aria-label="${kind.label} · ${SC_LABEL[sc]} 示例 ${id}"></video>
        <span class="vtag">${kind.tag}</span>
        <button class="pbtn" type="button" aria-label="播放或暂停示例 ${id} 的${kind.label}"><i>▶</i></button>
      </div>
      <span class="vlabel">${kind.label}</span>
    </div>`).join("");
}

function renderDemos(sc) {
  if (!demoGrid) return;
  demoGrid.innerHTML = "";
  const frag = document.createDocumentFragment();
  (DEMOS[sc] || []).forEach(id => {
    const card = document.createElement("article");
    card.className = "demo-card";
    card.innerHTML = `
      <div class="demo-head">
        <span class="demo-title">示例 ${id}</span>
        <span class="demo-type">${SC_LABEL[sc]}</span>
      </div>
      <div class="tri">${demoVideosHtml(sc, id)}</div>
      <p class="demo-hint">悬停预览 · 点击任一画面暂停 / 继续</p>`;
    card._interacted = false;
    bindCard(card, false);
    demoIO.observe(card);
    frag.appendChild(card);
  });
  demoGrid.appendChild(frag);
  $$("video", demoGrid).forEach(v => {
    v.addEventListener("loadedmetadata", () => v.pause());
  });
}

const tabs = $$(".tab");
tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("is-active")) return;
    tabs.forEach(b => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    renderDemos(btn.dataset.tab);
  });
});
renderDemos("h2h");

/* ---------------- copy bibtex ---------------- */
const copyBib = $("#copyBib");
if (copyBib) {
  copyBib.addEventListener("click", async () => {
    const text = $("pre code").innerText.trim();
    const done = () => {
      const old = copyBib.textContent;
      copyBib.textContent = "已复制 ✓";
      setTimeout(() => { copyBib.textContent = old; }, 1800);
    };
    try {
      await navigator.clipboard.writeText(text);
      done();
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    }
  });
}
