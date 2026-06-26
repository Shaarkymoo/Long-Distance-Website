/**
 * Pixel art object definitions for the room homepage.
 * Each sprite is a 2D array of color codes mapped via PALETTE.
 * '.' = transparent, [char] = palette color.
 * Rows are auto-normalized to equal width via normalize().
 */

export const PALETTE = {
  '.': 'transparent',
  '#': '#2A1F1A',   // dark outline
  'w': '#8B6F5E',   // wood/object base
  'W': '#B8957A',   // light wood
  'd': '#5C4A3E',   // dark detail
  'g': '#F4C542',   // gold
  'G': '#E8A87C',   // warm glow
  'r': '#C0392B',   // red
  'b': '#5DADE2',   // blue
  'B': '#2E86C1',   // dark blue
  'p': '#AF7AC5',   // purple
  'k': '#1A1A1A',   // black
  'l': '#F0E6D8',   // light/cream
  'o': '#E67E22',   // orange
  'c': '#76D7C4',   // cyan
  'e': '#58D68D',   // green
  'y': '#F1C40F',   // yellow
  's': '#BDC3C7',   // silver
  'n': '#3D251C',   // dark brown
  'm': '#6B4F3E',   // medium brown
  't': '#E6B0AA',   // pink
  'v': '#8E44AD',   // violet
  ' ': '#F0E6D8',   // white/cream surface (for whiteboard)
};

/** Auto-pad all rows of a sprite array to the same width with '.' */
export function normalize(rows) {
  const w = Math.max(...rows.map(r => r.length));
  return rows.map(r => r.padEnd(w, '.'));
}

export function spriteToBoxShadow(sprite, pixelSize = 4) {
  const shadows = [];
  for (let y = 0; y < sprite.length; y++) {
    for (let x = 0; x < sprite[y].length; x++) {
      const code = sprite[y][x];
      if (code === '.') continue;
      const color = PALETTE[code] || code;
      shadows.push(`${x * pixelSize}px ${y * pixelSize}px 0 ${color}`);
    }
  }
  return shadows.join(',');
}

export function spriteSize(sprite) {
  return {
    width: sprite[0].length,
    height: sprite.length,
  };
}

// ---- SPRITE DEFINITIONS ----
// Use def() helper which auto-normalizes row widths.

function def(name, link, desc, rows) {
  return { name, link, desc, sprite: normalize(rows) };
}

export const lamp = def('Lamp', '/light', 'Toggle the lights', [
  '...gg...',
  '..gGGg..',
  '..gGGg..',
  '.gwwGg.',
  '.wwwwd.',
  '.d#w#d.',
  '..#w#..',
  '..#w#..',
  '..#w#..',
  '..#w#..',
  '.dw#wn.',
  '.#wwww#',
  '.#d##d#',
  '........',
]);

export const tv = def('TV', '/movies', 'Movies & splitwise', [
  '........',
  '########',
  '#bbbbbb#',
  '#bbbbbb#',
  '#bbbBbb#',
  '#bbBbbb#',
  '#bbbbbb#',
  '########',
  '.##..##.',
  '..#..#..',
]);

export const bookshelf = def('Books', '/books', 'Book tracker', [
  '##########',
  '#rr##ee##',
  '#rr##ee##',
  '#rr##ee##',
  '##########',
  '##bb##pp#',
  '##bb##pp#',
  '##bb##pp#',
  '##########',
  '#yy##oo##',
  '#yy##oo##',
  '#yy##oo##',
  '##########',
  '.##....##.',
  '..#....#..',
]);

export const music = def('Music', '/music', 'Our playlist', [
  '....#....',
  '...##....',
  '..#.#....',
  '.#..#....',
  '#...#....',
  '.....#...',
  '....#.#..',
  '...#.#.#.',
  '..#.#.#.#',
  '.#.#.#.#.',
  '..#.#.#..',
  '...#.#...',
  '.....#...',
  '.........',
]);

export const whiteboard = def('Whiteboard', '/whiteboard', 'Shared whiteboard', [
  '.########.',
  '.#      #.',
  '.#  r   #.',
  '.# r r  #.',
  '.#  r r #.',
  '.#   r  #.',
  '.#      #.',
  '.#   b  #.',
  '.#  b b #.',
  '.# b   b#.',
  '.#  b b #.',
  '.#   b  #.',
  '.########.',
  '...##..##.',
]);

export const dice = def('D&D', '/dnd', 'Dungeons & Dragons', [
  '....#.....',
  '...###....',
  '..#.#.#...',
  '.#..#..#..',
  '#.r#r.#r#.',
  '.#..#..#..',
  '..#.#.#...',
  '...###....',
  '....#....',
]);

export const envelope = def('Messages', '/messages', 'Leave a note', [
  '.########.',
  '#.######.#',
  '#..####..#',
  '#...#...#.',
  '#....#...',
  '#...#...#.',
  '#..####..#',
  '#.######.#',
  '.########.',
]);

export const puzzle = def('Puzzles', '/puzzles', 'Daily puzzles', [
  '...####...',
  '..#rrrr#..',
  '.#rrrrrr#.',
  '.#rr#rr#.',
  '##rr#rr#.',
  '#ggr###r#.',
  '#gg#####..',
  '#gg#bb##..',
  '.##.#bb#..',
  '...##bb#..',
]);

export const controller = def('Games', '/games', 'Play together', [
  '..#######..',
  '.#kssssk#..',
  '#kssssssk#.',
  '#k#ssss#k#.',
  '###..#..###',
  '..#.#.#..#.',
]);

export const quiz = def('Quizzes', '/quizzes', 'Compare answers', [
  '..#####..',
  '.#rrrrr#.',
  '#rrrrrr#.',
  '#rrrrrr#.',
  '#rrrrr#..',
  '.#rrr#...',
  '.#rrr#...',
  '..#r##...',
  '..#rr#...',
  '..#rr#...',
  '...#rrr..',
]);

export const prediction = def('Predictions', '/predictions', 'Track your bets', [
  '....###....',
  '..#bbbb#..',
  '.#bbbbb#..',
  '.#bb#bbb#.',
  '.#bb#bbb#.',
  '.#bb#bbb#.',
  '.#bbbbbb#.',
  '.#bbbbbb#.',
  '..#bbbb#..',
  '...####...',
]);

export const conversation = def('Conversations', '/conversations', 'Deep talks', [
  '.#####.....',
  '#ggggg#....',
  '#ggggg#....',
  '.#####.#...',
  '.....###.#.',
  '.....#ggg#.',
  '.....#####.',
]);

export const notebook = def('Notebook', '/notebook', 'Shared notes', [
  '.#######.',
  '#llllllw#',
  '#llllllw#',
  '#ll#lllw#',
  '#ll#lllw#',
  '#llllllw#',
  '#llllllw#',
  '#ll#lllw#',
  '#ll#lllw#',
  '#llllllw#',
  '#llllllw#',
  '.#######.',
]);

export const trivia = def('Trivia', '/trivia', 'Test each other', [
  '..####..',
  '.#bbbb#.',
  '#bbbbbb#',
  '#bbbBbb#',
  '#bbbBbb#',
  '#bb#Bbb#',
  '#bbbBbb#',
  '#bbbbbb#',
  '.#bbbb#.',
  '.#bbbb#.',
  '..#bb#..',
  '..#bb#..',
  '..#bb#..',
  '...#..#.',
]);

export const guessObject = def('Guess', '/guess', 'Mystery object', [
  '..#######.',
  '.#o#ooo#.#',
  '.#ooo#oo#.',
  '.#oo#ooo#.',
  '.#o#o#oo#.',
  '.#ooo#oo#.',
  '.#oooooo#.',
  '..#ooooo#.',
  '...#oooo#.',
  '...#oooo#.',
  '..#oooo#..',
  '..####....',
]);

export const challenges = def('Challenges', '/challenges', 'Couple dares', [
  '....###....',
  '..#rrrr#..',
  '.#rrrrrr#.',
  '.#rr#rr#.',
  '.#rr#rr#.',
  '.#rr#rr#.',
  '.#rrrrrr#.',
  '.#rrrrrr#.',
  '..#rrrr#..',
  '...####...',
]);

// Map for easy iteration
export const objectList = [
  lamp, tv, bookshelf, music, whiteboard, dice, envelope, puzzle,
  controller, quiz, prediction, conversation, notebook, trivia,
  guessObject, challenges,
];
