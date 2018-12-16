const fs = require('fs')
const Speaker = require('speaker')
const createMusicStream = require('create-music-stream')

const {MusicBeatDetector, MusicBeatScheduler, MusicGraph} = require('.')

const musicSource = process.argv[2] //get the first argument on cli

//MusicGraph generates an SVG graph that displays every detected peak
const musicGraph = new MusicGraph()

//MusicBeatScheduler syncs any detected peak with the listened audio. It's useful to control some lights or any other effect
const musicBeatScheduler = new MusicBeatScheduler(pos => {
  console.log(`peak at ${pos}ms`) //do here your effect
})

//MusicBeatDetector analyzes the music
const musicBeatDetector = new MusicBeatDetector({
  plotter: musicGraph.getPlotter(),
  scheduler: musicBeatScheduler.getScheduler(),
})

//get any raw pcm_16le stream
createMusicStream(musicSource)

  //pipe on analyzer
  .pipe(musicBeatDetector.getAnalyzer())
  .on('peak-detected', (pos, bpm) => console.log(`peak-detected at ${pos}ms, detected bpm ${bpm}`))
  .on('end', () => {
    fs.writeFileSync('graph.svg', musicGraph.getSVG())
    console.log('end')
  })

  //pipe on speaker
  .pipe(new Speaker())
  .on('open', () => musicBeatScheduler.start())