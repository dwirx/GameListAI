const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.static("public"));

function getFileList(folder, itemsPerPage, currentPage) {
  const files = fs.readdirSync(folder);
  const htmlFiles = files.filter(
    (file) => path.extname(file).toLowerCase() === ".html",
  );
  const totalPages = Math.ceil(htmlFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFiles = htmlFiles.slice(startIndex, endIndex);

  return {
    files: currentFiles,
    totalPages: totalPages,
  };
}

app.get("/", (req, res) => {
  const itemsPerPage = parseInt(req.query.items) || 10;
  const currentPage = parseInt(req.query.page) || 1;

  const gameFolder = "./game";
  const toolsFolder = "./tools";

  const gameFiles = getFileList(gameFolder, itemsPerPage, currentPage);
  const toolsFiles = getFileList(toolsFolder, itemsPerPage, currentPage);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Game and Tool Files</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      <style>
        .game-frame {
          width: 100%;
          height: 100%;
          border: none;
        }
        .fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 9999;
        }
        .hacker-theme {
          background-color: #0C0C0C;
          color: #00FF00;
          font-family: 'Courier New', monospace;
        }
        .hacker-theme .bg-white {
          background-color: #1C1C1C !important;
        }
        .hacker-theme .text-blue-500 {
          color: #00FF00 !important;
        }
        .hacker-theme .bg-blue-500 {
          background-color: #008000 !important;
        }
        .hacker-theme .bg-green-500 {
          background-color: #006400 !important;
        }
        .hacker-theme .hover\\:bg-blue-600:hover {
          background-color: #006400 !important;
        }
        .hacker-theme .hover\\:bg-green-600:hover {
          background-color: #004B00 !important;
        }
        .hacker-theme .shadow-md {
          box-shadow: 0 0 10px #00FF00;
        }
        .hacker-theme .hover\\:shadow-lg:hover {
          box-shadow: 0 0 15px #00FF00;
        }
        .control-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }
        .control-button {
          background-color: #ddd;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
        }
        .control-button:hover {
          background-color: #ccc;
        }
      </style>
    </head>
    <body class="bg-gray-100 min-h-screen" id="body">
      <div id="main-container" class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-center mb-8">Game and Tool Files</h1>

        <div class="mb-6 flex flex-wrap justify-between items-center">
          <select id="itemsPerPage" class="bg-white border border-gray-300 rounded-md px-4 py-2 mb-2 sm:mb-0" onchange="changeItemsPerPage()">
            <option value="10" ${itemsPerPage === 10 ? "selected" : ""}>10 items</option>
            <option value="20" ${itemsPerPage === 20 ? "selected" : ""}>20 items</option>
            <option value="50" ${itemsPerPage === 50 ? "selected" : ""}>50 items</option>
          </select>
          <div>
            <button id="toggleViewBtn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mr-2" onclick="toggleView()">
              Toggle View
            </button>
            <button id="fullscreenBtn" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2" onclick="toggleFullscreen()">
              Fullscreen
            </button>
            <button id="themeToggleBtn" class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded" onclick="toggleTheme()">
              Hacker Theme
            </button>
          </div>
        </div>

        <div id="folders-container">
          <h2 class="text-2xl font-bold mb-4">Games</h2>
          <div id="game-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            ${gameFiles.files
              .map(
                (file) => `
              <div class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
                <h3 class="font-semibold mb-2">${file}</h3>
                <div class="flex space-x-2">
                  <button class="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm" onclick="loadFile('game', '${file}')">
                    Play
                  </button>
                  <a href="/game/${file}" target="_blank" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm">
                    Open
                  </a>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>

          <h2 class="text-2xl font-bold mb-4">Tools</h2>
          <div id="tools-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${toolsFiles.files
              .map(
                (file) => `
              <div class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
                <h3 class="font-semibold mb-2">${file}</h3>
                <div class="flex space-x-2">
                  <button class="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm" onclick="loadFile('tools', '${file}')">
                    Use
                  </button>
                  <a href="/tools/${file}" target="_blank" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm">
                    Open
                  </a>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>

        <div id="pagination" class="mt-8 flex justify-center flex-wrap">
          ${Array.from(
            { length: Math.max(gameFiles.totalPages, toolsFiles.totalPages) },
            (_, i) => i + 1,
          )
            .map(
              (page) => `
            <a href="/?items=${itemsPerPage}&page=${page}" class="px-3 py-2 m-1 ${
              currentPage === page
                ? "bg-blue-500 text-white"
                : "bg-white text-blue-500"
            } rounded-md">
              ${page}
            </a>
          `,
            )
            .join("")}
        </div>

        <div id="file-container" class="mt-8 hidden">
          <div class="control-buttons">
            <button class="control-button" onclick="minimizeFile()">Minimize</button>
            <button class="control-button" onclick="toggleFullscreen()">Fullscreen</button>
            <button class="control-button" onclick="closeFile()">Close</button>
          </div>
          <h2 id="file-title" class="text-2xl font-bold mb-4"></h2>
          <div id="frame-container" class="w-full" style="height: 80vh;">
            <iframe id="file-frame" class="game-frame"></iframe>
          </div>
        </div>
      </div>

      <script>
        function changeItemsPerPage() {
          const select = document.getElementById('itemsPerPage');
          window.location.href = '/?items=' + select.value;
        }

        function toggleView() {
          const foldersContainer = document.getElementById('folders-container');
          const fileContainer = document.getElementById('file-container');
          const pagination = document.getElementById('pagination');

          if (foldersContainer.style.display === 'none') {
            foldersContainer.style.display = 'block';
            pagination.style.display = 'flex';
            fileContainer.style.display = 'none';
          } else {
            foldersContainer.style.display = 'none';
            pagination.style.display = 'none';
            fileContainer.style.display = 'block';
          }
        }

        function loadFile(folder, file) {
          const fileTitle = document.getElementById('file-title');
          const fileFrame = document.getElementById('file-frame');
          const fileContainer = document.getElementById('file-container');
          const foldersContainer = document.getElementById('folders-container');
          const pagination = document.getElementById('pagination');

          fileTitle.textContent = file;
          fileFrame.src = '/' + folder + '/' + file;
          fileContainer.style.display = 'block';
          foldersContainer.style.display = 'none';
          pagination.style.display = 'none';
        }

        function closeFile() {
          const fileContainer = document.getElementById('file-container');
          const foldersContainer = document.getElementById('folders-container');
          const pagination = document.getElementById('pagination');

          fileContainer.style.display = 'none';
          foldersContainer.style.display = 'block';
          pagination.style.display = 'flex';
        }

        function minimizeFile() {
          const frameContainer = document.getElementById('frame-container');
          frameContainer.style.height = frameContainer.style.height === '40vh' ? '80vh' : '40vh';
        }

        function toggleFullscreen() {
          const mainContainer = document.getElementById('main-container');
          const fileContainer = document.getElementById('file-container');
          const frameContainer = document.getElementById('frame-container');

          if (!document.fullscreenElement) {
            if (fileContainer.requestFullscreen) {
              fileContainer.requestFullscreen();
            } else if (fileContainer.mozRequestFullScreen) {
              fileContainer.mozRequestFullScreen();
            } else if (fileContainer.webkitRequestFullscreen) {
              fileContainer.webkitRequestFullscreen();
            } else if (fileContainer.msRequestFullscreen) {
              fileContainer.msRequestFullscreen();
            }
            frameContainer.style.height = '100vh';
            mainContainer.classList.add('fullscreen');
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
              document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
              document.msExitFullscreen();
            }
            frameContainer.style.height = '80vh';
            mainContainer.classList.remove('fullscreen');
          }
        }

        function handleFullscreenChange() {
          const mainContainer = document.getElementById('main-container');
          const frameContainer = document.getElementById('frame-container');
          const fullscreenBtn = document.getElementById('fullscreenBtn');

          if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
            frameContainer.style.height = '80vh';
            mainContainer.classList.remove('fullscreen');
            fullscreenBtn.textContent = 'Fullscreen';
          } else {
            frameContainer.style.height = '100vh';
            mainContainer.classList.add('fullscreen');
            fullscreenBtn.textContent = 'Exit Fullscreen';
          }
        }

        function toggleTheme() {
          const body = document.getElementById('body');
          const themeToggleBtn = document.getElementById('themeToggleBtn');
          body.classList.toggle('hacker-theme');
          if (body.classList.contains('hacker-theme')) {
            themeToggleBtn.textContent = 'Normal Theme';
          } else {
            themeToggleBtn.textContent = 'Hacker Theme';
          }
        }

        window.addEventListener('resize', function() {
          const fileContainer = document.getElementById('file-container');
          const frameContainer = document.getElementById('frame-container');

          if (fileContainer.style.display !== 'none') {
            if (window.innerWidth < 768) {
              frameContainer.style.height = '50vh';
            } else {
              frameContainer.style.height = '80vh';
            }
          }
        });

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

app.get("/game/:file", (req, res) => {
  const filePath = path.join(__dirname, "game", req.params.file);
  res.sendFile(filePath);
});

app.get("/tools/:file", (req, res) => {
  const filePath = path.join(__dirname, "tools", req.params.file);
  res.sendFile(filePath);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
