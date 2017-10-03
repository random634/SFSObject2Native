/**
 * @file do preprocess for the proto file, mainly remove the comment.
 * @author lingo(random634@163.com)
 */

let fs = require('fs');
let path = require('path');


let _doPreProcess = function (path2file, callback) {
  if (!fs.existsSync(path2file)) {
    console.error('_doPreProcess file not exist: ' + path2file);
    return;
  }

  let fsStat = fs.statSync(path2file);
  if (fsStat.isDirectory()) {
    for (let file in fs.readdirSync(path2file)) {
      _doPreProcess(path.join(path2file, file), callback);
    }
  } else if (fsStat.isFile()) {
    // remove the comment
    let commentRegEx = /\s*\/\/.*\n\s*/g;
    
    let data = fs.readFileSync(path2file, 'utf8');

    data = data.replace(commentRegEx, ' ');
    
    if (callback != null) {
      callback(data, path2file);
    }
  }
};

module.exports = {
  preprocess: _doPreProcess,
};