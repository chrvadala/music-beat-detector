const SlidingWindowMax = require('sliding-window-max')
const through = require('through2')
const Fili = require('fili/index')

const FREQ = 44100
const SAMPLES_WINDOW = FREQ * 1.5
const MIN_PEAK_DISTANCE = FREQ / 5
const MAX_INT16 = Math.pow(2, 16) / 2 - 1
const MAX_UINT32 = Math.pow(2, 32) - 1

class MusicBeatDetector {
  constructor (options = {}) {
    this.threshold = MAX_INT16
    this.lastPeakDistance = MAX_UINT32
    this.slidingWindowMax = new SlidingWindowMax(SAMPLES_WINDOW, {waitFullRange: false})
    this.pos = 0

    this.sensitivity = options.sensitivity || 0.6
    this.debugFilter = options.debugFilter
    this.plotter = options.plotter
    this.scheduler = options.scheduler
    this.minThreashold = options.minThreashold || MAX_INT16 * 0.05

    this.leftFilter = this.getBandFilter()
    this.rightFilter = this.getBandFilter()

    const analyzeBuffer = this.analyzeBuffer.bind(this)

    this.through = through(function (packet, enc, cb) {
      const stream = this
      analyzeBuffer(stream, packet, cb)
    })
  }

  getAnalyzer () {
    return this.through
  }

  analyzeBuffer (stream, packet, done) {
    for (let i = 0; i < packet.length; i += 4) {
      const left = packet.readInt16LE(i)
      const filteredLeft = this.leftFilter.singleStep(left)

      if (this.isPeak(filteredLeft)) {
        let ms = Math.round(this.pos / (FREQ / 1000))
        stream.emit('peak-detected', ms, this.bpm)
        if (this.scheduler) this.scheduler(ms)
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
    this.threshold = Math.max(
      this.slidingWindowMax.evaluate(sample) * this.sensitivity,
      this.minThreashold
    )

    const overThreshold = sample >= this.threshold
    const enoughTimeSinceLastPeak = this.lastPeakDistance > MIN_PEAK_DISTANCE

    if (overThreshold && enoughTimeSinceLastPeak) {
      this.bpm = Math.round(60 * FREQ / this.lastPeakDistance)
      this.lastPeakDistance = 0
      return true
    }

    if (this.plotter) {
      this.plotter({sample, threshold: this.threshold, lastPeakDistance: this.lastPeakDistance})
    }

    this.pos++
    this.lastPeakDistance++
    if (this.lastPeakDistance > MAX_UINT32) this.lastPeakDistance = MAX_UINT32

    return false
  }

  getBandFilter () {
    const firCalculator = new Fili.FirCoeffs()

    const firFilterCoeffs = firCalculator.lowpass({
      order: 100,
      Fs: FREQ,
      Fc: 350,
    })

    return new Fili.FirFilter(firFilterCoeffs)
  }

}

module.exports = MusicBeatDetector