<script setup lang="ts">
import { ref, onMounted } from 'vue'
import kaboom from 'kaboom'

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  if (canvas.value) {
    // Calculate the scale to fit the width or height
    const kWidth = 360
    const kHeight = 640

    const scaleFactor = Math.min(window.innerWidth / kWidth, window.innerHeight / kHeight)

    kaboom({
      width: kWidth,
      height: kHeight,
      scale: scaleFactor, // <--- Scale based on window size
      canvas: canvas.value,
    })

    // Load all three bird animation frames
    loadSprite('bird-down', '/redbird-downflap.png')
    loadSprite('bird-mid', '/redbird-midflap.png')
    loadSprite('bird-up', '/redbird-upflap.png')

    loadSprite('background-day', '/background-day.png')
    loadSprite('coin', '/coin.png')
    loadSprite('pipe', '/pipe-green.png')
    loadSound('score', '/point.ogg')
    loadSound('wooosh', '/swoosh.ogg')
    loadSound('hit', '/hit.ogg')

    setGravity(3200)

    scene('game', () => {
      const PIPE_OPEN = 180
      const JUMP_FORCE = 800
      let speed = 320
      const MAX_SPEED = 640
      const SPEED_INCREASE = 8

      const CEILING = -60
      const PIPE_HEIGHT = 320

      const bgOriginalWidth = 288
      const bgOriginalHeight = 512
      const bgScaleY = height() / bgOriginalHeight
      const bgScaledWidth = bgOriginalWidth * bgScaleY
      const numBackgrounds = Math.ceil(width() / bgScaledWidth) + 1

      for (let i = 0; i < numBackgrounds; i++) {
        add([sprite('background-day'), pos(i * bgScaledWidth, 0), scale(bgScaleY), fixed(), z(-1)])
      }

      const bean = add([
        sprite('bird-mid'), // Start with mid frame
        pos(width() / 4, 0),
        area(),
        body(),
        {
          animFrame: 0,
          animTimer: 0,
        },
      ])

      // Animate bird wings
      const ANIM_SPEED = 0.1 // Seconds per frame
      const birdFrames = ['bird-down', 'bird-mid', 'bird-up', 'bird-mid']

      bean.onUpdate(() => {
        // Wing animation
        bean.animTimer += dt()
        if (bean.animTimer >= ANIM_SPEED) {
          bean.animTimer = 0
          bean.animFrame = (bean.animFrame + 1) % birdFrames.length
          bean.use(sprite(birdFrames[bean.animFrame]!))
        }

        // Death check
        if (bean.pos.y >= height() || bean.pos.y <= CEILING) {
          go('lose', score)
        }
      })

      onKeyPress('space', () => {
        bean.jump(JUMP_FORCE)
        play('wooosh')
      })

      onGamepadButtonPress('south', () => {
        bean.jump(JUMP_FORCE)
        play('wooosh')
      })

      onClick(() => {
        bean.jump(JUMP_FORCE)
        play('wooosh')
      })

      function spawnPipe() {
        // Calculate the random position for the bottom of the top pipe
        // We want a range between 140 and 320 to prevent "floating" pipes
        // 140 = (Screen Height - Pipe Height - Gap)
        // 320 = (Pipe Height)
        const minPipePos = height() - PIPE_HEIGHT - PIPE_OPEN // 140
        const maxPipePos = PIPE_HEIGHT // 320

        // rand(min, max) picks a random number between the two
        const pipePos = rand(minPipePos, maxPipePos)

        // Top Pipe
        add([
          sprite('pipe', { flipY: true }),
          // Position: pipePos minus the height of the image lifts it up correctly
          pos(width(), pipePos - PIPE_HEIGHT),
          area(),
          move(LEFT, speed),
          offscreen({ destroy: true }),
          'pipe',
        ])

        // Bottom Pipe
        add([
          sprite('pipe'),
          // Position: pipePos plus the gap size
          pos(width(), pipePos + PIPE_OPEN),
          area(),
          move(LEFT, speed),
          // offscreen({ destroy: true }),
          'pipe',
          { passed: false },
        ])
      }

      bean.onCollide('pipe', () => {
        go('lose', score)
        play('hit')
        addKaboom(bean.pos)
      })

      onUpdate('pipe', (p) => {
        if (p.pos.x + p.width <= bean.pos.x && p.passed === false) {
          addScore()
          p.passed = true
        }
      })

      onUpdate(() => {
        speed = Math.min(MAX_SPEED, speed + SPEED_INCREASE * dt())
      })

      loop(1, () => {
        spawnPipe()
      })

      let score = 0

      const scoreLabel = add([
        text(score.toString()),
        anchor('center'),
        pos(width() / 2, 80),
        fixed(),
        z(100),
      ])

      function addScore() {
        score++
        scoreLabel.text = score.toString()
        play('score')
      }
    })

    scene('lose', (score) => {
      const bgOriginalWidth = 288
      const bgOriginalHeight = 512
      const bgScaleY = height() / bgOriginalHeight
      const bgScaledWidth = bgOriginalWidth * bgScaleY
      const numBackgrounds = Math.ceil(width() / bgScaledWidth) + 1

      for (let i = 0; i < numBackgrounds; i++) {
        add([sprite('background-day'), pos(i * bgScaledWidth, 0), scale(bgScaleY), fixed(), z(-1)])
      }

      add([sprite('bird-mid'), pos(width() / 2, height() / 2 - 108), scale(3), anchor('center')])

      add([
        text(score ?? 'Welcome'),
        pos(width() / 2, height() / 2 + 108),
        scale(3),
        anchor('center'),
      ])

      onKeyPress('space', () => go('game'))
      onClick(() => go('game'))
    })

    go('lose')
  }
})
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>

<style>
canvas {
  border: 2px solid #543847;
  border: 2px solid #543847;
}
</style>
