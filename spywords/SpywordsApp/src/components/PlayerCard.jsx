export default function PlayerCard({ player }) {
    return (
      <div
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr auto",
            // maxWidth:300,
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.1rem 0.6rem",
            border: "1px solid #444",
            borderRadius: 8,
            background: player.team === "red" ? "#dc143c" : "#4169e1",
            color: "white"
          }}
          >
          {/* avatar */}
        
        <img
          src={`/avatars/default-${player.team}-${player.role}.png`}
          alt="avt"
          style={{ width: 60, height: 60, borderRadius: "50%"}}
        />
  
        {/* name + role stacked */}
        <div>

          <div style={{ fontWeight: 600, fontSize:18}}>
            {player.username}
          </div>
          <div style={{ marginTop:5,fontSize: 13, opacity: 0.7 }}>
            {player.role}
          </div>

        </div>
  
        {/* ready badge */}
        <span style={{ fontSize: 22 }}>
          {/* {player.ready? "Ready":"Not Ready"} */}
          <img src={player.ready ? "/readystates/check.png" : "readystates/uncheck.png"} style={{width: 60, height: 60, borderRadius: "50%"}}/>
        </span>
      
      </div>
    );
  }