const mainContainer = document.getElementById("main-container");
const codeEditor = CodeMirror(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "htmlmixed",
    autoCloseTags: {
        whenOpening: true,
        whenClosing: true,
        indentTags: [],
    },
    autoCloseBrackets: true,
    lineWrapping: false,
    theme: "default",
    extraKeys: {
        "'/>'": (cm) => {
            const cursor = cm.getCursor();
            const token = cm.getTokenAt(cursor);
            if (token.type === "tag") {
                cm.replaceRange("/>", cursor);
            } else {
                cm.replaceRange("'>", cursor);
            }
        },
    },
});

const previewContainer = document.getElementById("preview-container");
const previewFrame = document.getElementById("preview");
const runButton = document.getElementById("runButton");
const closePreviewButton = document.getElementById("closePreview");
const splitModeToggle = document.getElementById("splitModeToggle");
const toggleSplitOrientationButton = document.getElementById(
    "toggleSplitOrientation",
);
const darkModeToggle = document.getElementById("darkModeToggle");
const decreaseFontSizeButton = document.getElementById("decreaseFontSize");
const increaseFontSizeButton = document.getElementById("increaseFontSize");
const fontSizeDisplay = document.getElementById("fontSizeDisplay");

// Add new button for opening preview in new tab
const openInNewTabButton = document.createElement("button");
openInNewTabButton.id = "openInNewTab";
openInNewTabButton.className =
    "text-white hover:text-blue-400 transition-colors duration-300";
openInNewTabButton.title = "Open Real-time Preview in New Tab";
openInNewTabButton.innerHTML = '<i class="fas fa-external-link-alt"></i>';

// Insert the new button next to the existing buttons in the toolbar
const toolbarButtonsContainer = document.querySelector(
    "#toolbar > div:last-child",
);
toolbarButtonsContainer.insertBefore(
    openInNewTabButton,
    toolbarButtonsContainer.firstChild,
);

const selectAllButton = document.getElementById("selectAllButton");
const clearAllButton = document.getElementById("clearAllButton");

// Function to select all text in the editor
function selectAllText() {
    codeEditor.execCommand("selectAll");
}

// Function to clear all text in the editor
function clearAllText() {
    if (
        confirm(
            "Are you sure you want to clear all text? This action cannot be undone.",
        )
    ) {
        codeEditor.setValue("");
        updatePreview();
    }
}

// Add event listeners for the new buttons
selectAllButton.addEventListener("click", selectAllText);
clearAllButton.addEventListener("click", clearAllText);

let fontSize = 14;
let newTabWindow = null;

function getWrappedCode(code, isDarkMode) {
    return `
        <html>
            <head>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: ${isDarkMode ? "#e0e0e0" : "#333"};
                        background-color: ${isDarkMode ? "#1a1a1a" : "#ffffff"};
                    }
                </style>
                <script>
                    window.addEventListener('message', function(event) {
                        if (event.data.type === 'codeUpdate') {
                            document.body.innerHTML = event.data.code;
                        } else if (event.data.type === 'darkModeUpdate') {
                            document.body.style.color = event.data.isDarkMode ? "#e0e0e0" : "#333";
                            document.body.style.backgroundColor = event.data.isDarkMode ? "#1a1a1a" : "#ffffff";
                        }
                    });
                </script>
            </head>
            <body>${code}</body>
        </html>
    `;
}

function updatePreview() {
    const code = codeEditor.getValue();
    const isDarkMode = document.body.classList.contains("dark");
    const wrappedCode = getWrappedCode(code, isDarkMode);
    previewFrame.srcdoc = wrappedCode;
    localStorage.setItem("savedCode", code);

    // Update the new tab preview if it's open
    if (newTabWindow && !newTabWindow.closed) {
        newTabWindow.postMessage({ type: "codeUpdate", code: code }, "*");
    }
}

// Function to open preview in new tab
function openPreviewInNewTab() {
    const code = codeEditor.getValue();
    const isDarkMode = document.body.classList.contains("dark");
    const wrappedCode = getWrappedCode(code, isDarkMode);

    // Close the previous window if it exists
    if (newTabWindow && !newTabWindow.closed) {
        newTabWindow.close();
    }

    newTabWindow = window.open("", "_blank");
    newTabWindow.document.write(wrappedCode);
    newTabWindow.document.close();
}

// Add event listener for the new button
openInNewTabButton.addEventListener("click", openPreviewInNewTab);

codeEditor.on("change", updatePreview);

document.getElementById("toggleWrapButton").addEventListener("click", () => {
    const isWrapping = codeEditor.getOption("lineWrapping");
    codeEditor.setOption("lineWrapping", !isWrapping);
});

document.getElementById("copyButton").addEventListener("click", () => {
    navigator.clipboard
        .writeText(codeEditor.getValue())
        .then(() => {
            alert("Code copied to clipboard!");
        })
        .catch((err) => {
            alert("Failed to copy code: ", err);
        });
});

function toggleBrowserFullscreen() {
    previewContainer.classList.toggle("browser-fullscreen");
    previewContainer.classList.remove("hidden");
    closePreviewButton.style.display = previewContainer.classList.contains(
        "browser-fullscreen",
    )
        ? "block"
        : "none";
}

runButton.addEventListener("click", () => {
    updatePreview();
    toggleBrowserFullscreen();
});

closePreviewButton.addEventListener("click", () => {
    toggleBrowserFullscreen();
    if (!splitModeToggle.checked) {
        previewContainer.classList.add("hidden");
    }
});

splitModeToggle.addEventListener("change", () => {
    mainContainer.classList.toggle("flex-col", splitModeToggle.checked);
    previewContainer.classList.toggle("hidden", !splitModeToggle.checked);
    if (splitModeToggle.checked) {
        updatePreview();
        closePreviewButton.style.display = "none";
    } else {
        closePreviewButton.style.display = "none";
    }
    codeEditor.refresh();
});

toggleSplitOrientationButton.addEventListener("click", () => {
    if (splitModeToggle.checked) {
        mainContainer.classList.toggle("flex-col");
        codeEditor.refresh();
    }
});

function customCloseTag(cm) {
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);
    const tokenType = cm.getTokenTypeAt(cursor);

    if (tokenType && tokenType.indexOf("tag") > -1) {
        const from = { line: cursor.line, ch: 0 };
        const to = { line: cursor.line, ch: line.length };
        const content = cm.getRange(from, to);
        const match = content.match(/<(\w+)([^>]*)$/);

        if (match) {
            const tagName = match[1];
            const closeTag = `></${tagName}>`;
            cm.replaceRange(closeTag, cursor);
            cm.setCursor({ line: cursor.line, ch: cursor.ch + 1 });
            return true;
        }
    }
    return false;
}

codeEditor.setOption("extraKeys", {
    "Ctrl-Enter": (cm) => {
        if (!customCloseTag(cm)) {
            cm.execCommand("newlineAndIndent");
        }
    },
});

const savedCode = localStorage.getItem("savedCode");
if (savedCode) {
    codeEditor.setValue(savedCode);
    updatePreview();
} else {
    const defaultCode = `
<div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">Welcome to Enhanced Live Preview</h1>
    <p class="mb-4">This is a live preview of your HTML code. Edit the code in the editor to see changes here.</p>
    <button class="bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800 text-white font-bold py-2 px-4 rounded transition duration-300">
        Click me!
    </button>
    <div class="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 class="text-xl font-semibold mb-2">Features:</h2>
        <ul class="list-disc list-inside">
            <li>Live preview</li>
            <li>Dark mode support</li>
            <li>Syntax highlighting</li>
            <li>Responsive design</li>
        </ul>
    </div>
</div>`;
    codeEditor.setValue(defaultCode);
    updatePreview();
}

function adjustLayout() {
    codeEditor.refresh();
    if (window.innerWidth <= 768) {
        mainContainer.classList.add("flex-col");
        if (splitModeToggle.checked) {
            splitModeToggle.checked = false;
            previewContainer.classList.add("hidden");
        }
    } else {
        mainContainer.classList.remove("flex-col");
    }
}

window.addEventListener("load", adjustLayout);
window.addEventListener("resize", adjustLayout);

function toggleDarkMode() {
    document.body.classList.toggle("dark");
    const isDarkMode = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", isDarkMode);
    darkModeToggle.innerHTML = isDarkMode
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
    codeEditor.setOption("theme", isDarkMode ? "darcula" : "default");
    codeEditor.refresh();
    updatePreview();

    // Update dark mode in the new tab preview if it's open
    if (newTabWindow && !newTabWindow.closed) {
        newTabWindow.postMessage(
            { type: "darkModeUpdate", isDarkMode: isDarkMode },
            "*",
        );
    }
}

darkModeToggle.addEventListener("click", toggleDarkMode);

const savedDarkMode = localStorage.getItem("darkMode");
if (savedDarkMode === "true") {
    toggleDarkMode();
}

function updateFontSize(delta) {
    fontSize += delta;
    fontSize = Math.max(8, Math.min(fontSize, 24));
    codeEditor.getWrapperElement().style.fontSize = `${fontSize}px`;
    fontSizeDisplay.textContent = `${fontSize}px`;
    codeEditor.refresh();
}

decreaseFontSizeButton.addEventListener("click", () => updateFontSize(-1));
increaseFontSizeButton.addEventListener("click", () => updateFontSize(1));
