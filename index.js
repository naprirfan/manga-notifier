var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('database');

const express = require('express')
const app = express()
const axios = require('axios')
const config = require('./config.js')
const telegramBaseUrl = config.TELEGRAM_API_BASE_URL + config.TELEGRAM_BOT_ID
const cheerio = require('cheerio')
const bodyParser = require('body-parser');

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/new_message', (req, res) => {
  const { message } = req.body
  return res.redirect(`/send_message/${config.TELEGRAM_CHAT_ID}/${message}_from_bot!`)
})

app.get('/send_message/:chat_id/:text*', (req, res) => {

  axios.get(`${telegramBaseUrl}/sendMessage?chat_id=${req.params.chat_id}&text=${req.params.text}`)
    .then(response => {
      return res.send('ok')
    })
    .catch(error => {
      console.log(error)
      return res.end('error')
    })
})

app.get('/get_latest_chapter_from_manganel', (req, res) => {

  db.serialize(function() {
    db.each("SELECT * FROM manga", function(err, row) {
      const mangaName = row.display
      const mangaSlug = row.slug
      const latest = row.latest_chapter
      const newest = latest + 1

      let instance = axios.create();
      instance.defaults.timeout = 10000;
      instance.get(`https://manganel.me/chapter/${mangaSlug}/chapter-${newest}`)
        .then(response => {
          if (response && response.data && response.status === 200) {
            let $ = cheerio.load(response.data)
            if ($('#mangareader').length) {
              // Build message
              let encodedUrl = `https%3A%2F%2Fmanganel.me%2Fchapter%2F${mangaSlug}%2Fchapter-${newest}`
              const message = `${mangaName} chapter ${newest} is here! ${encodedUrl}`

              // Update latest chapter in database
              db.run(`UPDATE manga SET latest_chapter = ${newest} WHERE slug = '${mangaSlug}'`)

              // Send message
              axios.get(`${telegramBaseUrl}/sendMessage?chat_id=${config.TELEGRAM_CHAT_ID}&text=${message}`)
                .then(response => {
                  console.log('ok')
                })
                .catch(error => {
                  console.log(error)
                })
            }
            else {
              console.log('Manga not available yet')
            }
          }
        })
        .catch(error => {
          console.log(error)
        })
    });

  })

  return res.end('ok')

})

app.listen(3000, () => console.log('Manga notifier kun listening on port 3000!'))
