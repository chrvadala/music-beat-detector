const fs = require('fs')
const path = require('path')
const lame = require('lame')
const progress = require('progress-stream')
const {MusicBeatDetector, MusicGraph} = require('..')

let filename = process.argv[2]

try {
  fs.accessSync(filename, fs.constants.R_OK)
  filename = fs.realpathSync(filename)
  console.info('Analyzing ' + filename)
} catch (e) {
  console.error('The first argument should be an mp3 file. Found ' + filename)
  process.exit(1)
}

const graph = new MusicGraph(100, 600)

fs.createReadStream(filename)

  //progress bar
  .pipe(progress(
    {time: 500, length: fs.statSync(filename).size},
    progress => console.log(`Completed:${Math.round(progress.percentage)}% ETA:${progress.eta}secs`)
  ))

  //mp3 decoder
  .pipe(new lame.Decoder())

  //detect completion
  .on('end', () => {
    fs.writeFileSync('graph.svg', graph.getSVG())
  })

  //detect peaks
  .pipe(new MusicBeatDetector({
    logger: record => graph.addRecord(record),
    // debugFilter: true,
  }))

  .pipe(fs.createWriteStream('/dev/null'))
