/**
 * @file this is a test file
 * @author lingo(random634@163.com)
 */

let path = require('path')
let preProcess = require('./preprocess')
let generator = require('./generator')

let protoFile = path.join(__dirname, '../proto/test_proto.json')
let outputDir = path.join(__dirname, '../output')

if (process.argv[2] === 'clear') {
  generator.clear()
} else {
  if (process.argv[2] != null) {
    protoFile = process.argv[2]
  }
  if (process.argv[3] != null) {
    outputDir = process.argv[3]
  }

  preProcess.preprocess(protoFile, (data, file) => {
    let jsObj = JSON.parse(data)
    generator.generate(jsObj, outputDir)
  })
}
