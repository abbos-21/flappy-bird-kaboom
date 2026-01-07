<script setup lang="ts">
import { ref, onMounted } from 'vue'
import kaboom from 'kaboom'

const canvas = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  if (canvas.value) {
    kaboom({
      width: window.innerWidth,
      height: window.innerHeight,
      canvas: canvas.value,
    })

    // Load all three bird animation frames
    loadSprite('bird-down', '/redbird-downflap.png')
    loadSprite('bird-mid', '/redbird-midflap.png')
    loadSprite('bird-up', '/redbird-upflap.png')

    loadSprite('background-day', '/background-day.png')
    loadSprite('coin', '/coin.png')
    loadSound('score', '/point.ogg')
    loadSound('wooosh', '/swoosh.ogg')
    loadSound('hit', '/hit.ogg')

    setGravity(3200)

    scene('game', () => {
      const PIPE_OPEN = 180
      const PIPE_MIN = 60
      const JUMP_FORCE = 800
      const SPEED = 320
      const CEILING = -60

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
        const h1 = rand(PIPE_MIN, height() - PIPE_MIN - PIPE_OPEN)
        const h2 = height() - h1 - PIPE_OPEN
        const CAP_W = 52
        const CAP_H = 24
        const BODY_W = 48

        // --- TOP PIPE ---
        const pipeTop = add([
          pos(width(), 0),
          area({ shape: new Rect(vec2(0, 0), CAP_W, h1) }),
          move(LEFT, SPEED),
          offscreen({ destroy: true }),
          'pipe',
        ])

        // Top Body (Centered)
        pipeTop.add([
          rect(BODY_W, h1 - CAP_H),
          pos(2, 0),
          color(0, 183, 219),
          outline(1, rgb(84, 56, 71)),
        ])

        // Top Cap (At the bottom of the top pipe)
        pipeTop.add([
          rect(CAP_W, CAP_H),
          pos(0, h1 - CAP_H),
          color(0, 183, 219),
          outline(1, rgb(84, 56, 71)),
        ])

        // --- BOTTOM PIPE ---
        const pipeBottom = add([
          pos(width(), h1 + PIPE_OPEN),
          // Area covers the full width of the cap and total height
          area({ shape: new Rect(vec2(0, 0), CAP_W, CAP_H + h2) }),
          move(LEFT, SPEED),
          offscreen({ destroy: true }),
          'pipe',
          { passed: false },
        ])

        // Bottom Cap
        pipeBottom.add([
          rect(CAP_W, CAP_H),
          pos(0, 0),
          color(0, 183, 219),
          outline(1, rgb(84, 56, 71)),
        ])

        // Bottom Body (Centered: (52 - 48) / 2 = 2px offset)
        pipeBottom.add([
          rect(BODY_W, h2),
          pos(2, CAP_H),
          color(0, 183, 219),
          outline(1, rgb(84, 56, 71)),
        ])
      }

      bean.onCollide('pipe', () => {
        go('lose', score)
        play('hit')
        addKaboom(bean.pos)
      })

      // onUpdate('pipe', (p) => {
      //   if (p.pos.x + p.width <= bean.pos.x && p.passed === false) {
      //     addScore()
      //     p.passed = true
      //   }
      // })

      onUpdate('pipe', (p) => {
        // Only check pipes that have the 'passed' property (the bottom pipes)
        if (p.passed === false) {
          // Use the actual constant CAP_W (52) since p.width is undefined
          if (p.pos.x + 52 <= bean.pos.x) {
            addScore()
            p.passed = true
          }
        }
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
