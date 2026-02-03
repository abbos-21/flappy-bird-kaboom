<script setup lang="ts">
import { ref, onMounted } from 'vue'
import kaboom from 'kaboom'
import { useAdsgram } from '@adsgram/vue'
import { gameService } from '@/services/gameService' // [INTEGRATION]
import { useUserStore } from '@/stores/user'         // [INTEGRATION]

const canvas = ref<HTMLCanvasElement | null>(null)
const userStore = useUserStore() // [INTEGRATION] Access global user state

onMounted(async () => {
  // [INTEGRATION] Sync user data on load
  await userStore.sync()

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
  loadSprite('background-night', '/background-night.png')
  loadSprite('pipe', '/pipe-green.png')
  loadSprite('pipe-red', '/pipe-red.png')
  loadSprite('base', '/base.png')

  loadSound('score', '/point.ogg')
  loadSound('wooosh', '/wing.ogg')
  loadSound('hit', '/hit.ogg')

  // --- Helpers ---
  function createTiledBackground() {
    const bgWidth = 288
    const bgHeight = 512
    const bgScale = height() / bgHeight
    const numBgs = Math.ceil(width() / (bgWidth * bgScale)) + 1

    const dayLayers = []
    const nightLayers = []

    for (let i = 0; i < numBgs; i++) {
      nightLayers.push(
        add([
          sprite('background-night'),
          pos(i * (bgWidth * bgScale), 0),
          scale(bgScale),
          fixed(),
          z(-2),
          opacity(0),
        ]),
      )

      dayLayers.push(
        add([
          sprite('background-day'),
          pos(i * (bgWidth * bgScale), 0),
          scale(bgScale),
          fixed(),
          z(-1),
          opacity(1),
        ]),
      )
    }
    return { dayLayers, nightLayers }
  }

  // --- Game Scene ---
  scene('game', () => {
    setGravity(3200)
    let score = 0
    let currentSpeed = 100
    let gameStarted = false
    let isGameOver = false
    let isNight = false

    // [INTEGRATION] Session tracking
    let currentSessionId: string | null = null

    // Configuration
    const JUMP_FORCE = 800
    const PIPE_OPEN = 180
    const PIPE_HEIGHT = 320
    const FLOOR_HEIGHT = 112
    const CEILING = -60
    const MAX_SPEED = 640
    const SPEED_ACCEL = 0
    const ANIM_SPEED = 0.1
    const birdFrames = ['bird-down', 'bird-mid', 'bird-up', 'bird-mid']

    const backgrounds = createTiledBackground()

    // UI
    const scoreLabel = add([text('0'), pos(width() / 2, 80), anchor('center'), fixed(), z(30)])

    // [INTEGRATION] Added User Stats to UI
    add([
        text(`Best: ${userStore.maxScore}`, { size: 16 }),
        pos(10, 10),
        fixed(),
        z(30)
    ])
    add([
        text(`Coins: ${userStore.coins}`, { size: 16 }),
        pos(10, 30),
        fixed(),
        z(30)
    ])

    const startPrompt = add([
      text('Press Space or Click to Start', { size: 20 }),
      pos(width() / 2, height() / 2),
      anchor('center'),
      fixed(),
      z(30),
    ])

    // Player
    const bird = add([
      sprite('bird-mid'),
      pos(width() / 4, (height() - FLOOR_HEIGHT) / 2),
      area({ scale: 0.8 }),
      body(),
      rotate(0),
      anchor('center'),
      z(20),
      { animFrame: 0, animTimer: 0 },
    ])

    bird.paused = true

    // Floor
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

    function updateTheme() {
      const shouldBeNight = Math.floor(score / 10) % 2 !== 0

      if (shouldBeNight !== isNight) {
        isNight = shouldBeNight
        const newPipeSprite = isNight ? 'pipe-red' : 'pipe'
        setTimeout(() => {
          get('pipe').forEach((p) => {
            p.use(sprite(newPipeSprite, { flipY: p.flipY }))
          })
        }, 750)

        if (backgrounds.nightLayers[0]) {
          tween(
            backgrounds.nightLayers[0].opacity,
            isNight ? 1 : 0,
            1.5,
            (v) => {
              backgrounds.nightLayers.forEach((bg) => (bg.opacity = v))
              backgrounds.dayLayers.forEach((bg) => (bg.opacity = 1 - v))
            },
            easings.easeInOutQuad,
          )
        }
      }
    }

    function spawnPipe() {
      if (isGameOver) return

      const minPipePos = height() - FLOOR_HEIGHT - PIPE_HEIGHT - PIPE_OPEN / 2
      const maxPipePos = PIPE_HEIGHT
      const pipePos = rand(minPipePos, maxPipePos)
      const pipeSprite = isNight ? 'pipe-red' : 'pipe'

      add([
        sprite(pipeSprite, { flipY: true }),
        pos(width(), pipePos - PIPE_HEIGHT),
        area(),
        move(LEFT, currentSpeed),
        offscreen({ destroy: true }),
        z(5),
        'pipe',
      ])

      add([
        sprite(pipeSprite),
        pos(width(), pipePos + PIPE_OPEN),
        area(),
        move(LEFT, currentSpeed),
        z(5),
        'pipe',
        { passed: false },
      ])
    }

    // [INTEGRATION] Updated Start Logic
    function startGame() {
      if (gameStarted || isGameOver) return

      gameStarted = true
      bird.paused = false
      startPrompt.destroy()
      bird.jump(JUMP_FORCE)
      play('wooosh')

      // Optimistic Start: Start game visuals immediately, fetch session in background
      gameService.startSession().then(id => {
        currentSessionId = id
        if (!id) console.error("Failed to start server session")
      })

      wait(2, () => {
        if (!isGameOver) {
          loop(1.5, () => spawnPipe())
        }
      })
    }

    // [INTEGRATION] Updated Crash Logic
    async function crash() {
      if (isGameOver) return
      isGameOver = true
      play('hit')
      addKaboom(bird.pos).z = 30
      bird.paused = true
      get('pipe').forEach((p) => {
        p.paused = true
      })

      // Send score to server immediately upon crash
      if (currentSessionId) {
        // We don't await here to keep UI responsive, we await in the lose scene or let it sync in bg
        gameService.endSession(currentSessionId, score)
      }

      wait(0.75, () => {
        go('lose', score)
      })
    }

    onUpdate(() => {
      if (!isGameOver) {
        const scrollSpeed = gameStarted ? currentSpeed : 100
        base1.pos.x -= scrollSpeed * dt()
        base2.pos.x -= scrollSpeed * dt()
        if (base1.pos.x <= -base1.width) base1.pos.x = base2.pos.x + base2.width
        if (base2.pos.x <= -base2.width) base2.pos.x = base1.pos.x + base1.width
      }

      if (!gameStarted || isGameOver) return

      if (bird.vel.y < 0) {
        bird.angle = -35
      } else if (bird.angle < 90) {
        bird.angle += 350 * dt()
      }

      if (bird.angle < 45) {
        bird.animTimer += dt()
        if (bird.animTimer >= ANIM_SPEED) {
          bird.animTimer = 0
          bird.animFrame = (bird.animFrame + 1) % birdFrames.length
          bird.use(sprite(birdFrames[bird.animFrame]!))
        }
      } else {
        bird.use(sprite('bird-mid'))
      }

      currentSpeed = Math.min(MAX_SPEED, currentSpeed + SPEED_ACCEL * dt())

      if (bird.pos.y >= height() - FLOOR_HEIGHT || bird.pos.y <= CEILING) {
        crash()
      }
    })

    onUpdate('pipe', (p) => {
      if (!isGameOver && p.passed === false && p.pos.x + p.width <= bird.pos.x) {
        score++
        scoreLabel.text = score.toString()
        p.passed = true
        play('score')
        updateTheme()
      }
    })

    const jump = () => {
      if (isGameOver) return
      if (!gameStarted) {
        startGame()
        return
      }
      bird.jump(JUMP_FORCE)
      play('wooosh')
    }

    onKeyPress('space', jump)
    onClick(jump)
    onGamepadButtonPress('south', jump) // Keep gamepad support

    bird.onCollide('pipe', crash)
    bird.onCollide('base', crash)
  })

  // [INTEGRATION] Adsgram Setup
  const { show, addEventListener } = useAdsgram({
    blockId: '20793',
    onReward: (): void => {
      go('game')
    },
  })

  addEventListener('onBannerNotFound', () => {
    console.log('Banner not found')
  })

  // --- Lose Scene ---
  scene('lose', (score) => {
    createTiledBackground()
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

    // [INTEGRATION] Show Total Coins
    add([
      text(`Total Coins: ${userStore.coins}`, { size: 16 }),
      pos(width() / 2, height() / 2 + 90),
      anchor('center'),
      z(20),
      color(255, 215, 0) // Gold color
    ])

    const startButton = add([
      rect(160, 50, { radius: 8 }),
      pos(width() / 2, height() / 2 + 150), // Adjusted pos
      anchor('center'),
      color(76, 175, 80),
      area(),
      z(20),
      'startButton',
    ])

    add([
      text('START', { size: 24 }),
      pos(width() / 2, height() / 2 + 150),
      anchor('center'),
      color(255, 255, 255),
      z(30),
    ])

    startButton.onHoverUpdate(() => {
      startButton.color = rgb(102, 187, 106)
      setCursor('pointer')
    })

    startButton.onHoverEnd(() => {
      startButton.color = rgb(76, 175, 80)
      setCursor('default')
    })

    startButton.onClick(() => {
      go('game')
    })

    // [INTEGRATION] Press space to show Ad then restart
    onKeyPress('space', () => show())
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
