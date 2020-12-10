// https://superuser.com/a/1323395/1200777

const fs = require('fs');
const path = require('path');
const {
    spawnSync
  } = require('child_process');

var chaplength = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6]
// contains chapter verse mappings for each line
var mappings = []
// Number of verses in quran
const VERSE_LENGTH = 6236

let foldervals = fs.readdirSync('mishary')

counter = 0;
let testarr = []

for (i = 1; i <= 114; i++) {
    testarr = []
  for (j = 1; j <= chaplength[i - 1]; j++) {
    
    testarr.push("file 'mishary/"+foldervals[counter]+"'")

    counter++
  }
  fs.writeFileSync('mylist.txt', testarr.join('\n'))

  var output = spawnSync('ffmpeg', ['-f', 'concat','-safe','0','-i','mylist.txt','-c','copy','chap/'+(i+"").padStart(3, '0')+'.mp3'])
  

}