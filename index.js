const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.get("/", (req, res) => {
  const gameDir = path.join(__dirname, "game");
  fs.readdir(gameDir, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      res.status(500).send("Error reading game directory");
      return;
    }

    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(files.length / itemsPerPage);

    const html = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Game Files</title>
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
              .monochrome-theme {
                filter: grayscale(100%);
              }
              .close-fullscreen {
                position: absolute;
                top: 10px;
                right: 10px;
                z-index: 10000;
                background-color: rgba(255, 255, 255, 0.7);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 20px;
                cursor: pointer;
                display: none;
              }
              .fullscreen .close-fullscreen {
                display: block;
              }
            </style>
          </head>
          <body class="bg-gray-100 min-h-screen" id="body">
            <div id="main-container" class="container mx-auto px-4 py-8">
              <h1 class="text-4xl font-bold text-center mb-8">Game Files</h1>

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
                  <button id="themeToggleBtn" class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded mr-2" onclick="toggleTheme()">
                    Hacker Theme
                  </button>
                  <button id="monochromeToggleBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded" onclick="toggleMonochrome()">
                    Monochrome
                  </button>
                </div>
              </div>

              <div id="file-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${files
                  .slice(startIndex, endIndex)
                  .map(
                    (file) => `
                  <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-4">
                    <h2 class="text-xl font-semibold mb-2">${file}</h2>
                    <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" onclick="loadGame('${file}')">
                      Play
                    </button>
                  </div>
                `,
                  )
                  .join("")}
              </div>

              <div id="pagination" class="mt-8 flex justify-center">
                ${Array.from({ length: totalPages }, (_, i) => i + 1)
                  .map(
                    (pageNum) => `
                  <a href="?page=${pageNum}&itemsPerPage=${itemsPerPage}" class="mx-1 px-3 py-2 bg-white rounded-md shadow ${page === pageNum ? "bg-blue-500 text-white" : "text-blue-500 hover:bg-blue-100"}">
                    ${pageNum}
                  </a>
                `,
                  )
                  .join("")}
              </div>

              <div id="game-container" class="mt-8 hidden">
                <h2 id="game-title" class="text-2xl font-bold mb-4"></h2>
                <div id="frame-container" class="w-full relative" style="height: 80vh;">
                  <iframe id="game-frame" class="game-frame"></iframe>
                  <button id="closeFullscreenBtn" class="close-fullscreen" onclick="exitFullscreen()">&times;</button>
                </div>
              </div>
            </div>

            <script>
              let currentView = 'grid';

              function toggleView() {
                const fileList = document.getElementById('file-list');
                const toggleViewBtn = document.getElementById('toggleViewBtn');

                if (currentView === 'grid') {
fileList.classList.remove('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-4');
              fileList.classList.add('flex', 'flex-col', 'space-y-4');
              currentView = 'list';
              toggleViewBtn.textContent = 'Grid View';
            } else {
              fileList.classList.remove('flex', 'flex-col', 'space-y-4');
              fileList.classList.add('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-4');
              currentView = 'grid';
              toggleViewBtn.textContent = 'List View';
            }
          }

          function loadGame(file) {
            const gameContainer = document.getElementById('game-container');
            const gameTitle = document.getElementById('game-title');
            const gameFrame = document.getElementById('game-frame');
            const fileList = document.getElementById('file-list');
            const pagination = document.getElementById('pagination');

            gameTitle.textContent = file;
            gameFrame.src = "/game/" + file;
            gameContainer.classList.remove('hidden');
            fileList.classList.add('hidden');
            pagination.classList.add('hidden');
          }

          function changeItemsPerPage() {
            const itemsPerPage = document.getElementById('itemsPerPage').value;
            window.location.href = "?page=1&itemsPerPage=" + itemsPerPage;
          }

          function toggleFullscreen() {
            const mainContainer = document.getElementById('main-container');
            const gameContainer = document.getElementById('game-container');
            const frameContainer = document.getElementById('frame-container');
            const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');
            
            if (!document.fullscreenElement) {
              if (gameContainer.requestFullscreen) {
                gameContainer.requestFullscreen();
              } else if (gameContainer.mozRequestFullScreen) {
                gameContainer.mozRequestFullScreen();
              } else if (gameContainer.webkitRequestFullscreen) {
                gameContainer.webkitRequestFullscreen();
              } else if (gameContainer.msRequestFullscreen) {
                gameContainer.msRequestFullscreen();
              }
              frameContainer.style.height = '100vh';
              mainContainer.classList.add('fullscreen');
              closeFullscreenBtn.style.display = 'block';
            } else {
              exitFullscreen();
            }
          }

          function exitFullscreen() {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
              document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
              document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
              document.msExitFullscreen();
            }
          }

          function handleFullscreenChange() {
            const mainContainer = document.getElementById('main-container');
            const frameContainer = document.getElementById('frame-container');
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');
            
            if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
              frameContainer.style.height = '80vh';
              mainContainer.classList.remove('fullscreen');
              fullscreenBtn.textContent = 'Fullscreen';
              closeFullscreenBtn.style.display = 'none';
            } else {
              frameContainer.style.height = '100vh';
              mainContainer.classList.add('fullscreen');
              fullscreenBtn.textContent = 'Exit Fullscreen';
              closeFullscreenBtn.style.display = 'block';
            }
          }

          function toggleTheme() {
            const body = document.getElementById('body');
            const themeToggleBtn = document.getElementById('themeToggleBtn');
            body.classList.toggle('hacker-theme');
            body.classList.remove('monochrome-theme');
            if (body.classList.contains('hacker-theme')) {
              themeToggleBtn.textContent = 'Normal Theme';
              document.getElementById('monochromeToggleBtn').textContent = 'Monochrome';
            } else {
              themeToggleBtn.textContent = 'Hacker Theme';
            }
          }

          function toggleMonochrome() {
            const body = document.getElementById('body');
            const monochromeToggleBtn = document.getElementById('monochromeToggleBtn');
            body.classList.toggle('monochrome-theme');
            body.classList.remove('hacker-theme');
            if (body.classList.contains('monochrome-theme')) {
              monochromeToggleBtn.textContent = 'Color Theme';
              document.getElementById('themeToggleBtn').textContent = 'Hacker Theme';
            } else {
              monochromeToggleBtn.textContent = 'Monochrome';
            }
          }

          window.addEventListener('resize', function() {
            const gameContainer = document.getElementById('game-container');
            const frameContainer = document.getElementById('frame-container');
            
            if (gameContainer.style.display !== 'none') {
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
});

app.get("/game/:file", (req, res) => {
  const filePath = path.join(__dirname, "game", req.params.file);
  res.sendFile(filePath);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
