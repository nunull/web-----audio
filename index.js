const keys = {
  'a': 'c3',
  's': 'c4',
  'd': 'd#4',
  'f': 'g4',
  'j': 'g#4',
  'k': 'f3',
  'l': 'g#3',
  ';': 'c5'
}

let initialized = false
let audioContext
let reverbNode
let audioFiles = []
const voices = []

// ideas:
// - gain for each module
// - drone parameters
// - looper
// - recording

render()

document.addEventListener('keydown', event => {
  if (event.repeat) return
  
  console.log('keydown', event)
  if (!initialized) {
    init()
    return
  }
  
  const voice = voices.find(v => v.key === event.key)
  if (voice) voice.attack()
  
  render()
})

document.addEventListener('keyup', event => {
  const voice = voices.find(v => v.key === event.key)
  if (voice) voice.release()
  
  render()
})

const dropElement = document.querySelector('#drop')

dropElement.addEventListener('dragover', event => {
  event.preventDefault()
  dropElement.classList.add('active')
})

dropElement.addEventListener('drop', async event => {
  console.log('drop', event)
  
  event.preventDefault()
  dropElement.classList.remove('active')
  
  init()
  
  const audioItems = Array.from(event.dataTransfer.items)
    .filter(item =>
      item.kind === 'file' && item.type.indexOf('audio/') === 0
    )
  
  const newAudioFiles = await Promise.all(audioItems.map(async item => {
    const file = item.getAsFile()
    const buffer = await file.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(buffer)
    return {
      name: file.name,
      audioBuffer
    }
  }))
  
  audioFiles = audioFiles.concat(newAudioFiles)
    
  render()
})

document.querySelector('#audio-files').addEventListener('click', event => {
  if (!event.target.classList.contains('audio-file')) return
  
  playAudioFile(event.target.innerText)
})

function init () {
  if (audioContext) return
  
  console.log('init')
  
  audioContext = new (window.AudioContext || window.webkitAudioContext)()
  reverbjs.extend(audioContext);
  
  const reverbUrl = "http://reverbjs.org/Library/LadyChapelStAlbansCathedral.m4a";
  reverbNode = audioContext.createReverbFromUrl(reverbUrl, function() {
    reverbNode.connect(audioContext.destination)
    
    initialized = true
    render()
  })
  
  const left = audioContext.createStereoPanner()
  const right = audioContext.createStereoPanner()
  left.pan.setValueAtTime(-0.5, audioContext.currentTime)
  right.pan.setValueAtTime(0.5, audioContext.currentTime)
  
  left.connect(reverbNode)
  right.connect(reverbNode)
  
  const lfos = [
    createLfo(0.12),
    createLfo(0.23),
    createLfo(4)
  ]
  
  const modIndices = {
    all: audioContext.createGain(),
    odd: audioContext.createGain(),
    even: audioContext.createGain(),
    left: audioContext.createGain(),
    right: audioContext.createGain()
  }
  
  lfos[0].createGain(1000).connect(modIndices.all.gain)
  lfos[1].createGain(1000).connect(modIndices.odd.gain)
  lfos[2].createGain(1000).connect(modIndices.even.gain)
  lfos[0].createGain(600).connect(modIndices.left.gain)
  lfos[1].createGain(600).connect(modIndices.right.gain)

  const keyNotes = Object.entries(keys)
  for (let i = 0; i < keyNotes.length; i++) {
    const [key, note] = keyNotes[i]
    const voice = createVoice(key, note)
    voices.push(voice)
    
    voice.gain.connect(i % 2 == 0 ? left : right)
    
    voice.gain.connect(modIndices.all)
    modIndices.all.connect(voice.oscillator.detune)
    
    if (i % 2 == 0) {
      voice.gain.connect(modIndices.even)
      modIndices.even.connect(voice.oscillator.detune)
    } else {
      voice.gain.connect(modIndices.odd)
      modIndices.odd.connect(voice.oscillator.detune)
    }
    
    if (i < 4) {
      voice.gain.connect(modIndices.left)
      modIndices.left.connect(voice.oscillator.detune)
    } else {
      voice.gain.connect(modIndices.right)
      modIndices.right.connect(voice.oscillator.detune)
    }
  }
}

function createLfo (frequency) {
  const oscillator = audioContext.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  oscillator.start()
  
  return {
    createGain (value) {
      const gain = audioContext.createGain()
      gain.gain.setValueAtTime(value, audioContext.currentTime)
      oscillator.connect(gain)
      return gain
    }
  }
}

function createVoice (key, note) {
  const frequency = Tonal.Note.freq(note)
  console.log(frequency)
  
  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0, audioContext.currentTime)
  
  const oscillator = audioContext.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  oscillator.start()
  
  oscillator.connect(gain)
  
  return {
    key,
    note,
    gain,
    oscillator,
    active: false,
    attack () {
      this.active = true
      gain.gain.cancelAndHoldAtTime(audioContext.currentTime)
      gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.01)
      gain.gain.linearRampToValueAtTime(0.125, audioContext.currentTime + 5)
    },
    release () {
      this.active = false
      gain.gain.cancelAndHoldAtTime(audioContext.currentTime)
      gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 3)
    }
  }
}

function playAudioFile (name) {
  const audioFile = audioFiles.find(file => file.name === name)
  if (!audioFile) return
  
  if (!audioFile.active) {
    console.log('playing', name)
    
    const sourceNode = audioContext.createBufferSource()
    sourceNode.buffer = audioFile.audioBuffer
    sourceNode.loop = true
    sourceNode.connect(reverbNode)
    sourceNode.start()
    
    audioFile.sourceNode = sourceNode
    audioFile.active = true
  } else {
    audioFile.sourceNode.stop()
    audioFile.active = false
  }
  
  render()
}

function render () {
  const droneValuesElement = document.querySelector('#drone-values')
  const voicesElement = document.querySelector('#voices')
  
  const audioPlayerValuesElement = document.querySelector('#audio-player-values')
  const audioFilesElement = document.querySelector('#audio-files')
  
  if (initialized) voicesElement.classList.remove('deactivated')
  
  droneValuesElement.innerHTML = `<div class="value">volume: 0.8</div>`
  
  voicesElement.innerHTML = ''
  for (let i = 0; i < Object.keys(keys).length; i++) {
    const key = Object.keys(keys)[i]
    const note = keys[key]
    const voice = voices[i]
    voicesElement.innerHTML += `
      <div class="voice${(voice || {}).active ? ' active' : ''}">
        <div>${key.toUpperCase()}</div>
        <div class="note">${note}</div>
      </div>`
      
    if (i === 3) {
      voicesElement.innerHTML += `<div class="spacer"></div>`
    }
  }
  
  audioPlayerValuesElement.innerHTML = `<div class="value">volume: 0.8</div>`
  
  audioFilesElement.innerHTML = ''
  for (const audioFile of audioFiles) {
    audioFilesElement.innerHTML += `
      <div class="audio-file${audioFile.active ? ' active' : ''}">${audioFile.name}
      </div>`
  }
}