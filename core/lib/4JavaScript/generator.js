let fs = require('fs');
let path = require('path');
let assert = require('assert');

let map = require('./map');
let mkdir = require('../../common/mkdir')


let _recordMacro = {};

let _generateMacros = function (data, outputDir, recordFileMap, recordMacro) {
  mkdir.mkdir(outputDir);

  if (data.__macros != null) {
    if (data.__macros.__namespace == null) {
      console.error('_generateMacros macros has no field __namespace fail.')
      return;
    }

    let outputString = '';
    let outputFile = path.join(outputDir, data.__macros.__namespace + '.js');
    if (recordFileMap[outputFile] == null) {
      // the first time access
      recordFileMap[outputFile] = 1;
      outputString += '// This is a auto generate file, don\'t change it!\n\n\n';
      outputString += 'module.exports = {}\n\n';

      if (fs.existsSync(outputFile)) {
        fs.truncateSync(outputFile);
      }
    }

    if (recordMacro[data.__macros.__namespace] == null) {
      recordMacro[data.__macros.__namespace] = {};
    }

    if (data.__macros.__defines == null) {
      return;
    }

    let dict = data.__macros.__defines;
    let keys = Object.keys(dict);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let val = dict[key];

      if (recordMacro[data.__macros.__namespace][key] != null) {
        continue;
      }
      recordMacro[data.__macros.__namespace][key] = val;

      let objString = JSON.stringify(val, null, 2);
      if (typeof val === 'object') {
        let regEx = /"(.*?)":/g;
        objString = objString.replace(regEx, "$1:");
        outputString += 'let ' + key + ' = ' + objString + ';\n';
      } else {
        outputString += 'let ' + key + ' = ' + objString + ';\n';
      }

      outputString += 'module.exports["' + key + '"] = ' + key + ';\n\n';
    }

    fs.appendFileSync(outputFile, outputString);
  }
};

/**
 * 
 * let Login_rsp_game_info = new SFS2X.SFSObject();
 * let Login_rsp_game_info_maps = new SFS2X.SFSArray();
 * if (dataIn.game_info.maps != null) {
 *   for (let Login_rsp_game_info_maps_i=0; Login_rsp_game_info_maps_i<dataIn.game_info.maps.length; Login_rsp_game_info_maps_i++) {
 *     let Login_rsp_game_info_maps_item = dataIn.game_info.maps[Login_rsp_game_info_maps_i];
 *     let MapInfoParser = require("MapInfoParser");
 *     let Login_rsp_game_info_maps_item_out = MapInfoParser.encode(Login_rsp_game_info_maps_item);
 *     Login_rsp_game_info_maps.add(Login_rsp_game_info_maps_item_out, 17);
 *   }
 * }
 * Login_rsp_game_info.put("maps", Login_rsp_game_info_maps, 18);
 * Login_rsp.put("game_info", Login_rsp_game_info, 17);
 * @param {any} key 
 * @param {any} val 
 * @param {any} inObj 
 * @param {any} outObj 
 * @param {any} indent 
 * @param {boolean} [inArray=false] 
 * @returns 
 */
function _encodeOneField(key, val, inObj, outObj, indent, inArray = false, tagMap = null) {
  let outputString = '';
  let encoder = null;
  if (Array.isArray(val)) {
    let _outObj = outObj + '_' + key;
    let _outObj_i = _outObj + '_i';
    let _outObj_item = _outObj + '_item';

    outputString += ' '.repeat(indent) + 'let ' + _outObj + ' = new SFS2X.SFSArray();\n';
    outputString += ' '.repeat(indent) + 'if (' + inObj + ' != null) {\n';
    outputString += ' '.repeat(indent + 2) + 'for (let ' + _outObj_i + '=0; ' + _outObj_i + '<' + inObj + '.length; ' + _outObj_i + '++) {\n';
    outputString += ' '.repeat(indent + 4) + 'let ' + _outObj_item + ' = ' + inObj + '[' + _outObj_i + '];\n';
    outputString += _encodeOneField(0, val[0], _outObj_item, _outObj, indent + 4, true, tagMap);
    outputString += ' '.repeat(indent + 2) + '}\n';
    outputString += ' '.repeat(indent) + '}\n';

    encoder = map.getEncoder('array');
    outputString += encoder(key, _outObj, outObj, indent, inArray);
    outputString += '\n';
  }
  else if (typeof val === 'object') {
    let _outObj = outObj + '_' + key;
    outputString += ' '.repeat(indent) + 'let ' + _outObj + ' = new SFS2X.SFSObject();\n';
    outputString += ' '.repeat(indent) + 'if (' + inObj + ' != null) {\n';
    
    let _keys = Object.keys(val);
    for (let i = 0; i < _keys.length; i++) {
      let _key = _keys[i];
      let _val = val[_key];
      let _inObj = inObj + '.' + _key;

      outputString += _encodeOneField(_key, _val, _inObj, _outObj, indent + 2, false, tagMap);
    }
    outputString += ' '.repeat(indent) + '}\n';
    
    encoder = map.getEncoder('object');
    outputString += encoder(key, _outObj, outObj, indent, inArray);
    outputString += '\n';
  } else {
    let _infos = val.split(',');
    let _type = _infos[0].trim();

    encoder = map.getEncoder(_type);
    if (encoder != null) {
      outputString += encoder(key, inObj, outObj, indent, inArray);
      if (_infos.length > 1) {
        // store tag
        outputString += ' '.repeat(indent) + tagMap + '["' + _infos[1].trim() + '"] = ' + inObj + ';\n';
      }
    } else {
      let _parser = '__' + _type + 'Parser';
      if (_infos.length > 1) {
        // use tag
        let _enums = _type.split('.');
        assert(_enums.length > 1);
        let _macroFile = _enums[0];
        let _macroType = _enums[1];
        let _macroFileName = '__' + _macroFile;
        let _macroTypeName = '__' + _macroType;
        _parser = _macroTypeName + 'Parser';

        outputString += ' '.repeat(indent) + 'let ' + _macroFileName + ' = require("' + _macroFile + '");\n';
        outputString += ' '.repeat(indent) + 'let ' + _macroTypeName + ' = ' + _macroFileName + '["' + _macroType + '"];\n';
        outputString += ' '.repeat(indent) + 'let ' + _parser + ' = require(' + _macroTypeName + '[' + tagMap + '["' + _infos[1].trim() + '"]' + ']'  + ' + "Parser"' + ');\n';
      } else {
        outputString += ' '.repeat(indent) + 'let ' + _parser + ' = require("' + _type + 'Parser' + '");\n';
      }

      if (!inArray) {
        let _outObj = outObj + '_' + key;
        outputString += ' '.repeat(indent) + 'let ' + _outObj + ' = ' + _parser + '.encode(' + inObj + ', ' + tagMap + ');\n';
        outputString += ' '.repeat(indent) + outObj + '.put("' + key + '", ' + _outObj + ', ' + map.getTypeId('object') + ');\n'; // must be a object
      } else {
        let _outObj = outObj + '_' + key;
        outputString += ' '.repeat(indent) + 'let ' + _outObj + ' = ' + _parser + '.encode(' + inObj + ', ' + tagMap + ');\n';
        outputString += ' '.repeat(indent) + outObj + '.add(' + _outObj + ', ' + map.getTypeId('object') + ');\n'; // must be a object
      }
    }
  }

  return outputString;
};

/**
 * 
 * let Login_rsp_game_info_in = dataIn.get("game_info", 17);
 * let Login_rsp_game_info_out = null;
 * if (Login_rsp_game_info_in != null) {
 *   Login_rsp_game_info_out = {};
 *   let Login_rsp_game_info_out_maps_in = Login_rsp_game_info_in.get("maps", 18);
 *   let Login_rsp_game_info_out_maps_out = null;
 *   if (Login_rsp_game_info_out_maps_in != null) {
 *     Login_rsp_game_info_out_maps_out = [];
 *     for (let Login_rsp_game_info_out_maps_out_i=0; Login_rsp_game_info_out_maps_out_i<Login_rsp_game_info_out_maps_in.size(); Login_rsp_game_info_out_maps_out_i++) {
 *       let Login_rsp_game_info_out_maps_out_item_in = Login_rsp_game_info_out_maps_in.get(Login_rsp_game_info_out_maps_out_i, 17);
 *       let Login_rsp_game_info_out_maps_out_item_out = null;
 *       if (Login_rsp_game_info_out_maps_out_item_in != null) {
 *         let MapInfoParser = require("MapInfoParser");
 *         Login_rsp_game_info_out_maps_out_item_out = MapInfoParser.decode(Login_rsp_game_info_out_maps_out_item_in);
 *       }
 *       Login_rsp_game_info_out_maps_out.push(Login_rsp_game_info_out_maps_out_item_out);
 * 
 *     }
 *   }
 *   Login_rsp_game_info_out["maps"] = Login_rsp_game_info_out_maps_out;
 * }
 * Login_rsp["game_info"] = Login_rsp_game_info_out;
 * 
 * @param {any} key 
 * @param {any} val 
 * @param {any} inObj 
 * @param {any} outObj 
 * @param {any} indent 
 * @param {boolean} [inArray=false] 
 * @returns 
 */
function _decodeOneField(key, val, inObj, outObj, indent, inArray = false, tagMap = null) {
  let outputString = '';
  let decoder = null;

  let _inObj = outObj + '_' + key + '_in';
  let _outObj = outObj + '_' + key + '_out';
  if (inArray) {
    _inObj = inObj;
    _outObj = outObj;
  }

  if (Array.isArray(val)) {
    if (!inArray) {
      decoder = map.getDecoder('array');
      outputString += decoder(key, inObj, _inObj, indent, true);
    }

    let _outObj_i = _outObj + '_i';
    let _outObj_item_in = _outObj + '_item_in';
    let _outObj_item_out = _outObj + '_item_out';

    outputString += ' '.repeat(indent) + 'let ' + _outObj + ' = null;\n';
    outputString += ' '.repeat(indent) + 'if (' + _inObj + ' != null) {\n';
    outputString += ' '.repeat(indent + 2) + _outObj + ' = [];\n';
    outputString += ' '.repeat(indent + 2) + 'for (let ' + _outObj_i + '=0; ' + _outObj_i + '<' + _inObj + '.size(); ' + _outObj_i + '++) {\n';

    let typeId = null;
    if (Array.isArray(val[0])) {
      typeId = map.getTypeId('array');
    } else if (typeof val[0] === 'object') {
      typeId = map.getTypeId('object');
    } else if (val[0] === 'number') {
      typeId = -1;
    } else {
      typeId = map.getTypeId(val[0]);
    }

    if (typeId == null) {
      typeId = map.getTypeId('object');
    }

    if (typeId === -1) {
      outputString += ' '.repeat(indent + 4) + 'let ' + _outObj_item_in + ' = ' + _inObj + '.get(' + _outObj_i + ');\n';
    }
    else {
      outputString += ' '.repeat(indent + 4) + 'let ' + _outObj_item_in + ' = ' + _inObj + '.get(' + _outObj_i + ', ' + typeId + ');\n';
    }

    if (typeId <= map.getTypeId('string')) {
      outputString += ' '.repeat(indent + 4) + 'let ' + _outObj_item_out + ' = ' + _outObj_item_in + ';\n';
    } else {
      outputString += _decodeOneField(0, val[0], _outObj_item_in, _outObj_item_out, indent + 4, true, tagMap);
    }

    outputString += ' '.repeat(indent + 4) + _outObj + '.push(' + _outObj_item_out + ');\n\n';
    outputString += ' '.repeat(indent + 2) + '}\n';
    outputString += ' '.repeat(indent) + '}\n';

    if (!inArray) {
      outputString += ' '.repeat(indent) + outObj + '["' + key + '"] = ' + _outObj + ';\n\n';
    }
  }
  else if (typeof val === 'object') {
    if (!inArray) {
      decoder = map.getDecoder('object');
      outputString += decoder(key, inObj, _inObj, indent, true);
    }

    outputString += ' '.repeat(indent) + 'let ' + _outObj + ' = null;\n';
    outputString += ' '.repeat(indent) + 'if (' + _inObj + ' != null) {\n';
    outputString += ' '.repeat(indent + 2) + _outObj + ' = {};\n';

    let _keys = Object.keys(val);
    for (let i = 0; i < _keys.length; i++) {
      let _key = _keys[i];
      let _val = val[_key];

      outputString += _decodeOneField(_key, _val, _inObj, _outObj, indent + 2, false, tagMap);
    }

    outputString += ' '.repeat(indent) + '}\n';

    if (!inArray) {
      outputString += ' '.repeat(indent) + outObj + '["' + key + '"] = ' + _outObj + ';\n\n';
    }
  } else {
    let _infos = val.split(',');
    let _type = _infos[0].trim();
    decoder = map.getDecoder(_type);
    if (decoder != null) {
      outputString += decoder(key, inObj, outObj, indent);
      if (_infos.length > 1) {
        // store tag
        outputString += ' '.repeat(indent) + tagMap + '["' + _infos[1].trim() + '"] = ' + outObj + '["' + key + '"];\n';
      }
    } else {
      if (!inArray) {
        decoder = map.getDecoder('object');
        outputString += decoder(key, inObj, _inObj, indent, true);
      }
      outputString += ' '.repeat(indent) + 'let ' + _outObj + ' = null;\n';
      outputString += ' '.repeat(indent) + 'if (' + _inObj + ' != null) {\n';

      let _parser = '__' + _type + 'Parser';
      if (_infos.length > 1) {
        // use tag
        let _enums = _type.split('.');
        assert(_enums.length > 1);
        let _macroFile = _enums[0];
        let _macroType = _enums[1];
        let _macroFileName = '__' + _macroFile;
        let _macroTypeName = '__' + _macroType;
        _parser = _macroTypeName + 'Parser';

        outputString += ' '.repeat(indent + 2) + 'let ' + _macroFileName + ' = require("' + _macroFile + '");\n';
        outputString += ' '.repeat(indent + 2) + 'let ' + _macroTypeName + ' = ' + _macroFileName + '["' + _macroType + '"];\n';
        outputString += ' '.repeat(indent + 2) + 'let ' + _parser + ' = require(' + _macroTypeName + '[' + tagMap + '["' + _infos[1].trim() + '"]' + ']' + ' + "Parser"' + ');\n';
      } else {
        outputString += ' '.repeat(indent + 2) + 'let ' + _parser + ' = require("' + _type + 'Parser' + '");\n';
      }

      outputString += ' '.repeat(indent + 2) + _outObj + ' = ' + _parser + '.decode(' + _inObj + ', ' + tagMap + ');\n';
      outputString += ' '.repeat(indent) + '}\n';

      if (!inArray) {
        outputString += ' '.repeat(indent) + outObj + '["' + key + '"] = ' + _outObj + ';\n\n';
      }
    }
  }

  return outputString;
};

let _generateCommon = function (data, outputDir, recordFileMap) {
  mkdir.mkdir(outputDir);

  if (data.__common != null) {
    let keys = Object.keys(data.__common);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let val = data.__common[key];

      let outputString = '';
      let outputFile = path.join(outputDir, key + 'Parser.js');
      if (recordFileMap[outputFile] == null) {
        // the first time access
        recordFileMap[outputFile] = 1;
        outputString += '// This is a auto generate file, don\'t change it!\n\n\n';
        outputString += 'module.exports = {}\n\n';

        if (fs.existsSync(outputFile)) {
          fs.truncateSync(outputFile);
        }
      }

      // common struct proto
      outputString += 'let _encode = function (dataIn, tagMap) {\n';
      let _outObj = key;
      let _outObj_tag = _outObj + '_tag';
      let _keys = Object.keys(val);

      outputString += '  let ' + _outObj + ' = new SFS2X.SFSObject();\n';
      outputString += '  let ' + _outObj_tag + ' = tagMap || {};\n';
      for (let i = 0; i < _keys.length; i++) {
        let _key = _keys[i];
        let _val = val[_key];
        let _inObj = 'dataIn.' + _key;

        outputString += _encodeOneField(_key, _val, _inObj, _outObj, 2, false, _outObj_tag);
      }
      outputString += '  return ' + _outObj + ';\n';
      outputString += '};\n';
      outputString += 'module.exports["encode"] = _encode;\n\n';

      outputString += 'let _decode = function (dataIn, tagMap) {\n';
      outputString += '  let ' + _outObj + ' = {};\n';
      outputString += '  let ' + _outObj_tag + ' = tagMap || {};\n';
      for (let i = 0; i < _keys.length; i++) {
        let _key = _keys[i];
        let _val = val[_key];

        outputString += _decodeOneField(_key, _val, 'dataIn', _outObj, 2, false, _outObj_tag);
      }
      outputString += '  return ' + _outObj + ';\n';
      outputString += '};\n';
      outputString += 'module.exports["decode"] = _decode;\n\n';

      //write to file
      fs.writeFileSync(outputFile, outputString);
    }
  }
};

let _generateRPC = function (data, outputDir, recordFileMap) {
  mkdir.mkdir(outputDir);

  if (data.__rpc != null) {
    let keys = Object.keys(data.__rpc);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let val = data.__rpc[key];

      let outputString = '';
      let outputFile = path.join(outputDir, key + 'Parser.js');
      if (recordFileMap[outputFile] == null) {
        // the first time access
        recordFileMap[outputFile] = 1;
        outputString += '// This is a auto generate file, don\'t change it!\n\n\n';
        outputString += 'module.exports = {}\n\n';

        if (fs.existsSync(outputFile)) {
          fs.truncateSync(outputFile);
        }
      }

      // deal __req
      if (val.__req != null) {
        let _outObj = key + '_req';
        let _outObj_tag = _outObj + '_tag';
        let _keys = Object.keys(val.__req);

        outputString += 'let _req = {\n';
        outputString += '  encode: function (dataIn, tagMap) {\n';
        outputString += '    let ' + _outObj + ' = new SFS2X.SFSObject();\n';
        outputString += '    let ' + _outObj_tag + ' = tagMap || {};\n';
        for (let i = 0; i < _keys.length; i++) {
          let _key = _keys[i];
          let _val = val.__req[_key];
          let _inObj = 'dataIn.' + _key;

          outputString += _encodeOneField(_key, _val, _inObj, _outObj, 4, false, _outObj_tag);
        }
        outputString += '    return ' + _outObj + ';\n';
        outputString += '  },\n\n';

        outputString += '  decode: function (dataIn, tagMap) {\n';
        outputString += '    let ' + _outObj + ' = {};\n';
        outputString += '    let ' + _outObj_tag + ' = tagMap || {};\n';
        for (let i = 0; i < _keys.length; i++) {
          let _key = _keys[i];
          let _val = val.__req[_key];

          outputString += _decodeOneField(_key, _val, 'dataIn', _outObj, 4, false, _outObj_tag);
        }
        outputString += '    return ' + _outObj + ';\n';
        outputString += '  },\n';
        outputString += '}\n';
        outputString += 'module.exports["req"] = _req;\n\n';
      }

      // deal __rsp
      if (val.__rsp != null) {
        let _outObj = key + '_rsp';
        let _outObj_tag = _outObj + '_tag';

        let _keys = Object.keys(val.__rsp);

        outputString += 'let _rsp = {\n';
        outputString += '  encode: function (dataIn, tagMap) {\n';
        outputString += '    let ' + _outObj + ' = new SFS2X.SFSObject();\n';
        outputString += '    let ' + _outObj_tag + ' = tagMap || {};\n';
        for (let i = 0; i < _keys.length; i++) {
          let _key = _keys[i];
          let _val = val.__rsp[_key];
          let _inObj = 'dataIn.' + _key;

          outputString += _encodeOneField(_key, _val, _inObj, _outObj, 4, false, _outObj_tag);
        }
        outputString += '    return ' + _outObj + ';\n';
        outputString += '  },\n\n';

        outputString += '  decode: function (dataIn, tagMap) {\n';
        outputString += '    let ' + _outObj + ' = {};\n';
        outputString += '    let ' + _outObj_tag + ' = tagMap || {};\n';
        for (let i = 0; i < _keys.length; i++) {
          let _key = _keys[i];
          let _val = val.__rsp[_key];

          outputString += _decodeOneField(_key, _val, 'dataIn', _outObj, 4, false, _outObj_tag);
        }
        outputString += '    return ' + _outObj + ';\n';
        outputString += '  },\n';
        outputString += '}\n';
        outputString += 'module.exports["rsp"] = _rsp;\n\n';
      }

      //write to file
      fs.writeFileSync(outputFile, outputString);
    }
  }
};

module.exports = {
  generateMacros: _generateMacros,
  generateCommon: _generateCommon,
  generateRPC: _generateRPC,
};
