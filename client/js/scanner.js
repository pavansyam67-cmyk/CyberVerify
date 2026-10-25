```javascript
const API_BASE_URL = "https://cyberverify-backend.onrender.com";

const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const imagePreview = document.getElementById("imagePreview");
const cameraBox = document.querySelector(".camera-box");

const startCameraBtn = document.getElementById("startCameraBtn");
const captureBtn = document.getElementById("captureBtn");
const fileInput = document.getElementById("fileInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const cameraStatus = document.getElementById("cameraStatus");
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

const resultsSection = document.getElementById("results");
const toast = document.getElementById("toast");

let stream = null;
let selectedFile = null;

if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => nav.classList.toggle("open"));

  document.querySelectorAll("nav a").forEach(a => {
    a.addEventListener("click", () => nav.classList.remove("open"));
  });
}

function showToast(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function setSelectedImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Please choose a valid image file.");
    return;
  }

  selectedFile = file;
  imagePreview.src = URL.createObjectURL(file);

  cameraBox.classList.remove("active");
  cameraBox.classList.add("has-image");
  analyzeBtn.disabled = false;
  cameraStatus.textContent = "Image ready";

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  startCameraBtn.textContent = "Start Camera";
  captureBtn.disabled = true;
}

if (fileInput) {
  fileInput.addEventListener("change", event => {
    const file = event.target.files[0];

    if (file) {
      setSelectedImage(file);
    } else {
      selectedFile = null;
      analyzeBtn.disabled = true;
    }
  });
}

if (startCameraBtn) {
  startCameraBtn.addEventListener("click", async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        camera.srcObject = null;
        cameraBox.classList.remove("active");
        startCameraBtn.textContent = "Start Camera";
        captureBtn.disabled = true;
        cameraStatus.textContent = "Camera off";
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });

      camera.srcObject = stream;
      await camera.play();

      cameraBox.classList.add("active");
      startCameraBtn.textContent = "Stop Camera";
      captureBtn.disabled = false;
      cameraStatus.textContent = "Camera active";

      selectedFile = null;
      analyzeBtn.disabled = true;
    } catch (error) {
      console.error("Camera error:", error);
      showToast("Allow camera permission or upload an image instead.");
    }
  });
}

if (captureBtn) {
  captureBtn.addEventListener("click", () => {
    if (!stream || !camera.videoWidth) {
      showToast("Start the camera first.");
      return;
    }

    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(camera, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) {
        showToast("Unable to capture the image.");
        return;
      }

      selectedFile = new File([blob], "camera-product.jpg", {
        type: "image/jpeg"
      });

      imagePreview.src = URL.createObjectURL(blob);
      cameraBox.classList.remove("active");
      cameraBox.classList.add("has-image");
      analyzeBtn.disabled = false;
      captureBtn.disabled = true;
      cameraStatus.textContent = "Photo captured";

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }

      camera.srcObject = null;
      startCameraBtn.textContent = "Start Camera";
      showToast("Product photo captured.");
    }, "image/jpeg", 0.92);
  });
}

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      showToast("Capture or upload a product image first.");
      return;
    }

    const formData = new FormData();
    formData.append("productImage", selectedFile);

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    try {
    const response = await fetch(
  `${API_BASE_URL}/api/verification/analyze`,
  {
    method: "POST",
    body: formData
  }
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Analysis failed.");
      }

      displayResult(data.verification);
      await loadHistory();

      resultsSection.classList.add("show");
      resultsSection.scrollIntoView({ behavior: "smooth" });
      showToast("Prototype verification completed.");
    } catch (error) {
      console.error("Analysis error:", error);
      showToast(error.message || "Unable to analyze image.");
    } finally {
      analyzeBtn.disabled = !selectedFile;
      analyzeBtn.innerHTML = 'Analyze Product <span>→</span>';
    }
  });
}

function displayResult(record) {
  if (!record) {
    showToast("The server returned no verification result.");
    return;
  }

  const resultTitle = document.getElementById("resultTitle");
  const resultDescription = document.getElementById("resultDescription");
  const resultIcon = document.getElementById("resultIcon");

  resultTitle.textContent = record.result || "Result unavailable";
  resultDescription.textContent =
    "This is an initial image-based awareness result, not absolute proof of authenticity.";

  document.getElementById("overallScore").innerHTML =
    `${record.overallScore ?? 0}<small>/100</small>`;

  updateScore("brand", record.brandLogoScore, "Brand appearance");
  updateScore("packaging", record.packagingScore, "Packaging appearance");
  updateScore("label", record.labelScore, "Label appearance");

  document.getElementById("recommendationText").textContent =
    record.recommendation || "Check the product with the official brand or seller.";

  if (record.result === "Likely Genuine") {
    resultIcon.textContent = "✓";
    resultIcon.style.color = "var(--primary)";
  } else if ((record.result || "").includes("Suspicious")) {
    resultIcon.textContent = "!";
    resultIcon.style.color = "var(--warning)";
  } else {
    resultIcon.textContent = "×";
    resultIcon.style.color = "var(--danger)";
  }
}

function updateScore(type, value, description) {
  const score = Number(value) || 0;
  const scoreElement = document.getElementById(`${type}Score`);
  const barElement = document.getElementById(`${type}Bar`);
  const textElement = document.getElementById(`${type}Text`);

  if (scoreElement) {
    scoreElement.textContent = `${score}/100`;
  }

  if (barElement) {
    barElement.style.width = `${Math.max(0, Math.min(100, score))}%`;
  }

  if (textElement) {
    textElement.textContent = description;
  }
}

async function loadHistory() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/verification/history`
    );

    if (!response.ok) {
      throw new Error("Could not load verification history.");
    }

    const data = await response.json();
    const history = Array.isArray(data)
      ? data
      : data.history || data.verifications || [];

    renderHistory(history);
  } catch (error) {
    console.error("History error:", error);
  }
}

function renderHistory(records) {
  const historyContainer = document.getElementById("historyList");
  if (!historyContainer) return;

  historyContainer.replaceChildren();

  if (!records.length) {
    historyContainer.textContent = "No verification history yet.";
    return;
  }

  records.forEach(record => {
    const item = document.createElement("div");
    item.className = "history-item";

    const title = document.createElement("strong");
    title.textContent = record.result || "Verification result";

    const score = document.createElement("p");
    score.textContent = `Score: ${record.overallScore ?? "N/A"}/100`;

    item.append(title, score);

    if (record._id) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/verification/${encodeURIComponent(record._id)}`,
            { method: "DELETE" }
          );

          if (!response.ok) {
            throw new Error("Could not delete this record.");
          }

          await loadHistory();
          showToast("History record deleted.");
        } catch (error) {
          console.error("Delete error:", error);
          showToast(error.message || "Unable to delete record.");
        }
      });

      item.appendChild(deleteButton);
    }

    historyContainer.appendChild(item);
  });
}

loadHistory();
```
