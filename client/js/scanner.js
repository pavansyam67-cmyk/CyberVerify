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

if (startCamera
