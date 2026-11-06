"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ARKANOID_LEVELS } from "@/lib/arkanoid-levels";

export interface ArkanoidGameHandle {
  forceGameOver: () => void;
}

export interface ArkanoidGameProps {
  paused: boolean;
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  onGameOver: () => void;
}

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

interface Sprite {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const EXPLOSION_FRAMES: Record<string, Sprite[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

const SPRITES: {
  paddle: Sprite;
  ball: Sprite;
  blocks: Record<string, Sprite>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
}

type GameState = "playing" | "gameover";

const ArkanoidGame = forwardRef<ArkanoidGameHandle, ArkanoidGameProps>(
  function ArkanoidGame({ paused, onStats, onGameOver }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pausedRef = useRef(paused);
    const onStatsRef = useRef(onStats);
    const onGameOverRef = useRef(onGameOver);
    const forceGameOverRef = useRef<() => void>(() => {});

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      onStatsRef.current = onStats;
    }, [onStats]);

    useEffect(() => {
      onGameOverRef.current = onGameOver;
    }, [onGameOver]);

    useImperativeHandle(
      ref,
      () => ({
        forceGameOver: () => forceGameOverRef.current(),
      }),
      [],
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maybeCtx = canvas.getContext("2d");
      if (!maybeCtx) return;
      const ctx: CanvasRenderingContext2D = maybeCtx;
      const canvasEl: HTMLCanvasElement = canvas;

      const paddle = { x: 0, y: 560, w: 81, h: 14 };
      const ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };

      let blocks: Block[] = [];
      let explosions: Explosion[] = [];
      let lives = 3;
      let score = 0;
      let gameState: GameState = "playing";
      let currentLevel = 1;

      const keys: Record<string, boolean> = {
        ArrowLeft: false,
        ArrowRight: false,
      };

      let ssImg: HTMLImageElement | null = null;
      let ssLoaded = false;

      let lastScore = -1;
      let lastLives = -1;
      let lastLevel = -1;

      function emitStats() {
        if (
          score !== lastScore ||
          lives !== lastLives ||
          currentLevel !== lastLevel
        ) {
          lastScore = score;
          lastLives = lives;
          lastLevel = currentLevel;
          onStatsRef.current({ score, lives, level: currentLevel });
        }
      }

      function endGame() {
        if (gameState === "gameover") return;
        gameState = "gameover";
        onGameOverRef.current();
      }

      forceGameOverRef.current = () => {
        lives = 0;
        endGame();
      };

      function initPaddle() {
        paddle.x = (W - paddle.w) / 2;
      }

      function initBall() {
        const speed = ARKANOID_LEVELS[currentLevel - 1].speed;
        ball.x = paddle.x + (paddle.w - ball.w) / 2;
        ball.y = paddle.y - ball.h;
        ball.vx = BASE_BALL_VX * speed;
        ball.vy = BASE_BALL_VY * speed;
      }

      function loadLevel(n: number) {
        currentLevel = n;
        const level = ARKANOID_LEVELS[n - 1];
        blocks = level.blocks.map((b) => ({
          x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
          y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
          w: BLOCK_W,
          h: BLOCK_H,
          color: b.color,
          alive: true,
        }));
        explosions = [];
        ball.x = paddle.x + (paddle.w - ball.w) / 2;
        ball.y = paddle.y - ball.h;
        ball.vx = BASE_BALL_VX * level.speed;
        ball.vy = BASE_BALL_VY * level.speed;
      }

      function collideAABB(block: Block) {
        return (
          ball.x < block.x + block.w &&
          ball.x + ball.w > block.x &&
          ball.y < block.y + block.h &&
          ball.y + ball.h > block.y
        );
      }

      function handleMouseMove(e: MouseEvent) {
        const rect = canvasEl.getBoundingClientRect();
        const scaleX = canvasEl.width / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
      }

      function handleKeyDown(e: KeyboardEvent) {
        if (e.key in keys) keys[e.key] = true;
      }

      function handleKeyUp(e: KeyboardEvent) {
        if (e.key in keys) keys[e.key] = false;
      }

      function update(dt: number) {
        if (gameState !== "playing") return;

        if (keys.ArrowLeft)
          paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
        if (keys.ArrowRight)
          paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x <= 0) {
          ball.x = 0;
          ball.vx = Math.abs(ball.vx);
        }
        if (ball.x + ball.w >= W) {
          ball.x = W - ball.w;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y <= 0) {
          ball.y = 0;
          ball.vy = Math.abs(ball.vy);
        }

        if (
          ball.vy > 0 &&
          ball.x + ball.w > paddle.x &&
          ball.x < paddle.x + paddle.w &&
          ball.y + ball.h >= paddle.y &&
          ball.y + ball.h <= paddle.y + paddle.h + 8
        ) {
          ball.y = paddle.y - ball.h;
          ball.vy = -Math.abs(ball.vy);
        }

        for (const block of blocks) {
          if (!block.alive) continue;
          if (collideAABB(block)) {
            block.alive = false;
            explosions.push({
              x: block.x,
              y: block.y,
              w: block.w,
              h: block.h,
              color: block.color,
              elapsed: 0,
            });
            score += 10;
            ball.vy = -ball.vy;
            if (blocks.every((b) => !b.alive)) {
              if (currentLevel < 5) loadLevel(currentLevel + 1);
              else endGame();
            }
            break;
          }
        }

        for (const exp of explosions) exp.elapsed += dt * 1000;
        explosions = explosions.filter(
          (exp) => exp.elapsed < EXPLOSION_DURATION,
        );

        if (ball.y > H) {
          lives--;
          if (lives <= 0) {
            lives = 0;
            endGame();
          } else {
            initBall();
          }
        }
      }

      function drawSprite(
        name: string,
        x: number,
        y: number,
        w: number,
        h: number,
      ) {
        if (!ssLoaded || !ssImg) return;
        const sp = name.startsWith("block_")
          ? SPRITES.blocks[name.slice(6)]
          : name === "paddle"
            ? SPRITES.paddle
            : SPRITES.ball;
        if (!sp) return;
        ctx.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
      }

      function drawFrame(
        frame: Sprite,
        x: number,
        y: number,
        w: number,
        h: number,
      ) {
        if (!ssLoaded || !ssImg) return;
        ctx.drawImage(
          ssImg,
          frame.sx,
          frame.sy,
          frame.sw,
          frame.sh,
          x,
          y,
          w,
          h,
        );
      }

      function draw() {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        for (const block of blocks) {
          if (block.alive)
            drawSprite(
              "block_" + block.color,
              block.x,
              block.y,
              block.w,
              block.h,
            );
        }

        for (const exp of explosions) {
          const frameIndex = Math.min(
            Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
            3,
          );
          drawFrame(
            EXPLOSION_FRAMES[exp.color][frameIndex],
            exp.x,
            exp.y,
            exp.w,
            exp.h,
          );
        }

        drawSprite("paddle", paddle.x, paddle.y, paddle.w, paddle.h);
        drawSprite("ball", ball.x, ball.y, ball.w, ball.h);

        if (gameState === "playing") {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 18px monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText("Score: " + score, 10, 10);
          ctx.textAlign = "center";
          ctx.fillText("Nivel: " + currentLevel, W / 2, 10);
          const ballSize = 16;
          const ballSpacing = 4;
          for (let i = 0; i < lives; i++) {
            const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
            drawSprite("ball", bx, 10, ballSize, ballSize);
          }
        }
      }

      canvas.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      let lastTime: number | null = null;
      let rafId: number;
      let cancelled = false;

      function loop(timestamp: number) {
        if (lastTime === null) lastTime = timestamp;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;

        if (!pausedRef.current) update(dt);
        draw();
        emitStats();

        rafId = requestAnimationFrame(loop);
      }

      const rawImg = new Image();
      rawImg.onload = () => {
        if (cancelled) return;
        ssImg = rawImg;
        ssLoaded = true;
        initPaddle();
        loadLevel(1);
        rafId = requestAnimationFrame(loop);
      };
      rawImg.src = "/arkanoid/spritesheet-breakout.png";

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
        canvas.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    );
  },
);

export default ArkanoidGame;
