const getMP3Duration = require('get-mp3-duration')
const fs = require('fs');
const path = require('path');


// Assuming all the numbers in sequecing order & 6236 files, otherwise it will create issue
// This will create a file with timings in 6236 lines

let audioPath = 'D:\\Files\\Quran\\English Recitation only\\quran ibrahim walk parts recitation'

// holds the duration of each file
let timeHolder = []

for (let file of fs.readdirSync(audioPath)){

    const buffer = fs.readFileSync(path.join(audioPath,file))
    const duration = getMP3Duration(buffer)
    timeHolder.push(duration)


}

fs.writeFileSync('timings.txt', timeHolder.join('\n'))
