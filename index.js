const app = new Vue({
  el: '#app',
  data: {
    drone: {
      params: [{
        module: 'drone',
        name: 'volume',
        value: 0.8,
        active: true
      // }, {
      //   module: 'drone',
      //   name: 'reverb',
      //   value: 0.8,
      //   active: false
      // }, {
      //   module: 'drone',
      //   name: 'tone',
      //   value: 0.2,
      //   active: false
      }],
      voices: [{
        key: 'a',
        note: 'c3',
        active: false
      }, {
        key: 's',
        note: 'c4',
        active: false
      }, {
        key: 'd',
        note: 'd#4',
        active: false
      }, {
        key: 'f',
        note: 'g4',
        active: false
      }, {
        
      }, {
        key: 'j',
        note: 'g#4',
        active: false
      }, {
        key: 'k',
        note: 'f3',
        active: false
      }, {
        key: 'l',
        note: 'g#3',
        active: false
      }, {
        key: ';',
        note: 'c5',
        active: false
      }]
    },
    audioPlayer: {
      params: [{
        module: 'audioPlayer',
        name: 'volume',
        value: 0.8,
        active: false
      // }, {
      //   module: 'audioPlayer',
      //   name: 'reverb',
      //   value: 0.8,
      //   active: false
      }],
      files: []
    },
    audio: {
      initialized: false
    },
    modal: {
      name: null
    }
  },
  methods: {
    init () {
      if (!app.audio.initialized) this.showModal('initializing')
      
      audio.init()
    },
    
    onInitialized () {
      app.audio.initialized = true
      this.hideModal()
    },
    
    playVoice (key) {
      if (!app.audio.initialized) return  
      
      const voice_ = this.drone.voices.find(v => v.key === key)
      if (!voice_) return
      
      const voice = audio.voices.find(v => v.key === key)
      
      voice_.active = true
      voice.attack()
    },
    
    stopVoice (key) {
      if (!app.audio.initialized) return
      
      const voice_ = this.drone.voices.find(v => v.key === key)
      if (!voice_) return
      
      const voice = audio.voices.find(v => v.key === key)
      
      voice_.active = false
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
      const params = this.drone.params.concat(this.audioPlayer.params)
      const currentParam = params.find(param => param.active)
      const currentIndex = params.indexOf(currentParam)
      const nextIndex = (currentIndex + 1) % params.length
      const nextParam = params[nextIndex]
      
      currentParam.active = false
      nextParam.active = true
    },
    
    increaseCurrentParam () {
      const params = this.drone.params.concat(this.audioPlayer.params)
      const currentParam = params.find(param => param.active)
      
      currentParam.value = Math.min(1, currentParam.value + 0.1)
      currentParam.value = Math.round(currentParam.value * 10) / 10
      
      audio.onParamChange(currentParam)
    },
    
    decreaseCurrentParam () {
      const params = this.drone.params.concat(this.audioPlayer.params)
      const currentParam = params.find(param => param.active)
      
      currentParam.value = Math.max(0, currentParam.value - 0.1)
      currentParam.value = Math.round(currentParam.value * 10) / 10
      
      audio.onParamChange(currentParam)
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
  switch (event.key) {
    case 'Tab':
      event.preventDefault()
      app.selectNextParam()
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