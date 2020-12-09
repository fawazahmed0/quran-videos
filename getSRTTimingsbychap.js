const getMP3Duration = require('get-mp3-duration')
const fs = require('fs');
const path = require('path');


// Creating line to [chapter,verseNo] mappings
// Array containing number of verses in each chapters
var chaplength = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6]
// contains chapter verse mappings for each line
var mappings = []
// Number of verses in quran
const VERSE_LENGTH = 6236

for (i = 1; i <= 114; i++) {
  for (j = 1; j <= chaplength[i - 1]; j++) {
    mappings.push([i, j])
  }
}

function millisToSrtTime( ms ) {
    // 1- Convert to seconds:
    var seconds = parseInt(ms / 1000)
	// Get millis
	var millis = parseInt(((ms/1000)%1)*1000)
    // 2- Extract hours:
    var hours = parseInt( seconds / 3600 ); // 3,600 seconds in 1 hour
    seconds = seconds % 3600; // seconds remaining after extracting hours
    // 3- Extract minutes:
    var minutes = parseInt( seconds / 60 ); // 60 seconds in 1 minute
    // 4- Keep only seconds not extracted to minutes:
    seconds = seconds % 60;



hours = hours+""
minutes = minutes+""
seconds = seconds+""
millis=millis+""


 return hours.padStart(2, '0')+":"+minutes.padStart(2, '0')+":"+seconds.padStart(2, '0')+","+millis.padStart(3, '0')
}
// 6236 files
// assuming path: D:\Files\Quran\English Recitation only\quran ibrahim walk parts recitation
// test files: C:\Users\Nawaz\Documents\GitHub\quran-api\database\linebyline

// create chap by chap srt file for each edition


let linebylineTextPath = 'C:\\Users\\Nawaz\\Documents\\GitHub\\quran-api\\database\\linebyline'

var timingsArr = fs.readFileSync('timings.txt').toString().split(/\r?\n/).map(e=>parseInt(e))

let srtTimings = []

let counter = 0
for (i = 1; i <= 114; i++) {
    let time = 0
    for (j = 1; j <= chaplength[i - 1]; j++) {
        let beginTime = time
        time = time + timingsArr[counter]
        srtTimings.push(millisToSrtTime( beginTime ) +' --> '+millisToSrtTime( time ))
      
        counter++
    }
  }

  fs.writeFileSync('SRTchapbychaptimings.txt', srtTimings.join('\n'))



