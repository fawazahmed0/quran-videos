const fs = require('fs')
const path = require('path')
const {
  spawnSync
} = require('child_process')
const fetch = require('node-fetch')

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality.
// Any number of plugins can be added through `puppeteer.use()`
const puppeteer = require('puppeteer-extra')

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// each index corresponds to 001.mp4 .. to n.mp4
// Duration of pixabay videos in seconds
const pixabayDuration = [18, 13, 41, 38, 28, 30, 11, 39, 20, 18, 30, 32, 30, 50]
// Duration by chapter wise in seconds
const chapDuration = [47, 7265, 4792, 4770, 3758, 4338, 4793, 1822, 3625, 2689, 2771, 2516, 1213, 1217, 955, 2531, 1988, 1997, 1273, 1628, 1570, 1767, 1487, 1959, 1177, 1967, 1672, 2033, 1358, 1161, 653, 477, 1596, 1040, 914, 964, 1146, 946, 1622, 1484, 1005, 972, 1021, 509, 597, 763, 721, 630, 386, 499, 408, 369, 371, 350, 560, 531, 743, 572, 600, 422, 268, 197, 239, 343, 322, 287, 406, 376, 359, 272, 259, 293, 239, 290, 217, 347, 258, 299, 244, 210, 145, 141, 239, 153, 178, 90, 86, 97, 239, 91, 68, 102, 49, 31, 49, 83, 53, 117, 55, 54, 82, 51, 14, 39, 28, 21, 35, 12, 36, 19, 26, 11, 19, 40]
const pixabayPath = path.join(__dirname, 'pixabay videos')

const audioPath = path.join(__dirname, 'audios')

// stores the end result
const hardcodedSubPath = path.join(__dirname, 'output')

const subtitlesPath = path.join(__dirname, 'subtitles')
// stores the uploaded link in edition file name
const uploadLinkPath = path.join(__dirname, 'uploaded')

// stores the editions to be added priority wise
const editionsList = ['eng-ummmuhammad', 'zho-majian1', 'zho-muhammadmakin', 'spa-raulgonzalezbor', 'ara-sirajtafseer', 'hin-suhelfarooqkhan', 'ben-zohurulhoque', 'rus-vporokhova', 'por-samirelhayek', 'ace-tgkhmahjiddinju', 'afr-imammabaker', 'amh-muhammedsadiqan', 'ara-sirajtafseer', 'asm-shaykhrafeequli', 'aze-vasimmammadaliy', 'bam-deenmuhammad', 'ber-ramdaneatmansou', 'bos-wwwislamhouseco', 'bul-tzvetantheophan', 'cat-yousseflyoussi', 'ces-prekladihrbek', 'dag-muhammadbabaght', 'dan-vandetaal', 'deu-frankbubenheima', 'div-officeofthepres', 'epo-hadiabdollahian', 'fas-unknown', 'fil-wwwislamhouseco', 'fin-unknown', 'fra-shahnazsaidiben', 'guj-rabilaalomari', 'hau-abubakarmahmoud', 'heb-unknown', 'hrv-unknown', 'hun-drahmedabdelrah', 'ilp-abdulazizgroaal', 'ind-unknown', 'ita-hamzarobertopic', 'jav-unknown', 'jpn-ryoichimita', 'kan-abdussalamputhi', 'kaz-khalifahaltaich', 'khm-cambodianmuslim', 'kin-rmcrwanda', 'kir-shamsaldinhakim', 'kmr-unknown', 'knx-unknown', 'kor-unknown', 'kur-muhammadsalehba', 'lat-hadiabdollahian', 'lug-fareeqmusa', 'luy-mohammadramadha', 'mal-muhammadkarakun', 'mar-muhammadshafiia', 'mkd-sheikhhassangil', 'mlt-martinrzammitmu', 'mrw-guroalimsaroman', 'msa-abdullahmuhamma', 'nep-ahlalhadithcent', 'nld-unknown', 'nor-einarberg', 'nya-alhajiyusufmuha', 'orm-ghaliapapurapag', 'pan-drmuhamadhabibb', 'pol-jozefabielawski', 'pus-zakariaabulsala', 'ron-unknown', 'run-sheikhamissirad', 'sin-wwwislamhouseco', 'slk-hadiabdollahian', 'sna-abdullahjmadini', 'snd-tajmehmoodamrot', 'som-shaykhmahmoodmu', 'sot-sheikheliaskeke', 'sqi-unknown', 'swa-alimuhsinalbarw', 'swe-knutbernstrom', 'tam-janturstfoundat', 'tat-yakubibnnugman', 'tel-abdulraheemmoha', 'tgk-wwwislamhouseco', 'tha-kingfahadquranc', 'tur-ynozturk', 'uig-shaykhmuhammads', 'ukr-yakubovych', 'urd-abulaalamaududi', 'uzb-muhammadsodikmu', 'vie-hassanabdulkari', 'xho-imaamismaaeelng', 'yor-shaykhaburahima', 'zul-iqembulezifundi', 'mya-hashimtinmyint']

// keep track of where to start
const stateFile = path.join(__dirname, 'state.txt')

// Max videos to upload daily
const maxuploads = 80
// No of subtitles to upload concurrently
const maxSubUpload = 20
let uploaded

let email, pass, recovery
if (process.env.CI) {
  email = process.env.user
  pass = process.env.key
  recovery = process.env.recovery
} else {
  [email, pass, recovery] = fs.readFileSync(path.join(__dirname, 'config.ini')).toString().split(/\r?\n/).map(e => e.trim())
}

const apiLink = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1'
const editionsLink = apiLink + '/editions'

// browser related values
let browser, page
const height = 1024
const width = 1280
const timeout = 60000

const uploadURL = 'https://www.youtube.com/upload'
const studioURL = 'https://studio.youtube.com'

const metadataPath = path.join(__dirname, 'metadata')
const titlePath = path.join(metadataPath, 'titles')
// Translated tags & description
const tagsPath = path.join(metadataPath, 'tags.json')
const tagsJSON = readJSON(tagsPath)
const descriptionPath = path.join(metadataPath, 'description.json')
const descriptionJSON = readJSON(descriptionPath)
// Youtube dropdown languages
let ytLangs = ['Abkhazian', 'Afar', 'Afrikaans', 'Akan', 'Albanian', 'American Sign Language', 'Amharic', 'Arabic', 'Aramaic', 'Armenian', 'Assamese', 'Aymara', 'Azerbaijani', 'Bangla', 'Bashkir', 'Basque', 'Belarusian', 'Bhojpuri', 'Bislama', 'Bosnian', 'Breton', 'Bulgarian', 'Burmese', 'Cantonese', 'Cantonese (Hong Kong)', 'Catalan', 'Cherokee', 'Chinese', 'Chinese (China)', 'Chinese (Hong Kong)', 'Chinese (Simplified)', 'Chinese (Singapore)', 'Chinese (Taiwan)', 'Chinese (Traditional)', 'Choctaw', 'Corsican', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Dutch (Belgium)', 'Dutch (Netherlands)', 'Dzongkha', 'English', 'English (Canada)', 'English (India)', 'English (Ireland)', 'English (United Kingdom)', 'English (United States)', 'Esperanto', 'Estonian', 'Faroese', 'Fijian', 'Filipino', 'Finnish', 'French', 'French (Belgium)', 'French (Canada)', 'French (France)', 'French (Switzerland)', 'Fulah', 'Galician', 'Georgian', 'German', 'German (Austria)', 'German (Germany)', 'German (Switzerland)', 'Greek', 'Guarani', 'Gujarati', 'Haitian Creole', 'Hakka Chinese', 'Hakka Chinese (Taiwan)', 'Hausa', 'Hebrew', 'Hindi', 'Hindi (Latin)', 'Hiri Motu', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Interlingua', 'Interlingue', 'Inuktitut', 'Inupiaq', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kalaallisut', 'Kannada', 'Kashmiri', 'Kazakh', 'Khmer', 'Kinyarwanda', 'Klingon', 'Korean', 'Kurdish', 'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Manipuri', 'Maori', 'Marathi', 'Masai', 'Min Nan Chinese', 'Min Nan Chinese (Taiwan)', 'Mizo', 'Mongolian', 'Nauru', 'Navajo', 'Nepali', 'Norwegian', 'Occitan', 'Odia', 'Oromo', 'Pashto', 'Persian', 'Persian (Afghanistan)', 'Persian (Iran)', 'Polish', 'Portuguese', 'Portuguese (Brazil)', 'Portuguese (Portugal)', 'Punjabi', 'Quechua', 'Romanian', 'Romanian', 'Romansh', 'Rundi', 'Russian', 'Russian (Latin)', 'Samoan', 'Sango', 'Sanskrit', 'Sardinian', 'Scottish Gaelic', 'Serbian', 'Serbian (Cyrillic)', 'Serbian (Latin)', 'Serbian (Latin)', 'Sherdukpen', 'Shona', 'Sicilian', 'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'Southern Sotho', 'Spanish', 'Spanish (Latin America)', 'Spanish (Mexico)', 'Spanish (Spain)', 'Spanish (United States)', 'Sundanese', 'Swahili', 'Swati', 'Swedish', 'Tajik', 'Tamil', 'Tatar', 'Telugu', 'Thai', 'Tibetan', 'Tigrinya', 'Tok Pisin', 'Tongan', 'Tsonga', 'Tswana', 'Turkish', 'Turkmen', 'Ukrainian', 'Urdu', 'Uzbek', 'Vietnamese', 'Volapük', 'Võro', 'Welsh', 'Western Frisian', 'Wolof', 'Xhosa', 'Yiddish', 'Yoruba', 'Zulu']
ytLangs = ytLangs.map(e => e.toLowerCase())

// Stores the playlist option to select
let playlistToSelect
// stores the editionName, which is being uploaded
let editionName

// stores the pixavideos index thats needs to be ignored, as they are distracting
const ignorePixaVidIndex = [4, 7, 9, 11]
// Stores the list of chapters which needs to be reuploaded due to error etc
const redoChapters = []

// hardcodetime/video duration ratio for each pixa video
const videoTimeRatio = [0.1751304347826087, 1.789804347826087, 0.5999347826086957, 0.34145652173913044, 0.1971304347826087, 0.22706521739130434, 0.21043478260869566, 0.17365217391304347, 0.1945, 0.22604347826086957, 0.2111086956521739, 0.773804347826087, 0.20578260869565218, 0.1725]

// Stores the beginning time
const beginTime = new Date().getTime()

// Actions job timelimit of 6 hours
const sixHoursMillis = 21600000
// Slack for job timelimit for eighty minutes
const eightyMinsMillis = 4800000
// max duration with slack, i.e 4hours 40mins
const maxDuration = sixHoursMillis - eightyMinsMillis

const maxTitleLen = 100
const maxDescLen = 5000

// Youtube dropdown Language names to Edition Language names mappings for not similar names
const ytToEditionLang = {
  pashto: 'pushto',
  uyghur: 'uighur',
  punjabi: 'panjabi',
  kyrgyz: 'kirghiz',
  kurdish: 'kurmanji',
  'Southern Sotho': 'sotho',
  'Chinese (Simplified)': 'chinese(simplified)',
  'Chinese (Traditional)': 'chinese(traditional)'
}

// Google translate Language names to Edition Language names mappings for not similar names
const gTransToEditionLang = {
  'myanmar(burmese)': 'burmese',
  pashto: 'pushto',
  uyghur: 'uighur',
  punjabi: 'panjabi',
  kyrgyz: 'kirghiz',
  'kurdish(kurmanji)': 'kurmanji',
  sesotho: 'sotho'
}
// Holds Edition name to Edition Language mapping
let edHolder

// youtube dropdown to edition name mappings
const submapped = {
  'Chinese (China)': 'zho-mazhonggang',
  'Chinese (Hong Kong)': 'zho-muhammadmakin',
  'Chinese (Simplified)': 'zho-majian',
  'Chinese (Singapore)': 'zho-muhammadmakin-la',
  'Chinese (Taiwan)': 'zho-majian1',
  'Chinese (Traditional)': 'zho-anonymousgroupo',
  'Dutch (Belgium)': 'nld-fredleemhuis',
  'Dutch (Netherlands)': 'nld-salomokeyzer',
  'English (Canada)': 'eng-muhammadasad',
  'English (India)': 'eng-miraneesuddin',
  'English (Ireland)': 'eng-themonotheistgr',
  'English (United Kingdom)': 'eng-thestudyquran',
  'English (United States)': 'eng-safikaskas',
  'French (Belgium)': 'fra-islamicfoundati',
  'French (Canada)': 'fra-muhammadhameedu',
  'French (France)': 'fra-shahnazsaidiben',
  'French (Switzerland)': 'fra-muhammadhamidul',
  Kyrgyz: 'kir-shamsaldinhakim',
  'German (Austria)': 'deu-aburidamuhammad',
  'German (Germany)': 'deu-adeltheodorkhou',
  'German (Switzerland)': 'deu-amirzaidan',
  'Hindi (Latin)': 'hin-suhelfarooqkhan-la',
  Pashto: 'pus-abdulwalikhan',
  'Persian (Afghanistan)': 'fas-abdolmohammaday',
  'Persian (Iran)': 'fas-abolfazlbahramp',
  'Portuguese (Brazil)': 'por-helminasr',
  'Portuguese (Portugal)': 'por-samirelhayek',
  Punjabi: 'pan-drmuhamadhabibb',
  'Russian (Latin)': 'rus-abuadel-la',
  'Southern Sotho': 'sot-sheikheliaskeke',
  'Spanish (Latin America)': 'spa-abdulqadermouhe',
  'Spanish (Mexico)': 'spa-juliocortes',
  'Spanish (Spain)': 'spa-islamicfoundati',
  'Spanish (United States)': 'spa-muhammadasadabd',
  Bangla: 'ben-abubakrzakaria',
  Afar: 'aar-sheikhmahmoudab',
  Afrikaans: 'afr-imammabaker',
  Albanian: 'sqi-unknown',
  Amharic: 'amh-muhammedsadiqan',
  Arabic: 'ara-sirajtafseer',
  Assamese: 'asm-shaykhrafeequli',
  Azerbaijani: 'aze-vasimmammadaliy',
  Bosnian: 'bos-wwwislamhouseco',
  Bulgarian: 'bul-tzvetantheophan',
  Burmese: 'mya-hashimtinmyint',
  Catalan: 'cat-yousseflyoussi',
  Croatian: 'hrv-unknown',
  Czech: 'ces-prekladihrbek',
  Danish: 'dan-vandetaal',
  Dutch: 'nld-unknown',
  English: 'eng-wahiduddinkhan',
  Esperanto: 'epo-hadiabdollahian',
  Finnish: 'fin-unknown',
  French: 'fra-shahnazsaidiben',
  German: 'deu-frankbubenheima',
  Gujarati: 'guj-rabilaalomari',
  Hausa: 'hau-abubakarmahmoud',
  Hebrew: 'heb-unknown',
  Hindi: 'hin-suhelfarooqkhan',
  Hungarian: 'hun-drahmedabdelrah',
  Indonesian: 'ind-unknown',
  Italian: 'ita-hamzarobertopic',
  Japanese: 'jpn-ryoichimita',
  Javanese: 'jav-unknown',
  Kannada: 'kan-abdussalamputhi',
  Kazakh: 'kaz-khalifahaltaich',
  Khmer: 'khm-cambodianmuslim',
  Kinyarwanda: 'kin-rmcrwanda',
  Korean: 'kor-unknown',
  Kurdish: 'kur-muhammadsalehba',
  Latin: 'lat-hadiabdollahian',
  Macedonian: 'mkd-sheikhhassangil',
  Malay: 'msa-abdullahmuhamma',
  Malayalam: 'mal-muhammadkarakun',
  Maltese: 'mlt-martinrzammitmu',
  Marathi: 'mar-muhammadshafiia',
  Nepali: 'nep-ahlalhadithcent',
  Norwegian: 'nor-einarberg',
  Oromo: 'orm-ghaliapapurapag',
  Persian: 'fas-unknown',
  Polish: 'pol-jozefabielawski',
  Portuguese: 'por-samirelhayek',
  Romanian: 'ron-unknown',
  Rundi: 'run-sheikhamissirad',
  Russian: 'rus-vporokhova',
  Shona: 'sna-abdullahjmadini',
  Sindhi: 'snd-tajmehmoodamrot',
  Sinhala: 'sin-wwwislamhouseco',
  Slovak: 'slk-hadiabdollahian',
  Somali: 'som-shaykhmahmoodmu',
  Spanish: 'spa-raulgonzalezbor',
  Swahili: 'swa-alimuhsinalbarw',
  Swedish: 'swe-knutbernstrom',
  Tajik: 'tgk-wwwislamhouseco',
  Tamil: 'tam-janturstfoundat',
  Tatar: 'tat-yakubibnnugman',
  Telugu: 'tel-abdulraheemmoha',
  Thai: 'tha-kingfahadquranc',
  Turkish: 'tur-ynozturk',
  Ukrainian: 'ukr-yakubovych',
  Urdu: 'urd-syedzeeshanhaid',
  Uzbek: 'uzb-muhammadsodikmu',
  Vietnamese: 'vie-hassanabdulkari',
  Xhosa: 'xho-imaamismaaeelng',
  Yoruba: 'yor-shaykhaburahima',
  Zulu: 'zul-iqembulezifundi',
  Filipino: 'fil-wwwislamhouseco'
}

// make hardcodedsubtitle vidoe output directory if it doesn't exist
fs.mkdirSync(hardcodedSubPath, {
  recursive: true
})
// make uploadedlink path, which will save the editions uploaded youtube links
fs.mkdirSync(uploadLinkPath, {
  recursive: true
})

// capitalizes all the first letters in a sentense
const capitalize = words => words.split(' ').map(w => w[0].toUpperCase() + w.substring(1)).join(' ')
// generate random video larger than chapter
async function generateVideos () {
  const [editionsJSON] = await getLinksJSON([editionsLink + '.json'])
  // Holds subtitle uploading promises
  let subPromiseHolder = []
  // Edition name to Edition Language mapping
  edHolder = {}
  for (const value of Object.values(editionsJSON)) { edHolder[value.name] = value.language }

  const pixabayFiles = fs.readdirSync(pixabayPath).sort()
  let chap, day;
  [editionName, chap, playlistToSelect, uploaded, day] = getState()
  chap = parseInt(chap)

  // if today is different date, then the upload limits don't count
  if (day != new Date().toISOString().substring(8, 10)) { uploaded = 0 }

  const editionLang = edHolder[editionName].toLowerCase()

  for (;chap <= 114; chap++) {
    // if(redoChapters.includes(chap)){
    // hardset editionName for which reuploading is to be done
    //   editionName = 'somevalue'
    console.log('beginning for chapter ', chap)
    // Save the current chap & edition state, to recover from here in case of error
    saveState(editionName, chap)

    const currentDuration = new Date().getTime() - beginTime

    const remainingDuration = maxDuration - currentDuration

    const currChapDuration = chapDuration[chap] * 1000

    // stores the pixavideos index that needs to be used
    let allowedPixaVidIndex
    // if chapter size is bigger, then ignore 1st and 2nd index of pixavids also,as they are of huge size
    if (chap < 30) { allowedPixaVidIndex = [...Array(pixabayFiles.length).keys()].filter(e => !ignorePixaVidIndex.concat(1, 2).includes(e)) } else { allowedPixaVidIndex = [...Array(pixabayFiles.length).keys()].filter(e => !ignorePixaVidIndex.includes(e)) }

    const randomIndex = getRandomNo(allowedPixaVidIndex.length)
    const randomNo = allowedPixaVidIndex[randomIndex]
    // stop if uploaded files had reached the youtube upload limit or
    // remaining duration is not enought to hardcode the subtitles & upload
    if (uploaded >= maxuploads || remainingDuration < currChapDuration * videoTimeRatio[randomNo]) { break }
    console.log('selected pixabay video index is ', randomNo)
    // Pixabay Videos to use for recitation
    const pixaFileWithPath = path.join(pixabayPath, pixabayFiles[randomNo])

    // Increase the video size to more than chapter duration
    const repeat = Math.ceil(chapDuration[chap - 1] / pixabayDuration[randomNo])

    // var outputsub = spawnSync('ffmpeg', ['-i', 'merged/'+(i+"").padStart(3, '0')+'.mp4','-i','chap/'+(i+"").padStart(3, '0')+'.mp3','-vf',"subtitles=subtitles/eng-miraneesuddin/1.srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'",'-crf','24','-vcodec','libx264','-map','0:v','-map','1:a','-c:a','copy','-shortest','withsub/'+(i+"").padStart(3, '0')+'.mp4'])

    const paddedI = (chap + '').padStart(3, '0')
    const fileSavePath = path.join(hardcodedSubPath, paddedI + '.mp4')
    spawnSync('ffmpeg', ['-stream_loop', repeat, '-i', pixaFileWithPath, '-i', path.join(audioPath, paddedI + '.mp3'), '-vf', 'subtitles=subtitles/' + editionName + '/' + chap + ".srt:force_style='Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=60'", '-crf', '18', '-vcodec', 'libx264', '-preset', 'ultrafast', '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest', fileSavePath])
    console.log('before uploading the video for chapter ', chap)
    // write code to upload the video using actions script
   let title = await uploadVideo(fileSavePath, editionLang, chap)
    console.log('Uploading completed for ', chap)
    const subLink = await getSubLink(title)
    // upload the subtitles
    console.log('concurrently uploading subtitles')
    subPromiseHolder.push(uploadSub(chap, subLink).then())
    uploaded++

    // Delete the uploaded video to save space in actions
    fs.unlinkSync(fileSavePath)
    // Delete temp directory in actions
    if (process.env.CI) {
      fs.rmdirSync(process.env.tempdir, {
        recursive: true
      })
      fs.mkdirSync(process.env.tempdir, {
        recursive: true
      })
    }
    // if subtitles promise holder has reached max subtitles uploads, then wait for all of them to complete
    if (subPromiseHolder.length === maxSubUpload) {
      await Promise.all(subPromiseHolder)
      subPromiseHolder = []
    }
    // }
  }

  // wait for all remaining subtitles upload  to complete
  await Promise.all(subPromiseHolder)

  const editionIndex = editionsList.indexOf(editionName)
  // if all the chapters are uploaded, then save new edition & chapter 1
  if (chap > 114) { saveState(editionsList[editionIndex + 1], 1) }
}

async function begin () {
  await launchBrowser()
  // sometimes chapter may begin from large no like 95,
  // that's why we are calling the func two times, to reach maxUploadNo
  try {
    await login(page)
  } catch (error) {
    console.log('Login failed, trying again')
    console.error(error)
    await login(page)
  }
  await generateVideos()
  await generateVideos()
  await browser.close()
}

begin()

// get the yesterdays state, so to continue uploading
function getState () {
  return fs.readFileSync(stateFile).toString().split(/\r?\n/)
}

// save the state
function saveState (editionNameArg, chap) {
  fs.writeFileSync(stateFile, editionNameArg + '\n' + chap + '\n' + playlistToSelect + '\n' + uploaded + '\n' + new Date().toISOString().substring(8, 10))
}

// Generates random number
function getRandomNo (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

function getKeyByValue (obj, value) {
  return Object.keys(obj).find(key => obj[key].toLowerCase() === value.toLowerCase())
}

// context and browser is a global variable and it can be accessed from anywhere
// function that launches a browser
async function launchBrowser () {
  browser = await puppeteer.launch({ headless: true })
  page = await browser.newPage()
  await page.setDefaultTimeout(timeout)
  await page.setViewport({ width: width, height: height })
}

// Login bypass with recovery email
async function securityBypass (localPage) {
  try {
    const confirmRecoveryXPath = '//*[normalize-space(text())=\'Confirm your recovery email\']'
    await localPage.waitForXPath(confirmRecoveryXPath)

    const confirmRecoveryBtn = await localPage.$x(confirmRecoveryXPath)
    await localPage.evaluate(el => el.click(), confirmRecoveryBtn[0])
  } catch (error) {
    console.log('confirm your recovery email button not found')
    console.error(error)
  }

  try {
    const enterRecoveryXPath = '//*[normalize-space(text())=\'Enter recovery email address\']'
    await localPage.waitForXPath(enterRecoveryXPath)
    await localPage.type('input[type="email"]', recovery)
    await localPage.keyboard.press('Enter')
    await localPage.waitForNavigation({
      waitUntil: 'networkidle0'
    })
    const selectBtnXPath = '//*[normalize-space(text())=\'Select files\']'
    await localPage.waitForXPath(selectBtnXPath)
  } catch (error) {
    console.log('Login Failed in securityBypass')
    console.error(error)
  }
}

async function login (localPage) {
  await localPage.goto(uploadURL)
  await localPage.waitForSelector('input[type="email"]')
  await localPage.type('input[type="email"]', email)
  await localPage.keyboard.press('Enter')
  await localPage.waitForNavigation({
    waitUntil: 'networkidle0'
  })

  await localPage.waitForXPath('//*[normalize-space(text())=\'Show password\']')
  // await page.waitForSelector('input[type="password"]')
  await localPage.type('input[type="password"]', pass)

  await localPage.keyboard.press('Enter')

  await localPage.waitForNavigation()

  try {
    const selectBtnXPath = '//*[normalize-space(text())=\'Select files\']'
    await localPage.waitForXPath(selectBtnXPath, { timeout: 60000 })
  } catch (error) {
    console.log('Login failed, have to try securtiy bypass')
    console.error(error)
    await securityBypass(localPage)
  }
}

function readJSON (pathToJSON) {
  const jsonStr = fs.readFileSync(pathToJSON).toString()
  return JSON.parse(jsonStr)
}

// https://www.shawntabrizi.com/code/programmatically-fetch-multiple-apis-parallel-using-async-await-javascript/
// Get links async i.e in parallel
async function getLinksJSON (urls) {
  return await Promise.all(
    urls.map(url => fetch(url).then(response => response.json()))
  ).catch(console.error)
}
// keep playlistBool true, only if its 1 chap
async function uploadVideo (pathToFile, lang, chapter) {
  const chapTitlePath = path.join(titlePath, chapter + '.json')
  const titleJSON = readJSON(chapTitlePath)
  // if language exists, then use the language name, otherwise get it from mappings objects
  const gtransLang = titleJSON[lang] ? lang : getKeyByValue(gTransToEditionLang, lang)
  const ytLang = ytLangs.includes(lang) ? capitalize(lang) : getKeyByValue(ytToEditionLang, lang)

  const title = titleJSON[gtransLang] ? titleJSON[gtransLang] : titleJSON.english + ' | ' + lang
  const description = descriptionJSON[gtransLang] ? descriptionJSON[gtransLang] : descriptionJSON.english
  let tags = tagsJSON[gtransLang] ? tagsJSON[gtransLang] : tagsJSON.english
  const newPlaylist = tags[0] + ' ' + lang
  const videoLang = ytLang || 'English'

  const finalTitle = capitalize(title).substring(0, maxTitleLen)

  // Also add english tags in addition to translated tags
  if (gtransLang !== 'english') { tags = tags.concat(tagsJSON.english) }

  await page.evaluate(() => { window.onbeforeunload = null })
  await page.goto(uploadURL)

  const closeBtnXPath = '//*[normalize-space(text())=\'Close\']'
  const selectBtnXPath = '//*[normalize-space(text())=\'Select files\']'
  await page.waitForXPath(selectBtnXPath)
  await page.waitForXPath(closeBtnXPath)
  // Remove hidden closebtn text
  const closeBtn = await page.$x(closeBtnXPath)
  await page.evaluate(el => { el.textContent = 'oldclosse' }, closeBtn[0])

  const selectBtn = await page.$x(selectBtnXPath)
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    selectBtn[0].click()// button that triggers file selection
  ])
  await fileChooser.accept([pathToFile])
  // Wait for upload to complete
  await page.waitForXPath('//*[contains(text(),"Upload complete")]', { timeout: 0 })
  // Wait for upload to go away and processing to start
  await page.waitForXPath('//*[contains(text(),"Upload complete")]', { hidden: true, timeout: 0 })
  // Wait until title & description box pops up
  await page.waitForFunction('document.querySelectorAll(\'[id="textbox"]\').length > 1')
  const textBoxes = await page.$x('//*[@id="textbox"]')
  // Add the title value
  await textBoxes[0].focus()
  await sleep(1000)
  await textBoxes[0].type(finalTitle)
  // Add the Description content
  await textBoxes[1].type(description.substring(0, maxDescLen))

  const childOption = await page.$x('//*[contains(text(),"No, it\'s")]')
  await childOption[0].click()

  const moreOption = await page.$x('//*[normalize-space(text())=\'More options\']')
  await moreOption[0].click()
  const playlist = await page.$x('//*[normalize-space(text())=\'Select\']')
  let createplaylistdone
  if (chapter === 1) {
    // Creating new playlist
    // click on playlist dropdown

    await page.evaluate(el => el.click(), playlist[0])
    // click New playlist button
    const newPlaylistXPath = '//*[normalize-space(text())=\'New playlist\']'
    await page.waitForXPath(newPlaylistXPath)
    const createplaylist = await page.$x(newPlaylistXPath)
    await page.evaluate(el => el.click(), createplaylist[0])
    // Enter new playlist name
    await page.keyboard.type(' ' + newPlaylist.substring(0, 148))
    // click create & then done button
    const createplaylistbtn = await page.$x('//*[normalize-space(text())=\'Create\']')
    await page.evaluate(el => el.click(), createplaylistbtn[1])
    createplaylistdone = await page.$x('//*[normalize-space(text())=\'Done\']')
    await page.evaluate(el => el.click(), createplaylistdone[0])
    // assign newPlaylist name, so in next chapter time it will be used to select that playlist
    playlistToSelect = newPlaylist
  } else {
  // Selecting playlist
    await page.evaluate(el => el.click(), playlist[0])
    const playlistToSelectXPath = '//*[normalize-space(text())=\'' + playlistToSelect + '\']'
    await page.waitForXPath(playlistToSelectXPath)
    const playlistName = await page.$x(playlistToSelectXPath)
    await page.evaluate(el => el.click(), playlistName[0])
    createplaylistdone = await page.$x('//*[normalize-space(text())=\'Done\']')
    await page.evaluate(el => el.click(), createplaylistdone[0])
  }
  // Add tags
  await page.type('[placeholder="Add tag"]', tags.join(', ').substring(0, 495) + ', ')

  // Selecting video language
  const langHandler = await page.$x('//*[normalize-space(text())=\'Video language\']')
  await page.evaluate(el => el.click(), langHandler[0])

  const langName = await page.$x('//*[normalize-space(text())=\'' + videoLang + '\']')
  await page.evaluate(el => el.click(), langName[langName.length - 1])

  // click next button
  const nextBtnXPath = '//*[normalize-space(text())=\'Next\']/parent::*[not(@disabled)]'
  await page.waitForXPath(nextBtnXPath)
  let next = await page.$x(nextBtnXPath)
  await next[0].click()
  await sleep(2000)
  await page.waitForXPath(nextBtnXPath)
  // click next button
  next = await page.$x(nextBtnXPath)
  await next[0].click()

  await sleep(2000)

  // Get publish button
  const publishXPath = '//*[normalize-space(text())=\'Publish\']/parent::*[not(@disabled)]'
  await page.waitForXPath(publishXPath)
  const publish = await page.$x(publishXPath)
  // save youtube upload link
  await page.waitForSelector('[href^="https://youtu.be"]')
  const uploadedLinkHandle = await page.$('[href^="https://youtu.be"]')
  const uploadedLink = await page.evaluate(e => e.getAttribute('href'), uploadedLinkHandle)
  fs.appendFileSync(path.join(uploadLinkPath, editionName + '.txt'), 'chapter ' + chapter + ' ' + uploadedLink + '\n')

  // translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')

  await publish[0].click()
  // await page.waitForXPath('//*[contains(text(),"Finished processing")]', { timeout: 0})
  // Wait for closebtn to show up
  await page.waitForXPath(closeBtnXPath)

  return finalTitle
}

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getSubLink (title) {
  await page.evaluate(() => { window.onbeforeunload = null })
  await page.goto(studioURL)
  const subtitlesTabXPath = '//*[normalize-space(text())=\'Subtitles\']'
  await page.waitForXPath(subtitlesTabXPath)
  const subtitlesTab = await page.$x(subtitlesTabXPath)
  await page.evaluate(el => el.click(), subtitlesTab[0])

  await page.waitForNavigation()
  await page.waitForSelector('[id="video-title"]')
  await page.waitForFunction('document.querySelectorAll(\'[id="video-title"]\').length > 5')
  await sleep(2000)

  const subLink = await page.evaluate(titletext =>  Array.from(document.querySelectorAll('[id="video-title"]')).map(e => [e.textContent.trim(),e.href]).filter(e =>e[0].toLowerCase()==titletext.toLowerCase() && /.*?translations$/.test(e[1]))[0][1],title)

  return subLink
}

// upload the subtitles
async function uploadSub (chapter, subLink) {
  // read chapter translated titles json
  const chapTitlePath = path.join(titlePath, chapter + '.json')
  const titleJSON = readJSON(chapTitlePath)
  // Create a new incognito browser context
  // const context = await browser.createIncognitoBrowserContext()
  // Create a new page inside a new context
  const localPage = await browser.newPage()
  await localPage.setDefaultTimeout(timeout)
  await localPage.setViewport({ width: width, height: height })
  const holdersubmap = { ...submapped }
  let noOfErrors = 0
  const maxErrors = 7

  // Go to upload subtitles link
  await localPage.goto(subLink)
  // upload the subtitle for english language, as it is the default title & description language
  try {
    await subPart(path.join(subtitlesPath, holdersubmap.English, chapter + '.srt'), localPage)
  } catch (error) {
    console.log('uploading first subtitle failed for ', path.join(subtitlesPath, holdersubmap.English, chapter + '.srt'), ' trying again')
    console.error(error)
    // remove the reload site? dialog
    await localPage.evaluate(() => { window.onbeforeunload = null })
    await localPage.goto(subLink)
    try {
      await subPart(path.join(subtitlesPath, holdersubmap.English, chapter + '.srt'), localPage)
    } catch (error) {
      console.log('uploading first subtitle failed for ', path.join(subtitlesPath, holdersubmap.English, chapter + '.srt'), ' skipping whole chapter subtitle upload')
      console.error(error)
      return
    }
  }

  delete holdersubmap.English
  for (const [key, value] of Object.entries(holdersubmap)) {
    // if there are more unrecoverable errors, that means there is some problem with the link or the upload did not happen
    if (noOfErrors > maxErrors) { break }
    try {
      await addNewLang(key, localPage)
    } catch (error) {
      console.log('Adding language failed in subtitles for language ', key, 'and chapter ', chapter, ' trying again')
      console.error(error)
      // remove the reload site? dialog
      await localPage.evaluate(() => { window.onbeforeunload = null })
      await localPage.goto(subLink)
      try {
        await addNewLang(key, localPage)
      } catch (error) {
        console.log('Adding language failed again in subtitles for language ', key, 'and chapter ', chapter)
        console.log('Skipping this now')
        console.error(error)
        noOfErrors++
        continue
      }
    }

    const lang = edHolder[value].toLowerCase()
    const gtransLang = titleJSON[lang] ? lang : getKeyByValue(gTransToEditionLang, lang)
    const title = titleJSON[gtransLang] ? titleJSON[gtransLang] : titleJSON.english + ' | ' + lang
    const description = descriptionJSON[gtransLang] ? descriptionJSON[gtransLang] : descriptionJSON.english
    try {
      await titleDescPart(title, description, localPage)
    } catch (error) {
      console.log('\nlang\n', key, '\ntitle\n', title, '\ndesc\n', description)
      console.log('Adding titleDescripiton failed for chapter ', chapter, ' trying again')
      console.error(error)
      // remove the reload site? dialog
      await localPage.evaluate(() => { window.onbeforeunload = null })
      await localPage.goto(subLink)
      try {
        await addNewLang(key, localPage)
        await titleDescPart(title, description, localPage)
      } catch (error) {
        console.log('\nlang\n', key, '\ntitle\n', title, '\ndesc\n', description)
        console.log('Adding titleDescripiton failed again for chapter ', chapter, ' skipping this now')
        console.error(error)
        noOfErrors++
        continue
      }
    }

    try {
      await subPart(path.join(subtitlesPath, value, chapter + '.srt'), localPage)
    } catch (error) {
      console.log('uploading subtitle failed for ', path.join(subtitlesPath, value, chapter + '.srt'), ' trying again')
      console.error(error)

      // remove the reload site? dialog
      await localPage.evaluate(() => { window.onbeforeunload = null })
      await localPage.goto(subLink)
      try {
        await subPart(path.join(subtitlesPath, value, chapter + '.srt'), localPage)
      } catch (error) {
        console.log('uploading subtitle failed again for ', path.join(subtitlesPath, value, chapter + '.srt'), ' skipping this now')
        console.error(error)
        noOfErrors++
        continue
      }
    }
  }
  await localPage.close()
}
// subtitles upload
async function subPart (pathToFile, localPage) {
  await localPage.waitForSelector('[id="add-translation"]')
  await localPage.evaluate(() => document.querySelectorAll('[id="add-translation"]')[0].click())
  await localPage.waitForSelector('[id="choose-upload-file"]')
  await localPage.click('#choose-upload-file')
  const continueBtnXPath = '//*[normalize-space(text())=\'Continue\']'
  await localPage.waitForXPath(continueBtnXPath)
  const continueBtn = await localPage.$x(continueBtnXPath)

  // click ion Select Files & upload the file
  const [fileChooser] = await Promise.all([
    localPage.waitForFileChooser(),
    continueBtn[0].click() // button that triggers upload
  ])

  await fileChooser.accept([pathToFile])
  await localPage.waitForSelector('[label="Caption"]')

  const publishXPath = '//*[normalize-space(text())=\'Publish\']/parent::*[not(@disabled)]'
  await localPage.waitForXPath(publishXPath)
  const publish = await localPage.$x(publishXPath)

  await publish[publish.length - 1].click()

  for (const val of publish) { await localPage.evaluate(el => { el.textContent = 'old publish' }, val) }
  /*
  await localPage.evaluate(() => {
    if (document.querySelector('[id="add-translation"]')) { document.querySelector('[id="add-translation"]').setAttribute('id', 'oldbtn') }
  })
*/
  await localPage.waitForFunction('document.querySelector(\'[label="Caption"]\') === null')
  await localPage.waitForFunction('document.querySelector(\'[id="add-translation"]\') === null')
}

// Add title & description in subtitles pages
async function titleDescPart (title, desc, localPage) {
  await localPage.waitForSelector('[id="add-translation"]')
  await localPage.evaluate(() => document.querySelectorAll('[id="add-translation"]')[0].click())
  const titleXPath = '[aria-label="Title *"]'
  await localPage.waitForSelector(titleXPath)
  // Add the title value
  await localPage.focus(titleXPath)
  await localPage.type(titleXPath, capitalize(title).substring(0, maxTitleLen))

  // Add the title value
  // await page.focus(`[placeholder="Description"]`)

  await localPage.type('[placeholder="Description"][spellcheck="true"]:enabled', desc.substring(0, maxDescLen))

  const publishBtnXPath = '//*[normalize-space(text())=\'Publish\']/parent::*[not(@disabled)]'
  await localPage.waitForXPath(publishBtnXPath)
  const publish = await localPage.$x(publishBtnXPath)
  // remove the first add button before clicking publish
  await localPage.evaluate(() => document.querySelector('[id="add-translation"]').setAttribute('id', 'oldbtn'))
  await publish[publish.length - 1].click()

  for (const val of publish) { await localPage.evaluate(el => { el.textContent = 'old publish' }, val) }

  // change attribute values to avoid problems
  await localPage.evaluate(() => document.querySelector('[aria-label="Title *"]').setAttribute('aria-label', 'old title'))
  await localPage.evaluate(() => document.querySelector('[placeholder="Description"][spellcheck="true"]:enabled').setAttribute('placeholder', 'desc'))
  // await localPage.evaluate(() => document.querySelector('[id="add-translation"]').setAttribute('id', 'oldbtn'))
  // await localPage.waitForFunction('document.querySelector(\'[id="add-translation"]\') === null')
}
// Select new language
async function addNewLang (langVal, localPage) {
  // Adding new language
  const addLangBtnXPath = '//*[normalize-space(text())=\'Add language\']'
  await localPage.waitForXPath(addLangBtnXPath)
  const Addlang = await localPage.$x(addLangBtnXPath)
  await localPage.evaluate(el => el.click(), Addlang[0])
  const langValXPath = '//*[normalize-space(text())=\'' + langVal + '\']'
  await localPage.waitForXPath(langValXPath)
  const langName = await localPage.$x(langValXPath)
  await localPage.evaluate(el => el.click(), langName[langName.length - 1])
}
