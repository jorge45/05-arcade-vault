"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface TetrisGameHandle {
  forceGameOver: () => void;
}

export interface TetrisGameProps {
  paused: boolean;
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  onGameOver: () => void;
}

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const NEXT_BLOCK = 30;

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
] as const;

const PIECES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const THEMES = {
  dark: {
    canvasBg: "#1a1a25",
    border: "#2a2a3a",
    label: "#555570",
    controlsText: "#888",
    gridLine: "#22222e",
    toggleBg: "#22223a",
    toggleBorder: "#3a3a5a",
    toggleText: "#aaa",
  },
  light: {
    canvasBg: "#e4e4f0",
    border: "#b0b0c8",
    label: "#6060a0",
    controlsText: "#404060",
    gridLine: "#c8c8dc",
    toggleBg: "#dcdcf0",
    toggleBorder: "#9090b8",
    toggleText: "#3a3a6a",
  },
};

const VALUE_COLOR = "#7aa2f7";

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(board: number[][], shape: number[][], ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape: number[][]) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

const TetrisGame = forwardRef<TetrisGameHandle, TetrisGameProps>(
  function TetrisGame({ paused, onStats, onGameOver }, ref) {
    const boardCanvasRef = useRef<HTMLCanvasElement>(null);
    const nextCanvasRef = useRef<HTMLCanvasElement>(null);
    const linesValueRef = useRef<HTMLSpanElement>(null);

    const pausedRef = useRef(paused);
    const onStatsRef = useRef(onStats);
    const onGameOverRef = useRef(onGameOver);
    const forceGameOverRef = useRef<() => void>(() => {});

    const [isLight, setIsLight] = useState(false);
    const themeRef = useRef(isLight);

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      onStatsRef.current = onStats;
    }, [onStats]);

    useEffect(() => {
      onGameOverRef.current = onGameOver;
    }, [onGameOver]);

    useEffect(() => {
      themeRef.current = isLight;
    }, [isLight]);

    useEffect(() => {
      const saved = localStorage.getItem("tetris-theme");
      if (saved === "light") setIsLight(true);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        forceGameOver: () => forceGameOverRef.current(),
      }),
      [],
    );

    useEffect(() => {
      const boardCanvas = boardCanvasRef.current;
      const nextCanvas = nextCanvasRef.current;
      if (!boardCanvas || !nextCanvas) return;
      const maybeCtx = boardCanvas.getContext("2d");
      const maybeNextCtx = nextCanvas.getContext("2d");
      if (!maybeCtx || !maybeNextCtx) return;
      const ctx: CanvasRenderingContext2D = maybeCtx;
      const nextCtx: CanvasRenderingContext2D = maybeNextCtx;

      let board: number[][];
      let current: Piece;
      let next: Piece;
      let score: number;
      let lines: number;
      let level: number;
      let gameOver: boolean;
      let dropAccum: number;
      let dropInterval: number;
      let lastTime: number | null = null;
      let rafId: number;

      let lastScore = -1;
      let lastLives = -1;
      let lastLevel = -1;

      function emitStats() {
        const lives = gameOver ? 0 : 1;
        if (score !== lastScore || lives !== lastLives || level !== lastLevel) {
          lastScore = score;
          lastLives = lives;
          lastLevel = level;
          onStatsRef.current({ score, lives, level });
        }
      }

      function tryRotate() {
        const rotated = rotateCW(current.shape);
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
          if (!collide(board, rotated, current.x + kick, current.y)) {
            current.shape = rotated;
            current.x += kick;
            return;
          }
        }
      }

      function merge() {
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              board[current.y + r][current.x + c] = current.shape[r][c];
      }

      function setLinesDisplay() {
        if (linesValueRef.current)
          linesValueRef.current.textContent = String(lines);
      }

      function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (board[r].every((v) => v !== 0)) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(0));
            cleared++;
            r++;
          }
        }
        if (cleared) {
          lines += cleared;
          score += (LINE_SCORES[cleared] || 0) * level;
          level = Math.floor(lines / 10) + 1;
          dropInterval = Math.max(100, 1000 - (level - 1) * 90);
          setLinesDisplay();
        }
      }

      function ghostY() {
        let gy = current.y;
        while (!collide(board, current.shape, current.x, gy + 1)) gy++;
        return gy;
      }

      function hardDrop() {
        const gy = ghostY();
        score += (gy - current.y) * 2;
        current.y = gy;
        lockPiece();
      }

      function softDrop() {
        if (!collide(board, current.shape, current.x, current.y + 1)) {
          current.y++;
          score += 1;
        } else {
          lockPiece();
        }
      }

      function endGame() {
        if (gameOver) return;
        gameOver = true;
        onGameOverRef.current();
      }

      function spawn() {
        current = next;
        next = randomPiece();
        if (collide(board, current.shape, current.x, current.y)) {
          endGame();
        }
        drawNext();
      }

      function lockPiece() {
        merge();
        clearLines();
        spawn();
      }

      forceGameOverRef.current = () => {
        endGame();
      };

      function drawBlock(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        colorIndex: number,
        size: number,
        alpha?: number,
      ) {
        if (!colorIndex) return;
        const color = COLORS[colorIndex];
        if (!color) return;
        context.globalAlpha = alpha ?? 1;
        context.fillStyle = color;
        context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        context.fillStyle = "rgba(255,255,255,0.12)";
        context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
        context.globalAlpha = 1;
      }

      function drawGrid() {
        ctx.strokeStyle = themeRef.current
          ? THEMES.light.gridLine
          : THEMES.dark.gridLine;
        ctx.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(c * BLOCK, 0);
          ctx.lineTo(c * BLOCK, ROWS * BLOCK);
          ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * BLOCK);
          ctx.lineTo(COLS * BLOCK, r * BLOCK);
          ctx.stroke();
        }
      }

      function draw() {
        ctx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
        drawGrid();

        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            drawBlock(ctx, c, r, board[r][c], BLOCK);

        const gy = ghostY();
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              drawBlock(
                ctx,
                current.x + c,
                gy + r,
                current.shape[r][c],
                BLOCK,
                0.2,
              );

        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            drawBlock(
              ctx,
              current.x + c,
              current.y + r,
              current.shape[r][c],
              BLOCK,
            );
      }

      function drawNext() {
        nextCtx.clearRect(0, 0, 4 * NEXT_BLOCK, 4 * NEXT_BLOCK);
        const shape = next.shape;
        const offX = Math.floor((4 - shape[0].length) / 2);
        const offY = Math.floor((4 - shape.length) / 2);
        for (let r = 0; r < shape.length; r++)
          for (let c = 0; c < shape[r].length; c++)
            drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
      }

      function initGame() {
        board = createBoard();
        score = 0;
        lines = 0;
        level = 1;
        gameOver = false;
        dropInterval = 1000;
        dropAccum = 0;
        next = randomPiece();
        spawn();
        setLinesDisplay();
      }

      const GAME_KEYS = new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "KeyX",
        "Space",
      ]);

      function handleKeyDown(e: KeyboardEvent) {
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (pausedRef.current || gameOver) return;
        switch (e.code) {
          case "ArrowLeft":
            if (!collide(board, current.shape, current.x - 1, current.y))
              current.x--;
            break;
          case "ArrowRight":
            if (!collide(board, current.shape, current.x + 1, current.y))
              current.x++;
            break;
          case "ArrowDown":
            softDrop();
            break;
          case "ArrowUp":
          case "KeyX":
            tryRotate();
            break;
          case "Space":
            hardDrop();
            break;
        }
      }

      window.addEventListener("keydown", handleKeyDown);

      initGame();

      function loop(ts: number) {
        const dt = lastTime === null ? 0 : ts - lastTime;
        lastTime = ts;
        if (!pausedRef.current && !gameOver) {
          dropAccum += dt;
          if (dropAccum >= dropInterval) {
            dropAccum = 0;
            if (!collide(board, current.shape, current.x, current.y + 1)) {
              current.y++;
            } else {
              lockPiece();
            }
          }
        }
        draw();
        emitStats();
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, []);

    const theme = isLight ? THEMES.light : THEMES.dark;

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4%",
          padding: "3%",
          boxSizing: "border-box",
        }}
      >
        <canvas
          ref={boardCanvasRef}
          width={COLS * BLOCK}
          height={ROWS * BLOCK}
          style={{
            height: "100%",
            aspectRatio: `${COLS * BLOCK} / ${ROWS * BLOCK}`,
            background: theme.canvasBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 4,
            display: "block",
          }}
        />
        <aside
          style={{
            height: "100%",
            width: "30%",
            display: "flex",
            flexDirection: "column",
            gap: "6%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 10,
                letterSpacing: 2,
                color: theme.label,
                fontWeight: 600,
              }}
            >
              NEXT
            </span>
            <canvas
              ref={nextCanvasRef}
              width={4 * NEXT_BLOCK}
              height={4 * NEXT_BLOCK}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: theme.canvasBg,
                border: `1px solid ${theme.border}`,
                borderRadius: 4,
                display: "block",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 10,
                letterSpacing: 2,
                color: theme.label,
                fontWeight: 600,
              }}
            >
              LÍNEAS
            </span>
            <span
              ref={linesValueRef}
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: 26,
                fontWeight: 700,
                color: VALUE_COLOR,
                letterSpacing: 1,
              }}
            >
              0
            </span>
          </div>

          <button
            onClick={() =>
              setIsLight((prev) => {
                const next = !prev;
                localStorage.setItem("tetris-theme", next ? "light" : "dark");
                return next;
              })
            }
            style={{
              background: theme.toggleBg,
              border: `1px solid ${theme.toggleBorder}`,
              borderRadius: 20,
              padding: "4px 12px",
              fontSize: 13,
              fontFamily: "'Courier New', Courier, monospace",
              color: theme.toggleText,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              letterSpacing: 1,
              alignSelf: "flex-start",
            }}
          >
            <span style={{ fontSize: 15 }}>{isLight ? "☀" : "☾"}</span>
            <span>{isLight ? "DARK" : "LIGHT"}</span>
          </button>
        </aside>
      </div>
    );
  },
);

export default TetrisGame;
