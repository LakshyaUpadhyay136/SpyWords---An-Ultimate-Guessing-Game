Based on your final `App.jsx` and `server.js` files, here’s a **complete and elaborated ruleset and dynamic flow** for your multiplayer Codenames-inspired game, tailored to how your implementation actually works:

---

##  Game Overview

This is a **4-player**, **team-based**, turn-driven game where two teams — 🔴 Red and 🔵 Blue — compete to guess their own words based on clues given by their spymaster. The game ends when a team finds all their words or triggers a losing condition.

---

##  Teams & Roles

- **2 Teams**: Red and Blue
    
- Each team has:
    
    - **1 Spymaster** (gives clues)
        
    - **1 Operative** (guesses based on clue)
        

>  Enforced: The app prevents more than one spymaster or operative per team.

---

##  Game Setup

1. Players **join a room** (max 4)
    
2. Each player **chooses a team (Red or Blue)** and a **role (Spymaster or Operative)**
    
3. All players must click **“Ready”**
    
4. Once all 4 are ready, the game **automatically starts**
    

>  Game will not start unless **all 4 players** are ready.

---

##  Game Objective

- **Guess all your team’s words** (6 red or 6 blue)
    
- Avoid:
    
    - Guessing the **assassin**
        
    - **Repeatedly missing turns** (3 total)
        
    - (Optional in future) **Making too many wrong guesses in hardcore mode**
        

---

##  Game Mechanics

###  Board Generation

- At game start, **16 words** are randomly selected from `wordlist-eng.txt`
    
- Roles assigned:
    
    - 6 Red
        
    - 6 Blue
        
    - 3 Neutral
        
    - 1 Assassin
        

Each tile is an object like:

```js
{ word: "MOUNTAIN", role: "red", revealed: false }
```

---

###  Turn Structure

- Each turn belongs to a team (starts with **Red**)
    
- Spymaster gives:
    
    - A **one-word clue**
        
    - A **number** (max guesses)
        
- Operative types a word guess in chat
    
- Clue can be submitted only **once per turn**
    
- Guess can be made only **once per turn**  
    _(One guess per clue currently implemented)_
    

> The app disables guessing/clue-sending for the opposing team during your turn.

---

###  Turn Timer

- Each team gets **60 seconds**
    
- If time expires without a clue or guess:
    
    - That team earns a **missed turn**
        
    - After **3 missed turns**, the opponent wins
        

---

###  Ending a Turn

A turn ends when:

- The operative makes a guess
    
- The team clicks **“End Turn”**
    
- Time expires (auto-end)
    

---

##  Losing Conditions

-  **Assassin revealed** → that team loses instantly
    
-  **3 missed turns** → that team loses
    
- 🟥🔵 **All 6 team words guessed** → that team wins
    

>  All conditions clear timers and prevent further updates.

---

##  Rematch

After a game ends:

- Players can click the **“Rematch”** button
    
- This:
    
    - Resets the board and scores
        
    - Resets all “Ready” states
        
    - Starts a new 16-word round with new clues
        

---

##  Chat-Based Guessing

- Operatives **type their guesses** into the chat box
    
- The backend **matches the guessed word** to the board
    
- If:
    
    - It's your color → +1 point
        
    - It's wrong → ends turn
        
    - It's assassin → you lose
        

>  Invalid or repeated guesses also end the turn

---

##  Rules Enforcement

|Rule|Where Enforced|
|---|---|
|Max 4 players|server.js (`MAX_PLAYERS = 4`)|
|Only 1 spymaster/operative per team|server.js → `joinRoom()` validation|
|Team-based input lock|App.jsx disables inputs unless it's your team's turn|
|Timer|`startTurnTimer()` in server.js|
|Victory checks|After each guess, in `sendMessage`|
