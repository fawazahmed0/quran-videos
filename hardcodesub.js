const fs = require('fs')
const path = require('path')
const {
  spawnSync
} = require('child_process')

// each index corresponds to 001.mp4 .. to n.mp4
// Duration of pixabay videos in seconds
const pixabayDuration = [18, 13, 41, 38, 28, 30, 11, 39, 20, 18, 30,32,30,50 ]
// Duration by chapter wise in seconds
const chapDuration = [47, 7265, 4792, 4770, 3758, 4338, 4793, 1822, 3625, 2689, 2771, 2516, 1213, 1217, 955, 2531, 1988, 1997, 1273, 1628, 1570, 1767, 1487, 1959, 1177, 1967, 1672, 2033, 1358, 1161, 653, 477, 1596, 1040, 966, 1057, 1463, 1060, 1628, 1567, 1149, 1165, 1226, 574, 638, 952, 733, 717, 496, 559, 551, 491, 467, 489, 691, 731, 822, 606, 623, 447, 287, 209, 252, 320, 357, 354, 445, 452, 402, 315, 278, 331, 240, 322, 208, 312, 284, 271, 238, 203, 127, 112, 288, 146, 181, 89, 96, 122, 196, 107, 74, 100, 55, 35, 60, 84, 36, 114, 50, 61, 54, 53, 21, 48, 40, 34, 49, 16, 45, 26, 32, 14, 24, 41]

const pixabayPath = path.join(__dirname, 'pixabay videos')

const audioPath = path.join(__dirname, 'audios')

// stores the end result
const hardcodedSubPath = path.join(__dirname, 'output')

const subtitlesPath = path.join(__dirname, 'subtitles')

// stores the editions to be added priority wise
const editionsList = ['eng-muhammadasad', 'zho-majian1', 'zho-muhammadmakin', 'spa-raulgonzalezbor', 'aar-sheikhmahmoudab', 'hin-suhelfarooqkhan', 'ben-zohurulhoque', 'rus-vporokhova', 'por-samirelhayek', 'ace-tgkhmahjiddinju', 'afr-imammabaker', 'amh-muhammedsadiqan', 'ara-sirajtafseer', 'asm-shaykhrafeequli', 'aze-vasimmammadaliy', 'bam-deenmuhammad', 'ber-ramdaneatmansou', 'bos-wwwislamhouseco', 'bul-tzvetantheophan', 'cat-yousseflyoussi', 'ces-prekladihrbek', 'dag-muhammadbabaght', 'dan-vandetaal', 'deu-frankbubenheima', 'div-officeofthepres', 'epo-hadiabdollahian', 'fas-unknown', 'fil-wwwislamhouseco', 'fin-unknown', 'fra-shahnazsaidiben', 'guj-rabilaalomari', 'hau-abubakarmahmoud', 'heb-unknown', 'hrv-unknown', 'hun-drahmedabdelrah', 'ilp-abdulazizgroaal', 'ind-unknown', 'ita-hamzarobertopic', 'jav-unknown', 'jpn-ryoichimita', 'kan-abdussalamputhi', 'kaz-khalifahaltaich', 'khm-cambodianmuslim', 'kin-rmcrwanda', 'kir-shamsaldinhakim', 'kmr-unknown', 'knx-unknown', 'kor-unknown', 'kur-muhammadsalehba', 'lat-hadiabdollahian', 'lug-fareeqmusa', 'luy-mohammadramadha', 'mal-muhammadkarakun', 'mar-muhammadshafiia', 'mkd-sheikhhassangil', 'mlt-martinrzammitmu', 'mrw-guroalimsaroman', 'msa-abdullahmuhamma', 'mya-hashimtinmyint', 'nep-ahlalhadithcent', 'nld-unknown', 'nor-einarberg', 'nya-alhajiyusufmuha', 'orm-ghaliapapurapag', 'pan-drmuhamadhabibb', 'pol-jozefabielawski', 'pus-zakariaabulsala', 'ron-unknown', 'run-sheikhamissirad', 'sin-wwwislamhouseco', 'slk-hadiabdollahian', 'sna-abdullahjmadini', 'snd-tajmehmoodamrot', 'som-shaykhmahmoodmu', 'sot-sheikheliaskeke', 'sqi-unknown', 'swa-alimuhsinalbarw', 'swe-knutbernstrom', 'tam-janturstfoundat', 'tat-yakubibnnugman', 'tel-abdulraheemmoha', 'tgk-wwwislamhouseco', 'tha-kingfahadquranc', 'tur-ynozturk', 'uig-shaykhmuhammads', 'ukr-yakubovych', 'urd-abulaalamaududi', 'uzb-muhammadsodikmu', 'vie-hassanabdulkari', 'xho-imaamismaaeelng', 'yor-shaykhaburahima', 'zul-iqembulezifundi']

// keep track of where to start
const stateFile = path.join(__dirname, 'state.txt')

// Keep track of number of files uploaded
const maxuploads = 95
let uploaded = 0

// generate random video larger than chapter
function generateVideos () {
  const pixabayFiles = fs.readdirSync(pixabayPath).sort()
  let [editionName, chap] = getState()

  for (;chap <= 114; chap++) {
    const randomNo = getRandomNo(pixabayFiles.length)
    // Pixabay Videos to use for recitation
    const pixaFileWithPath = path.join(pixabayPath, pixabayFiles[randomNo])

    // Increase the video size to more than chapter duration
    const repeat = Math.ceil(chapDuration[chap - 1] / pixabayDuration[randomNo])

    // var outputsub = spawnSync('ffmpeg', ['-i', 'merged/'+(i+"").padStart(3, '0')+'.mp4','-i','chap/'+(i+"").padStart(3, '0')+'.mp3','-vf',"subtitles=subtitles/eng-miraneesuddin/1.srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'",'-crf','24','-vcodec','libx264','-map','0:v','-map','1:a','-c:a','copy','-shortest','withsub/'+(i+"").padStart(3, '0')+'.mp4'])

    const paddedI = (chap + '').padStart(3, '0')

    spawnSync('ffmpeg', ['-stream_loop', repeat, '-i', pixaFileWithPath, '-i', path.join(audioPath, paddedI + '.mp3'), '-vf', 'subtitles=subtitles/' + editionName + '/' + chap + ".srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'", '-crf', '24', '-vcodec', 'libx264', '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest', path.join(hardcodedSubPath, paddedI + '.mp4')])

    // write code to upload the video using actions script

    uploaded++

    // Delete the uploaded video to save space in actions
    // fs.unlinkSync(path.join(hardcodedSubPath, paddedI + '.mp4'))

    // stop if uploaded files had reached the youtube upload limit
    if (uploaded >= maxuploads) { break }
  }

  const editionIndex = editionsList.indexOf(editionName)
  // if all the chapters are uploaded, then save new edition & chapter 1
  if (chap > 114) { saveState(editionsList[editionIndex + 1], 1) }
  // if the break is due to reaching max upload rates, then save the editionName & next chapter to be uploaded next time
  else {
    saveState(editionName, chap + 1)
  }
}

function begin () {
  generateVideos()
  generateVideos()
}

begin()

// get the yesterdays state, so to continue uploading
function getState () {
  const statevals = fs.readFileSync(stateFile).toString().split(/\r?\n/)
  return [statevals[0], parseInt(statevals[1])]
}

// save the state
function saveState (editionName, chap) {
  fs.writeFileSync(stateFile, editionName + '\n' + chap)
}

// Generates random number
function getRandomNo (max) {
  return Math.floor(Math.random() * Math.floor(max))
}
