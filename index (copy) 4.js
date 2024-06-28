const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.static("public"));

app.get("/", (req, res) => {
  const gameFolder = "./game";
  const itemsPerPage = parseInt(req.query.items) || 10;
  const currentPage = parseInt(req.query.page) || 1;

  fs.readdir(gameFolder, (err, files) => {
    if (err) {
      return res.status(500).send("Error reading directory");
    }

    const htmlFiles = files.filter(
      (file) => path.extname(file).toLowerCase() === ".html",
    );
    const totalPages = Math.ceil(htmlFiles.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentFiles = htmlFiles.slice(startIndex, endIndex);

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
          .hacker-theme .hover\:bg-blue-600:hover {
            background-color: #006400 !important;
          }
          .hacker-theme .hover\:bg-green-600:hover {
            background-color: #004B00 !important;
          }
          .hacker-theme .shadow-md {
            box-shadow: 0 0 10px #00FF00;
          }
          .hacker-theme .hover\:shadow-lg:hover {
            box-shadow: 0 0 15px #00FF00;
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
              <button id="themeToggleBtn" class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded" onclick="toggleTheme()">
                Hacker Theme
              </button>
            </div>
          </div>

          <div id="file-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${currentFiles
              .map(
                (file) => `
              <div class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow duration-300">
                <h3 class="font-semibold mb-2">${file}</h3>
                <div class="flex space-x-2">
                  <button class="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm" onclick="loadGame('${file}')">
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

          <div id="pagination" class="mt-8 flex justify-center flex-wrap">
            ${Array.from({ length: totalPages }, (_, i) => i + 1)
              .map(
                (page) => `
              <a href="/?items=${itemsPerPage}&page=${page}" class="px-3 py-2 m-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-white text-blue-500"} rounded-md">
                ${page}
              </a>
            `,
              )
              .join("")}
          </div>

          <div id="game-container" class="mt-8 hidden">
            <h2 id="game-title" class="text-2xl font-bold mb-4"></h2>
            <div id="frame-container" class="w-full" style="height: 80vh;">
              <iframe id="game-frame" class="game-frame"></iframe>
            </div>
          </div>
        </div>

        <script>
          function changeItemsPerPage() {
            const select = document.getElementById('itemsPerPage');
            window.location.href = '/?items=' + select.value;
          }

          function toggleView() {
            const fileList = document.getElementById('file-list');
            const gameContainer = document.getElementById('game-container');
            const pagination = document.getElementById('pagination');

            if (fileList.style.display === 'none') {
              fileList.style.display = 'grid';
              pagination.style.display = 'flex';
              gameContainer.style.display = 'none';
            } else {
              fileList.style.display = 'none';
              pagination.style.display = 'none';
              gameContainer.style.display = 'block';
            }
          }

          function loadGame(file) {
            const gameTitle = document.getElementById('game-title');
            const gameFrame = document.getElementById('game-frame');
            const gameContainer = document.getElementById('game-container');
            const fileList = document.getElementById('file-list');
            const pagination = document.getElementById('pagination');
gameTitle.textContent = file;
            gameFrame.src = '/game/' + file;
            gameContainer.style.display = 'block';
            fileList.style.display = 'none';
            pagination.style.display = 'none';
          }

          function toggleFullscreen() {
            const mainContainer = document.getElementById('main-container');
            const gameContainer = document.getElementById('game-container');
            const frameContainer = document.getElementById('frame-container');

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
