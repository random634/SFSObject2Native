/**
 * @file en/decode map for JavaScript
 * @author lingo(random634@163.com)
 */

// __type 可以为如下字符串内容：
// bool, byte, short, int, long, float, double, number, string, {}, []
// 这两个__type比较特殊
// {} - object
// [] - array
// ---------------------
// SFSOBJType    JSType
//  NULL          object
//  BOOL          boolean
//  BYTE          number
//  SHORT         number
//  INT           number
//  LONG          number
//  FLOAT         number
//  DOUBLE        number
//  UTF-STRING    string
//  SFSOBJECT     object
//  SFSARRAY      object

let typeIdMap = {
  null: 0,
  bool: 1,
  byte: 2,
  short: 3,
  int: 4,
  long: 5,
  float: 6,
  double: 7,
  string: 8,
  array_bool: 9,
  array_byte: 10,
  array_short: 11,
  array_int: 12,
  array_long: 13,
  array_float: 14,
  array_double: 15,
  array_string: 16,
  object: 17,
  array: 18,
  class: 19
};

let _commonEncoder = function (key, val, outObj, typeId, indent = 0, inArray = false) {
  let outString = '';
  if (!inArray) {
    outString += ' '.repeat(indent) + outObj + '.put("' + key + '", ' + val + ', ' + typeId + ');\n';
  } else {
    outString += ' '.repeat(indent) + outObj + '.add(' + val + ', ' + typeId + ');\n';
  }

  return outString;
};

let _commonDecoder = function (key, inObj, outObj, typeId = null, indent = 0, isMid = false) {
  let outString = '';
  let _prefix = '';
  let _outKey = '["' + key + '"]';
  if (isMid) {
    _prefix = 'let ';
    _outKey = '';
  }

  outString += ' '.repeat(indent) + _prefix + outObj + _outKey + ' = ' + inObj + '.get("' + key + '", ' + typeId + ');\n';
  
  return outString;
};

let _getEncoder = function (type) {
  if (typeIdMap[type] != null) {
    return function (key, val, outObj, indent = 0, inArray = false) {
      return _commonEncoder(key, val, outObj, typeIdMap[type], indent, inArray);
    }
  } else {
    if (type === 'number') {
      // it's just fit my need, you can change it to fit yours   
      return function (key, val, outObj, indent = 0, inArray = false) {
        let outString = '';
        outString += ' '.repeat(indent) + 'if (!!(' + val + ' % 1)) {\n';
        outString += _commonEncoder(key, val, outObj, typeIdMap['float'], indent + 2, inArray);
        outString += ' '.repeat(indent) + '} else {\n';
        outString += _commonEncoder(key, val, outObj, typeIdMap['int'], indent + 2, inArray);
        outString += ' '.repeat(indent) + '};\n';

        return outString;
      }
    }
    return null;
  }
};

let _getDecoder = function (type) {
  if (typeIdMap[type] != null) {
    return function (key, inObj, outObj, indent = 0, isMid = false) {
      return _commonDecoder(key, inObj, outObj, typeIdMap[type], indent, isMid);
    }
  } else {
    if (type === 'number') {
      return function (key, inObj, outObj, indent = 0, isMid = false) {
        let outString = '';
        let _outKey = '["' + key + '"]';
        if (isMid) {
          _outKey = '';
        }

        outString += ' '.repeat(indent) + outObj + _outKey + ' = ' + inObj + '.get("' + key + '");\n';
        
        return outString;
      }
    } else {
      return null;
    }
  }
};

let _getTypeId = function (type) {
  return typeIdMap[type];
}

module.exports = {
  getEncoder: _getEncoder,
  getDecoder: _getDecoder,
  getTypeId: _getTypeId,
}