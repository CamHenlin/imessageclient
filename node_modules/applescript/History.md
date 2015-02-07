
1.0.0 / 2015-01-27
==================

  * README: use single quotes for `require()` call
  * package: remove "lib" and "engines" fields
  * Merge pull request #9 from linclark/fix-arg-order
  * fix arg order
  * Merge pull request #6 from Resseguie/no-callback
  * allow for no callback
  * Merge pull request #1 from cnandreu/patch-1
  * Fixed example in README.md

0.2.1 / 2010-09-03
==================

  * If an error is returned from the AppleScript, then the offending code is attached to the Error object as `err.appleScript`

0.2.0 / 2010-07-27
==================

  * Exposed the underlying parser Functions via the exported `Parsers` property
  * Add MIT license

0.1.0 / 2010-07-21
==================

  * Adding a "package.json" file for "npm". Preparing for v0.1.0 tag
  * Added a simple script to easily execute *.applescript test script
  * Added a new test case to ensure the 'fail' case issue is (and remains) fixed
  * Fixed the case where a zero-length response would cause an infinite loop in the result parser
  * Now converting `«data »` results into native Buffer instances. Horray!
  * Fixed StringParser with escaping control characters
  * Rewrote parsing logic to use Strings and substring
  * Replaced the RegExp based result parsing logic to actual char-by-char based parsing logic
  * Write to stdin when 'execString' is called, instead of passing the String as an argument (potentially dangerous)
  * Rename 'node-applescript.js' to 'applescript.js'
  * Initial commit
