
import mime from 'mime-types'
import WebTorrent from 'webtorrent'
import dragDrop from 'drag-drop'
import Webamp from 'webamp'
import keys from './util/keys'
import getFileType from './util/get-file-type'
import getRandomImage from './util/get-random-image'

// document.addEventListener('DOMContentLoaded', init)

// Check if Winamp is supported in this browser
if (!Webamp.browserIsSupported()) {
  alert('Oh no! Webamp does not work!')
  throw new Error("What's the point of anything?")
}

const baseUrl = `${window.location.protocol}//${window.location.host}`
const webampWindows = {
  main: {
    position: { x: -275, y: 0 }
  },
  equalizer: {
    open: false,
    hidden: false,
    shade: false,
    position: { x: -275, y: 116 }
  },
  playlist: {
    open: true,
    doubled: true,
    position: { x: 0, y: 0 },
    size: [0, 4]
  }
}
const webamp = new Webamp({
  enableHotkeys: true,
  __initialWindowLayout: {
    ...webampWindows
  }
})

dragDrop('body', function (files) {
  console.log('GOT FILES:', files)
  client.seed(files, (torrent) => {
    console.log('Client is seeding:', torrent.infoHash)

    // Update URL.
    const url = `${baseUrl}#${torrent.magnetURI}`
    window.history.pushState({}, document.title, url)
  })

  filename = file.name
  const reader = new window.FileReader()
  reader.addEventListener('load', e => {
    const data = e.target.result
    player.load(data).play()
  })
  reader.addEventListener('error', err => {
    console.error('FileReader error' + err)
    toast.show('Oops! Something went wrong :(')
  })
  reader.readAsArrayBuffer(file)
})

async function init () {
  const client = new WebTorrent()
  const $background = document.getElementById('background')
  const $input = document.getElementById('cid')
  const $loading = document.getElementById('loading')
  let hiddenLoadingText = true
  let loadingTextTimer
  let isLoading = false
  let loadingHash
  let totalFiles = 0
  let loadedFiles = 0

  setBackground()

  // Render Webamp.
  webamp.renderWhenReady(document.getElementById('winamp-container'))

  keys('#cid', 'Enter', () => {
    const magnet = $input.value
    if (!magnet) return
    load(magnet)
  })

  function setBackground (img) {
    img = img || getRandomImage()
    $background.style.backgroundImage = `url(${img})`
  }

  function setLoading (percentage) {
    $loading.style.width = `${percentage}vw`
  }

  function showLoading () {
    isLoading = true
    loadingTextTimer = setTimeout(() => {
      hiddenLoadingText = false
      $loading.classList.add('init')
    }, 1000)
    $loading.style.opacity = '1'
  }

  function hideLoading () {
    isLoading = false
    $loading.style.opacity = '0'
    setTimeout(() => {
      $loading.style.width = '0vw'
    }, 500)
  }

  function setHistory (magnet, partial = false) {
    window.history.pushState({}, null, `#${magnet}`)
  }

  async function loadFile (file) {
    console.log('loadFile:', file)

    const { name } = file

    // Audio file.
    if (getFileType(name) === 'audio') {
      console.log('Adding audio track...', file)
      file.getBlobURL((error, url) => {
        loadedFiles += 1
        console.log(`Got blob url for ${name} - ${loadedFiles} out of ${totalFiles}`, { url })
        webamp.appendTracks([
          {
            url,
            defaultName: name
          }
        ])

        // Hide loading after all files were loaded.
        if (loadedFiles === totalFiles) {
          console.log('All files loaded')
          hideLoading()
        }
      })
    }

    // Image file.
    if (getFileType(name) === 'image' && !alreadySetBackground) {
      console.log('Using background from torrent', file)
      file.getBlobURL((error, url) => {
        setBackground(url)
        alreadySetBackground = true
      })
    }
  }

  async function load (magnet) {
    if (isLoading) hideLoading()

    // Set magnet in the URL.
    setHistory(magnet)

    console.log(`Loading ${magnet}...`)
    let total = 0
    let loadedItems = 0
    showLoading()

    client.add(magnet, torrent => {
      console.log('Added torrent', torrent)
      totalFiles = torrent.files?.length || 0

      // Iterate files and add audio files one by one.
      torrent.files.forEach(loadFile)

      torrent.on('done', () => {
        console.log('All files downloaded!')
        hideLoading()
      })
    })

    client.on('error', error => {
      console.log('ERROR', error)
    })
  }

  // Read hash from URL.
  const magnet = window.location.hash.substr(1)
  if (magnet) {
    console.log(`Auto loading magnet: ${magnet}`)
    load(magnet)
  }
}

init()
