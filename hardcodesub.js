const fs = require('fs');
const path = require('path');
const {
    spawnSync
  } = require('child_process');


// each index correspondse to 001.mp4 .. to n.mp4
// duration of pixabay videos in seconds
let pixabayDuration = [18,13,41,25,28,30,11,39,05]
// duration by chapter wise in seconds
let chapDuration = [47,7265,4792,4770,3758,4338,4793,1822,3625,2689,2771,2516,1213,1217,955,2531,1988,1997,1273,1628,1570,1767,1487,1959,1177,1967,1672,2033,1358,1161,653,477,1596,1040,966,1057,1463,1060,1628,1567,1149,1165,1226,574,638,952,733,717,496,559,551,491,467,489,691,731,822,606,623,447,287,209,252,320,357,354,445,452,402,315,278,331,240,322,208,312,284,271,238,203,127,112,288,146,181,89,96,122,196,107,74,100,55,35,60,84,36,114,50,61,54,53,21,48,40,34,49,16,45,26,32,14,24,41]

let pixabayPath = path.join(__dirname, 'pixabay videos')

let audioPath = path.join(__dirname, 'chap')

// stores the end result
let hardcodedSubPath = path.join(__dirname, 'withsub')

// stores the merged enlarged pixabay files
let pixabayBigPath =path.join(__dirname, 'merged')

let subtitlesPath =path.join(__dirname, 'subtitles')

let editionName = 'eng-miraneesuddin'

let editionSubtitlePath  = path.join(subtitlesPath,editionName )

// generate random video larger than chapter
function mergeVideos(){
let pixabayFiles = fs.readdirSync(pixabayPath).sort()
let chapterFiles = fs.readdirSync(audioPath).sort()

for(let i=1;i<=114;i++){
// let mergeList = []
let randomNo = getRandomNo(pixabayFiles.length) 
//Pixabay Video to use for recitation
let pixaFileWithPath = path.join(pixabayPath,pixabayFiles[randomNo])

// Increase the video size to more than chapter duration
let repeat = Math.ceil(chapDuration[i-1]/pixabayDuration[randomNo])
//for(let j=0;j<iterations;j++)
//mergeList.push("file '"+fileWithPath+"'")

//fs.writeFileSync('mergelist.txt', mergeList.join('\n'))


// var output = spawnSync('ffmpeg', ['-f', 'concat','-safe','0','-i','mergelist.txt','-c','copy',path.join(pixabayBigPath,(i+"").padStart(3, '0')+'.mp4')])


 //   var outputmp3 = spawnSync('ffmpeg', ['-i', 'merged/'+(i+"").padStart(3, '0')+'.mp4','-i','chap/'+(i+"").padStart(3, '0')+'.mp3','-map','0:v','-map','1:a','-c:v','copy','-shortest','mergedmp3/'+(i+"").padStart(3, '0')+'.mp4'])
    // add chapter value in .srt name
  //  var outputsub = spawnSync('ffmpeg', ['-i', 'mergedmp3/'+(i+"").padStart(3, '0')+'.mp4','-lavfi',"subtitles=subtitles/eng-miraneesuddin/1.srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'",'-crf','24','-vcodec','libx264','-c:a','copy','withsub/'+(i+"").padStart(3, '0')+'.mp4'])
  
//  var outputsub = spawnSync('ffmpeg', ['-i', 'merged/'+(i+"").padStart(3, '0')+'.mp4','-i','chap/'+(i+"").padStart(3, '0')+'.mp3','-vf',"subtitles=subtitles/eng-miraneesuddin/1.srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'",'-crf','24','-vcodec','libx264','-map','0:v','-map','1:a','-c:a','copy','-shortest','withsub/'+(i+"").padStart(3, '0')+'.mp4'])
       
// var outputsub = spawnSync('ffmpeg', ['-i', 'merged/'+(i+"").padStart(3, '0')+'.mp4','-i','chap/'+(i+"").padStart(3, '0')+'.mp3','-vf',"subtitles=subtitles/eng-miraneesuddin/1.srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'",'-crf','24','-vcodec','libx264','-map','0:v','-map','1:a','-c:a','copy','-shortest','withsub/'+(i+"").padStart(3, '0')+'.mp4'])
   
let paddedI = (i+"").padStart(3, '0')

var outputsub = spawnSync('ffmpeg', ['-stream_loop',repeat,'-i', pixaFileWithPath,'-i',path.join(audioPath,paddedI+'.mp3'),'-vf',"subtitles=subtitles/"+editionName+"/"+i+".srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'",'-crf','24','-vcodec','libx264','-map','0:v','-map','1:a','-c:a','copy','-shortest',path.join(hardcodedSubPath,paddedI+'.mp4')])
    


// upload the video using actions script 


//Delete the uploaded video to save space in actions

// fs.unlinkSync(path.join(hardcodedSubPath,paddedI+'.mp4'))
   
    break

}


}
mergeVideos()

//Generates random number
function getRandomNo(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }