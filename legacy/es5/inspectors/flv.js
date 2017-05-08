'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _commonNalParse = require('./common/nal-parse');

var _commonDataToHexJs = require('./common/data-to-hex.js');

var _commonDataToHexJs2 = _interopRequireDefault(_commonDataToHexJs);

var tagTypes = {
  0x08: 'audio',
  0x09: 'video',
  0x12: 'metadata'
},
    hex = function hex(val) {
  return '0x' + ('00' + val.toString(16)).slice(-2).toUpperCase();
},
    hexStringList = function hexStringList(data) {
  var arr = [],
      i;

  while (data.byteLength > 0) {
    i = 0;
    arr.push(hex(data[i++]));
    data = data.subarray(i);
  }
  return arr.join(' ');
},
    parseAVCTag = function parseAVCTag(tag, obj) {
  var avcPacketTypes = ['AVC Sequence Header', 'AVC NALU', 'AVC End-of-Sequence'],
      compositionTime = tag[1] & parseInt('01111111', 2) << 16 | tag[2] << 8 | tag[3];

  obj = obj || {};

  obj.avcPacketType = avcPacketTypes[tag[0]];
  obj.CompositionTime = tag[1] & parseInt('10000000', 2) ? -compositionTime : compositionTime;

  obj.data = tag.subarray(4);
  if (tag[0] === 0) {
    obj.type = 'video-metadata';
  }

  return obj;
},
    parseVideoTag = function parseVideoTag(tag, obj) {
  var frameTypes = ['Unknown', 'Keyframe (for AVC, a seekable frame)', 'Inter frame (for AVC, a nonseekable frame)', 'Disposable inter frame (H.263 only)', 'Generated keyframe (reserved for server use only)', 'Video info/command frame'],
      codecID = tag[0] & parseInt('00001111', 2);

  obj = obj || {};

  obj.frameType = frameTypes[(tag[0] & parseInt('11110000', 2)) >>> 4];
  obj.codecID = codecID;

  if (codecID === 7) {
    return parseAVCTag(tag.subarray(1), obj);
  }
  return obj;
},
    parseAACTag = function parseAACTag(tag, obj) {
  var packetTypes = ['AAC Sequence Header', 'AAC Raw'];

  obj = obj || {};

  obj.aacPacketType = packetTypes[tag[0]];
  obj.data = tag.subarray(1);

  return obj;
},
    parseAudioTag = function parseAudioTag(tag, obj) {
  var formatTable = ['Linear PCM, platform endian', 'ADPCM', 'MP3', 'Linear PCM, little endian', 'Nellymoser 16-kHz mono', 'Nellymoser 8-kHz mono', 'Nellymoser', 'G.711 A-law logarithmic PCM', 'G.711 mu-law logarithmic PCM', 'reserved', 'AAC', 'Speex', 'MP3 8-Khz', 'Device-specific sound'],
      samplingRateTable = ['5.5-kHz', '11-kHz', '22-kHz', '44-kHz'],
      soundFormat = (tag[0] & parseInt('11110000', 2)) >>> 4;

  obj = obj || {};

  obj.soundFormat = formatTable[soundFormat];
  obj.soundRate = samplingRateTable[(tag[0] & parseInt('00001100', 2)) >>> 2];
  obj.soundSize = (tag[0] & parseInt('00000010', 2)) >>> 1 ? '16-bit' : '8-bit';
  obj.soundType = tag[0] & parseInt('00000001', 2) ? 'Stereo' : 'Mono';

  if (soundFormat === 10) {
    return parseAACTag(tag.subarray(1), obj);
  }
  return obj;
},
    parseGenericTag = function parseGenericTag(tag) {
  return {
    type: tagTypes[tag[0]],
    dataSize: tag[1] << 16 | tag[2] << 8 | tag[3],
    timestamp: tag[7] << 24 | tag[4] << 16 | tag[5] << 8 | tag[6],
    streamID: tag[8] << 16 | tag[9] << 8 | tag[10]
  };
},
    inspectFlvTag = function inspectFlvTag(tag) {
  var header = parseGenericTag(tag);
  switch (tag[0]) {
    case 0x08:
      parseAudioTag(tag.subarray(11), header);
      break;
    case 0x09:
      parseVideoTag(tag.subarray(11), header);
      break;
    case 0x12:
  }
  return header;
},
    inspectFlv = function inspectFlv(bytes) {
  var i = 9,
      // header
  dataSize,
      parsedResults = [],
      tag;

  // traverse the tags
  i += 4; // skip previous tag size
  while (i < bytes.byteLength) {
    dataSize = bytes[i + 1] << 16;
    dataSize |= bytes[i + 2] << 8;
    dataSize |= bytes[i + 3];
    dataSize += 11;

    tag = bytes.subarray(i, i + dataSize);
    parsedResults.push(inspectFlvTag(tag));
    i += dataSize + 4;
  }
  return parsedResults;
};

var domifyFlv = function domifyFlv(flvTags) {
  var container = document.createElement('div');

  parsePESPackets(flvTags, container, 1);

  return container;
};

var parsePESPackets = function parsePESPackets(pesPackets, parent, depth) {
  pesPackets.forEach(function (packet) {
    var packetEl = document.createElement('div');
    domifyBox(parseNals(packet), parent, depth + 1);
  });
};

var parseNals = function parseNals(packet) {
  if (packet.type === 'video') {
    packet.nals = (0, _commonNalParse.nalParseAVCC)(packet.data);
    packet.nals.size = packet.data.length;
  }
  return packet;
};

var domifyBox = function domifyBox(box, parentNode, depth) {
  var isObject = function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]';
  };
  var attributes = ['size', 'flags', 'type', 'version'];
  var specialProperties = ['boxes', 'nals', 'samples', 'packetCount'];
  var objectProperties = Object.keys(box).filter(function (key) {
    return isObject(box[key]) || Array.isArray(box[key]) && isObject(box[key][0]);
  });
  var propertyExclusions = attributes.concat(specialProperties).concat(objectProperties);
  var subProperties = Object.keys(box).filter(function (key) {
    return propertyExclusions.indexOf(key) === -1;
  });

  var boxNode = document.createElement('mp4-box');
  var propertyNode = document.createElement('mp4-properties');
  var subBoxesNode = document.createElement('mp4-boxes');
  var boxTypeNode = document.createElement('mp4-box-type');

  if (box.type) {
    boxTypeNode.textContent = box.type;

    if (depth > 1) {
      boxTypeNode.classList.add('collapsed');
    }

    boxNode.appendChild(boxTypeNode);
  }

  attributes.forEach(function (key) {
    if (typeof box[key] !== 'undefined') {
      boxNode.setAttribute('data-' + key, box[key]);
    }
  });

  if (subProperties.length) {
    subProperties.forEach(function (key) {
      makeProperty(key, box[key], propertyNode);
    });
    boxNode.appendChild(propertyNode);
  }

  if (box.boxes && box.boxes.length) {
    box.boxes.forEach(function (subBox) {
      return domifyBox(subBox, subBoxesNode, depth + 1);
    });
    boxNode.appendChild(subBoxesNode);
  } else if (objectProperties.length) {
    objectProperties.forEach(function (key) {
      if (Array.isArray(box[key])) {
        domifyBox({
          type: key,
          boxes: box[key],
          size: box[key].size
        }, subBoxesNode, depth + 1);
      } else {
        domifyBox(box[key], subBoxesNode, depth + 1);
      }
    });
    boxNode.appendChild(subBoxesNode);
  }

  parentNode.appendChild(boxNode);
};

var makeProperty = function makeProperty(name, value, parentNode) {
  var nameNode = document.createElement('mp4-name');
  var valueNode = document.createElement('mp4-value');
  var propertyNode = document.createElement('mp4-property');

  nameNode.setAttribute('data-name', name);
  nameNode.textContent = name;

  if (value instanceof Uint8Array || value instanceof Uint32Array) {
    var strValue = (0, _commonDataToHexJs2['default'])(value, '');
    var sliceOffset = 0;
    var lines = 0;

    for (; sliceOffset < strValue.length; sliceOffset++) {
      if (strValue[sliceOffset] === '\n') {
        if (++lines === 21) {
          sliceOffset++;
          break;
        }
      }
    }
    var truncValue = strValue.slice(0, sliceOffset);

    if (truncValue.length < strValue.length) {
      truncValue += '<' + (value.byteLength - 336) + 'b remaining of ' + value.byteLength + 'b total>';
    }

    valueNode.setAttribute('data-value', truncValue.toUpperCase());
    valueNode.innerHTML = truncValue;
    valueNode.classList.add('pre-like');
  } else if (Array.isArray(value)) {
    var strValue = '[' + value.join(', ') + ']';
    valueNode.setAttribute('data-value', strValue);
    valueNode.textContent = strValue;
  } else {
    valueNode.setAttribute('data-value', value);
    valueNode.textContent = value;
  }

  propertyNode.appendChild(nameNode);
  propertyNode.appendChild(valueNode);

  parentNode.appendChild(propertyNode);
};

exports['default'] = {
  inspect: inspectFlv,
  domify: domifyFlv
};
module.exports = exports['default'];