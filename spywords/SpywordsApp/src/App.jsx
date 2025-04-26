import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import JoinRoom from './components/JoinRoom';
import PlayerCard from "./components/PlayerCard";
const socket = io("http://192.168.101.32:3000",{transports: ["websocket"]});

function App() {
  const [roomId, setRoomId] = useState(""); // changed
  const [username, setUsername] = useState("");
  const [team, setTeam] = useState(""); // changed
  const [role, setRole] = useState(""); // changed
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [players, setPlayers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [timer, setTimer] = useState(60);
  const [clue, setClue] = useState("");
  const [clueCount, setClueCount] = useState(1);
  const [gameOver, setGameOver] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    //────────────────────────────────────────────────────────────
    //                1. DEFINE HANDLER FUNCTIONS
    //────────────────────────────────────────────────────────────
    const handleConnect = () => console.log("✅ Connected:", socket.id);
    
    const handleDisconnect = () => {
      console.log("❌ Disconnected");
      setJoined(false);
    };
    
    const handleJoinedRoom = ({ roomId, username }) => {
      console.log(`🎉 Joined ${roomId} as ${username}`);
      setJoined(true);
    };
    
    const handleReceiveMessage = ({ username, message }) =>
      setChat(prev => [...prev, `${username}: ${message}`]);
    
    const handleGameStart = (state) => {
      setGameState(state);
      setGameOver(null);
      setChat([]); // ✅ Optional: clear previous chat
      setMessage("");
      setJoined(true);
    };
    // --- OTHER IMPORTANT HANDLERS ---
    const handleTimerUpdate = (time) => setTimer(time);
    const handleClueGiven = ({ clue, count }) =>
      setGameState(prev => ({ ...prev, clue, guessCount: count }));
    const handleBoardUpdate = ({ board, redLeft, blueLeft, scores }) =>
      setGameState(prev => ({
        ...prev,
        board,
        redLeft,
        blueLeft,
        scores
      }));
    const handleTurnEnded = (nextTurn) =>
      setGameState(prev => ({ ...prev, currentTurn: nextTurn }));
    const handleGameOver = (result) => setGameOver(result);

    //────────────────────────────────────────────────────────────
    //                2. SUBSCRIBE TO SOCKET EVENTS
    //────────────────────────────────────────────────────────────
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("joinedRoom", handleJoinedRoom);
    socket.on("roomUpdate", setPlayers);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("gameStart", handleGameStart);
    socket.on("timerUpdate", handleTimerUpdate);
    socket.on("clueGiven", handleClueGiven);
    socket.on("boardUpdate", handleBoardUpdate);
    socket.on("turnEnded", handleTurnEnded);
    socket.on("gameOver", handleGameOver);
    socket.on("errorMessage", (msg) => alert(msg));
    socket.on("operativeExists", (team) => {
      alert(`OPERATIVE ALREADY EXISTS: For team ${team.toUpperCase()}`);
    });
    socket.on("spymasterExists", (team) => {
      alert(`SPYMASTER ALREADY EXISTS: For team ${team.toUpperCase()}`);
    });
    socket.on("countdown", (seconds) => setCountdown(seconds));
    socket.on("allReady", () => {
      setCountdown(null);
      startGame();
    });

    // Cleanup to prevent duplicated listeners
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("joinedRoom", handleJoinedRoom);
      socket.off("roomUpdate", setPlayers);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("gameStart", handleGameStart);
      socket.off("timerUpdate", handleTimerUpdate);
      socket.off("clueGiven", handleClueGiven);
      socket.off("boardUpdate", handleBoardUpdate);
      socket.off("turnEnded", handleTurnEnded);
      socket.off("gameOver", handleGameOver);
      socket.off("countdown");
      socket.off("allReady");
    };
  }, []);
 

  const joinRoom = () => {
    if (username && roomId) socket.emit("joinRoom", { roomId, username, team, role });
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { roomId, username, message: message.trim() });
      setMessage("");
    }
  };
  

  const startGame = () => socket.emit("startGame", roomId);
  const submitClue = () => {
    socket.emit("sendClue", { roomId, clue, count: parseInt(clueCount) });
    setClue(""); setClueCount(1);
  };
  const guessWord = (word) => socket.emit("makeGuess", { roomId, word });
  const endTurn = () => socket.emit("endTurn", roomId);

  const roomFull = players.length >= 4;
  const teamLimitReached = players.filter(p => p.team === team).length >= 2;
  const roleConflict = players.some(p => p.team === team && p.role === role);
  const redTeam  = players.filter(p => p.team === "red");
  const blueTeam = players.filter(p => p.team === "blue");

  
  const renderTile = (tile, i) => {
    const isSpymaster = role === "spymaster";
    const isRevealed = tile.revealed;
    const teamColor = {
      red: "crimson",
      blue: "royalblue",
      neutral: "gray",
      assassin: "black"
    };
    const text = tile.word;
    const bg = tile.revealed ? teamColor[tile.role] // revealed word gets its true color
    : (isSpymaster ? teamColor[tile.role] : "#888"); // spymaster sees true, operative sees gray

    const strike = isRevealed ? "line-through" : "none";
  
    return (
      <div
        key={i}
        style={{
          backgroundColor: bg,
          height: "auto",
          fontSize:"18px",
          padding: "14px",
          border: "1px solid #444",
          borderRadius: "5px",
          color: "white",
          textAlign: "center",
          textDecoration: strike,
          fontWeight: "bold"
        }}
      >
        {text}
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      {!joined ? (
        <JoinRoom
        username={username}
        setUsername={setUsername}
        roomId={roomId}
        setRoomId={setRoomId}
        team={team}
        setTeam={setTeam}
        role={role}
        setRole={setRole}
        joinRoom={joinRoom}
        roomFull={roomFull}
        teamLimitReached={teamLimitReached}
        roleConflict={roleConflict}
        />) : (
        <>
        {/* <h3 className="RoomId-Info">Room ID: {roomId}</h3> */}
        <button onClick={() => {
          socket.emit("leaveRoom", roomId);
            setJoined(false);
            setPlayers([]);
            setRoomId(roomId);
            setUsername(username);
            setTeam(team);
            setRole(role);
            }}>
              Leave Room
        </button>

        {/*Leave button with its logic above, defines what happens when the person leaves the room*/}
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem",marginBottom: "1rem"}}>
              {/* RED TEAM LOBBY */}
              <div>
                <h4 style={{ fontWeight:600, fontSize: 20, color: "#dc143c", textShadow: "1px 1px #000000", textAlign: "center" }}>TEAM: Red Delta</h4>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {redTeam.map(p => (
                    <PlayerCard key={p.id} player={p} />
                  ))}
                </div>
              </div>

              {/* BLUE TEAM LOBBY */}
              <div>
                <h4 style={{ fontWeight:600, fontSize: 20, color: "#4169e1", textShadow: "1px 1px #000000", textAlign: "center" }}>TEAM: Blue Force</h4>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {blueTeam.map(p => (
                    <PlayerCard key={p.id} player={p} />
                  ))}
                </div>
              </div>
        </div>
          
          {gameState ? (
            <>
              <h3 className={(gameState.currentTurn=="red" ? "some-events--red":"some-events--blue")}>CURRENT TURN: {gameState.currentTurn=="red"?"Red Delta":"Blue Force"}</h3>
              <h4 className="time-counter">Time Left: {timer}s</h4>
              <p className="guess-box">
                <span>Red Delta Guessed: {gameState.scores?.red ?? 0}</span>
                <span>Blue Force Guessed: {gameState.scores?.blue ?? 0}</span>
              </p>
              <p className="guess-box">
                <span>Words Left: {gameState.redLeft ?? "?"}</span>
                <span>Words Left: {gameState.blueLeft ?? "?"}</span>
              </p>
              <br />
              <p className={(gameState.currentTurn=="red"?"clue-box--red":"clue-box--blue")}>
                <span>CURRENT CLUE({gameState.guessCount}): {gameState.clue}</span>
                <span>GUESSES REMAIN: {gameState.guessCount}</span>
              </p>
              {gameOver && (
<div>
    <p style={{ color: "green" }}>
      🏆 {gameOver.winner.toUpperCase()} wins! ({gameOver.reason})
    </p>
    <button
      onClick={() => {
        setGameOver(null);                  // Reset local winner message
        setChat([]);                        // Optional: clear chat
        setMessage("");                     // Optional: clear current input
        setGameState(null);                 // this will show the ready lobby again
        socket.emit("rematch", roomId);     // Trigger rematch on server
      }}
    >
      Rematch
    </button>
  </div>
)}
<br />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {gameState.board.map(renderTile)}
              <br />
              </div>
              {role === "spymaster" && team === gameState.currentTurn && (
                <div style={{ marginTop: 10 }} className="clue-sender">
                  <input placeholder="Enter Clue:" value={clue} onChange={e => setClue(e.target.value)} />
                  <input type="number" value={clueCount} min={1} onChange={e => setClueCount(e.target.value)} />
                  <button onClick={submitClue}>SEND CLUE!</button>
                </div>
              )}
              {role === "operative" && team === gameState.currentTurn && (
                <div style={{ marginTop: 10 }} className="clue-sender">
                  {/* THIS BUTTON HERE IS DEVELOPER-OPTIONS-BUTTON to end turn */}
                  {/* <button onClick={endTurn}>End Turn</button>   */}
                </div>
              )}
            </>
          ) : (
            <>
              {countdown !== null ? (
                <p>Starting in {countdown}...</p>
              ) : (
                <button onClick={() => socket.emit("toggleReady", roomId)}>
                  {players.find(p => p.id === socket.id)?.ready ? "Unready" : "Ready"}
                </button>
              )}
            </>
          )}
{/*Above is the countdown section when all players are ready*/}
{/* <h4>Guesses Log</h4> */}
{gameState  && (<div className="clue-sender">
  {role !== "spymaster" && (
    <>
      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Enter Word:"
        disabled={!gameState || team !== gameState.currentTurn}
      />
      <button
        onClick={sendMessage}
        disabled={!gameState || team !== gameState.currentTurn}
      >
        GUESS!
      </button>
    </>
  )}
</div>
)}

          </>
      )}
    </div>
  );
}
export default App;
