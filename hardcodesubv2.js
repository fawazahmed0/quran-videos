const fs = require('fs')
const path = require('path')
const os = require('os')
const fetch = require('node-fetch')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality.
// Any number of plugins can be added through `puppeteer.use()`
const puppeteer = require('puppeteer-extra')
// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// each index corresponds to 001.mp4 .. to n.mp4
// Duration of pixabay videos in seconds
const pixabayDuration = [13, 9, 35, 33, 24, 7, 16, 25, 24, 43, 41, 53, 35, 29, 24, 18, 10, 30]
// Duration by chapter wise in seconds
const chapDuration = [40, 7549, 4511, 4399, 3418, 3751, 3945, 1511, 3126, 2267, 2507, 2200, 1052, 1148, 841, 2327, 1866, 1842, 1188, 1511, 1557, 1631, 1402, 1658, 1109, 1640, 1347, 1717, 1210, 1005, 583, 453, 1495, 1005, 914, 964, 1146, 946, 1622, 1484, 1005, 972, 1021, 509, 597, 763, 721, 630, 386, 499, 408, 369, 371, 350, 560, 531, 743, 572, 600, 422, 268, 197, 239, 343, 322, 287, 406, 376, 359, 272, 259, 293, 239, 290, 217, 347, 258, 299, 244, 210, 145, 141, 239, 153, 178, 90, 86, 97, 239, 91, 68, 102, 49, 31, 49, 83, 53, 117, 55, 54, 82, 51, 14, 39, 28, 21, 35, 12, 36, 19, 26, 11, 19, 40]
const pixabayPath = path.join(__dirname, 'pixabay videos')
const pixabayFiles = fs.readdirSync(pixabayPath).sort()

const audioPath = path.join(__dirname, 'audios')

// stores the end result
const hardcodedSubPath = path.join(__dirname, 'output')

const subtitlesPath = path.join(__dirname, 'subtitles')
// stores the uploaded link in edition file name
const uploadLinkPath = path.join(__dirname, 'uploaded')

const metadataPath = path.join(__dirname, 'metadata')
const titlePath = path.join(metadataPath, 'titles')

// Translated tags & description
const tagsPath = path.join(metadataPath, 'tags.json')
const tagsJSON = readJSON(tagsPath)
const descriptionPath = path.join(metadataPath, 'description.json')
const descriptionJSON = readJSON(descriptionPath)

// make hardcodedsubtitle vidoe output directory if it doesn't exist
fs.mkdirSync(hardcodedSubPath, {
  recursive: true
})
// make uploadedlink path, which will save the editions uploaded youtube links
fs.mkdirSync(uploadLinkPath, {
  recursive: true
})

// keep track of where to start
const stateFile = path.join(__dirname, 'state.txt')

// Max videos to upload daily
const maxuploads = 95
// No of uploads concurrently
const maxConcurrentUpload = 2

let uploaded
// Stores todays date i.e 11 or 12 etc
let day

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
let browser
const height = 1024
const width = 1280
const timeout = 60000

const uploadURL = 'https://www.youtube.com/upload'
const studioURL = 'https://studio.youtube.com'

// hardcodetime/video duration ratio for each pixa video
const videoTimeRatio = [0.14312820512820512, 0.35302564102564105, 0.22987179487179488, 0.34197435897435896, 0.221, 0.20241025641025642, 0.18035897435897436, 0.2297948717948718, 0.23971794871794871, 0.18792307692307691, 0.25887179487179485, 0.2291025641025641, 0.20997435897435898, 0.24566666666666667, 0.2414102564102564, 0.34212820512820513, 0.24666666666666667, 0.4205897435897436]
// Average hardcodetime/video duration ratio for pixa video
// const avgVideoRatio = 0.3

// stores the pixavideos index thats needs to be ignored, as they are distracting
const ignorePixaVidIndex = [2, 10,12, 14]

// Large size pixa indices, produces large size on video generation
const largeSizePixaIndices = [2, 4, 7, 8, 10, 13, 14, 15, 16, 17]

// stores the pixavideos index that needs to be used
const allowedPixaVidIndex = [...Array(pixabayFiles.length).keys()].filter(e => !ignorePixaVidIndex.includes(e))
// Stores the pixavideos index that are of small size, to be used for large chapters
const allowedPixaVidIndexSmallSize = [...Array(pixabayFiles.length).keys()].filter((e, i) => !ignorePixaVidIndex.concat(largeSizePixaIndices).includes(e))
// stores random numbers by ignoring few ignored pixabay indices
const adjustedRandomArray = []
for (let i = 1; i <= 114; i++) {
  let allowdPixIndices
  // if chapter duratio is less than 30mins ,use normal index, else use indexes which generates video of small size
  if (chapDuration[i] < 1800) { allowdPixIndices = allowedPixaVidIndex } else { allowdPixIndices = allowedPixaVidIndexSmallSize }

  const randomIndex = getRandomNo(allowdPixIndices.length)
  adjustedRandomArray[i] = allowdPixIndices[randomIndex]
}

// Stores the beginning time
const beginTime = new Date().getTime()

// Actions job timelimit of 6 hours
const sixHoursMillis = 21600000
// Slack for job timelimit for sixty minutes
const sixtyMinsMillis = 3600000
// max duration with slack, i.e 5hours
const maxDuration = sixHoursMillis - sixtyMinsMillis

const maxTitleLen = 100
const maxDescLen = 5000
// Multiply with this while checking remaining time
const timeMultiplier = 2

// stores the editionJSON from quran api
let editionsJSON

// stores the editions to be added priority wise
const editionsList = ['eng-ummmuhammad', 'zho-majian1', 'zho-muhammadmakin', 'spa-raulgonzalezbor', 'ara-sirajtafseer', 'hin-suhelfarooqkhan', 'ben-zohurulhoque', 'rus-vporokhova', 'por-samirelhayek', 'ace-tgkhmahjiddinju', 'afr-imammabaker', 'amh-muhammedsadiqan', 'asm-shaykhrafeequli', 'aze-vasimmammadaliy', 'bam-deenmuhammad', 'ber-ramdaneatmansou', 'bos-wwwislamhouseco', 'bul-tzvetantheophan','mya-ghazimohammadha', 'cat-yousseflyoussi', 'ces-prekladihrbek', 'dag-muhammadbabaght', 'dan-vandetaal', 'deu-frankbubenheima', 'div-officeofthepres', 'epo-hadiabdollahian', 'fas-unknown', 'fil-wwwislamhouseco', 'fin-unknown', 'fra-shahnazsaidiben', 'guj-rabilaalomari', 'hau-abubakarmahmoud', 'heb-unknown', 'hrv-unknown', 'hun-drahmedabdelrah', 'ilp-abdulazizgroaal', 'ind-unknown', 'ita-hamzarobertopic', 'jav-unknown', 'jpn-ryoichimita','urd-muhammadjunagar-la', 'kan-abdussalamputhi', 'kaz-khalifahaltaich', 'urd-abulaalamaududi','khm-cambodianmuslim', 'kin-rmcrwanda', 'kir-shamsaldinhakim', 'kmr-unknown', 'knx-unknown', 'kor-unknown', 'kur-muhammadsalehba', 'lat-hadiabdollahian', 'lug-fareeqmusa', 'luy-mohammadramadha', 'mal-muhammadkarakun', 'mar-muhammadshafiia', 'mkd-sheikhhassangil', 'mlt-martinrzammitmu', 'mrw-guroalimsaroman', 'msa-abdullahmuhamma', 'nep-ahlalhadithcent', 'nld-unknown', 'nor-einarberg', 'nya-alhajiyusufmuha', 'orm-ghaliapapurapag', 'pan-drmuhamadhabibb', 'pol-jozefabielawski', 'pus-zakariaabulsala', 'ron-unknown', 'run-sheikhamissirad', 'sin-wwwislamhouseco', 'slk-hadiabdollahian', 'sna-abdullahjmadini', 'snd-tajmehmoodamrot', 'som-shaykhmahmoodmu', 'sot-sheikheliaskeke', 'sqi-unknown', 'swa-alimuhsinalbarw', 'swe-knutbernstrom', 'tam-janturstfoundat', 'tat-yakubibnnugman', 'tel-abdulraheemmoha', 'tgk-wwwislamhouseco', 'tha-kingfahadquranc', 'tur-ynozturk', 'uig-shaykhmuhammads', 'ukr-yakubovych', 'uzb-muhammadsodikmu', 'vie-hassanabdulkari', 'xho-imaamismaaeelng', 'yor-shaykhaburahima', 'zul-iqembulezifundi']

// Youtube dropdown languages
let ytLangs = ['Abkhazian', 'Afar', 'Afrikaans', 'Akan', 'Albanian', 'American Sign Language', 'Amharic', 'Arabic', 'Aramaic', 'Armenian', 'Assamese', 'Aymara', 'Azerbaijani', 'Bangla', 'Bashkir', 'Basque', 'Belarusian', 'Bhojpuri', 'Bislama', 'Bosnian', 'Breton', 'Bulgarian', 'Burmese', 'Cantonese', 'Cantonese (Hong Kong)', 'Catalan', 'Cherokee', 'Chinese', 'Chinese (China)', 'Chinese (Hong Kong)', 'Chinese (Simplified)', 'Chinese (Singapore)', 'Chinese (Taiwan)', 'Chinese (Traditional)', 'Choctaw', 'Corsican', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Dutch (Belgium)', 'Dutch (Netherlands)', 'Dzongkha', 'English', 'English (Canada)', 'English (India)', 'English (Ireland)', 'English (United Kingdom)', 'English (United States)', 'Esperanto', 'Estonian', 'Faroese', 'Fijian', 'Filipino', 'Finnish', 'French', 'French (Belgium)', 'French (Canada)', 'French (France)', 'French (Switzerland)', 'Fulah', 'Galician', 'Georgian', 'German', 'German (Austria)', 'German (Germany)', 'German (Switzerland)', 'Greek', 'Guarani', 'Gujarati', 'Haitian Creole', 'Hakka Chinese', 'Hakka Chinese (Taiwan)', 'Hausa', 'Hebrew', 'Hindi', 'Hindi (Latin)', 'Hiri Motu', 'Hungarian', 'Icelandic', 'Igbo', 'Indonesian', 'Interlingua', 'Interlingue', 'Inuktitut', 'Inupiaq', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kalaallisut', 'Kannada', 'Kashmiri', 'Kazakh', 'Khmer', 'Kinyarwanda', 'Klingon', 'Korean', 'Kurdish', 'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Luxembourgish', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Manipuri', 'Maori', 'Marathi', 'Masai', 'Min Nan Chinese', 'Min Nan Chinese (Taiwan)', 'Mizo', 'Mongolian', 'Nauru', 'Navajo', 'Nepali', 'Norwegian', 'Occitan', 'Odia', 'Oromo', 'Pashto', 'Persian', 'Persian (Afghanistan)', 'Persian (Iran)', 'Polish', 'Portuguese', 'Portuguese (Brazil)', 'Portuguese (Portugal)', 'Punjabi', 'Quechua', 'Romanian', 'Romanian', 'Romansh', 'Rundi', 'Russian', 'Russian (Latin)', 'Samoan', 'Sango', 'Sanskrit', 'Sardinian', 'Scottish Gaelic', 'Serbian', 'Serbian (Cyrillic)', 'Serbian (Latin)', 'Serbian (Latin)', 'Sherdukpen', 'Shona', 'Sicilian', 'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'Southern Sotho', 'Spanish', 'Spanish (Latin America)', 'Spanish (Mexico)', 'Spanish (Spain)', 'Spanish (United States)', 'Sundanese', 'Swahili', 'Swati', 'Swedish', 'Tajik', 'Tamil', 'Tatar', 'Telugu', 'Thai', 'Tibetan', 'Tigrinya', 'Tok Pisin', 'Tongan', 'Tsonga', 'Tswana', 'Turkish', 'Turkmen', 'Ukrainian', 'Urdu', 'Uzbek', 'Vietnamese', 'Volapük', 'Võro', 'Welsh', 'Western Frisian', 'Wolof', 'Xhosa', 'Yiddish', 'Yoruba', 'Zulu']
ytLangs = ytLangs.map(e => e.toLowerCase())

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

// capitalizes all the first letters in a sentense
const capitalize = words => words.split(' ').map(w => w[0].toUpperCase() + w.substring(1)).join(' ')

async function begin () {
  [editionsJSON] = await getLinksJSON([editionsLink + '.json'])
  await launchBrowser()
  const page = await getNewPage()
  for (let i = 0; i < 2; i++) {
    try {
      await login(page)
      break
    } catch (error) {
      console.error(error)
      const nextText = i === 0 ? ' trying again' : ' failed again, stopping everything'
      console.log('Login failed ', nextText)
      if (i === 1) {
        await browser.close()
        return
      }
    }
  }
  // close the page to save resources
  await page.close()
  // Holds  uploading promises
  const PromiseHolder = []
  // Edition name to Edition Language mapping
  edHolder = {}
  for (const value of Object.values(editionsJSON)) { edHolder[value.name] = value.language }

  let chap, editionName;
  [editionName, chap, uploaded, day] = getState()
  chap = parseInt(chap)
  resetDayValues()

  while (uploaded < maxuploads) {
    // break if cannot encode the video within github actions limit
    if (checkTimeSuffice(chap) === false) { break }

    console.log('beginning for chapter ', chap)

    const editionLang = edHolder[editionName].toLowerCase()

    try {
      const uploadPromise = genUploadWithSub(editionLang, chap, editionName).then(values => {
        uploaded++
        // Remove the promise from PromiseHolder array as it is completed
        PromiseHolder.splice(PromiseHolder.indexOf(uploadPromise), 1)
        return [values[0], values[1]]
      })

      PromiseHolder.push(uploadPromise)
    } catch (error) {
      console.log('uploading video or subtitle uploading failed for ', chap, ' and edition named ', editionName)
      console.error(error)
    }

    chap++
    // if all the chapters are uploaded, then start from new edition & chapter 1
    if (chap > 114) {
      chap = 1
      const editionIndex = editionsList.indexOf(editionName)
      editionName = editionsList[editionIndex + 1]
    }

    // if  promise holder has reached max concurrent uploads, then wait for atleast one of them to complete
    if (PromiseHolder.length === maxConcurrentUpload) {
      console.log('inside promise race')
      const [chapVal, edVal] = await Promise.race(PromiseHolder)
      // Save the current chap & edition state, to recover from here in case of error
      saveState(edVal, chapVal)
    }
    resetDayValues()
  }

  // wait for remaining uploads & subtitles uploads
  await Promise.all(PromiseHolder)
  // Save the current chap & edition state, to recover from here in case of error
  saveState(editionName, chap)

  await browser.close()
}

begin()

// Returns true if sufficient time is there to generate the video in actions
function checkTimeSuffice (chap) {
  const currentDuration = new Date().getTime() - beginTime

  const remainingDuration = maxDuration - currentDuration

  const currChapDuration = chapDuration[chap] * 1000
  const randomNo = adjustedRandomArray[chap]
  // stop if uploaded files had reached the youtube upload limit or
  // remaining duration is not enought to hardcode the subtitles & upload
  if (remainingDuration < currChapDuration * videoTimeRatio[randomNo] * timeMultiplier) { return false } else { return true }
}
// reset the uploaded to 0 if todays date is different and update the day value
function resetDayValues () {
  // if now is different date, then the upload limits resets
  if (day != new Date().toISOString().substring(8, 10)) {
    uploaded = 0
    day = new Date().toISOString().substring(8, 10)
  }
}

async function generateMP4 (editionName, chap) {
  // return path.join(hardcodedSubPath, (chap + '').padStart(3, '0') + '.mp4')
  const randomNo = adjustedRandomArray[chap]
  console.log('selected pixabay video index is ', randomNo)
  // Pixabay Videos to use for recitation
  const pixaFileWithPath = path.join(pixabayPath, pixabayFiles[randomNo])

  // Increase the video size to more than chapter duration
  const repeat = Math.ceil(chapDuration[chap - 1] / pixabayDuration[randomNo])

  const paddedI = (chap + '').padStart(3, '0')
  const fileSavePath = path.join(hardcodedSubPath, paddedI + '.mp4')
  await exec('ffmpeg ' + ['-stream_loop', repeat, '-i', '"' + pixaFileWithPath + '"', '-i', '"' + path.join(audioPath, paddedI + '.mp3') + '"', '-vf', '"subtitles=subtitles/' + editionName + '/' + chap + '.srt:force_style=\'Alignment=2,OutlineColour=&H100000000,BorderStyle=3,Outline=1,Shadow=0,Fontsize=18,MarginL=0,MarginV=15\'"', '-crf', '24', '-vcodec', 'libx264', '-preset', 'ultrafast', '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest', '"' + fileSavePath + '"'].join(' '), { maxBuffer: Infinity })
  return fileSavePath
}

async function deleteFile (pathToFile) {
  // Delete the uploaded video to save space in actions
  fs.unlinkSync(pathToFile)
  // Delete temp directory in actions
  if (process.env.CI) {
    await exec('del /q/f/s ' + process.env.tempdir)
    await exec('del /q/f/s ' + path.join(os.tmpdir(), '*'))
  }
}

// context and browser is a global variable and it can be accessed from anywhere
// function that launches a browser
async function launchBrowser () {
  browser = await puppeteer.launch({ headless: true })
}

async function getNewPage () {
  const page = await browser.newPage()
  await page.setDefaultTimeout(timeout)
  await page.setViewport({ width: width, height: height })
  return page
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
  await localPage.type('input[type="password"]', pass)

  await localPage.keyboard.press('Enter')

  await localPage.waitForNavigation()

  try {
    const selectBtnXPath = '//*[normalize-space(text())=\'Select files\']'
    await localPage.waitForXPath(selectBtnXPath)
  } catch (error) {
    console.log('Login failed, have to try securtiy bypass')
    console.error(error)
    await securityBypass(localPage)
  }
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

  const enterRecoveryXPath = '//*[normalize-space(text())=\'Enter recovery email address\']'
  await localPage.waitForXPath(enterRecoveryXPath)
  await localPage.focus('input[type="email"]')
  await sleep(500)
  await localPage.type('input[type="email"]', recovery)
  await localPage.keyboard.press('Enter')
  await localPage.waitForNavigation({
    waitUntil: 'networkidle0'
  })
  const selectBtnXPath = '//*[normalize-space(text())=\'Select files\']'
  await localPage.waitForXPath(selectBtnXPath)
}
// Generates the video and then uploads it and then uploads it's subtitles
async function genUploadWithSub (editionLang, chap, editionName) {
  const fileSavePath = await generateMP4(editionName, chap)
  console.log('video generation complete for ', chap)
  let subLink;
  try {
    subLink = await uploadVideo(fileSavePath, editionLang, chap, editionName)
  } catch (error) {
    console.log("error while uploading video, trying one last attempt")
    console.error(error)
    subLink = await uploadVideo(fileSavePath, editionLang, chap, editionName)
    
  }
  console.log('Uploading completed for ', chap)
  await uploadSub(chap, subLink)
  await deleteFile(fileSavePath)
  return [chap, editionName]
}

async function uploadVideo (pathToFile, lang, chapter, editionName) {
  console.log('beginning video upload for chaper, ', chapter)
  const page = await getNewPage()
  const chapTitlePath = path.join(titlePath, chapter + '.json')
  const titleJSON = readJSON(chapTitlePath)
  // if language exists, then use the language name, otherwise get it from mappings objects
  const gtransLang = titleJSON[lang] ? lang : getKeyByValue(gTransToEditionLang, lang)
  const ytLang = ytLangs.includes(lang) ? capitalize(lang) : getKeyByValue(ytToEditionLang, lang)

  const title = titleJSON[gtransLang] ? titleJSON[gtransLang] : titleJSON.english + ' | ' + lang
  const description = descriptionJSON[gtransLang] ? descriptionJSON[gtransLang] : descriptionJSON.english
  let tags = tagsJSON[gtransLang] ? tagsJSON[gtransLang] : tagsJSON.english
  let playlistNameText = tags[0] + ' ' + lang
  playlistNameText = capitalize(playlistNameText).substring(0, 148)
  const videoLang = ytLang || 'English'

  const finalTitle = capitalize(title).substring(0, maxTitleLen)

  // Also add english tags in addition to translated tags
  if (gtransLang !== 'english') { tags = tags.concat(tagsJSON.english) }

  await page.evaluate(() => { window.onbeforeunload = null })
  await page.goto(uploadURL)

  const closeBtnXPath = '//*[normalize-space(text())=\'Close\']'
  const selectBtnXPath = '//*[normalize-space(text())=\'Select files\']'
  for (let i = 0; i < 2; i++) {
    try {
      await page.waitForXPath(selectBtnXPath)
      await page.waitForXPath(closeBtnXPath)
      break
    } catch (error) {
      const nextText = i === 0 ? ' trying again' : ' failed again'
      console.log('failed to find the select files button for chapter ', chapter, nextText)
      console.error(error)
      await page.evaluate(() => { window.onbeforeunload = null })
      await page.goto(uploadURL)
    }
  }
  // Remove hidden closebtn text
  const closeBtn = await page.$x(closeBtnXPath)
  await page.bringToFront()
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
  await page.bringToFront()
  // Add the title value
  await textBoxes[0].focus()
  await sleep(1000)
  await textBoxes[0].type(finalTitle)
  // Add the Description content
  await textBoxes[1].type(description.substring(0, maxDescLen))

  const childOption = await page.$x('//*[contains(text(),"No, it\'s")]')
  console.log("child option click")
  await childOption[0].click()

  const moreOption = await page.$x('//*[normalize-space(text())=\'Show more\']')
  console.log("more option click")
  await moreOption[0].click()
  const playlist = await page.$x('//*[normalize-space(text())=\'Select\']')
  let createplaylistdone
  console.log("playlist click")
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
    await page.keyboard.type(' ' + playlistNameText)
    // click create & then done button
    const createplaylistbtn = await page.$x('//*[normalize-space(text())=\'Create\']')
    await page.evaluate(el => el.click(), createplaylistbtn[1])
    createplaylistdone = await page.$x('//*[normalize-space(text())=\'Done\']')
    await page.evaluate(el => el.click(), createplaylistdone[0])
    // assign newPlaylist name, so in next chapter time it will be used to select that playlist
  } else {
    // Selecting playlist
    await page.evaluate(el => el.click(), playlist[0])
    const playlistToSelectXPath = '//*[normalize-space(text())="' + playlistNameText + '"]'
    await page.waitForXPath(playlistToSelectXPath)
    const playlistNameSelector = await page.$x(playlistToSelectXPath)
    await page.evaluate(el => el.click(), playlistNameSelector[0])
    createplaylistdone = await page.$x('//*[normalize-space(text())=\'Done\']')
    await page.evaluate(el => el.click(), createplaylistdone[0])
  }
  // Add tags
  await page.focus('[placeholder="Add tag"]')
  await page.type('[placeholder="Add tag"]', tags.join(', ').substring(0, 495) + ', ')
  console.log("video language ",videoLang )
  console.log("lang click")
  // Selecting video language
  const langHandler = await page.$x('//*[normalize-space(text())=\'Video language\']')
  await page.evaluate(el => el.click(), langHandler[0])
  console.log("lang click 2")
  const langName = await page.$x('//*[normalize-space(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"))=\'' + videoLang.toLowerCase() + '\']')
  //const langName = await page.$x('//*[normalize-space(text())=\'' + videoLang + '\']')
  await page.evaluate(el => el.click(), langName[langName.length - 1])

  // click next button
  const nextBtnXPath = '//*[normalize-space(text())=\'Next\']/parent::*[not(@disabled)]'
  await page.waitForXPath(nextBtnXPath)
  let next = await page.$x(nextBtnXPath)
  console.log("clicking first next button for chapter",chapter)
  await next[0].click()
  await sleep(2000)
  await page.waitForXPath(nextBtnXPath)
  // click next button
  next = await page.$x(nextBtnXPath)
  await next[0].click()
  console.log("clicking second next button for chapter",chapter)

  await sleep(2000)
  next = await page.$x(nextBtnXPath)
  await next[0].click()
  console.log("clicking third next button for chapter",chapter)

  await sleep(2000)

  // Get publish button
  const publishXPath = '//*[normalize-space(text())=\'Publish\']/parent::*[not(@disabled)]'
  await page.waitForXPath(publishXPath)
  // save youtube upload link
  await page.waitForSelector('[href^="https://youtu.be"]')
  const uploadedLinkHandle = await page.$('[href^="https://youtu.be"]')
  const uploadedLink = await page.evaluate(e => e.getAttribute('href'), uploadedLinkHandle)
  fs.appendFileSync(path.join(uploadLinkPath, editionName + '.txt'), 'chapter ' + chapter + ' ' + uploadedLink + '\n')
  console.log("clicking publish button for chapter",chapter)
  // translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')
  let publish;
  for(let i=0;i<10;i++){
    try {
      publish = await page.$x(publishXPath)
      await publish[0].click()
      break
    } catch (error) {
      await page.waitForTimeout(5000)
    }
  
  }
  // await page.waitForXPath('//*[contains(text(),"Finished processing")]', { timeout: 0})
  // Wait for closebtn to show up
  await page.waitForXPath(closeBtnXPath)
  let subLink
  for (let i = 0; i < 3; i++) {
    try {
      subLink = await getSubLink(finalTitle, page)
      break
    } catch (error) {
      const nextText = i !== 2 ? ' trying again' : ' failed again, sublink will be undefined for title '+finalTitle
      console.log('error getting subLink in uploadVideo function ', nextText)
      console.error(error)
      // wait for sometime before trying again, so that the subtitles link comes up
      await sleep(300000)
    }
  }

  await page.close()
  return subLink
}

async function getSubLink (title, page) {
  await page.bringToFront()
  await page.evaluate(() => { window.onbeforeunload = null })
  await page.goto(studioURL)
  const subtitlesTabXPath = '//*[normalize-space(text())=\'Subtitles\']'
  await page.waitForXPath(subtitlesTabXPath)

  let subLink
  for (let i = 0; i < 2; i++) {
    try {
      const subtitlesTab = await page.$x(subtitlesTabXPath)
      console.log("clicking subtitles tab")
      await page.evaluate(el => el.click(), subtitlesTab[0])
      await page.waitForNavigation()
      await page.waitForSelector('[id="video-title"]')
      await page.waitForFunction('document.querySelectorAll(\'[id="video-title"]\').length > 5')
      console.log("title text is ",title)
      console.log("fetching sublink")
      subLink = await page.evaluate(titletext => Array.from(document.querySelectorAll('[id="video-title"]')).map(e => [e.textContent.trim(), e.href]).filter(e => e[0]!=="" && titletext.toLowerCase().includes(e[0].slice(0,-3).toLowerCase()) && /.*?translations$/.test(e[1]))[0][1], title)
      break
    } catch (error) {
      const nextText = i === 0 ? ' trying again' : ' failed again'
      console.log('error in sublink ', nextText)
      console.error(error)
      if (i === 1) { throw error }
      await sleep(6000)
      await page.evaluate(() => { window.onbeforeunload = null })
      await page.goto(studioURL)
      await page.waitForXPath(subtitlesTabXPath)
    }
  }

  return subLink
}

// upload the subtitles
async function uploadSub (chapter, subLink) {
  console.log('beginning subtitles upload for ', chapter)
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
  const maxErrors = 15

  // Go to upload subtitles link
  await localPage.goto(subLink)
  await localPage.bringToFront()
  // upload the subtitle for english language, as it is the default title & description language
  for (let i = 0; i < 2; i++) {
    try {
      await subPart(path.join(subtitlesPath, holdersubmap.English, chapter + '.vtt'), localPage)
      break
    } catch (error) {
      const nextText = i === 0 ? ' trying again' : ' failed again, stopping subtitle upload'
      console.error(error)
      // remove the reload site? dialog
      await localPage.evaluate(() => { window.onbeforeunload = null })
      await localPage.goto(subLink)
      // Sometimes publish button exists which can cause issue
      if (await checkClickPublishBtn(localPage)) { break }
      console.log('uploading first subtitle failed for ', path.join(subtitlesPath, holdersubmap.English, chapter + '.vtt'), nextText)
      if (i === 1) { return }
    }
  }

  delete holdersubmap.English
  for (const [key, value] of Object.entries(holdersubmap)) {
    // if there are more unrecoverable errors, that means there is some problem with the link or the upload did not happen
    if (noOfErrors > maxErrors) {
      console.log('Max Errors exceeded for chapter ', chapter, ' breaking from subupload')
      break
    }
    for (let i = 0; i < 2; i++) {
      try {
        await addNewLang(key, localPage)
        break
      } catch (error) {
        const nextText = i === 0 ? ' trying again' : ' skipping for now'
        console.log('Adding language failed in subtitles for language ', key, 'and chapter ', chapter, nextText)
        console.error(error)
        await localPage.evaluate(() => { window.onbeforeunload = null })
        await localPage.goto(subLink)
        if (i === 1) {
          noOfErrors++
          break
        }
      }
    }

    const lang = edHolder[value].toLowerCase()
    const gtransLang = titleJSON[lang] ? lang : getKeyByValue(gTransToEditionLang, lang)
    const title = titleJSON[gtransLang] ? titleJSON[gtransLang] : titleJSON.english + ' | ' + lang
    const description = descriptionJSON[gtransLang] ? descriptionJSON[gtransLang] : descriptionJSON.english

    for (let i = 0; i < 2; i++) {
      try {
        if (i === 1) { await addNewLang(key, localPage) }
        await titleDescPart(title, description, localPage)
        break
      } catch (error) {
        const nextText = i === 0 ? ' trying again' : ' skipping for now'
        console.log('\nlang\n', key, '\ntitle\n', title, '\ndesc\n', description)
        console.log('Adding titleDescripiton failed for chapter ', chapter, nextText)
        console.error(error)
        // remove the reload site? dialog
        await localPage.evaluate(() => { window.onbeforeunload = null })
        await localPage.goto(subLink)
        if (i === 1) {
        // sometimes publish button exists which could cause this issue
          await checkClickPublishBtn(localPage)
          noOfErrors++
          break
        }
      }
    }
    for (let i = 0; i < 2; i++) {
      try {
        await subPart(path.join(subtitlesPath, value, chapter + '.vtt'), localPage)
        break
      } catch (error) {
        const nextText = i === 0 ? ' trying again' : ' skipping for now'
        console.log('uploading subtitle failed for ', path.join(subtitlesPath, value, chapter + '.vtt'), nextText)
        console.error(error)
        // The uploading subtitles fails for filipino, so don't waste time trying again for it
        if (key === 'Filipino') { break }
        // remove the reload site? dialog
        await localPage.evaluate(() => { window.onbeforeunload = null })
        await localPage.goto(subLink)
        if (i === 1) {
          // sometimes publish button exists which could cause this issue
          await checkClickPublishBtn(localPage)
          noOfErrors++
          break
        }
      }
    }
  }
  await localPage.close()
}

async function checkClickPublishBtn (localPage) {
  try {
    const publishXPath = '//*[normalize-space(text())=\'Publish\']/parent::*[not(@disabled)]'
    await localPage.waitForXPath(publishXPath, { timeout: 10000 })
    const publish = await localPage.$x(publishXPath)
    for (const publishBtn of publish) { await publishBtn.click() }
    return true
  } catch (error) {
    console.log('error while checking publish button')
    return false
  }
}
// subtitles upload
async function subPart (pathToFile, localPage) {
  await localPage.waitForSelector('[id="add-translation"]')
  await localPage.evaluate(() => document.querySelectorAll('[id="add-translation"]')[0].click())
  await localPage.waitForSelector('[id="choose-upload-file"]')
  await localPage.evaluate(() => document.querySelectorAll('[id="choose-upload-file"]')[0].click())
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

function readJSON (pathToJSON) {
  const jsonStr = fs.readFileSync(pathToJSON).toString()
  return JSON.parse(jsonStr)
}

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// get the yesterdays state, so to continue uploading
function getState () {
  return fs.readFileSync(stateFile).toString().split(/\r?\n/)
}

// save the state
function saveState (editionName, chap) {
  fs.writeFileSync(stateFile, editionName + '\n' + chap + '\n' + uploaded + '\n' + day)
}

// Generates random number
function getRandomNo (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

function getKeyByValue (obj, value) {
  return Object.keys(obj).find(key => obj[key].toLowerCase() === value.toLowerCase())
}

// https://www.shawntabrizi.com/code/programmatically-fetch-multiple-apis-parallel-using-async-await-javascript/
// Get links async i.e in parallel
async function getLinksJSON (urls) {
  return await Promise.all(
    urls.map(url => fetch(url).then(response => response.json()))
  ).catch(console.error)
}
