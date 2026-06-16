export interface ReverbParams {
  wet: number
  decay: number
}

export interface DelayParams {
  wet: number
  delayTime: number
  feedback: number
}

export interface FilterParams {
  wet: number
  frequency: number
  Q: number
  type: BiquadFilterType
}

export interface EffectChain {
  reverb: { enabled: boolean; params: ReverbParams; node: ConvolverNode | null; wetGain: GainNode | null; dryGain: GainNode | null }
  delay: { enabled: boolean; params: DelayParams; node: DelayNode | null; feedbackGain: GainNode | null; wetGain: GainNode | null; dryGain: GainNode | null }
  filter: { enabled: boolean; params: FilterParams; node: BiquadFilterNode | null; wetGain: GainNode | null; dryGain: GainNode | null }
}

export class EffectNode {
  private context: AudioContext
  public chain: EffectChain
  public input: GainNode
  public output: GainNode

  constructor(context: AudioContext) {
    this.context = context
    this.input = context.createGain()
    this.output = context.createGain()

    this.chain = {
      reverb: { enabled: false, params: { wet: 0.3, decay: 2 }, node: null, wetGain: null, dryGain: null },
      delay: { enabled: false, params: { wet: 0.3, delayTime: 0.5, feedback: 0.3 }, node: null, feedbackGain: null, wetGain: null, dryGain: null },
      filter: { enabled: false, params: { wet: 0.5, frequency: 2000, Q: 1, type: 'lowpass' }, node: null, wetGain: null, dryGain: null },
    }

    this.initEffects()
    this.connectChain()
  }

  private async createReverbImpulse(decay: number): Promise<AudioBuffer> {
    const sampleRate = this.context.sampleRate
    const length = sampleRate * decay
    const impulse = this.context.createBuffer(2, length, sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
      }
    }
    
    return impulse
  }

  private async initEffects() {
    this.chain.reverb.node = this.context.createConvolver()
    this.chain.reverb.wetGain = this.context.createGain()
    this.chain.reverb.dryGain = this.context.createGain()
    this.chain.reverb.wetGain.gain.value = this.chain.reverb.params.wet
    this.chain.reverb.dryGain.gain.value = 1 - this.chain.reverb.params.wet
    this.chain.reverb.node.buffer = await this.createReverbImpulse(this.chain.reverb.params.decay)

    this.chain.delay.node = this.context.createDelay(5)
    this.chain.delay.feedbackGain = this.context.createGain()
    this.chain.delay.wetGain = this.context.createGain()
    this.chain.delay.dryGain = this.context.createGain()
    this.chain.delay.node.delayTime.value = this.chain.delay.params.delayTime
    this.chain.delay.feedbackGain.gain.value = this.chain.delay.params.feedback
    this.chain.delay.wetGain.gain.value = this.chain.delay.params.wet
    this.chain.delay.dryGain.gain.value = 1 - this.chain.delay.params.wet
    this.chain.delay.node.connect(this.chain.delay.feedbackGain)
    this.chain.delay.feedbackGain.connect(this.chain.delay.node)

    this.chain.filter.node = this.context.createBiquadFilter()
    this.chain.filter.wetGain = this.context.createGain()
    this.chain.filter.dryGain = this.context.createGain()
    this.chain.filter.node.type = this.chain.filter.params.type
    this.chain.filter.node.frequency.value = this.chain.filter.params.frequency
    this.chain.filter.node.Q.value = this.chain.filter.params.Q
    this.chain.filter.wetGain.gain.value = this.chain.filter.params.wet
    this.chain.filter.dryGain.gain.value = 1 - this.chain.filter.params.wet

    this.connectChain()
  }

  private connectChain() {
    let currentNode: AudioNode = this.input

    if (this.chain.filter.enabled && this.chain.filter.node && this.chain.filter.wetGain && this.chain.filter.dryGain) {
      const split = this.context.createGain()
      currentNode.connect(split)
      split.connect(this.chain.filter.node)
      split.connect(this.chain.filter.dryGain)
      this.chain.filter.node.connect(this.chain.filter.wetGain)
      
      const merge = this.context.createGain()
      this.chain.filter.wetGain.connect(merge)
      this.chain.filter.dryGain.connect(merge)
      currentNode = merge
    }

    if (this.chain.delay.enabled && this.chain.delay.node && this.chain.delay.wetGain && this.chain.delay.dryGain) {
      const split = this.context.createGain()
      currentNode.connect(split)
      split.connect(this.chain.delay.node)
      split.connect(this.chain.delay.dryGain)
      this.chain.delay.node.connect(this.chain.delay.wetGain)
      
      const merge = this.context.createGain()
      this.chain.delay.wetGain.connect(merge)
      this.chain.delay.dryGain.connect(merge)
      currentNode = merge
    }

    if (this.chain.reverb.enabled && this.chain.reverb.node && this.chain.reverb.wetGain && this.chain.reverb.dryGain) {
      const split = this.context.createGain()
      currentNode.connect(split)
      split.connect(this.chain.reverb.node)
      split.connect(this.chain.reverb.dryGain)
      this.chain.reverb.node.connect(this.chain.reverb.wetGain)
      
      const merge = this.context.createGain()
      this.chain.reverb.wetGain.connect(merge)
      this.chain.reverb.dryGain.connect(merge)
      currentNode = merge
    }

    currentNode.connect(this.output)
  }

  public setReverbEnabled(enabled: boolean) {
    this.chain.reverb.enabled = enabled
    this.connectChain()
  }

  public setReverbParams(params: Partial<ReverbParams>) {
    this.chain.reverb.params = { ...this.chain.reverb.params, ...params }
    if (this.chain.reverb.wetGain && this.chain.reverb.dryGain) {
      this.chain.reverb.wetGain.gain.value = this.chain.reverb.params.wet
      this.chain.reverb.dryGain.gain.value = 1 - this.chain.reverb.params.wet
    }
    if (params.decay && this.chain.reverb.node) {
      this.createReverbImpulse(params.decay).then(buffer => {
        if (this.chain.reverb.node) {
          this.chain.reverb.node.buffer = buffer
        }
      })
    }
  }

  public setDelayEnabled(enabled: boolean) {
    this.chain.delay.enabled = enabled
    this.connectChain()
  }

  public setDelayParams(params: Partial<DelayParams>) {
    this.chain.delay.params = { ...this.chain.delay.params, ...params }
    if (this.chain.delay.node) {
      this.chain.delay.node.delayTime.value = this.chain.delay.params.delayTime
    }
    if (this.chain.delay.feedbackGain) {
      this.chain.delay.feedbackGain.gain.value = this.chain.delay.params.feedback
    }
    if (this.chain.delay.wetGain && this.chain.delay.dryGain) {
      this.chain.delay.wetGain.gain.value = this.chain.delay.params.wet
      this.chain.delay.dryGain.gain.value = 1 - this.chain.delay.params.wet
    }
  }

  public setFilterEnabled(enabled: boolean) {
    this.chain.filter.enabled = enabled
    this.connectChain()
  }

  public setFilterParams(params: Partial<FilterParams>) {
    this.chain.filter.params = { ...this.chain.filter.params, ...params }
    if (this.chain.filter.node) {
      if (params.type) this.chain.filter.node.type = params.type
      if (params.frequency !== undefined) this.chain.filter.node.frequency.value = params.frequency
      if (params.Q !== undefined) this.chain.filter.node.Q.value = params.Q
    }
    if (this.chain.filter.wetGain && this.chain.filter.dryGain) {
      this.chain.filter.wetGain.gain.value = this.chain.filter.params.wet
      this.chain.filter.dryGain.gain.value = 1 - this.chain.filter.params.wet
    }
  }

  public disconnect() {
    this.input.disconnect()
    this.output.disconnect()
    Object.values(this.chain).forEach(effect => {
      if (effect.node) effect.node.disconnect()
      if ('wetGain' in effect && effect.wetGain) effect.wetGain.disconnect()
      if ('dryGain' in effect && effect.dryGain) effect.dryGain.disconnect()
      if ('feedbackGain' in effect && effect.feedbackGain) effect.feedbackGain.disconnect()
    })
  }
}
