const app = new Vue({
  el: '#app',
  data: {
    activeParam: null,
    drone: {
      params: {
        volume: 1,
        attack: 1,
        release: 1
      },
      keys: 'qweruiopasdfjkl;zxcvnm,.'.split(''),
      notes: [
        'c2', 'c3', 'd#3', 'g3',
        'g#3', 'f2', 'g#2', 'c4',
        
        'c3', 'c4', 'd#4', 'g4',
        'g#4', 'f3', 'g#3', 'c5',
        
        'c4', 'c5', 'd#5', 'g5',
        'g#5', 'f4', 'g#4', 'c6'
      ],
      activeKeys: []
    },
    audioPlayer: {
      params: {
        volume: 0.8
      },
      files: []
    },
    audio: {
      initialized: false
    },
    modal: {
      name: null
    }
  },
  
  computed: {
    params () {
      const paramsList = []
      for (const key in this.drone.params) {
        paramsList.push({ module: 'drone', key, value: this.drone.params[key] })
      }
      
      for (const key in this.audioPlayer.params) {
        paramsList.push({ module: 'audioPlayer', key, value: this.audioPlayer.params[key] })
      }
      
      return paramsList
    },
    
    voices () {
      const voices = []
      for (let i = 0; i < this.drone.keys.length; i++) {
        const key = this.drone.keys[i]
        const note = this.drone.notes[i]
        
        voices.push({ type: 'voice', key, note })
        
        if (i % 8 == 7) voices.push({ type: 'break' })
        else if (i % 4 == 3) voices.push({ type: 'space' })
      }
      
      return voices
    }
  },
  
  methods: {
    init () {
      if (app.audio.initialized) return
      
      this.showModal('initializing')
      this.activeParam = this.params[0]
      audio.init()
    },
    
    onInitialized () {
      app.audio.initialized = true
      this.hideModal()
    },
    
    isKeyActive (key) {
      return this.drone.activeKeys.indexOf(key) !== -1
    },
    
    isParamActive (module, key) {
      if (!this.activeParam) return false
      return this.activeParam.module === module && this.activeParam.key === key
    },
    
    playVoice (key) {
      if (!app.audio.initialized) return  
      
      const voice = audio.voices.find(v => v.key === key)
      if (!voice) return
      
      this.drone.activeKeys.push(key)
      voice.attack()
    },
    
    stopVoice (key) {
      if (!app.audio.initialized) return
      
      const voice = audio.voices.find(v => v.key === key)
      if (!voice) return
      
      const activeKeyIndex = this.drone.activeKeys.indexOf(key)
      this.drone.activeKeys.splice(activeKeyIndex, 1)
      voice.release()
    },
    
    playFile (file) {
      if (!app.audio.initialized) return
      
      if (!file.active) {
        console.log('playing', file.name)
        
        file.sourceNode = audio.playFile(file.audioBuffer)
        file.active = true
      } else {
        console.log('stopping', file.name)
        
        file.sourceNode.stop()
        file.active = false
      }
    },
    
    selectNextParam () {
      const currentParam = this.params.find(p =>
        p.module === this.activeParam.module && p.key === this.activeParam.key)
      const currentIndex = this.params.indexOf(currentParam)
      const nextIndex = (currentIndex + 1) % this.params.length
      
      this.activeParam = this.params[nextIndex]
    },
    
    selectPreviousParam () {
      const currentParam = this.params.find(p =>
        p.module === this.activeParam.module && p.key === this.activeParam.key)
      const currentIndex = this.params.indexOf(currentParam)
      const previousIndex = currentIndex === 0 ? this.params.length - 1 : currentIndex - 1
      
      this.activeParam = this.params[previousIndex]
    },
    
    increaseCurrentParam () {
      const params = this[this.activeParam.module].params
      const key = this.activeParam.key
      
      params[key] = Math.min(1, params[key] + 0.1)
      params[key] = Math.round(params[key] * 10) / 10
      
      audio.onParamChange()
    },
    
    decreaseCurrentParam () {
      const params = this[this.activeParam.module].params
      const key = this.activeParam.key
      
      params[key] = Math.max(0, params[key] - 0.1)
      params[key] = Math.round(params[key] * 10) / 10
      
      audio.onParamChange()
    },
    
    showModal (name) {
      this.modal.name = name
    },
    
    hideModal () {
      this.modal.name = null
    }
  }
})

app.showModal('start')

document.addEventListener('keydown', event => {
  console.log('keydown', event)
  
  switch (event.key) {
    case 'Tab':
      event.preventDefault()
      if (!event.shiftKey) app.selectNextParam()
      else app.selectPreviousParam()
      return
    case 'ArrowUp':
    case 'ArrowRight':
      event.preventDefault()
      app.increaseCurrentParam()
      return
    case 'ArrowDown':
    case 'ArrowLeft':
      event.preventDefault()
      app.decreaseCurrentParam()
      return
  }
  
  if (event.repeat) return
  
  app.init()

  app.playVoice(event.key)
})

document.addEventListener('keyup', event => {
  app.stopVoice(event.key)
})

document.addEventListener('dragover', event => {
  event.preventDefault()
  app.showModal('drop')
})

document.addEventListener('drop', async event => {
  console.log('drop', event)
  
  event.preventDefault()
  app.hideModal()
  app.init()
  
  const audioItems = Array.from(event.dataTransfer.items)
    .filter(item => item.kind === 'file' && item.type.indexOf('audio/') === 0)
  
  const newAudioFiles = await Promise.all(audioItems.map(async item => {
    const file = item.getAsFile()
    const buffer = await file.arrayBuffer()
    const audioBuffer = await audio.context.decodeAudioData(buffer)
    
    return {
      name: file.name,
      audioBuffer,
      active: false
    }
  }))
  
  app.audioPlayer.files = app.audioPlayer.files.concat(newAudioFiles)
})