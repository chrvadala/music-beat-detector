const carlo = require('carlo')
const path = require('path')
const fs = require('fs')

const data = [];

(async () => {

  let dataset = fs
    .readFileSync(process.env.FILENAME)
    .toString()
    .trim()
    .split('\n')
    .map(v => v.split(','))
    .map(v => ({
      pos: parseFloat(v[0]),
      sample: parseFloat(v[1]),
      threshold: parseFloat(v[2]),
      lastPeakDistance: parseFloat(v[3])
    }))


  const app = await carlo.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google\ Chrome'
  })

  app.serveFolder(path.join(__dirname, '../gui'))

  app.on('exit', () => {
    console.info('Closed by GUI')
    process.exit()
  })

  await app.exposeFunction('getData', _ => dataset)
  await app.load('index.html')

})().catch(console.error)
