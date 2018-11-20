const path = require('path')
const fs = require('fs')

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

  constructor (filename) {
    this.records = []
  }

  addRecord (record) {
    if (this.records.length >= FREQ) {

    }
  }

  end () {
  }
}

function plot (width, height, records) {
  const root = {
    type: 'svg',
    children: plotSlice(width, height, records),
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    'shape-rendering': 'optimizeSpeed',
  }

  fs.writeFileSync('prova.svg', createSVG(root))
}

function plotSlice (width, height, records) {
  return [
    {
      type: 'rect',
      x: 0,
      y: 0,
      width,
      height,
      fill: COLORS.BACKGROUND
    },
    {
      type: 'g',
      transform: `translate(0, ${height / 2}) scale(1, -1)`,
      children: [
        ...renderSeconds(width, height, records),
        ...renderSamples(width, height, records),
        ...renderThreshold(width, height, records),
        ...renderPeaks(width, height, records),
      ]
    }
  ]
}

function createSVG (root) {
  return stringify(root)

  function stringify ({type, children = [], ...params}) {
    const _params = Object.keys(params).map(param => `${param}="${params[param]}"`).join(' ')

    if (children.length === 0) return `<${type} ${_params}/>`
    const _children = Array.isArray(children) ? children.map(stringify).join('') : stringify(children)
    return `<${type} ${_params}>${_children}</${type}>`
  }
}

function renderSamples (width, height, records) {
  const rescaleSample = threshold => (threshold / MAX_INT) * height
  const rescalePos = pos => Math.round((pos / records.length) * width)

  let segments = {}
  for (let i = 0; i < records.length; i++) {
    const pos = rescalePos(i)
    if(Array.isArray(segments[pos])) {
      segments[pos].push(records[i])
    }else{
      segments[pos] = [records[i]]
    }
  }

  return Object.values(segments)
    .map(slice => {
      let max = Number.NEGATIVE_INFINITY
      let min = Number.POSITIVE_INFINITY
      let sum = 0

      slice.forEach(v => {
        max = Math.max(max, v.sample)
        min = Math.min(min, v.sample)
        sum += v.threshold
      })

      return {
        max: max,
        min: min,
        avg: sum / slice.length
      }
    })
    .map(({max, min, avg}, index) => ({
      type: 'line',
      x1: index,
      y1: rescaleSample(max),
      x2: index,
      y2: rescaleSample(min),
      'stroke-width': 1.1,
      stroke: COLORS.SAMPLE,
    }))
}

function renderThreshold (width, height, records) {
  const rescaleThreshold = threshold => (threshold / MAX_INT) * height
  const rescalePos = pos => (pos / records.length) * width

  let cur = records[0].threshold
  let curPos = 0
  let lines = []

  let points = `M0 ${rescaleThreshold(cur)} `

  for (let i = 1; i < records.length; i++) {
    const threshold = records[i].threshold
    if (threshold === cur) continue

    points += `L${rescalePos(i)} ${rescaleThreshold(threshold)} `

    cur = threshold
    curPos = i
  }

  points += `L${width} ${rescaleThreshold(cur)}`

  return [{
    type: 'path',
    d: points,
    stroke: COLORS.THRESHOLD,
    fill: 'none',

  }]
}

function renderSeconds (width, height, records) {
  const rescalePos = pos => (pos * FREQ / records.length) * width

  const secs = records.length / FREQ
  let lines = []

  for (let i = 0; i < secs; i++) {
    lines.push({
      type: 'line',
      x1: rescalePos(i),
      y1: -height * 0.5,
      x2: rescalePos(i),
      y2: height * 0.5,
      'stroke-width': 1,
      'stroke-opacity': 0.3,
      stroke: COLORS.SECS,
    })
  }
  return lines
}

function renderPeaks (width, height, records) {
  const rescalePos = pos => (pos / records.length) * width
  const LINE_HEIGHT = 0.8

  let lines = []

  for (let i = 0; i < records.length; i++) {
    if (records[i].lastPeakDistance > 0) continue

    lines.push({
      type: 'line',
      x1: rescalePos(i),
      y1: -height * 0.5 * LINE_HEIGHT,
      x2: rescalePos(i),
      y2: height * 0.5 * LINE_HEIGHT,
      'stroke-width': 1,
      'stroke-opacity': 0.3,
      stroke: COLORS.PEAK,
    })
  }

  return lines
}

module.exports = MusicGraph

let dataset = fs
  .readFileSync('minOK.csv')
  .toString()
  .trim()
  .split('\n')
  .slice(FREQ + 2000, FREQ * +2000 + FREQ)
  .map(v => v.split(',').map(v => parseInt(v)))
  .map(v => ({
    pos: parseFloat(v[0]),
    sample: parseFloat(v[1]),
    threshold: parseFloat(v[2]),
    lastPeakDistance: parseFloat(v[3])
  }))

plot(4410, 600, dataset)
