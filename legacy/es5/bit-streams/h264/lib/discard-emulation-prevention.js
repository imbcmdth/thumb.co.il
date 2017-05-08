'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var discardEmulationPreventionBytes = function discardEmulationPreventionBytes(data) {
  var length = data.length;
  var emulationPreventionBytesPositions = [];
  var i = 1;
  var newLength = undefined;
  var newData = undefined;

  // Find all `Emulation Prevention Bytes`
  while (i < length - 2) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0x03) {
      emulationPreventionBytesPositions.push(i + 2);
      i += 2;
    } else {
      i++;
    }
  }

  // If no Emulation Prevention Bytes were found just return the original
  // array
  if (emulationPreventionBytesPositions.length === 0) {
    return data;
  }

  // Create a new array to hold the NAL unit data
  newLength = length - emulationPreventionBytesPositions.length;
  newData = new Uint8Array(newLength);
  var sourceIndex = 0;

  for (i = 0; i < newLength; sourceIndex++, i++) {
    if (sourceIndex === emulationPreventionBytesPositions[0]) {
      // Skip this byte
      sourceIndex++;
      // Remove this position index
      emulationPreventionBytesPositions.shift();
    }
    newData[i] = data[sourceIndex];
  }

  return newData;
};

exports['default'] = discardEmulationPreventionBytes;
module.exports = exports['default'];