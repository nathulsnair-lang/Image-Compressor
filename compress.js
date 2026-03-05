(function () {
  "use strict";

  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const controlsSection = document.getElementById("controls-section");
  const compressionProgress = document.getElementById("compression-progress");
  const progressText = document.getElementById("progress-text");
  const progressDetail = document.getElementById("progress-detail");
  const resultsSection = document.getElementById("results-section");
  const resultsList = document.getElementById("results-list");
  const resultsIntro = document.getElementById("results-intro");
  const selectedCountEl = document.getElementById("selected-count");
  const qualitySlider = document.getElementById("quality");
  const qualityValue = document.getElementById("quality-value");
  const maxSizeInput = document.getElementById("max-size");
  const formatSelect = document.getElementById("format");
  const compressBtn = document.getElementById("compress-btn");
  const clearBtn = document.getElementById("clear-btn");

  let selectedFiles = [];

  function isImageFile(file) {
    return file.type.startsWith("image/");
  }

  function setSelectedFiles(files) {
    selectedFiles = Array.from(files).filter(isImageFile);
    if (selectedCountEl) {
      selectedCountEl.textContent = selectedFiles.length
        ? selectedFiles.length + " image(s) selected — adjust options below, then click Compress."
        : "";
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function getOutputMime() {
    const v = formatSelect.value;
    if (v === "auto") {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const dataUrl = canvas.toDataURL("image/webp");
        return dataUrl && dataUrl.indexOf("image/webp") !== -1 ? "image/webp" : "image/jpeg";
      } catch (e) {
        return "image/jpeg";
      }
    }
    return v;
  }

  function scaleDimensions(width, height, maxDim) {
    if (!maxDim || maxDim <= 0) return { width, height };
    if (width <= maxDim && height <= maxDim) return { width, height };
    const r = Math.min(maxDim / width, maxDim / height);
    return {
      width: Math.round(width * r),
      height: Math.round(height * r),
    };
  }

  function compressImage(file, quality, maxDim, outputMime) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = function () {
        URL.revokeObjectURL(url);
        const { width: w, height: h } = scaleDimensions(img.naturalWidth, img.naturalHeight, maxDim);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const isLossy = outputMime !== "image/png";

        function tryQuality(q, onDone) {
          const qualityOption = isLossy ? q : undefined;
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                onDone(null);
                return;
              }
              onDone(blob);
            },
            outputMime,
            qualityOption
          );
        }

        function pickBest() {
          if (!isLossy) {
            tryQuality(undefined, (blob) => {
              if (blob) resolve(buildResult(blob)); else reject(new Error("Failed to compress"));
            });
            return;
          }

          var bestBlob = null;
          var qList = [quality, 0.75, 0.68, 0.6, 0.52];
          var qualitiesToTry = qList.filter(function (q, i) { return i === 0 || q < quality; });
          var index = 0;

          function next() {
            if (index >= qualitiesToTry.length) {
              if (bestBlob) resolve(buildResult(bestBlob));
              else reject(new Error("Failed to compress"));
              return;
            }
            var q = qualitiesToTry[index++];
            tryQuality(q, (blob) => {
              if (!blob) {
                next();
                return;
              }
              if (blob.size < file.size) {
                resolve(buildResult(blob));
                return;
              }
              if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
              next();
            });
          }

          next();
        }

        function buildResult(blob) {
          if (!blob) return null;
          return {
            blob: blob,
            originalSize: file.size,
            compressedSize: blob.size,
            width: w,
            height: h,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            name: file.name,
          };
        }

        pickBest();
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };

      img.src = url;
    });
  }

  function getDownloadExtension(mime) {
    if (mime === "image/webp") return "webp";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    return "bin";
  }

  function renderResult(item, originalUrl) {
    const card = document.createElement("div");
    card.className = "result-card";
    const savingsPct = item.originalSize > 0
      ? Math.round((1 - item.compressedSize / item.originalSize) * 100)
      : 0;
    const savedBytes = item.originalSize - item.compressedSize;
    const ext = getDownloadExtension(item.blob.type);
    const baseName = item.name.replace(/\.[^.]+$/, "") || "image";
    const compressedUrl = URL.createObjectURL(item.blob);

    const dimsChanged = item.originalWidth !== item.width || item.originalHeight !== item.height;
    const detailsRows = [
      { label: "Original size", value: formatBytes(item.originalSize) },
      { label: "Compressed size", value: formatBytes(item.compressedSize) },
      { label: "Saved", value: formatBytes(savedBytes) + (savingsPct > 0 ? " (" + savingsPct + "%)" : "") },
      { label: "Dimensions", value: (dimsChanged ? item.originalWidth + "×" + item.originalHeight + " → " : "") + item.width + " × " + item.height + " px" },
    ];

    card.innerHTML =
      '<p class="result-name">' + escapeHtml(item.name) + "</p>" +
      '<div class="result-compare">' +
      '<div class="compare-col"><span class="compare-label">Original</span><img class="compare-img" src="' + originalUrl + '" alt="Original" /></div>' +
      '<div class="compare-divider">→</div>' +
      '<div class="compare-col"><span class="compare-label">Compressed</span><img class="compare-img" src="' + compressedUrl + '" alt="Compressed" /></div>' +
      "</div>" +
      '<dl class="result-details">' +
      detailsRows.map(function (r) {
        return "<dt>" + escapeHtml(r.label) + "</dt><dd>" + escapeHtml(r.value) + "</dd>";
      }).join("") +
      "</dl>" +
      '<div class="result-actions">' +
      '<a class="btn btn-primary btn-download" download="' + escapeHtml(baseName + "-compressed." + ext) + '" href="#">Download compressed image</a>' +
      "</div>";

    const link = card.querySelector(".btn-download");
    link.href = compressedUrl;
    link.addEventListener("click", function (e) { e.stopPropagation(); });

    resultsList.appendChild(card);
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    if (files && files.length) {
      setSelectedFiles(files);
      controlsSection.hidden = false;
      resultsSection.hidden = true;
      resultsList.innerHTML = "";
    }
  });

  fileInput.addEventListener("change", () => {
    const files = fileInput.files;
    if (files && files.length) {
      setSelectedFiles(files);
      controlsSection.hidden = false;
      resultsSection.hidden = true;
      resultsList.innerHTML = "";
    }
  });

  qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = qualitySlider.value + "%";
  });

  compressBtn.addEventListener("click", async () => {
    if (fileInput.files && fileInput.files.length) {
      setSelectedFiles(fileInput.files);
    }
    if (!selectedFiles.length) return;
    const quality = parseInt(qualitySlider.value, 10) / 100;
    const maxDim = parseInt(maxSizeInput.value, 10) || 0;
    const outputMime = getOutputMime();
    const total = selectedFiles.length;

    compressBtn.disabled = true;
    resultsList.innerHTML = "";
    resultsSection.hidden = true;
    if (compressionProgress) {
      compressionProgress.hidden = false;
      progressText.textContent = "Compressing…";
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (progressDetail) progressDetail.textContent = "Image " + (i + 1) + " of " + total;
      try {
        const result = await compressImage(file, quality, maxDim, outputMime);
        const originalUrl = URL.createObjectURL(file);
        renderResult(result, originalUrl);
      } catch (err) {
        const card = document.createElement("div");
        card.className = "result-card result-card--error";
        card.innerHTML =
          '<p class="result-name">' + escapeHtml(file.name) + "</p>" +
          '<p class="result-error">Failed to compress this image.</p>';
        resultsList.appendChild(card);
      }
    }

    if (compressionProgress) compressionProgress.hidden = true;
    resultsSection.hidden = false;
    if (resultsIntro) {
      resultsIntro.textContent = total === 1
        ? "Compression complete. Compare original vs compressed below and download."
        : "Compression complete for " + total + " images. Compare and download below.";
    }
    compressBtn.disabled = false;
    compressBtn.textContent = "Compress images";
  });

  clearBtn.addEventListener("click", () => {
    selectedFiles = [];
    if (fileInput) fileInput.value = "";
    if (selectedCountEl) selectedCountEl.textContent = "";
    if (compressionProgress) compressionProgress.hidden = true;
    controlsSection.hidden = true;
    resultsSection.hidden = true;
    resultsList.innerHTML = "";
  });
})();
