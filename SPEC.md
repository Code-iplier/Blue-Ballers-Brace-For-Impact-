# Race Game Specification

## Project Overview
- **Project Name**: Meme Racer
- **Type**: 2D Racing Web Application
- **Core Functionality**: Top-down racing game with singleplayer mode featuring AI opponents, obstacles, and meme sound effects
- **Target Users**: Casual gamers who enjoy arcade-style racing with humorous audio

## Technical Stack
- Single HTML file with embedded CSS and JavaScript
- HTML5 Canvas for rendering
- Web Audio API for sound effects

## UI/UX Specification

### Visual Design

#### Color Palette
- **Background**: `#1a1a2e` (dark navy)
- **Track Surface**: `#3d3d3d` (asphalt gray)
- **Track Borders**: `#ff6b35` (orange) and `#ffffff` (white) alternating
- **Grass/Off-track**: `#2d5a27` (dark green)
- **Player Car**: `#e63946` (racing red)
- **AI Cars**: `#457b9d`, `#2a9d8f`, `#e9c46a`, `#f4a261`, `#9b5de5` (varied colors)
- **Obstacles**: `#ff006e` (hot pink), `#8338ec` (purple)
- **UI**: `#00f5d4` (cyan), `#fee440` (yellow)
- **Text**: `#ffffff` (white)
- **Menu Background**: `rgba(0, 0, 0, 0.85)`

#### Typography
- **Primary Font**: "Bangers", cursive (for titles)
- **Secondary Font**: "Orbitron", sans-serif (for UI elements)
- **Fallback**: Arial, sans-serif

#### Spacing
- Menu padding: 40px
- Button padding: 15px 40px
- Element margins: 20px

### Layout Structure

#### Game Canvas
- Full viewport canvas (100vw x 100vh)
- Camera follows player car with smooth interpolation
- Mini-map in corner (150x100px)

#### Menu System
- Centered modal-style menus
- Semi-transparent backdrop
- Animated button hover effects

### Components

#### Main Menu
- Game title with glow effect
- "START GAME" button
- "HOW TO PLAY" button
- "SETTINGS" button

#### Mode Select
- "SINGLEPLAYER" button
- "MULTIPLAYER" button

#### Game HUD
- Lap counter (top-left)
- Speed indicator (bottom-right)
- Position indicator (top-right)
- Timer (top-center)

#### Pause Menu
- "RESUME" button
- "RESTART" button
- "QUIT TO MENU" button

#### Game Over Screen
- Final position display
- Time display
- "PLAY AGAIN" button
- "BACK TO MENU" button

## Functionality Specification

### Core Features

#### Car Physics
- Acceleration with max speed cap (300 units/s)
- Deceleration when not accelerating
- Braking (faster deceleration)
- Steering with speed-dependent turning radius
- Drift mechanics at high speeds
- Collision bounce-back

#### Controls (WASD)
- W: Accelerate
- S: Brake/Reverse
- A: Steer Left
- D: Steer Right
- ESC: Pause menu

#### Track System
- Point-to-point race track
- Track width: 120 units
- Road with edge barriers (checker pattern)
- Start line and finish line
- Checkpoints for lap validation

#### AI Opponents (5 cars)
- Follow predefined waypoints
- Collision avoidance
- Variable AI difficulty/speed
- Rubber-banding mechanic

#### Obstacles
- Oil barrels (cause spinout)
- Cones (minor slowdown)
- Barriers (bounce)
- Randomly placed on track

#### Collision Detection
- Car-to-car collision
- Car-to-obstacle collision
- Car-to-boundary collision
- Physics response with momentum transfer

### Sound Effects (Web Audio API)

#### Built-in Sounds
- Engine loop (oscillator-based, pitch varies with speed)
- Collision impact
- Horn honk (AI cars)
- Spinout sound
- Victory/defeat fanfare

#### Meme Sound Effects
- Custom audio file upload support
- Pre-defined meme slots for:
  - Collision sound
  - Win sound
  - Lose sound
  - Start countdown

### Game Modes

#### Singleplayer
- Player vs 5 AI opponents
- Race to finish line
- Position ranking

#### Multiplayer (Local)
- 2-6 players on same keyboard
- Shared keyboard controls

### Game Flow
1. Main Menu → Mode Select
2. Countdown (3-2-1-GO!)
3. Race begins
4. First to complete track distance wins
5. Results screen
6. Return to menu

## Track Design

### Point-to-Point Track Layout
- Total length: ~8000 units
- Multiple turns (hairpins, chicanes, sweeps)
- Varied road width in sections
- Obstacle zones at key locations
- Start/Finish area

### Track Waypoints (example path)
```
Start → Straight → Hairpin → S-curve → Chicane →
Straight → Hairpin → Sweep → Final Sprint → Finish
```

## Acceptance Criteria

### Visual Checkpoints
- [ ] Canvas renders at full screen size
- [ ] Track is clearly visible with borders
- [ ] All 6 cars (1 player + 5 AI) render correctly
- [ ] Obstacles are visible on track
- [ ] HUD displays correctly
- [ ] Menus are centered and styled
- [ ] Sound icons are visible

### Functional Checkpoints
- [ ] Player car responds to WASD controls
- [ ] AI cars navigate the track
- [ ] Collisions trigger sound effects
- [ ] Obstacles affect car movement
- [ ] Game can be paused/resumed
- [ ] Winner is correctly determined
- [ ] Custom sounds can be uploaded

### Performance
- [ ] Maintains 60fps with all cars active
- [ ] No memory leaks during extended play
- [ ] Responsive on window resize