# music-beat-detector

**music-beat-detector** is a library that analyzes a music stream and detects any beat. It can be used to control lights or any magic effect by the music wave.

[![npm](https://img.shields.io/npm/v/create-music-stream.svg?maxAge=2592000?style=plastic)](https://www.npmjs.com/package/create-music-stream)
[![Downloads](https://img.shields.io/npm/dm/create-music-stream.svg)](https://www.npmjs.com/package/create-music-stream)
[![Donate](https://img.shields.io/badge/donate-PayPal-green.svg)](https://www.paypal.me/chrvadala/25)

Bundled with this library there are three components:
- `MusicBeatDetector` is able to analyze any PCM 16bit Little Endian audio stream. It detects music peaks and realtime bpm.
- `MusicBeatScheduler` is able to sync any detected peak with the listened audio. It's useful to control some lights or any other effect.
- `MusicGraph` generates an SVG graph that displays every detected peak. It's useful to tune the peak detection.


## Example
```javascript
const fs = require('fs')
const Speaker = require('speaker')
const createMusicStream = require('create-music-stream')
const {MusicBeatDetector, MusicBeatScheduler, MusicGraph} = require('music-beat-detector')

const musicSource = process.argv[2] //get the first argument on cli

const musicGraph = new MusicGraph(100, 600)

const musicBeatScheduler = new MusicBeatScheduler(pos => {
  console.log(`peak at ${pos}ms`) // your music effect goes here
})

const musicBeatDetector = new MusicBeatDetector({
  plotter: musicGraph.getPlotter(),
  scheduler: musicBeatScheduler.getScheduler(),
})

createMusicStream(musicSource)
  .pipe(musicBeatDetector.getAnalyzer())
  .on('peak-detected', (pos, bpm) => console.log(`peak-detected at ${pos}ms, detected bpm ${bpm}`))
  .on('end', () => {
    fs.writeFileSync('graph.svg', musicGraph.getSVG())
    console.log('end')
  })

  .pipe(new Speaker())
  .on('open', () => musicBeatScheduler.start())
```
### Usage
You can play any music sound supported by the library [create-music-stream](https://github.com/chrvadala/create-music-stream). 
*Note: The beat detection performs better on mp3 files then YouTube videos.*
```javascript
node example.js ./track.mp3
node example.js https://www.youtube.com/watch?v=qeMFqkcPYcg
node example.js https://www.youtube.com/watch?v=Zi_XLOBDo_Y
node example.js https://www.youtube.com/watch?v=n_GFN3a0yj0
node example.js https://www.youtube.com/watch?v=59Q_lhgGANc
```

## Contributors
- [chrvadala](https://github.com/chrvadala) (author)

## Beat detection visualized
![music-beat-detector](https://github.com/chrvadala/music-beat-detector/blob/master/example-graph.png?raw=true)
