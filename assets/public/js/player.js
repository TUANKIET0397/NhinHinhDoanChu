const canvas = document.querySelector('canvas'),
  toolBtns = document.querySelectorAll('.tool'),
  fillColor = document.querySelector('#fill-color'),
  sizeSlider = document.querySelector('#size-slider'),
  colorBtns = document.querySelectorAll('.colors .option'),
  colorPicker = document.querySelector('#color-picker'),
  clearCanvas = document.querySelector('.clear-canvas'),
  saveImg = document.querySelector('.save-img'),
  ctx = canvas.getContext('2d');

// Function to handle out game
document.addEventListener('DOMContentLoaded', () => {
  const outgame = document.getElementById('out-game');
  if (outgame) {
    outgame.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
});
// Show canvas and hide waiting message
function showCanvasWaiting() {
  document.getElementById('drawing-board__canvas').style.display = 'block';
  document.getElementById('drawing-board__choice').style.display = 'none';
  if (!isDrawing) {
    document.querySelector('.drawing-board__progress').style.display = 'none';
  }
}

// global variables with default value
let prevMouseX,
  prevMouseY,
  snapshot,
  isDrawing = false,
  selectedTool = 'brush',
  brushWidth = 5,
  selectedColor = '#000';

let lastX, lastY;
let canPlay = false;
let isDrawer = false;
let canGuess = false;
let timer;

// Biến cho hệ thống gợi ý
let hintCount = 3
let currentWord = ""
let hintButton = document.getElementById("hint-button")
let wordDisplay = document.getElementById("word-display")
let currentWordSpan = document.getElementById("current-word")
let hintCountSpan = document.getElementById("hint-count")
let hintDisplay = document.getElementById("hint-display")
let hintText = document.getElementById("hint-text")
let remainingHintsSpan = document.getElementById("remaining-hints")

const setCanvasBackground = () => {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = selectedColor; // setting fillstyle back to the selectedColor, it'll be the brush color
};

const resizeCanvas = () => {
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;

  let tempImage = null;
  if (oldWidth > 0 && oldHeight > 0) {
    tempImage = ctx.getImageData(0, 0, oldWidth, oldHeight);
  }

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  setCanvasBackground();

  const scaleX = canvas.width / oldWidth;
  const scaleY = canvas.height / oldHeight;

  if (tempImage) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = oldWidth;
    tempCanvas.height = oldHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(tempImage, 0, 0);

    ctx.scale(scaleX, scaleY);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
};

window.addEventListener('resize', () => {
  resizeCanvas();
});

const startDraw = (e) => {
  if (!isDrawer) return;
  isDrawing = true;
  prevMouseX = e.offsetX; // passing current mouseX position as prevMouseX value
  prevMouseY = e.offsetY; // passing current mouseY position as prevMouseY value
  lastX = e.offsetX;
  lastY = e.offsetY;

  ctx.beginPath(); // creating new path to draw
  ctx.lineWidth = brushWidth; // passing brushSize as line width
  ctx.strokeStyle = selectedColor; // passing selectedColor as stroke style
  ctx.fillStyle = selectedColor; // passing selectedColor as fill style
  // copying canvas data & passing as snapshot value.. this avoids dragging the image
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
};

const socket = io(); // Mặc định kết nối tới server đang chạy

const drawing = (e) => {
  if (!isDrawing || !isDrawer) return;
  ctx.putImageData(snapshot, 0, 0); // adding copied canvas data on to this canvas

  const currentX = e.offsetX;
  const currentY = e.offsetY;

  ctx.strokeStyle = selectedTool === 'eraser' ? '#fff' : selectedColor;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();

  // Gửi dữ liệu vẽ
  if (typeof lastX === 'number' && typeof lastY === 'number') {
    socket.emit('drawing', {
      prevX: lastX,
      prevY: lastY,
      x: currentX,
      y: currentY,
      color: selectedTool === 'eraser' ? '#fff' : selectedColor,
      width: brushWidth,
    });
  }

  lastX = currentX;
  lastY = currentY;
};

toolBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.options .active').classList.remove('active');
    btn.classList.add('active');
    selectedTool = btn.id;
  });
});

sizeSlider.addEventListener('change', () => (brushWidth = sizeSlider.value));

colorBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.options .selected').classList.remove('selected');
    btn.classList.add('selected');
    selectedColor = window
      .getComputedStyle(btn)
      .getPropertyValue('background-color');
  });
});

colorPicker.addEventListener('change', () => {
  colorPicker.parentElement.style.background = colorPicker.value;
  colorPicker.parentElement.click();
});

clearCanvas.addEventListener('click', () => {
  socket.emit('clearImg');
});

saveImg.addEventListener('click', () => {
  const link = document.createElement('a'); // creating <a> element
  link.download = `${Date.now()}.jpg`; // passing current date as link download value
  link.href = canvas.toDataURL(); // passing canvasData as link href value
  link.click(); // clicking link to download image
});

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', drawing);
canvas.addEventListener('mouseup', () => (isDrawing = false));

//GUESS
const chatInput = document.querySelector('.chat_input');
const chatBody = document.querySelector('.chat_body');

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && chatInput.value.trim() !== '') {
    if (!canGuess) return;
    socket.emit('guess', chatInput.value.trim());
    chatInput.value = '';
  }
});

socket.on('guess', (data) => {
  const div = document.createElement('div');
  div.classList.add('guess'); // class để định dạng CSS
  div.textContent = `👤 ${data.username}: ${data.guess}`; // Cắt gọn ID cho đẹp
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight; // Tự cuộn xuống dòng mới
});

// ========== HÀM CẬP NHẬT TÊN NGƯỜI VẼ ==========
function updateCurrentDrawerName(drawerName) {
  const usernameElements = document.querySelectorAll(
    '.drawing-board__username'
  );
  usernameElements.forEach((element) => {
    element.textContent = drawerName || 'Đang chờ...';
  });
  console.log('Updated drawer name to:', drawerName);
}

let currentDrawerName = 'Đang chờ...';

//Socket IO

socket.on('clear', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasBackground();
});

socket.on('drawing', (data) => {
  if (
    typeof data.prevX !== 'number' ||
    typeof data.prevY !== 'number' ||
    typeof data.x !== 'number' ||
    typeof data.y !== 'number'
  )
    return;

  ctx.beginPath();
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.width;
  ctx.moveTo(data.prevX, data.prevY); // từ điểm trước
  ctx.lineTo(data.x, data.y); // đến điểm mới
  ctx.stroke();
});

socket.on('init', (data) => {
  // Đảm bảo canvas đã resize trước khi vẽ
  const container = document.getElementById('drawing-board__canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  setCanvasBackground();

  data.drawHistory.forEach((line) => {
    if (
      typeof line.prevX !== 'number' ||
      typeof line.prevY !== 'number' ||
      typeof line.x !== 'number' ||
      typeof line.y !== 'number'
    )
      return;

    ctx.beginPath();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.moveTo(line.prevX, line.prevY);
    ctx.lineTo(line.x, line.y);
    ctx.stroke();
  });

  // Gửi đoán
  data.guessHistory.forEach((g) => {
    const div = document.createElement('div');
    div.classList.add('guess');
    div.textContent = `👤 ${g.username}: ${g.guess}`;
    chatBody.appendChild(div);
  });

  chatBody.scrollTop = chatBody.scrollHeight;
});

socket.on('startGame', () => {
  canPlay = true;
  document.getElementById('drawing-board__first').style.display = 'flex'; //Mặc định
  document.querySelector('.drawing-board__progress').style.display = 'block'; //Mặc định
});

// Khi chưa đủ người
socket.on('waiting', (playerCount) => {
  showCanvasWaiting();
  alert(`Waiting for other players`);
});

socket.on('yourTurnToDraw', () => {
  isDrawer = true;
  canGuess = false;
  document.getElementById('drawing-board__choice').style.display = 'block';
});

socket.on('startDrawing', () => {
  isDrawer = true;
  document.getElementById('drawing-board__choice').style.display = 'none';
  document.getElementById('drawing-board__canvas').style.display = 'block';
  resizeCanvas();
  
  // Khởi tạo lại hint elements
  hintButton = document.getElementById("hint-button");
  wordDisplay = document.getElementById("word-display");
  currentWordSpan = document.getElementById("current-word");
  hintCountSpan = document.getElementById("hint-count");
  hintDisplay = document.getElementById("hint-display");
  hintText = document.getElementById("hint-text");
  remainingHintsSpan = document.getElementById("remaining-hints");
  
  // Thêm event listener cho hint button
  addHintButtonListener();
  
  // Nếu client đã biết currentWord, hiển thị ngay cho người vẽ
  if (currentWord && currentWordSpan) currentWordSpan.textContent = currentWord;
  if (currentWord && wordDisplay) wordDisplay.style.display = 'block';
});

socket.on('otherPlayerDrawing', () => {
  isDrawer = false;
  canGuess = true;
  document.getElementById('drawing-board__choice').style.display = 'none';
  document.getElementById('drawing-board__canvas').style.display = 'block';
  resizeCanvas();
});

socket.on('startRound', () => {
  document.querySelector('.drawing-board__progress').style.display = 'block';
  setProgressBar(45, 'drawing-board__canvas-fill', () => {
    setTimeout(() => {
      socket.emit('timeUp');
    }, 3000);
  });
});

//Role
socket.on('role', (role) => {
  console.log('Received role:', role);

  // Khởi tạo lại hint elements
  hintButton = document.getElementById("hint-button");
  wordDisplay = document.getElementById("word-display");
  currentWordSpan = document.getElementById("current-word");
  hintCountSpan = document.getElementById("hint-count");
  hintDisplay = document.getElementById("hint-display");
  hintText = document.getElementById("hint-text");
  remainingHintsSpan = document.getElementById("remaining-hints");

  if (role === 'drawer') {
    isDrawer = true;
    canGuess = false;
    // Reset lượt gợi ý khi trở thành người vẽ mới
    hintCount = 3;
    updateHintButton();
    if (hintDisplay) hintDisplay.style.display = 'none';

    // Hiện first, ẩn second và canvas
    document.getElementById('drawing-board__choice').style.display = 'block';
    document.getElementById('drawing-board__first').style.display = 'flex';
    document.getElementById('drawing-board__second').style.display = 'none';
    document.getElementById('drawing-board__canvas').style.display = 'none';
  } else {
    isDrawer = false;
    canGuess = true;
    // Khi là người đoán, đảm bảo nút gợi ý bị vô hiệu hóa và ẩn khung gợi ý cũ
    updateHintButton();
    if (hintDisplay) hintDisplay.style.display = 'none';
    if (wordDisplay) wordDisplay.style.display = 'none';
    if (currentWordSpan) currentWordSpan.textContent = '';

    // Ẩn tất cả UI chọn vẽ, chỉ để canvas đoán
    document.getElementById('drawing-board__choice').style.display = 'none';
    document.getElementById('drawing-board__canvas').style.display = 'block';

    // KHÔNG cập nhật tên ở đây nữa vì không phải là drawer
  }
});

// ========== LẮNG NGHE CẬP NHẬT THÔNG TIN NGƯỜI VẼ ==========
// Lắng nghe sự kiện cập nhật thông tin người vẽ hiện tại
socket.on('updateCurrentDrawer', (drawerInfo) => {
  console.log('Updating current drawer to:', drawerInfo.name);
  currentDrawerName = drawerInfo.name;
  updateCurrentDrawerName(drawerInfo.name);
});

// Cập nhật khi game bắt đầu turn mới
socket.on('newTurnStarted', (gameState) => {
  console.log('New turn started, drawer:', gameState.currentDrawer);
  if (gameState.currentDrawer) {
    currentDrawerName = gameState.currentDrawer.name;
    updateCurrentDrawerName(gameState.currentDrawer.name);
  }
});

//Guess correctly
socket.on('correctGuess', (data) => {
  alert(`🎉 ${data.winnerId.slice(0, 5)} đã đoán đúng từ "${data.word}"!`);
});

socket.on('clearCanvas', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasBackground();
  chatBody.innerHTML = ''; // Xoá đoạn chat cũ
});

//Choose Word

function chooseWord(word) {
  // Cập nhật ngay trên client cho người vẽ
  currentWord = word;
  
  // Khởi tạo lại hint elements
  hintButton = document.getElementById("hint-button");
  wordDisplay = document.getElementById("word-display");
  currentWordSpan = document.getElementById("current-word");
  hintCountSpan = document.getElementById("hint-count");
  hintDisplay = document.getElementById("hint-display");
  hintText = document.getElementById("hint-text");
  remainingHintsSpan = document.getElementById("remaining-hints");
  
  if (currentWordSpan) currentWordSpan.textContent = word;
  if (wordDisplay) wordDisplay.style.display = 'block';

  socket.emit('selectedWord', word);
  document.getElementById('drawing-board__choice').style.display = 'none';
  document.getElementById('drawing-board__canvas').style.display = 'block';
  resizeCanvas();
  setProgressBar(45, 'drawing-board__canvas-fill', () => {
    setTimeout(() => {
      socket.emit('timeUp');
    }, 3000);
  });
}

socket.on('chooseWordOptions', (words) => {
  document.getElementById('drawing-board__choice').style.display = 'block';
  document.getElementById('drawing-board__canvas').style.display = 'none';

  const secondUI = document.getElementById('drawing-board__second');
  secondUI.style.display = 'flex';

  // Tìm phần .drawing-board__options
  const optionsContainer = secondUI.querySelector('.drawing-board__options');
  optionsContainer.innerHTML = ''; // Xoá các nút cũ nếu có

  // Thêm các nút mới vào .drawing-board__options
  words.forEach((word) => {
    const btn = document.createElement('button');
    btn.textContent = word;
    btn.classList.add('drawing-board__button');
    btn.onclick = () => chooseWord(word);
    optionsContainer.appendChild(btn);
  });
});

// (removed duplicate/incorrect selectedWord handler)

//Drawboard.js

function handleChoice(choice) {
  if (choice === 'draw') {
    // Ẩn first, hiển thị second để chọn từ
    document.getElementById('drawing-board__first').style.display = 'none';
    document.getElementById('drawing-board__second').style.display = 'flex';

    // Gửi yêu cầu server gửi danh sách từ
    socket.emit('requestWordOptions');
  } else {
    // Không vẽ → thông báo server để đổi lượt
    socket.emit('skipDrawing');
    document.getElementById('drawing-board__choice').style.display = 'none';
  }
}

function setProgressBar(duration, barId, callback) {
  const fill = document.getElementById(barId);
  fill.style.transition = 'none';
  fill.style.width = '100%';
  setTimeout(() => {
    fill.style.transition = `width ${duration}s linear`;
    fill.style.width = '0%';
  }, 50);

  clearTimeout(timer);
  timer = setTimeout(callback, duration * 1000);
}

function startDrawing() {
  document.getElementById('drawing-board__choice').style.display = 'none';
  document.getElementById('drawing-board__canvas').style.display = 'flex';

  // đảm bảo canvas có kích thước hợp lệ trước khi vẽ
  requestAnimationFrame(() => {
    resizeCanvas();
    setProgressBar(45, 'drawing-board__canvas-fill', () => {
      setTimeout(() => {
        socket.emit('timeUp');
      }, 3000);
    });
  });
}

socket.on('syncTimer', (remainingTime) => {
  setProgressBar(remainingTime, 'drawing-board__canvas-fill', () => {});
});

socket.on('stopTimer', () => {
  clearTimeout(timer);
  const fill = document.getElementById('drawing-board__canvas-fill');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '0%'; // Dừng ngay lập tức
  }
});

//Bảng người chơi
socket.on('updatePlayers', (players) => {
  const sidebar = document.querySelector('.player-drawing .player_playing');
  if (!sidebar) return;

  sidebar.innerHTML = ''; // Xóa danh sách cũ

  // Tìm người đang vẽ
  const currentDrawer = players.find((p) => p.role === 'drawer');

  // CHỈ cập nhật nếu chưa có tên drawer hoặc tên khác
  if (
    currentDrawer &&
    (!currentDrawerName || currentDrawerName === 'Đang chờ...')
  ) {
    console.log('Found current drawer in updatePlayers:', currentDrawer.name);
    currentDrawerName = currentDrawer.name;
    updateCurrentDrawerName(currentDrawer.name);
  }

  // Render danh sách players
  players.forEach((p) => {
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('player');

    const drawerIcon = p.role === 'drawer' ? '✏️ ' : '';

    playerDiv.innerHTML = `
      <div class="player_main">
        <div class="player_avatar">
          <img src="/img/avatar/${p.avatar || 'avt1.jpg'}" alt="Avatar" />
        </div>
        <div class="player_detail">
          <div class="player_name">${drawerIcon}${p.name}</div>
          <div class="player_score">${
            p.score
          } <p class="player_score_text">pts</p></div>
        </div>
      </div>
      ${
        p.isCorrect
          ? `
        <div class="greentick">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10L8 14L16 6" stroke="#28a745" stroke-width="2" fill="none"/>
          </svg>
        </div>
      `
          : ''
      }
    `;

    sidebar.appendChild(playerDiv);
  });
});

// Register Name Player
function registerPlayer() {
  const storedName = localStorage.getItem('playerName');
  if (!storedName) {
    window.location.href = '/';
    return;
  }

  socket.emit('joinGame', storedName);
}

// Gửi đăng ký player khi mới kết nối
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  currentDrawerName = 'Đang chờ...';
  updateCurrentDrawerName('Đang chờ...');
  
  // Khởi tạo hint elements
  hintButton = document.getElementById("hint-button");
  wordDisplay = document.getElementById("word-display");
  currentWordSpan = document.getElementById("current-word");
  hintCountSpan = document.getElementById("hint-count");
  hintDisplay = document.getElementById("hint-display");
  hintText = document.getElementById("hint-text");
  remainingHintsSpan = document.getElementById("remaining-hints");
  
  registerPlayer();
});
// Khi socket tự động reconnect lại sau mất kết nối
socket.on('reconnect', (attemptNumber) => {
  console.log('Socket reconnected after', attemptNumber, 'times');
  currentDrawerName = 'Đang chờ...';
  updateCurrentDrawerName('Đang chờ...');
  
  // Khởi tạo hint elements
  hintButton = document.getElementById("hint-button");
  wordDisplay = document.getElementById("word-display");
  currentWordSpan = document.getElementById("current-word");
  hintCountSpan = document.getElementById("hint-count");
  hintDisplay = document.getElementById("hint-display");
  hintText = document.getElementById("hint-text");
  remainingHintsSpan = document.getElementById("remaining-hints");
  
  registerPlayer();
});

window.onload = function () {
  // Khởi tạo hint elements
  hintButton = document.getElementById("hint-button");
  wordDisplay = document.getElementById("word-display");
  currentWordSpan = document.getElementById("current-word");
  hintCountSpan = document.getElementById("hint-count");
  hintDisplay = document.getElementById("hint-display");
  hintText = document.getElementById("hint-text");
  remainingHintsSpan = document.getElementById("remaining-hints");
  
  setProgressBar(10, 'drawing-board__progress-fill', () => startDrawing());
};

// Ranking Board
function updateRankingBoard(rankings, durationSec = 8) {
  const items = document.querySelectorAll('.ranking-board__item');

  rankings.forEach((player, index) => {
    const item = items[index];
    if (item) {
      item.querySelector('.ranking-board__name').textContent = player.name;
      item.querySelector('.ranking-board__score').textContent = player.score;
    }
  });

  // Start progress bar animation
  const progressFill = document.querySelector('.ranking-board__progress-fill');

  // Reset về trạng thái đầu
  progressFill.style.transition = 'none';
  progressFill.style.width = '100%';

  // Force reflow để đảm bảo trình duyệt “nhận” trạng thái trước khi animate
  void progressFill.offsetWidth;

  // Bắt đầu animate đồng bộ
  progressFill.style.transition = `width ${durationSec}s linear`;
  progressFill.style.width = '0';
}

socket.on('showRankings', (data) => {
  const rankingBoard = document.querySelector('.ranking-board');
  const wd = document.getElementById('word-display');
  const prog = document.querySelector('.drawing-board__progress');
  if (wd) wd.style.display = 'none';
  if (prog) prog.style.display = 'none';

  rankingBoard.style.display = 'flex';
  // Đảm bảo overlay đã render trước khi animate
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateRankingBoard(data.players, data.duration || 8);
    });
  });

  setTimeout(() => {
    rankingBoard.style.display = 'none';
    // không tự bật lại progress ở đây; chờ sự kiện turn mới
  }, (data.duration || 8) * 1000 + 200);
});

// Thêm xử lý khi reset game
socket.on('resetGame', (data) => {
  isDrawer = false;
  // Xóa hiển thị từ cũ
  const oldWordDisplay = document.querySelector('.current-word-display');
  if (oldWordDisplay) {
    oldWordDisplay.remove();
  }

  // Lấy lại tên người chơi từ URL
  const urlParams = new URLSearchParams(window.location.search);
  const playerName = urlParams.get('playerName');
  if (playerName) {
    document.querySelector('.player-name').textContent = playerName;
  }
});

//qr
// Nhận ngrok URL từ server
const ngrokUrl = window.ngrokUrl;

// DOM elements
const shareBtn = document.querySelector('.share');
const qrCode = document.querySelector('.qr-code');
const qrImg = qrCode.querySelector('img');

let isVisible = false;

shareBtn.addEventListener('click', () => {
  if (!isVisible) {
    // Hiện QR code
    const gameUrl = `${ngrokUrl}`; // Hoặc đường dẫn bạn muốn
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      gameUrl
    )}`;
    qrCode.classList.add('show');
    shareBtn.textContent = 'Hide';
    isVisible = true;
  } else {
    // Ẩn QR code
    qrCode.classList.remove('show');
    shareBtn.textContent = 'Share';
    isVisible = false;
  }
});



function updateHintButton() {
  console.log('Updating hint button, isDrawer:', isDrawer, 'hintCount:', hintCount);
  if (hintCountSpan) hintCountSpan.textContent = hintCount
  if (hintButton) {
    hintButton.disabled = !isDrawer || hintCount <= 0
    if (hintCount <= 0) hintButton.textContent = 'Hết gợi ý'
    console.log('Hint button disabled:', hintButton.disabled);
  }
}

// Function để thêm event listener cho hint button
function addHintButtonListener() {
  if (hintButton && !hintButton.hasAttribute('data-listener-added')) {
    hintButton.addEventListener('click', () => {
      console.log('Hint button clicked, isDrawer:', isDrawer, 'hintCount:', hintCount, 'currentWord:', currentWord);
      if (!isDrawer) return; // chỉ người vẽ được bấm
      if (hintCount > 0 && currentWord) {
        const hintLevel = 4 - hintCount; // 1..3
        console.log('Sending hint request, level:', hintLevel);
        socket.emit('requestHint', {
          word: currentWord,
          hintLevel
        })
      }
    });
    hintButton.setAttribute('data-listener-added', 'true');
    console.log('Hint button listener added');
  }
}

// Thêm event listener khi DOM load
document.addEventListener('DOMContentLoaded', () => {
  addHintButtonListener();
});

// Nhận gợi ý từ server và hiển thị cho tất cả
socket.on('showHint', (data) => {
  console.log('Received hint from server:', data);
  // Cập nhật đếm theo server
  hintCount = Math.max(0, Number(data?.remainingHints) || hintCount)
  updateHintButton()
  if (hintText) hintText.textContent = data?.hint || ''
  if (remainingHintsSpan) remainingHintsSpan.textContent = String(hintCount)
  if (hintDisplay) {
    hintDisplay.style.display = 'block'
    setTimeout(() => {
      hintDisplay.style.display = 'none'
    }, 5000)
  }
})


