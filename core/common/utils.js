let fs = require('fs')
let path = require('path')

module.exports = {
  mkdir: mkdir,
  deldir: deldir,
  strfmt: strfmt,
  delcomment: delcomment
}

// make a dir
function mkdir (dir) {
  if (fs.existsSync(dir)) {
    return
  }

  let dirParent = path.dirname(dir)

  if (fs.existsSync(dirParent)) {
    fs.mkdirSync(dir)
  } else {
    mkdir(dirParent)
    fs.mkdirSync(dir)
  }
}

// delete a dir
function deldir (dir) {
  if (!fs.existsSync(dir)) {
    return
  }

  if (fs.statSync(dir).isDirectory()) {
    let files = fs.readdirSync(dir)
    for (let i = 0; i < files.length; i++) {
      deldir(path.join(dir, files[i]))
    }
    fs.rmdirSync(dir)
  } else {
    fs.unlinkSync(dir)
  }
}

// string strfmt
function strfmt (fmt, args) {
  let retStr = ''
  if (arguments.length === 0) {
    return retStr
  }

  retStr = arguments[0]
  for (let i = 1; i < arguments.length; i++) {
    let re = new RegExp('\\{' + (i - 1) + '\\}', 'gm')
    retStr = retStr.replace(re, arguments[i])
  }
  return retStr
}

// delete the comment of str
function delcomment (inStr) {
  let outStr = ''
  if (inStr == null) {
    return outStr
  }

  let commentRegExp = /\s*\/\/.*\n\s*/g
  outStr = inStr.replace(commentRegExp, '')

  return outStr
}
