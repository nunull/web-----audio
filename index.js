// document.querySelector('#init').addEventListener('click', () => {
//   const AudioContext = window.AudioContext || window.webkitAudioContext
//
//   const audioContext = new AudioContext()
//
//   const oscillator = audioContext.createOscillator()
//
//   oscillator.type = 'triangle'
//   oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
//   oscillator.connect(audioContext.destination)
//   oscillator.start()
// })

const nodes = [{
  selected: true,
  type: 'osc',
  x: 0,
  y: 0
}, {
  type: 'osc',
  x: 1,
  y: 0
}, {
  type: 'osc',
  x: 2,
  y: 0
}, {
  type: 'lpf',
  x: 0,
  y: 1
}]

function selectNode (incX, incY) {
  const selectedNode = nodes.find(n => n.selected)
  if (!selectedNode) return

  const x = selectedNode.x + incX
  const y = selectedNode.y + incY

  const nextNode = nodes.find(n => n.x === x && n.y === y)
  if (!nextNode) return

  selectedNode.selected = false
  nextNode.selected = true

  draw()
}

const keymap = {
  'ArrowRight': () => selectNode(1, 0),
  'ArrowLeft': () => selectNode(-1, 0),
  'ArrowDown': () => selectNode(0, 1),
  'ArrowUp': () => selectNode(0, -1)
}

document.addEventListener('keydown', event => {
  const handler = keymap[event.key]
  if (!handler) return

  handler()
})

const canvas = document.querySelector('#patcher')
const context = canvas.getContext('2d')
const scale = 2
canvas.width = 600 * scale
canvas.height = 400 * scale

draw()

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height)

  context.lineWidth = 1
  context.lineJoin = 'miter'

  // context.fillStyle = '#f00'
  for (const node of nodes) {
    context.strokeStyle = node.selected ? '#0a0' : '#fff'
    // context.fillRect(2+node.x*50, 2+node.y*30, 40, 20)
    context.strokeRect(2+node.x*100, 2+node.y*50, 90, 40)
  }
}

