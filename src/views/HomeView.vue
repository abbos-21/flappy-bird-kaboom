<script setup lang="ts">
import { ref, onMounted } from 'vue'
import kaboom from 'kaboom'

const canvas = ref<HTMLCanvasElement | null>(null)

// onMounted(() => {
//   if (canvas.value) {
//     kaplay({
//       width: 200,
//       height: 200,
//       background: '#d46eb3',
//       scale: 2,
//       canvas: canvas.value,
//     })

//     const obj = add([
//       rect(32, 32), // Draw this object as a rectangle
//       pos(10, 20), // Position this object in X: 10 and Y: 20
//       'shape', // Classify this object as "shape"
//     ])

//     onKeyDown('right', () => {
//       obj.move(200, 0) // Move the object while "right" key is held down [!code highlight]
//     })

//     onKeyDown('left', () => {
//       obj.move(-200, 0) // Move the object while "right" key is held down [!code highlight]
//     })
//   }
// })

onMounted(() => {
  if (canvas.value) {
    kaboom({
      width: window.innerWidth,
      height: window.innerHeight,
      // letterbox: true,
      canvas: canvas.value,
    })

    loadSprite('bean', '/redbird-midflap.png')
    loadSprite('background-day', '/background-day.png')
    loadSprite('pipe', '/pipe-green.png')
    loadSound('score', '/examples/sounds/score.mp3')
    loadSound('wooosh', '/examples/sounds/wooosh.mp3')
    loadSound('hit', '/examples/sounds/hit.mp3')

    // define gravity
    setGravity(3200)

    scene('game', () => {
      const PIPE_OPEN = 180
      const PIPE_MIN = 60
      const JUMP_FORCE = 800
      const SPEED = 320
      const CEILING = -60

      const bg = add([sprite('background-day'), pos(0, 0), fixed(), z(-1)])

      // Calculate scale to cover entire canvas (may crop image)
      const scaleX = width() / bg.width
      const scaleY = height() / bg.height
      bg.scale = Math.max(scaleX, scaleY)

      // a game object consists of a list of components and tags
      const bean = add([
        // sprite() means it's drawn with a sprite of name "bean" (defined above in 'loadSprite')
        sprite('bean'),
        // give it a position
        pos(width() / 4, 0),
        // give it a collider
        area(),
        // body component enables it to fall and jump in a gravity world
        body(),
      ])

      // check for fall death
      bean.onUpdate(() => {
        if (bean.pos.y >= height() || bean.pos.y <= CEILING) {
          // switch to "lose" scene
          go('lose', score)
        }
      })

      // jump
      onKeyPress('space', () => {
        bean.jump(JUMP_FORCE)
        play('wooosh')
      })

      onGamepadButtonPress('south', () => {
        bean.jump(JUMP_FORCE)
        play('wooosh')
      })

      // mobile
      onClick(() => {
        bean.jump(JUMP_FORCE)
        play('wooosh')
      })

      // function spawnPipe() {
      //   // calculate pipe positions
      //   const h1 = rand(PIPE_MIN, height() - PIPE_MIN - PIPE_OPEN)
      //   const h2 = height() - h1 - PIPE_OPEN

      //   add([
      //     sprite('pipe', { flipY: true }),
      //     pos(width(), 0),
      //     area(),
      //     move(LEFT, SPEED),
      //     offscreen({ destroy: true }),
      //     // give it tags to easier define behaviors see below
      //     'pipe',
      //   ])

      //   add([
      //     pos(width(), h1 + PIPE_OPEN),
      //     sprite('pipe'),
      //     // rect(64, h2),
      //     // color(0, 127, 255),
      //     // outline(4),
      //     area(),
      //     move(LEFT, SPEED),
      //     offscreen({ destroy: true }),
      //     // give it tags to easier define behaviors see below
      //     'pipe',
      //     // raw obj just assigns every field to the game obj
      //     { passed: false },
      //   ])
      // }

      // function spawnPipe() {
      //   // calculate pipe positions
      //   const h1 = rand(PIPE_MIN, height() - PIPE_MIN - PIPE_OPEN)
      //   const h2 = height() - h1 - PIPE_OPEN

      //   // Top pipe (flipped upside down)
      //   add([
      //     sprite('pipe', { flipY: true }), // Flip vertically for top pipe
      //     pos(width(), 0),
      //     anchor('botleft'), // Anchor at bottom-left so it hangs from top
      //     area(),
      //     move(LEFT, SPEED),
      //     offscreen({ destroy: true }),
      //     'pipe',
      //   ])

      //   // Bottom pipe
      //   add([
      //     sprite('pipe'),
      //     pos(width(), h1 + PIPE_OPEN),
      //     anchor('topleft'), // Anchor at top-left
      //     area(),
      //     move(LEFT, SPEED),
      //     offscreen({ destroy: true }),
      //     'pipe',
      //     { passed: false },
      //   ])
      // }

      function spawnPipe() {
        // Random height for the gap start (position of bottom pipe's top)
        const gapY = rand(PIPE_MIN + 100, height() - PIPE_MIN - PIPE_OPEN - 100) // Add some padding to avoid extreme positions

        // Top pipe: flipped, anchored at bottom (opening faces down)
        add([
          sprite('pipe', { flipY: true }),
          pos(width(), gapY),
          anchor('botleft'), // Position refers to the bottom-left (opening end)
          area(),
          move(LEFT, SPEED),
          offscreen({ destroy: true }),
          'pipe',
        ])

        // Bottom pipe: normal, anchored at top (opening faces up)
        add([
          sprite('pipe'),
          pos(width(), gapY + PIPE_OPEN),
          anchor('topleft'), // Position refers to the top-left (opening end)
          area(),
          move(LEFT, SPEED),
          offscreen({ destroy: true }),
          'pipe',
          { passed: false },
        ])
      }

      // callback when bean onCollide with objects with tag "pipe"
      bean.onCollide('pipe', () => {
        go('lose', score)
        play('hit')
        addKaboom(bean.pos)
      })

      // per frame event for all objects with tag 'pipe'
      onUpdate('pipe', (p) => {
        // check if bean passed the pipe
        if (p.pos.x + p.width <= bean.pos.x && p.passed === false) {
          addScore()
          p.passed = true
        }
      })

      // spawn a pipe every 1 sec
      loop(1, () => {
        spawnPipe()
      })

      let score = 0

      // display score
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
      add([sprite('bean'), pos(width() / 2, height() / 2 - 108), scale(3), anchor('center')])

      // display score
      add([text(score), pos(width() / 2, height() / 2 + 108), scale(3), anchor('center')])

      // go back to game with space is pressed
      onKeyPress('space', () => go('game'))
      onClick(() => go('game'))
    })

    go('game')
  }
})
</script>

<template>
  <canvas ref="canvas"></canvas>
</template>
