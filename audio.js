const audio = {
  DEFAULT_ATTACK: 5,
  DEFAULT_RELEASE: 5,
  
  context: null,
  reverbNode: null,
  droneGainLeft: null,
  droneGainRight: null,
  audioPlayerGain: null,
  voices: [],
  
  init () {
    if (this.context) {
      this.context.resume()
      return
    }
    
    console.log('init')
    
    this.context = new (window.AudioContext || window.webkitAudioContext)()
    reverbjs.extend(this.context);
    
    this.reverbNode = this.context.createReverbFromUrl('assets/LadyChapelStAlbansCathedral.m4a', () => {
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

    for (let i = 0; i < app.voices.length; i++) {
      const voice_ = app.voices[i]
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
  
  onParamChange () {    
    droneGainLeft.gain.linearRampToValueAtTime(Math.pow(app.drone.params.volume, 2), this.context.currentTime + 0.2)
    droneGainRight.gain.linearRampToValueAtTime(Math.pow(app.drone.params.volume, 2), this.context.currentTime + 0.2)
    
    this.voices.forEach(voice => {
      voice.attackValue = Math.pow(app.drone.params.attack, 2) * this.DEFAULT_ATTACK
      voice.releaseValue = Math.pow(app.drone.params.release, 2) * this.DEFAULT_RELEASE
    })
    
    audioPlayerGain.gain.linearRampToValueAtTime(Math.pow(app.audioPlayer.params.volume, 2), this.context.currentTime + 0.2)
  },
  
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
      attackValue: audio.DEFAULT_ATTACK,
      releaseValue: audio.DEFAULT_RELEASE,
      key,
      note,
      gain,
      oscillator,
      attack () {
        console.log('attack', this)
        gain.gain.cancelAndHoldAtTime(context.currentTime)
        // gain.gain.cancelScheduledValues(context.currentTime)
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.01)
        gain.gain.linearRampToValueAtTime(0.125, context.currentTime + this.attackValue)
      },
      release () {
        gain.gain.cancelAndHoldAtTime(context.currentTime)
        // gain.gain.cancelScheduledValues(context.currentTime)
        gain.gain.linearRampToValueAtTime(0, context.currentTime + this.releaseValue)
      }
    }
  }
}

