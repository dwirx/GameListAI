// Initialize variables
let apiKeys = JSON.parse(localStorage.getItem("elevenlabsApiKeys")) || {};
let currentApiKey = localStorage.getItem("currentElevenlabsApiKey") || "";
let audioBlob = null;
let currentVoiceId = "";

const apiKeyInput = document.getElementById("apiKey");
const apiKeyNameInput = document.getElementById("apiKeyName");
const toggleApiKeyBtn = document.getElementById("toggleApiKey");
const addApiKeyBtn = document.getElementById("addApiKey");
const apiKeySelect = document.getElementById("apiKeySelect");
const deleteApiKeyBtn = document.getElementById("deleteApiKey");
const editApiKeyBtn = document.getElementById("editApiKey");
const useSelectedApiKeyBtn = document.getElementById("useSelectedApiKey");
const textArea = document.getElementById("text");
const textStats = document.getElementById("textStats");
const voiceSelect = document.getElementById("voice");
const previewAudio = document.getElementById("preview");
const convertBtn = document.getElementById("convert");
const audioContainer = document.getElementById("audioContainer");
const audioElement = document.getElementById("audio");
const downloadBtn = document.getElementById("download");
const saveToHistoryBtn = document.getElementById("saveToHistory");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");
const usageContainer = document.getElementById("usageContainer");
const showUsageBtn = document.getElementById("showUsage");
const usageDetails = document.getElementById("usageDetails");
const usageInfo = document.getElementById("usageInfo");
const usageBar = document.getElementById("usageBar");
const toggleApiKeyManagementBtn = document.getElementById(
  "toggleApiKeyManagement",
);
const apiKeyManagementSection = document.getElementById("apiKeyManagement");
const exportApiKeysBtn = document.getElementById("exportApiKeys");
const importApiKeysInput = document.getElementById("importApiKeys");

// Toggle API Key Management section
toggleApiKeyManagementBtn.addEventListener("click", () => {
  apiKeyManagementSection.classList.toggle("hidden");
  const toggleText = document.getElementById("toggleApiKeyText");
  if (apiKeyManagementSection.classList.contains("hidden")) {
    toggleText.textContent = "Show API Key Management";
  } else {
    toggleText.textContent = "Hide API Key Management";
  }
});

// Initialize API key select
function updateApiKeySelect() {
  apiKeySelect.innerHTML = "";
  Object.keys(apiKeys).forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    apiKeySelect.appendChild(option);
  });
  apiKeySelect.value = currentApiKey;
}

updateApiKeySelect();

// Toggle API key visibility
toggleApiKeyBtn.addEventListener("click", () => {
  apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
  toggleApiKeyBtn.innerHTML =
    apiKeyInput.type === "password"
      ? '<i class="fas fa-eye"></i>'
      : '<i class="fas fa-eye-slash"></i>';
});

// Add new API key
addApiKeyBtn.addEventListener("click", () => {
  const name = apiKeyNameInput.value.trim();
  const key = apiKeyInput.value.trim();
  if (name && key) {
    apiKeys[name] = key;
    localStorage.setItem("elevenlabsApiKeys", JSON.stringify(apiKeys));
    updateApiKeySelect();
    apiKeyNameInput.value = "";
    apiKeyInput.value = "";
    alert(`API key "${name}" added successfully.`);
  } else {
    alert("Please enter both a name and an API key.");
  }
});

// Delete selected API key
deleteApiKeyBtn.addEventListener("click", () => {
  const selectedName = apiKeySelect.value;
  if (selectedName) {
    if (
      confirm(`Are you sure you want to delete the API key "${selectedName}"?`)
    ) {
      delete apiKeys[selectedName];
      localStorage.setItem("elevenlabsApiKeys", JSON.stringify(apiKeys));
      if (currentApiKey === selectedName) {
        currentApiKey = "";
        localStorage.removeItem("currentElevenlabsApiKey");
      }
      updateApiKeySelect();
      alert(`API key "${selectedName}" deleted successfully.`);
    }
  } else {
    alert("Please select an API key to delete.");
  }
});

// Edit selected API key
editApiKeyBtn.addEventListener("click", () => {
  const selectedName = apiKeySelect.value;
  if (selectedName) {
    const newKey = prompt(
      `Enter new API key for "${selectedName}":`,
      apiKeys[selectedName],
    );
    if (newKey !== null) {
      apiKeys[selectedName] = newKey;
      localStorage.setItem("elevenlabsApiKeys", JSON.stringify(apiKeys));
      alert(`API key "${selectedName}" updated successfully.`);
    }
  } else {
    alert("Please select an API key to edit.");
  }
});

// Use selected API key
useSelectedApiKeyBtn.addEventListener("click", () => {
  const selectedName = apiKeySelect.value;
  if (selectedName) {
    currentApiKey = selectedName;
    localStorage.setItem("currentElevenlabsApiKey", currentApiKey);
    alert(`Now using API key "${selectedName}".`);
    fetchUsage();
    fetchVoices();
  } else {
    alert("Please select an API key to use.");
  }
});

// Text stats calculation
textArea.addEventListener("input", updateTextStats);

function updateTextStats() {
  const text = textArea.value;
  const charCount = text.length;
  const wordCount = text.trim().split(/\s+/).length;
  const paragraphCount = text.split(/\n\s*\n/).length;

  textStats.textContent = `Characters: ${charCount} | Words: ${wordCount} | Paragraphs: ${paragraphCount}`;
}

// Fetch voices
async function fetchVoices() {
  if (!currentApiKey) {
    alert("Please select an API key to use.");
    return;
  }

  try {
    const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKeys[currentApiKey],
      },
    });

    const voices = response.data.voices;
    const voicesByLanguage = {};

    voices.forEach((voice) => {
      const language = voice.labels.language || "Unknown";
      if (!voicesByLanguage[language]) {
        voicesByLanguage[language] = [];
      }
      voicesByLanguage[language].push(voice);
    });

    populateVoiceSelect(voicesByLanguage);
  } catch (error) {
    console.error("Error fetching voices:", error);
    alert("An error occurred while fetching voices. Please try again.");
  }
}

// Populate voice select
function populateVoiceSelect(voicesByLanguage) {
  voiceSelect.innerHTML = "";

  Object.keys(voicesByLanguage)
    .sort()
    .forEach((language) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = language;

      voicesByLanguage[language].forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.voice_id;
        option.textContent = voice.name;
        option.dataset.previewUrl = voice.preview_url;
        optgroup.appendChild(option);
      });

      voiceSelect.appendChild(optgroup);
    });

  // Trigger change event to load the first preview
  voiceSelect.dispatchEvent(new Event("change"));
}

// Update preview on voice change
voiceSelect.addEventListener("change", () => {
  const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
  previewAudio.src = selectedOption.dataset.previewUrl;
  currentVoiceId = selectedOption.value;
});

// Convert text to speech
convertBtn.addEventListener("click", async () => {
  const text = textArea.value;
  if (!text) {
    alert("Please enter some text.");
    return;
  }

  if (!currentApiKey) {
    alert("Please select an API key to use.");
    return;
  }

  try {
    convertBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i> Converting...';
    convertBtn.disabled = true;

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${currentVoiceId}`,
      {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      {
        headers: {
          Accept: "audio/mpeg",
          "xi-api-key": apiKeys[currentApiKey],
          "Content-Type": "application/json",
        },
        responseType: "blob",
      },
    );

    audioBlob = new Blob([response.data], { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(audioBlob);

    audioElement.src = audioUrl;
    audioContainer.classList.remove("hidden");

    // Fetch updated usage after conversion
    fetchUsage();
  } catch (error) {
    console.error("Error:", error);
    alert(
      "An error occurred while converting text to speech. Please try again.",
    );
  } finally {
    convertBtn.innerHTML =
      '<i class="fas fa-microphone mr-2"></i> Convert to Speech';
    convertBtn.disabled = false;
  }
});

// Download audio
downloadBtn.addEventListener("click", () => {
  if (audioBlob) {
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "tts_audio.mp3";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }
});

// Save to history
saveToHistoryBtn.addEventListener("click", () => {
  if (audioBlob) {
    const historyItem = {
      id: uuid.v4(),
      text: textArea.value,
      voiceId: currentVoiceId,
      voiceName: voiceSelect.options[voiceSelect.selectedIndex].textContent,
      timestamp: new Date().toISOString(),
      audio: URL.createObjectURL(audioBlob),
    };

    let history = JSON.parse(localStorage.getItem("ttsHistory")) || [];
    history.unshift(historyItem);
    localStorage.setItem("ttsHistory", JSON.stringify(history));

    updateHistoryList();
  }
});

// Update history list
function updateHistoryList() {
  const history = JSON.parse(localStorage.getItem("ttsHistory")) || [];
  historyList.innerHTML = "";

  history.forEach((item) => {
    const itemElement = document.createElement("div");
    itemElement.className = "bg-gray-100 p-4 rounded-lg";
    itemElement.innerHTML = `
      <p class="font-semibold">${item.voiceName}</p>
      <p class="text-sm text-gray-600">${new Date(item.timestamp).toLocaleString()}</p>
      <p class="mt-2">${item.text.substring(0, 50)}${item.text.length > 50 ? "..." : ""}</p>
      <audio controls src="${item.audio}" class="w-full mt-2"></audio>
      <button class="downloadHistoryAudio mt-2 bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600 transition duration-300">
        <i class="fas fa-download mr-1"></i> Download
      </button>
    `;

    const downloadBtn = itemElement.querySelector(".downloadHistoryAudio");
    downloadBtn.addEventListener("click", () => {
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = item.audio;
      a.download = `tts_audio_${item.id}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    historyList.appendChild(itemElement);
  });
}

// Clear history
clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the history?")) {
    localStorage.removeItem("ttsHistory");
    updateHistoryList();
  }
});

// Fetch usage
async function fetchUsage() {
  if (!currentApiKey) {
    usageContainer.classList.add("hidden");
    return;
  }

  try {
    const response = await axios.get("https://api.elevenlabs.io/v1/user", {
      headers: {
        "xi-api-key": apiKeys[currentApiKey],
      },
    });

    const usage = response.data.subscription;
    usageContainer.classList.remove("hidden");

    const totalCharacters = usage.character_limit;
    const usedCharacters = usage.character_count;
    const remainingCharacters = totalCharacters - usedCharacters;
    const usagePercentage = (usedCharacters / totalCharacters) * 100;

    document.getElementById("totalCharacters").textContent =
      totalCharacters.toLocaleString();
    document.getElementById("remainingCharacters").textContent =
      remainingCharacters.toLocaleString();
    document.getElementById("usagePercentage").textContent =
      `${usagePercentage.toFixed(2)}%`;
    usageBar.style.setProperty("--fill-width", `${usagePercentage}%`);

    const additionalUsageInfo = document.getElementById("additionalUsageInfo");
    additionalUsageInfo.innerHTML = `
      <p><strong>Tier:</strong> ${usage.tier}</p>
      <p><strong>Reset Date:</strong> ${new Date(usage.next_character_count_reset_unix * 1000).toLocaleDateString()}</p>
    `;

    // Start countdown
    startCountdown(usage.next_character_count_reset_unix * 1000);
  } catch (error) {
    console.error("Error fetching usage:", error);
    usageContainer.classList.add("hidden");
  }
}

// Countdown function
function startCountdown(resetDate) {
  const countdownElement = document.getElementById("resetCountdown");

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = resetDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    countdownElement.textContent = `Next Reset In: ${formatCountdown(days, hours, minutes, seconds)}`;

    if (distance < 0) {
      clearInterval(countdownTimer);
      countdownElement.textContent = "Character count has been reset!";
      fetchUsage(); // Refresh usage data
    }
  }

  updateCountdown(); // Initial call
  const countdownTimer = setInterval(updateCountdown, 1000);
}

// Toggle usage details
showUsageBtn.addEventListener("click", () => {
  usageDetails.classList.toggle("hidden");
  showUsageBtn.innerHTML = usageDetails.classList.contains("hidden")
    ? '<i class="fas fa-chart-bar mr-2"></i> Show Usage Details'
    : '<i class="fas fa-chart-bar mr-2"></i> Hide Usage Details';
});

// Initial history update and usage fetch
updateHistoryList();
fetchUsage();
fetchVoices();

// Save API keys to localStorage
function saveApiKeys() {
  localStorage.setItem("elevenlabsApiKeys", JSON.stringify(apiKeys));
}

// Load API keys from localStorage
function loadApiKeys() {
  const storedApiKeys = localStorage.getItem("elevenlabsApiKeys");
  if (storedApiKeys) {
    apiKeys = JSON.parse(storedApiKeys);
    updateApiKeySelect();
  }
}

// Load API keys on page load
loadApiKeys();

// Event listener for API key selection change
apiKeySelect.addEventListener("change", () => {
  const selectedApiKey = apiKeySelect.value;
  if (selectedApiKey) {
    currentApiKey = selectedApiKey;
    localStorage.setItem("currentElevenlabsApiKey", currentApiKey);
    fetchUsage();
    fetchVoices();
  }
});

// Function to update the UI based on the current API key
function updateUIForCurrentApiKey() {
  if (currentApiKey) {
    usageContainer.classList.remove("hidden");
    fetchUsage();
    fetchVoices();
  } else {
    usageContainer.classList.add("hidden");
    voiceSelect.innerHTML = '<option value="">Select an API key first</option>';
  }
}

// Call this function on page load and after API key changes
updateUIForCurrentApiKey();

// Error handling function
function handleError(error, message) {
  console.error(error);
  alert(message);
}

// Improve error handling in existing functions
async function fetchVoices() {
  if (!currentApiKey) {
    handleError(
      new Error("No API key selected"),
      "Please select an API key to use.",
    );
    return;
  }

  try {
    const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKeys[currentApiKey],
      },
    });

    const voices = response.data.voices;
    const voicesByLanguage = {};

    voices.forEach((voice) => {
      const language = voice.labels.language || "Unknown";
      if (!voicesByLanguage[language]) {
        voicesByLanguage[language] = [];
      }
      voicesByLanguage[language].push(voice);
    });

    populateVoiceSelect(voicesByLanguage);
  } catch (error) {
    handleError(
      error,
      "An error occurred while fetching voices. Please try again.",
    );
  }
}

// Add a function to validate API keys
function validateApiKey(apiKey) {
  // Add your validation logic here
  return apiKey.length > 0; // Simple validation example
}

// Update the addApiKey function to include validation
addApiKeyBtn.addEventListener("click", () => {
  const name = apiKeyNameInput.value.trim();
  const key = apiKeyInput.value.trim();
  if (name && key) {
    if (validateApiKey(key)) {
      apiKeys[name] = key;
      saveApiKeys();
      updateApiKeySelect();
      apiKeyNameInput.value = "";
      apiKeyInput.value = "";
      alert(`API key "${name}" added successfully.`);
    } else {
      alert("Invalid API key. Please check and try again.");
    }
  } else {
    alert("Please enter both a name and an API key.");
  }
});

// Add a function to format the countdown time
function formatCountdown(days, hours, minutes, seconds) {
  return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
}

// Export API keys
exportApiKeysBtn.addEventListener("click", () => {
  const dataStr = JSON.stringify(apiKeys);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
  const exportFileDefaultName = "elevenlabs_api_keys.json";

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
});

// Import API keys
importApiKeysInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const importedKeys = JSON.parse(e.target.result);
        apiKeys = { ...apiKeys, ...importedKeys };
        saveApiKeys();
        updateApiKeySelect();
        alert("API keys imported successfully.");
      } catch (error) {
        alert(
          "Error importing API keys. Please make sure the file is valid JSON.",
        );
      }
    };
    reader.readAsText(file);
  }
});

// Add event listener for the window load event
window.addEventListener("load", () => {
  loadApiKeys();
  updateUIForCurrentApiKey();
});
