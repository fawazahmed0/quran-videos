const fs = require('fs')
const path = require('path')
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const pixabayDuration = [13, 9, 35, 33, 24, 7, 16, 25, 24, 43, 41, 53, 35, 29, 24, 18, 10, 30]
const audioPath = path.join(__dirname, 'audios')
const pixabayPath = path.join(__dirname, 'pixabay videos')
const pixabayFiles = fs.readdirSync(pixabayPath).sort()
// stores the end result
const hardcodedSubPath = path.join(__dirname, 'output')

async function test(){

    let temparr = []
for(let i=0;i<pixabayFiles.length;i++){
  const currentDuration = new Date().getTime()
  await generateMP4('eng-ummmuhammad', 1,i,path.join(hardcodedSubPath, i + '.mp4'))
  const currentDuration2 = new Date().getTime()
  let timeTaken =currentDuration2-currentDuration;
   let ratio = timeTaken/39000
   console.log("ratio is ",ratio," for ",i)  
   temparr.push(ratio)
}
console.log(JSON.stringify(temparr))


}

test()

async function generateMP4 (editionName, chap, randomNo,fileSavePath ) {

  
    console.log('selected pixabay video index is ', randomNo)
    // Pixabay Videos to use for recitation
    const pixaFileWithPath = path.join(pixabayPath, pixabayFiles[randomNo])
  
    // Increase the video size to more than chapter duration
    const repeat = Math.ceil(39 / pixabayDuration[randomNo])
  
    const paddedI = (chap + '').padStart(3, '0')
    await exec('ffmpeg '+['-stream_loop', repeat, '-i', '"'+pixaFileWithPath+'"', '-i', '"'+path.join(audioPath, paddedI + '.mp3')+'"', '-vf', '"subtitles=subtitles/' + editionName + '/' + chap + `.srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'"`, '-crf', '24', '-vcodec', 'libx264', '-preset', 'ultrafast', '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest', '"'+fileSavePath+'"'].join(' '));
 
    return fileSavePath
  }
  