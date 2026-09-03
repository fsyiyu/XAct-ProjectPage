const galleries = window.XACT_VIDEO_GALLERIES || {};
const galleryState = {};

async function initMainVideo() {
  const video = document.getElementById("main-video");
  const loader = document.getElementById("main-video-loader");
  if (!video) return;

  const src = video.dataset.src;
  const setDirectSource = () => {
    video.src = src;
    video.load();
    if (loader) loader.classList.add("hidden");
  };

  if (window.location.protocol === "file:") {
    setDirectSource();
    return;
  }

  try {
    video.controls = false;
    if (loader) loader.textContent = "Loading video...";

    const response = await fetch(src, { cache: "force-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentLength = Number(response.headers.get("Content-Length")) || 0;
    if (!response.body || !contentLength) {
      const blob = await response.blob();
      video.src = URL.createObjectURL(blob);
    } else {
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (loader) {
          const percent = Math.round((received / contentLength) * 100);
          loader.textContent = `Loading video... ${percent}%`;
        }
      }

      const blob = new Blob(chunks, { type: "video/mp4" });
      video.src = URL.createObjectURL(blob);
    }

    video.controls = true;
    if (loader) loader.classList.add("hidden");
    video.load();
    video.play().catch(() => {});
  } catch (error) {
    setDirectSource();
  }
}

function videoLayer(className, src) {
  return `
    <video class="${className}" muted loop playsinline preload="none">
      <source data-src="${src}" type="video/mp4">
    </video>
  `;
}

function makeStrengthWrapper(scene) {
  return `
    <div class="video-wrapper strength">
      <div class="card-overlay"></div>
      ${videoLayer("layer-left", scene.left)}
      ${videoLayer("layer-small", scene.small)}
      ${videoLayer("layer-medium", scene.medium)}
      ${videoLayer("layer-large", scene.large)}
      <div class="slider-line"></div>
      <div class="slider-line-h"></div>
      <div class="slider-label tl">Left</div>
      <div class="slider-label tr">Small</div>
      <div class="slider-label bl">Medium</div>
      <div class="slider-label br">Large</div>
    </div>
  `;
}

function makePairWrapper(scene) {
  return `
    <div class="video-wrapper pair flowable">
      <div class="card-overlay"></div>
      ${videoLayer("layer-left", scene.left)}
      ${videoLayer("layer-right-result", scene.right)}
      ${scene.flow ? videoLayer("layer-right-flow", scene.flow) : ""}
      <div class="slider-line"></div>
      <div class="slider-label tl">Reference</div>
      <div class="slider-label tr" data-right-label>${scene.rightLabel || "Result"}</div>
    </div>
  `;
}

function makeCard(scene, index, galleryId, total) {
  const card = document.createElement("article");
  card.className = "video-card carousel-card hidden";
  card.dataset.index = index;

  const isPair = scene.mode === "pair";
  card.innerHTML = `
    ${isPair ? makePairWrapper(scene) : makeStrengthWrapper(scene)}
    <div class="card-meta">
      <div class="card-title">${scene.title} <span>(${index + 1} / ${total})</span></div>
      <div class="gallery-controls" style="gap:10px">
        ${isPair && scene.flow ? `<button class="mode-switch" type="button" aria-label="Toggle right side between optical flow and result">Flow ⇄ Result</button>` : ""}
        <div class="scene-dots">
          ${Array.from({ length: total }, (_, dotIndex) => `
            <button class="scene-dot" data-gallery="${galleryId}" data-index="${dotIndex}" aria-label="Show scene ${dotIndex + 1}"></button>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  setupSlider(card);
  const switchBtn = card.querySelector(".mode-switch");
  if (switchBtn) {
    switchBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const wrapper = card.querySelector(".video-wrapper");
      const rightLabel = card.querySelector("[data-right-label]");
      const showFlow = wrapper.classList.toggle("show-flow");
      switchBtn.classList.toggle("on", showFlow);
      switchBtn.textContent = showFlow ? "Result ⇄ Flow" : "Flow ⇄ Result";
      if (rightLabel) rightLabel.textContent = showFlow ? "Motion Plan" : (scene.rightLabel || "Result");
    });
  }
  card.addEventListener("click", () => {
    if (!card.classList.contains("active")) {
      setActive(galleryId, index);
    }
  });

  return card;
}

function setupSlider(card) {
  const wrapper = card.querySelector(".video-wrapper");

  function setPointer(clientX, clientY) {
    const rect = wrapper.getBoundingClientRect();
    const scaleX = rect.width / wrapper.offsetWidth;
    const scaleY = rect.height / wrapper.offsetHeight;
    const x = Math.max(0, Math.min((clientX - rect.left) / scaleX, wrapper.offsetWidth));
    const y = Math.max(0, Math.min((clientY - rect.top) / scaleY, wrapper.offsetHeight));
    wrapper.style.setProperty("--x", `${x}px`);
    wrapper.style.setProperty("--y", `${y}px`);
  }

  wrapper.addEventListener("mousemove", (event) => {
    setPointer(event.clientX, event.clientY);
  });

  wrapper.addEventListener("touchmove", (event) => {
    if (event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    setPointer(touch.clientX, touch.clientY);
  }, { passive: false });
}

function loadCardVideo(card) {
  card.querySelectorAll("video").forEach((video) => {
    const source = video.querySelector("source");
    if (source && source.dataset.src && !source.src) {
      source.src = source.dataset.src;
      video.load();
    }
  });
}

function playCard(card) {
  const videos = Array.from(card.querySelectorAll("video"));
  videos.forEach((video) => video.play().catch(() => {}));
}

function pauseCard(card) {
  card.querySelectorAll("video").forEach((video) => video.pause());
}

function startSync(galleryId, card) {
  const state = galleryState[galleryId];
  if (state.syncInterval) {
    clearInterval(state.syncInterval);
  }

  const videos = Array.from(card.querySelectorAll("video"));
  state.syncInterval = setInterval(() => {
    const anchor = videos[0];
    if (!anchor) return;
    const t = anchor.currentTime;
    videos.slice(1).forEach((video) => {
      if (Math.abs(video.currentTime - t) > 0.12) {
        video.currentTime = t;
      }
    });
  }, 450);
}

function setActive(galleryId, index) {
  const state = galleryState[galleryId];
  const { cards, scenes } = state;
  const total = scenes.length;
  const activeIndex = (index + total) % total;
  state.activeIndex = activeIndex;

  cards.forEach((card, cardIndex) => {
    card.className = "video-card carousel-card";
    let diff = (cardIndex - activeIndex + total) % total;
    if (diff > total / 2) diff -= total;

    if (diff === 0) {
      card.classList.add("active");
      loadCardVideo(card);
      playCard(card);
      startSync(galleryId, card);
    } else if (diff === -1) {
      card.classList.add("prev");
      loadCardVideo(card);
      pauseCard(card);
    } else if (diff === 1) {
      card.classList.add("next");
      loadCardVideo(card);
      pauseCard(card);
    } else {
      card.classList.add("hidden");
      if (diff < -1) card.classList.add("hidden-left");
      if (diff > 1) card.classList.add("hidden-right");
      pauseCard(card);
    }

    card.querySelectorAll(".scene-dot").forEach((dot) => {
      dot.classList.toggle("active", Number(dot.dataset.index) === activeIndex);
    });
  });
}

function makeNavButton(galleryId, action) {
  const isPrev = action === "prev";
  const button = document.createElement("button");
  button.className = `carousel-nav ${isPrev ? "prev-btn" : "next-btn"}`;
  button.dataset.gallery = galleryId;
  button.dataset.action = action;
  button.setAttribute("aria-label", isPrev ? "Previous scene" : "Next scene");
  button.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      ${isPrev ? '<path d="M15 18l-6-6 6-6"></path>' : '<path d="M9 18l6-6-6-6"></path>'}
    </svg>
  `;
  return button;
}

function makeGalleryBlock(galleryId, config) {
  const block = document.createElement("div");
  block.className = "gallery-block";
  block.innerHTML = `
    <div class="gallery-heading">
      <h3>${config.title}</h3>
      <div class="gallery-controls" data-gallery-controls="${galleryId}"></div>
    </div>
    <div class="stereo-gallery" id="gallery-${galleryId}"></div>
  `;
  return block;
}

function renderGallery(galleryId, config) {
  const root = document.getElementById(`gallery-${galleryId}`);
  const controls = document.querySelector(`[data-gallery-controls="${galleryId}"]`);
  if (!root || !controls || !config.scenes.length) return;
  root.innerHTML = "";
  controls.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "carousel-container";
  const track = document.createElement("div");
  track.className = "carousel-track";

  const cards = config.scenes.map((scene, index) => {
    const card = makeCard(scene, index, galleryId, config.scenes.length);
    track.appendChild(card);
    return card;
  });

  wrapper.appendChild(makeNavButton(galleryId, "prev"));
  wrapper.appendChild(track);
  wrapper.appendChild(makeNavButton(galleryId, "next"));
  root.appendChild(wrapper);

  config.scenes.forEach((scene, index) => {
    const dot = document.createElement("button");
    dot.className = "scene-dot";
    dot.dataset.gallery = galleryId;
    dot.dataset.index = index;
    dot.setAttribute("aria-label", `Show ${scene.title}`);
    controls.appendChild(dot);
  });

  galleryState[galleryId] = {
    activeIndex: 0,
    cards,
    scenes: config.scenes,
    syncInterval: null
  };

  setActive(galleryId, 0);
}

function renderAllGalleries() {
  const list = document.getElementById("gallery-list");
  if (!list) return;

  list.innerHTML = "";
  Object.entries(galleries).forEach(([galleryId, config]) => {
    list.appendChild(makeGalleryBlock(galleryId, config));
    renderGallery(galleryId, config);
  });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-gallery]");
  if (!target) return;

  event.stopPropagation();
  const galleryId = target.dataset.gallery;
  const state = galleryState[galleryId];
  if (!state) return;

  if (target.classList.contains("scene-dot")) {
    setActive(galleryId, Number(target.dataset.index));
    return;
  }

  if (target.dataset.action === "prev") {
    setActive(galleryId, state.activeIndex - 1);
  }

  if (target.dataset.action === "next") {
    setActive(galleryId, state.activeIndex + 1);
  }
});

renderAllGalleries();
initMainVideo();

const copyBib = document.getElementById("copyBib");
if (copyBib) {
  copyBib.addEventListener("click", async () => {
    const text = (document.querySelector(".bibtex code") || {}).innerText || "";
    const done = () => {
      const old = copyBib.textContent;
      copyBib.textContent = "Copied ✓";
      setTimeout(() => { copyBib.textContent = old; }, 1800);
    };
    try {
      await navigator.clipboard.writeText(text.trim());
      done();
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text.trim();
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
