let fs = require('fs');
let path = require('path');

function mkdir(dir, mode){
    try{
        fs.mkdirSync(dir, mode);
    }
    catch(e){
        if(e.errno === 34){
            mkdir(path.dirname(dir), mode);
            mkdir(dir, mode);
        }
    }
}

module.exports = {
  mkdir: mkdir,
}