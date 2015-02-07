# beepbeep

Make a console beep sound. *Well-tested, web-scale, cloud-based, restful node.js module.*

## Usage

```javascript
var beep = require('beepbeep')

beep()
// Beep!

beep(2)
// Beep! Beep!

beep(3, 1000)
// Beep! ... Beep! ... Beep!

beep([1000, 500, 2000])
// 1 second delay...Beep! 0.5 second delay...Beep! 2 second delay...Beep!
```

## Installation

```
npm install beepbeep
```

## License

MIT