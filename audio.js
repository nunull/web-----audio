const audio = {
  context: null,
  reverbNode: null,
  droneGainLeft: null,
  droneGainRight: null,
  audioPlayerGain: null,
  voices: [],
  
  setAttack (value) {
    this.voices.forEach(voice => {
      voice.attackValue = value
    })
  },

  setRelease (value) {
    this.voices.forEach(voice => {
      voice.releaseValue = value
    })
  },
  
  init (voices) {
    if (this.context) {
      this.context.resume()
      return
    }
    
    console.log('use `audio.setAttack(value)`')
    console.log('use `audio.setRelease(value)`')
    
    console.log('init')
    
    this.context = new (window.AudioContext || window.webkitAudioContext)()
    reverbjs.extend(this.context);
    
    this.reverbNode = this.context.createReverbFromUrl('LadyChapelStAlbansCathedral.m4a', () => {
      this.reverbNode.connect(this.context.destination)
      
      app.onInitialized()
    })
    
    const left = this.context.createStereoPanner()
    const right = this.context.createStereoPanner()
    left.pan.setValueAtTime(-0.5, this.context.currentTime)
    right.pan.setValueAtTime(0.5, this.context.currentTime)
    
    left.connect(this.reverbNode)
    right.connect(this.reverbNode)
    
    const lfos = [
      this.createLfo(0.12),
      this.createLfo(0.23),
      this.createLfo(4)
    ]
    
    const modIndices = {
      all: this.context.createGain(),
      odd: this.context.createGain(),
      even: this.context.createGain(),
      left: this.context.createGain(),
      right: this.context.createGain()
    }
    
    lfos[0].createGain(1000).connect(modIndices.all.gain)
    lfos[1].createGain(1000).connect(modIndices.odd.gain)
    lfos[2].createGain(1000).connect(modIndices.even.gain)
    lfos[0].createGain(600).connect(modIndices.left.gain)
    lfos[1].createGain(600).connect(modIndices.right.gain)
    
    droneGainLeft = this.context.createGain()
    droneGainLeft.gain.setValueAtTime(0.8, this.context.currentTime)
    droneGainLeft.connect(left)
    
    droneGainRight = this.context.createGain()
    droneGainRight.gain.setValueAtTime(0.8, this.context.currentTime)
    droneGainRight.connect(right)
    
    audioPlayerGain = this.context.createGain()
    audioPlayerGain.gain.setValueAtTime(0.8, this.context.currentTime)
    audioPlayerGain.connect(this.reverbNode)

    for (let i = 0; i < app.drone.voices.length; i++) {
      const voice_ = app.drone.voices[i]
      if (!voice_.key) continue
      
      const voice = this.createVoice(voice_.key, voice_.note)
      this.voices.push(voice)
      
      voice.gain.connect(i % 2 == 0 ? droneGainLeft : droneGainRight)
      
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
  },
  
  playFile (buffer) {
    const sourceNode = audio.context.createBufferSource()
    sourceNode.buffer = buffer
    sourceNode.loop = true
    sourceNode.connect(audioPlayerGain)
    sourceNode.start()
    
    return sourceNode
  },
  
  onParamChange (param) {
    const droneVolume = app.drone.params.find(param => param.name === 'volume')
    // const reverb = app.drone.params.find(param => param.name === 'reverb')
    // const tone = app.drone.params.find(param => param.name === 'volume')
    
    droneGainLeft.gain.linearRampToValueAtTime(droneVolume.value, this.context.currentTime + 0.2)
    droneGainRight.gain.linearRampToValueAtTime(droneVolume.value, this.context.currentTime + 0.2)
    
    const audioPlayerVolume = app.audioPlayer.params.find(param => param.name === 'volume')
    
    audioPlayerGain.gain.linearRampToValueAtTime(audioPlayerVolume.value, this.context.currentTime + 0.2)
  },
  
  // createGain (value) {
  //   const gain = this.context.createGain()
  //   gain.setValueAtTime(value, this.context.currentTime)
  //   return gain
  // },
  
  createLfo (frequency) {
    const context = this.context
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime)
    oscillator.start()
    
    return {
      createGain (value) {
        const gain = context.createGain()
        gain.gain.setValueAtTime(value, context.currentTime)
        oscillator.connect(gain)
        return gain
      }
    }
  },

  createVoice (key, note) {
    const frequency = Tonal.Note.freq(note)
    console.log(frequency)
    
    const gain = this.context.createGain()
    gain.gain.setValueAtTime(0, this.context.currentTime)
    
    const oscillator = this.context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime)
    oscillator.start()
    
    oscillator.connect(gain)
    
    // TODO
    const context = this.context
    
    return {
      attackValue: 3,
      releaseValue: 3,
      key,
      note,
      gain,
      oscillator,
      attack () {
        // gain.gain.cancelAndHoldAtTime(context.currentTime)
        gain.gain.cancelScheduledValues(context.currentTime)
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.01)
        gain.gain.linearRampToValueAtTime(0.125, context.currentTime + this.attackValue)
      },
      release () {
        // gain.gain.cancelAndHoldAtTime(context.currentTime)
        gain.gain.cancelScheduledValues(context.currentTime)
        gain.gain.linearRampToValueAtTime(0, context.currentTime + this.releaseValue)
      }
    }
  }
}

