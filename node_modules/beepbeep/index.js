'use strict';

/**
 * Make multiple console beep sounds
 * @param {number} [i=1] - Number of beeps
 * @param {number} [t=500] - Milliseconds between beeps
 */
module.exports = function (i, t) {
  if (i instanceof Array) {
    return delayedBeeps(i)
  }

  i = isNaN(i) ? 1 : i
  t = isNaN(t) ? 500 : t

  while (i-- > 0) {
    if (t*i === 0) beepNow()
    else setTimeout(beepNow, t*i)
  }
}

function delayedBeeps (i) {
  if (i.length === 0) {
    return
  }

  setTimeout(function () {
    beepNow()
    i.splice(0, 1)
    delayedBeeps(i)
  }, i[0])
}

function beepNow () {
  process.stdout.write('\x07')
}