const SlidingWindowMax = require('sliding-window-max')
const through = require('through2')
const Fili = require('fili/index')

const FREQ = 44100
const SAMPLES_WINDOW = FREQ * 2
const SENSITIVITY = 0.6
const MIN_PEAK_DISTANCE = FREQ / 3 //at most 3 peaks for seconds max180bpm
const MIN_ACCEPTED_PEAK = 32767 * 0.01

class MusicBeatDetector {

  constructor (options = {}) {
    this.threshold = Number.POSITIVE_INFINITY
    this.slidingWindowMax = new SlidingWindowMax(SAMPLES_WINDOW, {waitFullRange: false})
    this.pos = 0
    this.lastPeakDistance = Number.POSITIVE_INFINITY

    this.debugFilter = options.debugFilter
    this.logger = options.logger

    this.leftFilter = this.getBandFilter()
    this.rightFilter = this.getBandFilter()

    const analyzeBuffer = this.analyzeBuffer.bind(this)

    return through(function (packet, enc, cb) {
      const stream = this
      analyzeBuffer(stream, packet, cb)
    })
  }

  analyzeBuffer (stream, packet, done) {
    for (let i = 0; i < packet.length; i += 4) {
      const left = packet.readInt16LE(i)
      const filteredLeft = this.leftFilter.singleStep(left)

      if (this.isPeak(filteredLeft)) {
        stream.emit('peak', this.pos, this.bpm)
      }

      if (this.debugFilter) {
        const right = packet.readInt16LE(i + 2)
        const filteredRight = this.rightFilter.singleStep(right)

        packet.writeInt16LE(filteredLeft, i)
        packet.writeInt16LE(filteredRight, i + 2)
      }
    }

    stream.push(packet)
    done()
  }

  isPeak (sample) {
    let isPeak = false
    this.threshold = this.slidingWindowMax.evaluate(sample) * SENSITIVITY

    const overThreshold = sample > this.threshold
    const enoughTimeSinceLastPeak = this.lastPeakDistance > MIN_PEAK_DISTANCE
    const enoughVolume = sample > MIN_ACCEPTED_PEAK

    if (overThreshold && enoughTimeSinceLastPeak && enoughVolume) {
      this.bpm = Math.round(60 * FREQ / this.lastPeakDistance)
      this.lastPeakDistance = 0
      return true
    }

    if (this.logger) {
      this.logger({pos: this.pos, sample, threshold: this.threshold, lastPeakDistance: this.lastPeakDistance})
    }

    this.lastPeakDistance++
    this.pos++

    return false
  }

  getBandFilter () {
    const firCalculator = new Fili.FirCoeffs()

    const firFilterCoeffs = firCalculator.kbFilter({
      order: 101,
      Fs: FREQ,
      Fa: 20, // rise, 0 for lowpass
      Fb: 200, // fall, Fs/2 for highpass
      Att: -60 // attenuation in dB
    })

    return new Fili.FirFilter(firFilterCoeffs)
  }

}

module.exports = MusicBeatDetector