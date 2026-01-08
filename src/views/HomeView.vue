<script setup lang="ts">
import { ref, onMounted } from 'vue'
import kaboom from 'kaboom'
import { useAdsgram } from '@adsgram/vue'

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  if (!canvas.value) return

  kaboom({
    width: 360,
    height: 640,
    letterbox: true,
    canvas: canvas.value,
    background: [0, 0, 0],
  })

  // --- Assets Loading ---
  loadSprite('bird-down', '/bluebird-downflap.png')
  loadSprite('bird-mid', '/bluebird-midflap.png')
  loadSprite('bird-up', '/bluebird-upflap.png')
  loadSprite('background-day', '/background-day.png')
  loadSprite('pipe', '/pipe-green.png')
  loadSprite('base', '/base.png')

  loadSound('score', '/point.ogg')
  loadSound('wooosh', '/swoosh.ogg')
  loadSound('hit', '/hit.ogg')

  // --- Helpers ---
  function createTiledBackground() {
    const bgWidth = 288
    const bgHeight = 512
    const bgScale = height() / bgHeight
    const numBgs = Math.ceil(width() / (bgWidth * bgScale)) + 1

    for (let i = 0; i < numBgs; i++) {
      add([
        sprite('background-day'),
        pos(i * (bgWidth * bgScale), 0),
        scale(bgScale),
        fixed(),
        z(-1),
      ])
    }
  }

  // --- Game Scene ---
  scene('game', () => {
    setGravity(3200)
    let score = 0
    let currentSpeed = 320
    let gameStarted = false // Add this flag

    // Configuration
    const JUMP_FORCE = 800
    const PIPE_OPEN = 180
    const PIPE_HEIGHT = 320
    const FLOOR_HEIGHT = 112
    const CEILING = -60
    const MAX_SPEED = 640
    const SPEED_ACCEL = 8
    const ANIM_SPEED = 0.1
    const birdFrames = ['bird-down', 'bird-mid', 'bird-up', 'bird-mid']

    createTiledBackground()

    // UI
    const scoreLabel = add([text('0'), pos(width() / 2, 80), anchor('center'), fixed(), z(100)])

    // Add start prompt
    const startPrompt = add([
      text('Press Space or Click to Start', { size: 20 }),
      pos(width() / 2, height() / 2 + 100),
      anchor('center'),
      fixed(),
      z(100),
    ])

    // Player
    const bird = add([
      sprite('bird-mid'),
      pos(width() / 4, (height() - FLOOR_HEIGHT) / 2),
      area(),
      body(),
      z(20),
      {
        animFrame: 0,
        animTimer: 0,
      },
    ])

    // Disable gravity until game starts
    bird.paused = true

    // Scrolling Floor (Base)
    const base1 = add([
      sprite('base'),
      pos(0, height() - FLOOR_HEIGHT),
      area(),
      body({ isStatic: true }),
      z(10),
      'base',
    ])

    const base2 = add([
      sprite('base'),
      pos(base1.width, height() - FLOOR_HEIGHT),
      area(),
      body({ isStatic: true }),
      z(10),
      'base',
    ])

    // Pipes Logic
    function spawnPipe() {
      const minPipePos = height() - FLOOR_HEIGHT - PIPE_HEIGHT - PIPE_OPEN / 2
      const maxPipePos = PIPE_HEIGHT
      const pipePos = rand(minPipePos, maxPipePos)

      add([
        sprite('pipe', { flipY: true }),
        pos(width(), pipePos - PIPE_HEIGHT),
        area(),
        move(LEFT, currentSpeed),
        offscreen({ destroy: true }),
        z(0),
        'pipe',
      ])

      add([
        sprite('pipe'),
        pos(width(), pipePos + PIPE_OPEN),
        area(),
        move(LEFT, currentSpeed),
        z(0),
        'pipe',
        { passed: false },
      ])
    }

    // Function to start the game
    function startGame() {
      if (gameStarted) return
      gameStarted = true
      bird.paused = false
      startPrompt.destroy()

      wait(2, () => {
        loop(1, () => spawnPipe())
      })
    }

    // Core Loops & Updates
    onUpdate(() => {
      // Bird Animation (always runs, even before game starts)
      bird.animTimer += dt()
      if (bird.animTimer >= ANIM_SPEED) {
        bird.animTimer = 0
        bird.animFrame = (bird.animFrame + 1) % birdFrames.length
        bird.use(sprite(birdFrames[bird.animFrame]!))
      }

      // Scroll Base (always runs, even before game starts)
      const scrollSpeed = gameStarted ? currentSpeed : 160 // Slower scroll before game starts
      base1.pos.x -= scrollSpeed * dt()
      base2.pos.x -= scrollSpeed * dt()
      if (base1.pos.x <= -base1.width) base1.pos.x = base2.pos.x + base2.width
      if (base2.pos.x <= -base2.width) base2.pos.x = base1.pos.x + base1.width

      if (!gameStarted) return // Don't update other game logic until started

      // 1. Increase Difficulty
      currentSpeed = Math.min(MAX_SPEED, currentSpeed + SPEED_ACCEL * dt())

      // 2. Boundary Check
      if (bird.pos.y >= height() - FLOOR_HEIGHT || bird.pos.y <= CEILING) {
        go('lose', score)
      }
    })

    // Scoring
    onUpdate('pipe', (p) => {
      if (p.passed === false && p.pos.x + p.width <= bird.pos.x) {
        score++
        scoreLabel.text = score.toString()
        p.passed = true
        play('score')
      }
    })

    // Input & Collisions
    const jump = () => {
      if (!gameStarted) {
        startGame()
      }
      bird.jump(JUMP_FORCE)
      play('wooosh')
    }

    onKeyPress('space', jump)
    onClick(jump)
    onGamepadButtonPress('south', jump)

    bird.onCollide('pipe', () => {
      play('hit')
      go('lose', score)
      addKaboom(bird.pos)
    })

    bird.onCollide('base', () => {
      play('hit')
      go('lose', score)
      addKaboom(bird.pos)
    })
  })

  const { show, addEventListener } = useAdsgram({
    blockId: '20793',
    onReward: (): void => {
      go('game')
      console.log('Hello!')
    },
  })

  addEventListener('onBannerNotFound', () => {
    console.log('Banner not found')
  })

  // --- Lose Scene ---
  scene('lose', (score) => {
    createTiledBackground()

    // Add tiled static base
    const FLOOR_HEIGHT = 112
    const baseWidth = 336
    const numBases = Math.ceil(width() / baseWidth) + 1

    for (let i = 0; i < numBases; i++) {
      add([sprite('base'), pos(i * baseWidth, height() - FLOOR_HEIGHT), z(10)])
    }

    add([
      sprite('bird-mid'),
      pos(width() / 2, height() / 2 - 100),
      scale(2),
      anchor('center'),
      z(20),
    ])

    add([
      text(score !== undefined ? `Score: ${score}` : 'FLAPPY KABOOM'),
      pos(width() / 2, height() / 2 + 50),
      anchor('center'),
      z(20),
    ])

    // Start Button
    const startButton = add([
      rect(160, 50, { radius: 8 }),
      pos(width() / 2, height() / 2 + 140),
      anchor('center'),
      color(76, 175, 80),
      area(),
      z(20),
      'startButton',
    ])

    add([
      text('START', { size: 24 }),
      pos(width() / 2, height() / 2 + 140),
      anchor('center'),
      color(255, 255, 255),
      z(21),
    ])

    // Button hover effect
    startButton.onHoverUpdate(() => {
      startButton.color = rgb(102, 187, 106)
      setCursor('pointer')
    })

    startButton.onHoverEnd(() => {
      startButton.color = rgb(76, 175, 80)
      setCursor('default')
    })

    // Button click
    startButton.onClick(() => {
      show()
    })

    onKeyPress('space', () => go('game'))
  })

  go('lose')
})
</script>

<template>
  <div class="game-container">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style scoped>
.game-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #111;
  overflow: hidden;
}

canvas {
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}
</style>
