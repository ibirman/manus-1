# Sandcastle Builder Game

A 2D browser-based game where players build sandcastles to withstand incoming waves.

## Game Overview

In Sandcastle Builder, your goal is to build a strong sandcastle that can withstand waves while being as close as possible to the water. The game features:

- 2D top-down view of a beach environment
- Ability to build sand blocks by clicking on the beach
- Random waves that erode sand blocks near the water
- Scoring system based on protected area and proximity to water
- 10-minute time limit and 10-wave challenge
- 3D view of your completed sandcastle

## How to Play

1. Click on the beach to place sand blocks
2. Build walls higher by placing blocks on top of existing ones
3. Protect the highlighted area from incoming waves
4. The closer to the water you build, the more points you earn, but the higher risk of wave damage
5. Survive 10 waves within 10 minutes to win!
6. Click "View in 3D" to see your sandcastle in 3D perspective

## Controls

- **Left-click on beach**: Place sand block
- **Build Sand Block button**: Toggle building mode
- **Reset Game button**: Start a new game
- **View in 3D button**: View your sandcastle in 3D
- **In 3D view**:
  - Click and drag to rotate
  - Scroll to zoom
  - Right-click and drag to pan

## Scoring

- Base points are awarded for each protected cell in the designated area
- Bonus points are awarded based on proximity to water
- The final score is calculated after each wave hits

## Technical Details

The game is built using:
- HTML5 Canvas for 2D rendering
- JavaScript for game logic
- Three.js for 3D visualization

## Files

- `index.html`: Main HTML structure
- `style.css`: Game styling
- `game.js`: Core game mechanics
- `js/three.min.js`: Three.js library for 3D rendering
- `js/sandcastle3d.js`: 3D visualization implementation

## Installation

No installation required! Simply open `index.html` in a modern web browser to play.

## Credits

Created by Manus for the Sandcastle Builder Game project.
