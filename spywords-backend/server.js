// server.js (final version with fixed timers, revealed logic, and optional auto-turn end)
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const ip = require("ip");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});


const MAX_PLAYERS = 4;
const TEAM_SIZE = 2;
const TURN_TIME = 60; // seconds
const fs = require("fs");
const WORDS = fs.readFileSync("wordlist-eng.txt", "utf-8")
  .split("\n")
  .map(w => w.trim())
  .filter(Boolean);


const rooms = {}; // roomId => { players: [], gameState: {} }
const timers = {}; // roomId => interval

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function generateBoard() {
  const shuffled = shuffle([...WORDS]);
  const words = shuffled.slice(0, 16);
  const roles = shuffle([
    ...Array(6).fill("red"),
    ...Array(6).fill("blue"),
    ...Array(3).fill("neutral"),
    "assassin"
  ]);
  return words.map((word, i) => ({ word, role: roles[i], revealed: false }));
}

function getInitialGameState() {
  return {
    board: generateBoard(),
    currentTurn: "red",
    clue: null,
    guessCount: 0,
    clueGiven: false,
    guessMade: false,
    timer: TURN_TIME,
    history: [],
    scores: { red: 0, blue: 0 },
    missedTurns: { red: 0, blue: 0 },
  };
}

function startTurnTimer(roomId) {
  clearInterval(timers[roomId]);
  let remaining = TURN_TIME;

  timers[roomId] = setInterval(() => {
    const room = rooms[roomId];

    // ❌ Room or game state is invalid
    if (!room || !room.gameState) {
      clearInterval(timers[roomId]);
      delete timers[roomId];
      return;
    }

    // 🛑 Stop timer if game is already over
    if (room.gameState.gameOver) {
      clearInterval(timers[roomId]);
      delete timers[roomId];
      return;
    }

    // ⏳ Decrement timer and broadcast
    room.gameState.timer = --remaining;
    io.to(roomId).emit("timerUpdate", remaining);

    if (remaining <= 0) {
      // ✅ Handle missed turn ONLY if time runs out
      room.gameState.missedTurns[room.gameState.currentTurn]++;
      const missed = room.gameState.missedTurns[room.gameState.currentTurn];
      if (missed >= 3) {
        const loser = room.gameState.currentTurn;
        const winner = loser === "red" ? "blue" : "red";
        room.gameState.gameOver = true;
        io.to(roomId).emit("gameOver", { winner, reason: "missed 3 turns" });
        clearInterval(timers[roomId]);
        delete timers[roomId];
        return;
      }

      clearInterval(timers[roomId]);
      delete timers[roomId];

      // ✅ Skip if game somehow ended during countdown
      if (room.gameState.gameOver) return;

      // 🌀 Switch turn
      room.gameState.currentTurn = room.gameState.currentTurn === "red" ? "blue" : "red";
      room.gameState.clue = null;
      room.gameState.guessCount = 0;
      room.gameState.clueGiven = false;
      room.gameState.guessMade = false;

      io.to(roomId).emit("turnEnded", room.gameState.currentTurn);

      // 🔁 Restart timer for next team
      startTurnTimer(roomId);
    }
  }, 1000);
}


function startGame(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.rematchPending = false; // ✅ allow future rematch
  if (room.players.length < 4) {
    io.to(roomId).emit("errorMessage", "❗ 4 players required to start the game.");
    return;
  }

  room.gameState = getInitialGameState();
  const board = room.gameState.board;

  room.players.forEach(player => {
    const s = io.sockets.sockets.get(player.id);
    if (s) {
      const visibleBoard = player.role === "spymaster"
  ? board
  : board.map(w => ({
      word: w.word,
      role: w.revealed ? w.role : null,  // Only show role if revealed
      revealed: w.revealed
    }));


      s.emit("gameStart", {
        ...room.gameState,
        board: visibleBoard
      });
    }
  });

  startTurnTimer(roomId);
}

io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  socket.on("joinRoom", ({ roomId, username, team, role }) => {
    if (!rooms[roomId]) rooms[roomId] = { players: [] };
  
    const room = rooms[roomId];
    if (room.players.length >= MAX_PLAYERS) return socket.emit("roomFull");
  
    const teamCount = room.players.filter(p => p.team === team).length;
    const hasSpymaster = room.players.some(p => p.team === team && p.role === "spymaster");
    if (teamCount >= TEAM_SIZE) return socket.emit("teamFull", team);
    if (role === "spymaster" && hasSpymaster) return socket.emit("spymasterExists", team);
    const hasOperative = room.players.some(p => p.team === team && p.role === "operative");
    if (role === "operative" && hasOperative)
    return socket.emit("operativeExists", team);

    socket.join(roomId);
    room.players.push({ id: socket.id, username, team, role, ready: false }); // ✅ only add once
    socket.emit("joinedRoom", { roomId, username });
    io.to(roomId).emit("roomUpdate", room.players);
  });
  

  socket.on("toggleReady", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.ready = !player.ready;
      io.to(roomId).emit("roomUpdate", room.players);
  
      // Auto start if all are ready
      const allReady = room.players.length === 4 && room.players.every(p => p.ready);
      
        if (allReady) {
          let countdown = 3;
          const interval = setInterval(() => {
            io.to(roomId).emit("countdown", countdown);
            //Start the game automatically
            if (countdown === 0) {
              clearInterval(interval);
              io.to(roomId).emit("countdown", 0);
              //Start game directly from server instead of relying on client
              startGame(roomId);
            }            
            countdown--;
          }, 1000);
        }
    }
  });
  //New socket for leaveRoom
  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    const room = rooms[roomId];
    if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) {
      clearInterval(timers[roomId]);
      delete rooms[roomId];
      delete timers[roomId];
    } else {
      io.to(roomId).emit("roomUpdate", room.players);
    }
  });
  
  //Start game
  socket.on("startGame", (roomId) => startGame(roomId));


  socket.on("sendClue", ({ roomId, clue, count }) => {
    const room = rooms[roomId];
    if (!room || room.gameState.clueGiven) return;
  
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== "spymaster") return;
  
    const lowerClue = clue.trim().toLowerCase();
    const boardWords = room.gameState.board.map(w => w.word.toLowerCase());
    if (boardWords.includes(lowerClue)) {
      socket.emit("errorMessage", "❌ Clue cannot be one of the grid words!");
      return;
    }
  
    room.gameState.clue = clue;
    room.gameState.guessCount = count;
    room.gameState.clueGiven = true;
    io.to(roomId).emit("clueGiven", { clue, count });
  });
  

  socket.on("endTurn", (roomId) => {
    const room = rooms[roomId];
    if (room && room.gameState) {
      room.gameState.currentTurn = room.gameState.currentTurn === "red" ? "blue" : "red";
      room.gameState.clue = null;
      room.gameState.guessCount = 0;
      room.gameState.clueGiven = false;
      room.gameState.guessMade = false;
      io.to(roomId).emit("turnEnded", room.gameState.currentTurn);
      startTurnTimer(roomId);
    }
  });
  socket.on("rematch", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;
  
    // ✅ Prevent repeated resets
    if (room.rematchPending) return;
    room.rematchPending = true;
  
    room.players.forEach(p => p.ready = false);
    room.gameState = null;
  
    clearInterval(timers[roomId]);
    delete timers[roomId];
  
    io.to(roomId).emit("roomUpdate", room.players);
    io.to(roomId).emit("countdown", null);
  });
  
  
  

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        clearInterval(timers[roomId]);
        delete rooms[roomId];
        delete timers[roomId];
      } else {
        io.to(roomId).emit("roomUpdate", room.players);
      }
    }
  });

// Inside your existing socket.on("sendMessage") handler
socket.on("sendMessage", ({ roomId, username, message }) => {
  
  const room = rooms[roomId];
  if (!room || !room.gameState) return;
  
  const player = room.players.find(p => p.id === socket.id);
  if (!player || player.role === "spymaster") return;
  
  io.to(roomId).emit("receiveMessage", { username, message });

  const guessedWord = message.trim().toLowerCase();
  const boardItem = room.gameState.board.find(w => w.word.toLowerCase() === guessedWord);

  // ✅ If not a valid guess, just ignore (but still deduct guess attempt)
  if (!boardItem || boardItem.revealed) {
    room.gameState.guessCount--;
    if (room.gameState.guessCount <= 0) {
      room.gameState.currentTurn = room.gameState.currentTurn === "red" ? "blue" : "red";
      room.gameState.clue = null;
      room.gameState.guessCount = 0;
      room.gameState.clueGiven = false;
      room.gameState.guessMade = false;
      io.to(roomId).emit("turnEnded", room.gameState.currentTurn);
      startTurnTimer(roomId);
    }
    return;
  }

  boardItem.revealed = true;
  room.gameState.history.push({ word: boardItem.word, role: boardItem.role });

  // Update scores
  if (boardItem.role === "red") room.gameState.scores.red++;
  if (boardItem.role === "blue") room.gameState.scores.blue++;

  // Broadcast board update
  room.gameState.redLeft = room.gameState.board.filter(w => w.role === "red" && !w.revealed).length;
  room.gameState.blueLeft = room.gameState.board.filter(w => w.role === "blue" && !w.revealed).length;
    // 🏁 Check win condition
    if (room.gameState.redLeft === 0) {
      room.gameState.gameOver = true;
      io.to(roomId).emit("gameOver", { winner: "red", reason: "all words guessed" });
      clearInterval(timers[roomId]);
      delete timers[roomId];
      return;
    }
  
    if (room.gameState.blueLeft === 0) {
      room.gameState.gameOver = true;
      io.to(roomId).emit("gameOver", { winner: "blue", reason: "all words guessed" });
      clearInterval(timers[roomId]);
      delete timers[roomId];
      return;
    }
  const board = room.gameState.board;
  room.players.forEach(player => {
    const s = io.sockets.sockets.get(player.id);
    if (s) {
      const visibleBoard = player.role === "spymaster"
  ? board
  : board.map(w => ({
      word: w.word,
      role: w.revealed ? w.role : null,  // Only show role if revealed
      revealed: w.revealed
    }));


    s.emit("boardUpdate", {
      board: visibleBoard,
      redLeft: room.gameState.redLeft,
      blueLeft: room.gameState.blueLeft,
      scores: room.gameState.scores
    });
    
    }
  });

  // 🧨 Assassin ends the game
  if (boardItem.role === "assassin") {
    const winner = room.gameState.currentTurn === "red" ? "blue" : "red";
    room.gameState.gameOver = true;
    io.to(roomId).emit("gameOver", { winner, reason: "assassin" });
    clearInterval(timers[roomId]);
    delete timers[roomId];
    return;
  }

  // ✅ Normal guess → decrement remaining guesses
  room.gameState.guessCount--;

  if (room.gameState.guessCount <= 0) {
    room.gameState.currentTurn = room.gameState.currentTurn === "red" ? "blue" : "red";
    room.gameState.clue = null;
    room.gameState.guessCount = 0;
    room.gameState.clueGiven = false;
    room.gameState.guessMade = false;
    io.to(roomId).emit("turnEnded", room.gameState.currentTurn);
    startTurnTimer(roomId);
  }
});





});

const PORT = 3000;
const localIp = ip.address();
server.listen(PORT, localIp, () => {
  console.log(`Server running at http://${localIp}:${PORT}`);
});