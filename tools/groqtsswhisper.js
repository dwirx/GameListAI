// Constants and DOM elements
const chatContainer = document.getElementById("chatContainer");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const startSpeechButton = document.getElementById("startSpeech");
const stopSpeechButton = document.getElementById("stopSpeech");
const speechIndicator = document.getElementById("speechIndicator");
const countrySelect = document.getElementById("countrySelect");
const voicesSelect = document.getElementById("voices");
const rateInput = document.getElementById("rate");
const pitchInput = document.getElementById("pitch");
const rateValue = document.getElementById("rateValue");
const pitchValue = document.getElementById("pitchValue");
const apiKeyInput = document.getElementById("apiKey");
const toggleApiKeyButton = document.getElementById("toggleApiKey");
const clearChatButton = document.getElementById("clearChat");
const contextCountElement = document.getElementById("contextCount");
const modelSelect = document.getElementById("modelSelect");

// Global variables
let recognition;
let synthesis = window.speechSynthesis;
let voices = [];
let currentUtterance = null;
let conversationContext = [];
let contextCount = 0;

const countries = {
    ID: "Indonesia",
    US: "United States",
    GB: "United Kingdom",
    JP: "Japan",
    KR: "South Korea",
};

// Speech recognition setup
if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "id-ID";
} else {
    console.error("Speech recognition not supported");
}

// Functions
function populateVoices() {
    voices = synthesis.getVoices();
    const voicesByCountry = {};

    voices.forEach((voice) => {
        const country = voice.lang.split("-")[1];
        if (countries[country]) {
            if (!voicesByCountry[country]) {
                voicesByCountry[country] = [];
            }
            voicesByCountry[country].push(voice);
        }
    });

    countrySelect.innerHTML = `
        <option value="">Select a Country</option>
        ${Object.entries(countries)
            .map(([code, name]) => `<option value="${code}">${name}</option>`)
            .join("")}
    `;

    const savedCountry = localStorage.getItem("selectedCountry");
    if (savedCountry && voicesByCountry[savedCountry]) {
        countrySelect.value = savedCountry;
        updateVoiceList(savedCountry, voicesByCountry);
    }
}

function updateVoiceList(country, voicesByCountry) {
    const countryVoices = voicesByCountry[country] || [];
    voicesSelect.innerHTML = `
        <option value="">Select a Voice</option>
        ${countryVoices
            .map(
                (voice) =>
                    `<option value="${voice.name}">${voice.name}</option>`,
            )
            .join("")}
    `;

    const savedVoice = localStorage.getItem("selectedVoice");
    if (
        savedVoice &&
        countryVoices.some((voice) => voice.name === savedVoice)
    ) {
        voicesSelect.value = savedVoice;
    }
}

function setVoice() {
    const selectedVoice = voices.find(
        (voice) => voice.name === voicesSelect.value,
    );

    if (selectedVoice) {
        if (currentUtterance) {
            currentUtterance.voice = selectedVoice;
        }
        localStorage.setItem("selectedVoice", selectedVoice.name);
        localStorage.setItem(
            "selectedCountry",
            selectedVoice.lang.split("-")[1],
        );
    }
}

function setOption() {
    if (this.id === "rate") {
        if (currentUtterance) currentUtterance.rate = parseFloat(this.value);
        rateValue.textContent = this.value;
        localStorage.setItem("selectedRate", this.value);
    } else if (this.id === "pitch") {
        if (currentUtterance) currentUtterance.pitch = parseFloat(this.value);
        pitchValue.textContent = this.value;
        localStorage.setItem("selectedPitch", this.value);
    }
}

function addMessageToChat(sender, message) {
    const messageElement = document.createElement("div");
    messageElement.className = `mb-2 ${
        sender === "user" ? "text-right" : "text-left"
    }`;

    let formattedMessage;
    if (sender === "ai") {
        formattedMessage = DOMPurify.sanitize(marked.parse(message));
    } else {
        formattedMessage = message;
    }

    messageElement.innerHTML = `
        <div class="inline-block p-3 rounded-lg ${
            sender === "user" ? "bg-blue-200" : "bg-green-200"
        }">
            <p class="font-semibold mb-1">${sender === "user" ? "Anda" : "AI"}</p>
            <div class="${
                sender === "ai" ? "ai-response prose prose-sm" : ""
            }">${formattedMessage}</div>
            ${
                sender === "ai"
                    ? '<div class="mt-2"><button class="play-tts bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mr-2">Play TTS</button><button class="stop-tts bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">Stop TTS</button></div>'
                    : ""
            }
        </div>
    `;

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (sender === "ai") {
        const playButton = messageElement.querySelector(".play-tts");
        const stopButton = messageElement.querySelector(".stop-tts");
        playButton.addEventListener("click", () => speakText(message));
        stopButton.addEventListener("click", stopTTS);
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const selectedModel = modelSelect.value;

    if (!message) {
        return;
    }

    if (!apiKey) {
        addMessageToChat(
            "ai",
            "Silakan masukkan API key Groq Anda terlebih dahulu.",
        );
        return;
    }

    addMessageToChat("user", message);
    userInput.value = "";

    const thinkingElement = document.createElement("div");
    thinkingElement.className = "mb-2 text-left";
    thinkingElement.innerHTML = `
        <div class="inline-block p-3 rounded-lg bg-gray-200">
            <p class="font-semibold mb-1">AI</p>
            <div class="ai-thinking-animation flex space-x-1">
                <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
                <div class="w-2 h-2 bg-gray-500 rounded-full"></div>
            </div>
        </div>
    `;
    chatContainer.appendChild(thinkingElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        conversationContext.push({ role: "user", content: message });

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                messages: conversationContext,
                model: selectedModel,
                temperature: 1,
                max_tokens: 1024,
                top_p: 1,
                stream: false,
                stop: null,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
            },
        );

        chatContainer.removeChild(thinkingElement);

        const aiResponse = response.data.choices[0].message.content;

        conversationContext.push({
            role: "assistant",
            content: aiResponse,
        });

        contextCount = conversationContext.length;

        addMessageToChat("ai", aiResponse);
        updateContextCount();
        speakText(aiResponse);
    } catch (error) {
        chatContainer.removeChild(thinkingElement);
        handleError(error);
    }
}

function startSpeechRecognition() {
    if (recognition) {
        recognition.start();
        startSpeechButton.disabled = true;
        stopSpeechButton.disabled = false;
        showSpeechAnimation();
    }
}

function stopSpeechRecognition() {
    if (recognition) {
        recognition.stop();
        startSpeechButton.disabled = false;
        stopSpeechButton.disabled = true;
        hideSpeechAnimation();
    }
}

function showSpeechAnimation() {
    speechIndicator.classList.remove("hidden");
    speechIndicator.innerHTML = `
        <div class="speech-animation">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
    `;
}

function hideSpeechAnimation() {
    speechIndicator.classList.add("hidden");
    speechIndicator.innerHTML = "";
}

function stopTTS() {
    if (synthesis.speaking) {
        synthesis.cancel();
    }
    speechIndicator.classList.add("hidden");
}

function speakText(text) {
    stopTTS();

    const selectedVoice = voices.find(
        (voice) => voice.name === voicesSelect.value,
    );

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.onstart = () => {
        speechIndicator.classList.remove("hidden");
    };
    currentUtterance.onend = () => {
        speechIndicator.classList.add("hidden");
    };
    currentUtterance.onerror = (event) => {
        console.error("Speech synthesis error", event);
        speechIndicator.classList.add("hidden");
    };

    currentUtterance.voice = selectedVoice;
    currentUtterance.rate = parseFloat(rateInput.value);
    currentUtterance.pitch = parseFloat(pitchInput.value);

    synthesis.speak(currentUtterance);
}

function toggleApiKeyVisibility() {
    if (apiKeyInput.type === "password") {
        apiKeyInput.type = "text";
        toggleApiKeyButton.textContent = "Sembunyikan API Key";
    } else {
        apiKeyInput.type = "password";
        toggleApiKeyButton.textContent = "Tampilkan API Key";
    }
}

function updateContextCount() {
    contextCountElement.textContent = `Konteks: ${contextCount}`;
}

function clearChat() {
    conversationContext = [];
    contextCount = 0;
    updateContextCount();
    chatContainer.innerHTML = "";
    addMessageToChat(
        "ai",
        "Obrolan telah dibersihkan. Anda dapat memulai percakapan baru.",
    );
}

function handleError(error) {
    console.error("Error:", error);
    let errorMessage = "Terjadi kesalahan. Silakan coba lagi nanti.";

    if (error.response) {
        if (error.response.status === 401) {
            errorMessage =
                "API key tidak valid atau kadaluarsa. Silakan periksa kembali API key Anda.";
            localStorage.removeItem("apiKey");
            apiKeyInput.value = "";
        } else if (error.response.data && error.response.data.error) {
            errorMessage = `Error: ${error.response.data.error.message}`;
        }
    } else if (error.request) {
        errorMessage =
            "Tidak dapat terhubung ke server. Silakan periksa koneksi internet Anda.";
    }

    addMessageToChat("ai", errorMessage);
}

async function checkApiKey(apiKey) {
    try {
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                messages: [{ role: "user", content: "Test" }],
                model: modelSelect.value,
                max_tokens: 1,
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
            },
        );
        return true;
    } catch (error) {
        console.error("API key validation error:", error);
        return false;
    }
}

async function updateApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        const isValid = await checkApiKey(apiKey);
        if (isValid) {
            addMessageToChat(
                "ai",
                "API key valid. Anda sekarang dapat menggunakan chatbot.",
            );
            localStorage.setItem("apiKey", apiKey);
        } else {
            addMessageToChat(
                "ai",
                "API key tidak valid. Silakan periksa kembali dan masukkan API key yang benar.",
            );
            localStorage.removeItem("apiKey");
            apiKeyInput.value = "";
        }
    } else {
        addMessageToChat(
            "ai",
            "Silakan masukkan API key Groq Anda untuk menggunakan chatbot.",
        );
        localStorage.removeItem("apiKey");
    }
}

// Event Listeners
countrySelect.addEventListener("change", (e) => {
    const selectedCountry = e.target.value;
    const voicesByCountry = {};
    voices.forEach((voice) => {
        const country = voice.lang.split("-")[1];
        if (countries[country]) {
            if (!voicesByCountry[country]) {
                voicesByCountry[country] = [];
            }
            voicesByCountry[country].push(voice);
        }
    });
    updateVoiceList(selectedCountry, voicesByCountry);
    localStorage.setItem("selectedCountry", selectedCountry);
});

voicesSelect.addEventListener("change", setVoice);
rateInput.addEventListener("input", setOption);
pitchInput.addEventListener("input", setOption);

sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

startSpeechButton.addEventListener("click", startSpeechRecognition);
stopSpeechButton.addEventListener("click", stopSpeechRecognition);
toggleApiKeyButton.addEventListener("click", toggleApiKeyVisibility);
clearChatButton.addEventListener("click", clearChat);

apiKeyInput.addEventListener("change", updateApiKey);
modelSelect.addEventListener("change", () => {
    localStorage.setItem("selectedModel", modelSelect.value);
});

if (recognition) {
    recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        userInput.value = transcript;
        sendMessage();
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        startSpeechButton.disabled = false;
        stopSpeechButton.disabled = true;
        hideSpeechAnimation();
    };

    recognition.onend = () => {
        startSpeechButton.disabled = false;
        stopSpeechButton.disabled = true;
        hideSpeechAnimation();
    };
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    const savedApiKey = localStorage.getItem("apiKey");
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    const savedRate = localStorage.getItem("selectedRate");
    const savedPitch = localStorage.getItem("selectedPitch");
    const savedModel = localStorage.getItem("selectedModel");

    if (savedRate) {
        rateInput.value = savedRate;
        rateValue.textContent = savedRate;
    }

    if (savedPitch) {
        pitchInput.value = savedPitch;
        pitchValue.textContent = savedPitch;
    }

    if (savedModel) {
        modelSelect.value = savedModel;
    }

    populateVoices();
    updateContextCount();

    addMessageToChat(
        "ai",
        "Selamat datang! Saya adalah AI asisten yang siap membantu Anda. Silakan masukkan API key Groq Anda dan mulai bertanya.",
    );

    if (!savedApiKey) {
        addMessageToChat(
            "ai",
            "Sepertinya Anda belum memasukkan API key Groq. Silakan masukkan API key Anda untuk mulai menggunakan chatbot ini.",
        );
    }
});

// Tambahkan event listener untuk memastikan suara-suara telah dimuat
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
}
