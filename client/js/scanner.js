```javascript
const API_BASE_URL = "https://cyberverify-backend.onrender.com";

const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const imagePreview = document.getElementById("imagePreview");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
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

menuBtn.addEventListener("click", () => {
  nav.classList.toggle("open");
});

document.querySelectorAll("nav a").forEach(a => {
  a.addEventListener("click", () => nav.classList.remove("open"));
});

function showToast(message) {
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

startCameraBtn.addEventListener("click", async () => {
  try {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
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
    cameraBox.classList.add("active");
    startCameraBtn.textContent = "Stop Camera";
    captureBtn.disabled = false;
    cameraStatus.textContent = "Camera active";
    selectedFile = null;
    analyzeBtn.disabled = true;
  } catch (error) {
    console.error(error);
    showToast(
      "Camera access was blocked. Please allow camera permission or upload an image."
    );
  }
});

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

    startCameraBtn.textContent = "Start Camera";
    showToast("Product photo captured.");
  }, "image/jpeg", 0.92);
});

fileInput.addEventListener("change", event => {
  const file = event.target.files[0];

  if (file) {
    setSelectedImage(file);
  } else {
    selectedFile = null;
    analyzeBtn.disabled = true;
  }
});

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) {
    showToast("Capture or upload a product image first.");
    return;
  }

  const formData = new FormData();
  formData.append("productImage", selectedFile);

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = "Analyzing...";

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
    console.error(error);
    showToast(error.message || "Unable to analyze image.");
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = "Analyze Product <span>→</span>";
  }
});

function displayResult(record) {
  const resultTitle = document.getElementById("resultTitle");
  const resultDescription = document.getElementById("resultDescription");
  const resultIcon = document.getElementById("resultIcon");

  resultTitle.textContent = record.result;
  resultDescription.textContent =
    "This is an initial image-based awareness result, not absolute proof of authenticity.";

  document.getElementById("overallScore").innerHTML =
    `${record.overallScore}<small>/100</small>`;

  updateScore("brand", record.brandLogoScore, "Verified appearance");
  updateScore("packaging", record.packagingScore, "Consistent appearance");
  updateScore("label", record.labelScore, "Consistent appearance");

  document.getElementById("recommendationText").textContent =
    record.recommendation;

  if (record.result === "Likely Genuine") {
    resultIcon.textContent = "✓";
    resultIcon.style.color = "var(--primary)";
  } else if (record.result.includes("Suspicious")) {
    resultIcon.textContent = "!";
    resultIcon.style.color = "var(--warning)";
  } else {
    resultIcon.textContent = "×";
    resultIcon.style.color = "var(--danger)";
  }
}

function updateScore(type, value, text) {
  const
