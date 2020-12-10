const fs = require('fs');
const path = require('path');
const getMP3Duration = require('get-mp3-duration')
// store length chap wise
// duration of pixabay videos
// each index correspondse to 1 .. to n.mp4
let pixabay = [18,13,41,25,28,30,11,39,05]


let arr = []

for (let file of fs.readdirSync('chap')){

    const buffer = fs.readFileSync(path.join('chap',file))
   const duration = getMP3Duration(buffer)
   arr.push(Math.ceil(duration/1000))
   

}

console.log(JSON.stringify(arr))
