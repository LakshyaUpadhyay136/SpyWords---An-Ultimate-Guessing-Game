// src/components/JoinRoom.jsx
import React, { useState } from "react";
import "../styles/landing_page.css"; // relative to src

function JoinRoom({
  username, setUsername,
  roomId, setRoomId,
  team, setTeam,
  role, setRole,
  joinRoom,
  roomFull,
  teamLimitReached,
  roleConflict
}){
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleJoinClick = () => 
    { setSubmitAttempted(true);
      if (username && roomId && team && role && !roomFull && !teamLimitReached && !roleConflict) {
        joinRoom();
      }
    };

  return (
  <div id="game-container">
    <h1>SPYWORDS.IO</h1>
    <div className="menu-wrapper">
      
      {/* USERNAME INPUT*/}
      
      <div className="username-section">
        <label htmlFor="usernameInput">Username:</label>
        <input
        type="text"
        id="usernameInput"
        placeholder="Enter your name"
        value={username}
        onChange={e => setUsername(e.target.value)}
        />
        
        </div>
        {/* Room joining section */}
        <div className="room-menu">
          <input
          type="text"
          id="roomIdInput"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={e => setRoomId(e.target.value)} 
          />

          {/* TEAM DROPDOWN */}
          {/* <label htmlFor="selectATeam">Select a Team:</label> */}
          <select value={team} onChange={e => setTeam(e.target.value)} className={team===""?"placeholder":""}>
          <option value="" disabled selected hidden>Select a Team</option>
          <option value="red">TEAM: Red Delta</option>
          <option value="blue">TEAM: Blue Force</option>
          </select>

          {/* ROLE DROPDOWN */}
          <select value={role} onChange={e => setRole(e.target.value)} className={role===""?"placeholder":""}>
          <option value="" disabled selected hidden>Select a Role</option>
          <option value="spymaster">ROLE: Spymaster</option>
          <option value="operative">ROLE: Operative</option>
          </select>

          {/* <button onClick={joinRoom} disabled={!roomId || roomFull || teamLimitReached || roleConflict || team==="" || role===""}> 
            Join Room
          </button> */}

          <button onClick={handleJoinClick} disabled={roomFull || teamLimitReached || roleConflict}>
            Join Room
          </button>
          
          {submitAttempted && (!username || !roomId || roomFull || teamLimitReached || roleConflict || team==="" || role==="" ) && (
            <p className="Instruction-Prompts">
              {!username ? "Enter a Username!" : !roomId ? "Enter Room ID!" : team==="" ? "Select a Team!" : role==="" ? "Select a Role!" : roomFull ? "Room Already Full!" : teamLimitReached ? `Team ${team} is full` : "Role already taken"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
export default JoinRoom;
