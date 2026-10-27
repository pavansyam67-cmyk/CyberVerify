
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

// Face detection model
let faceModel = null;
let faceModelPromise = null;

// MobileNet image recognition model
let imageModel = null;
let modelPromise = null;

// Mobile navigation
if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    nav.classList.toggle("open");
  });

  document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
    });
  });
}

// Toast notification
function showToast(message) {
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

// Load MobileNet once
async function loadImageModel() {
  if (imageModel) return imageModel;

  if (typeof mobilenet === "undefined") {
    throw new Error(
      "Image recognition did not load. Check your internet connection and index.html."
    );
  }

  if (!modelPromise) {
    modelPromise = mobilenet.load();
  }

  try {
    imageModel = await modelPromise;
    return imageModel;
  } catch (error) {
    modelPromise = null;
    throw error;
  }
}

// Wait for selected image to load
function waitForImage() {
  if (
    imagePreview.complete &&
    imagePreview.naturalWidth > 0
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    imagePreview.onload = resolve;

    imagePreview.onerror = () => {
      reject(new Error("Unable to load the selected image."));
    };
  });
}

// Select an image
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

  if (camera) {
    camera.srcObject = null;
  }

  if (startCameraBtn) {
    startCameraBtn.textContent = "Start Camera";
  }

  if (captureBtn) {
    captureBtn.disabled = true;
  }
}

// Upload image
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

// Start or stop camera
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
        video: {
          facingMode: { ideal: "environment" }
        },
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
      showToast(
        "Allow camera permission or upload an image instead."
      );
    }
  });
}

// Capture image from camera
if (captureBtn) {
  captureBtn.addEventListener("click", () => {
    if (!stream || !camera.videoWidth) {
      showToast("Start the camera first.");
      return;
    }

    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    canvas.getContext("2d").drawImage(
      camera,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(blob => {
      if (!blob) {
        showToast("Unable to capture the image.");
        return;
      }

      setSelectedImage(
        new File(
          [blob],
          "camera-product.jpg",
          { type: "image/jpeg" }
        )
      );

      cameraStatus.textContent = "Photo captured";
      showToast("Photo captured.");
    }, "image/jpeg", 0.92);
  });
}

// Check whether the image contains a face
// or resembles a supported product category.
async function checkImageCategory() {
  await waitForImage();

  // Load BlazeFace
  if (typeof blazeface === "undefined") {
    throw new Error(
      "Face detection did not load. Refresh the page and try again."
    );
  }

  if (!faceModel) {
    if (!faceModelPromise) {
      faceModelPromise = blazeface.load();
    }

    try {
      faceModel = await faceModelPromise;
    } catch (error) {
      faceModelPromise = null;
      throw error;
    }
  }

  // Reject detected faces
  const faces = await faceModel.estimateFaces(
    imagePreview,
    true
  );

  console.log("Faces detected:", faces.length);
  console.log("Face detection result:", faces);

  if (faces.length > 0) {
    console.log("Face detected — rejecting image");

    return {
      valid: false,
      message:
        "Invalid Image — Please Upload a Product Image.",
      labels: ["human face detected"]
    };
  }

  // Check whether the image resembles a product
  const model = await loadImageModel();
  const predictions = await model.classify(
    imagePreview,
    5
  );

  console.log("Image predictions:", predictions);

  const labels = predictions.map(item =>
    item.className.toLowerCase()
  );

  const productTerms = [
    "shoe", "sandal", "clog", "sneaker",
    "watch", "sunglasses", "backpack",
    "handbag", "wallet", "bottle",
    "laptop", "computer", "cellular telephone",
    "mobile phone", "camera", "keyboard",
    "headphone", "helmet", "umbrella",
    "suitcase", "jersey", "jean", "shirt",
    "jacket", "hat", "cap", "book",
    "remote control", "television",
    "electric fan", "perfume", "toothbrush",
    "toy", "running shoe", "water bottle"
  ];

  const hasProduct = labels.some(label =>
    productTerms.some(term => label.includes(term))
  );

  if (!hasProduct) {
    return {
      valid: false,
      message:
        "Product not detected. Please upload a clear product image.",
      labels
    };
  }

  return {
    valid: true,
    labels
  };
}

// Analyze product image
if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      showToast("Capture or upload a product image first.");
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Checking Image...";

    try {
      const check = await checkImageCategory();

      // Display rejected image result
      if (!check.valid) {
        displayResult({
          result: "Invalid Image — Please Upload a Product Image",
          overallScore: 0,
          brandLogoScore: 0,
          packagingScore: 0,
          labelScore: 0,
          recommendation: check.message
        });

        if (resultsSection) {
          resultsSection.classList.add("show");
          resultsSection.scrollIntoView({
            behavior: "smooth"
          });
        }

        showToast(check.message);
        return;
      }

      // Send accepted image to backend
      analyzeBtn.textContent = "Analyzing...";

      const formData = new FormData();
      formData.append("productImage", selectedFile);

      const response = await fetch(
        `${API_BASE_URL}/api/verification/analyze`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Analysis failed."
        );
      }

      displayResult(data.verification);

      const description =
        document.getElementById("resultDescription");

      if (description) {
        description.textContent =
          "Image categories: " +
          check.labels.slice(0, 3).join(", ") +
          ". This is a prototype awareness check, not proof of authenticity.";
      }

      await loadHistory();

      if (resultsSection) {
        resultsSection.classList.add("show");
        resultsSection.scrollIntoView({
          behavior: "smooth"
        });
      }

      showToast("Prototype image check completed.");
    } catch (error) {
      console.error("Image analysis error:", error);

      showToast(
        error.message || "Unable to analyze image."
      );
    } finally {
      analyzeBtn.disabled = !selectedFile;
      analyzeBtn.innerHTML =
        'Analyze Product <span>→</span>';
    }
  });
}

// Display verification result
function displayResult(record) {
  if (!record) {
    showToast(
      "The server returned no verification result."
    );
    return;
  }

  const resultTitle =
    document.getElementById("resultTitle");

  const resultDescription =
    document.getElementById("resultDescription");

  const resultIcon =
    document.getElementById("resultIcon");

  const overallScore =
    document.getElementById("overallScore");

  const recommendationText =
    document.getElementById("recommendationText");

  if (resultTitle) {
    resultTitle.textContent =
      record.result || "Result unavailable";
  }

  if (resultDescription) {
    resultDescription.textContent =
      "This is an initial image-based awareness result, not absolute proof of authenticity.";
  }

  if (overallScore) {
    overallScore.innerHTML =
      `${record.overallScore ?? 0}<small>/100</small>`;
  }

  updateScore(
    "brand",
    record.brandLogoScore,
    "Brand appearance"
  );

  updateScore(
    "packaging",
    record.packagingScore,
    "Packaging appearance"
  );

  updateScore(
    "label",
    record.labelScore,
    "Label appearance"
  );

  if (recommendationText) {
    recommendationText.textContent =
      record.recommendation ||
      "Check the product with the official brand or seller.";
  }

  if (resultIcon) {
    if (
      record.result === "Likely Genuine"
    ) {
      resultIcon.textContent = "✓";
      resultIcon.style.color = "var(--primary)";
    } else if (
      (record.result || "").includes("Suspicious")
    ) {
      resultIcon.textContent = "!";
      resultIcon.style.color = "var(--warning)";
    } else {
      resultIcon.textContent = "×";
      resultIcon.style.color = "var(--danger)";
    }
  }
}

// Update individual scores
function updateScore(type, value, description) {
  const score = Number(value) || 0;

  const scoreElement =
    document.getElementById(`${type}Score`);

  const barElement =
    document.getElementById(`${type}Bar`);

  const textElement =
    document.getElementById(`${type}Text`);

  if (scoreElement) {
    scoreElement.textContent = `${score}/100`;
  }

  if (barElement) {
    barElement.style.width =
      `${Math.max(0, Math.min(100, score))}%`;
  }

  if (textElement) {
    textElement.textContent = description;
  }
}

// Load verification history
async function loadHistory() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/verification/history`
    );

    if (!response.ok) {
      throw new Error(
        "Could not load verification history."
      );
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

// Display history
function renderHistory(records) {
  const historyContainer =
    document.getElementById("historyList");

  if (!historyContainer) return;

  historyContainer.replaceChildren();

  if (!records.length) {
    historyContainer.textContent =
      "No verification history yet.";
    return;
  }

  records.forEach(record => {
    const item = document.createElement("div");
    item.className = "history-item";

    const title = document.createElement("strong");
    title.textContent =
      record.result || "Verification result";

    const score = document.createElement("p");
    score.textContent =
      `Score: ${record.overallScore ?? "N/A"}/100`;

    item.append(title, score);

    if (record._id) {
      const deleteButton =
        document.createElement("button");

      deleteButton.type = "button";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener(
        "click",
        async () => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/verification/${encodeURIComponent(record._id)}`,
              { method: "DELETE" }
            );

            if (!response.ok) {
              throw new Error(
                "Could not delete this record."
              );
            }

            await loadHistory();
            showToast("History record deleted.");
          } catch (error) {
            console.error("Delete error:", error);

            showToast(
              error.message ||
              "Unable to delete record."
            );
          }
        }
      );

      item.appendChild(deleteButton);
    }

    historyContainer.appendChild(item);
  });
}

// Load history when the page opens
loadHistory();
