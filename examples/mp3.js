const fs = require('fs')
const path = require('path')
const lame = require('lame')
const Speaker = require('speaker')

const {MusicBeatDetector} = require('..')

let filename = process.argv[2]

try {
  fs.accessSync(filename, fs.constants.R_OK)
  filename = fs.realpathSync(filename)
  console.info('Analyzing ' + filename)
} catch (e) {
  console.error('The first argument should be an mp3 file. Found ' + filename)
  process.exit(1)
}

fs.createReadStream(filename)
  .pipe(new lame.Decoder())
  .pipe(new MusicBeatDetector({
    // logger: val => console.log(val['sample'] + ',' + val['threshold'] + ',' + val['lastPeakDistance']),
    // debugFilter: true,
  }))
  .on('peak', (pos, bpm) => console.error('peak', pos, bpm))
  .pipe(new Speaker())