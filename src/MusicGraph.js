const FREQ = 44100
const MAX_INT = 32768
const COLORS = {
  BACKGROUND: '#3e3e40',
  SAMPLE: '#009290',
  THRESHOLD: '#bd93f9',
  PEAK: '#6bf26e',
  SECS: '#d8d8d8',
}

class MusicGraph {
  constructor (secondWidth = 100, secondHeight = 300) {
    this.renderer = renderer(secondWidth, secondHeight)
    this.pos = 1
    this.addRecord = this.addRecord.bind(this)
  }

  getPlotter(){
    return this.addRecord
  }

  addRecord (record) {
    this.renderer.addRecord(this.pos, record)
    this.pos++
  }

  getSVG () {
    const root = this.renderer.getSVG()
    return stringify(root)

    function stringify ({type, children = [], ...params}) {
      const _params = Object.keys(params).map(param => `${param}="${params[param]}"`).join(' ')

      if (children.length === 0) return `<${type} ${_params}/>`

      const _children = Array.isArray(children) ? children.map(stringify).join('') : stringify(children)
      return `<${type} ${_params}>${_children}</${type}>`
    }
  }
}

function renderer (secondWidth, secondHeight) {
  const scaleY = y => (y / MAX_INT) * secondHeight
  const scaleX = pos => {
    const main = Math.floor(pos / FREQ) * secondWidth
    const sub = Math.floor(((pos % FREQ) / FREQ) * secondWidth)
    return main + sub
  }

  const _samplesRenderer = samplesRenderer(scaleX, scaleY)
  const _thresholdRenderer = thresholdRenderer(scaleX, scaleY)
  const _peaksRenderer = peaksRenderer(scaleX, scaleY)
  const _secsRenderer = secsRenderer(scaleX, scaleY)
  let curPos = undefined

  return {
    addRecord (pos, record) {
      _samplesRenderer.addRecord(pos, record)
      _thresholdRenderer.addRecord(pos, record)
      _peaksRenderer.addRecord(pos, record)
      _secsRenderer.addRecord(pos, record)
      curPos = pos
    },

    getSVG () {
      const width = Math.ceil(curPos / FREQ) * secondWidth

      return {
        type: 'svg',
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: `0 0 ${width} ${secondHeight}`,
        width,
        height: secondHeight,
        'shape-rendering': 'crisp-edges',
        children: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            width,
            height: secondHeight,
            fill: COLORS.BACKGROUND
          },
          {
            type: 'g',
            transform: `translate(0, ${secondHeight / 2}) scale(1, -1)`,
            children: [
              _secsRenderer.getSVG(),
              _samplesRenderer.getSVG(),
              _thresholdRenderer.getSVG(),
              _peaksRenderer.getSVG(),
            ]
          }
        ]
      }
    },
  }
}

function samplesRenderer (scaleX, scaleY) {
  let segments = {}
  return {
    addRecord (pos, record) {
      const x = scaleX(pos)
      if (segments[x]) {
        segments[x].min = Math.min(segments[x].min, record.sample)
        segments[x].max = Math.max(segments[x].max, record.sample)
      } else {
        segments[x] = {
          min: record.sample,
          max: record.sample,
        }
      }
    },
    getSVG () {
      return {
        type: 'g',
        'stroke-width': 1.1,
        stroke: COLORS.SAMPLE,
        children: Object.values(segments)
          .map(({max, min}, index) => ({
            type: 'line',
            x1: index,
            y1: scaleY(max),
            x2: index,
            y2: scaleY(min),
          }))
      }
    }
  }
}

function thresholdRenderer (scaleX, scaleY) {
  let curThreshold = 0
  let curPos = 0
  let lines = []
  let points = `M${scaleX(0)} ${scaleY(curThreshold)} `

  return {
    addRecord (pos, record) {
      const threshold = record.threshold
      if (threshold === curThreshold) {
        pos++
        return
      }

      points += `L${scaleX(pos)} ${scaleY(threshold)} `

      curThreshold = threshold
      curPos = pos
    },

    getSVG () {
      points += `L${scaleX(curPos)} ${scaleY(curThreshold)}`

      return {
        type: 'g',
        stroke: COLORS.THRESHOLD,
        fill: 'none',
        children: {
          type: 'path',
          d: points,
        }
      }
    }
  }
}

function secsRenderer (scaleX, scaleY) {
  let secsPos = []

  return {
    addRecord (pos, record) {
      if (pos % FREQ > 0) return
      secsPos.push(pos)
    },

    getSVG () {
      return {
        type: 'g',
        'stroke-width': 1,
        'stroke-opacity': 0.3,
        stroke: COLORS.SECS,
        children: secsPos.map(pos => ({
          type: 'line',
          x1: scaleX(pos),
          y1: scaleY(-MAX_INT),
          x2: scaleX(pos),
          y2: scaleY(MAX_INT),
        }))
      }
    }
  }
}

function peaksRenderer (scaleX, scaleY) {
  const LINE_HEIGHT = 0.8

  let peaksPos = []

  return {
    addRecord (pos, record) {
      if (record.lastPeakDistance > 0) return

      peaksPos.push({pos: pos, sample: record.sample})
    },

    getSVG () {
      return {
        type: 'g',
        'stroke-width': 0,
        transform: 'translate(0, 30)',
        stroke: COLORS.PEAK,
        fill: COLORS.PEAK,
        children: peaksPos.map(({pos, sample}) => ({
          type: 'circle',
          cx: scaleX(pos),
          cy: scaleY(sample),
          r: 4,
        }))
      }
    }
  }
}

module.exports = MusicGraph