const fs = require('fs')
const path = require('path')
const lame = require('lame')
const Speaker = require('speaker')

const MusicBeatDetector = require('..')

const {FILENAME} = process.env

if (!FILENAME) throw new Error('Missing FILENAME env')

const options = {
  // logger: val => console.log(val['pos'] + ',' + val['sample'] + ',' + val['threshold'] + ',' + val['lastPeakDistance']),
  // debugFilter: true,
}

fs.createReadStream('/Users/chri/Music/One_Night_In_Bangkok/One_Night_In_Bangkok.mp3')
  .pipe(new lame.Decoder())
  .pipe(new MusicBeatDetector(options))
  .on('peak', (pos, bpm) => console.error('peak', pos, bpm))
  .pipe(new Speaker())