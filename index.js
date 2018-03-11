const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('database')
const express = require('express')
const app = express()
const axios = require('axios')
const config = require('./config.js')
const telegramBaseUrl = config.TELEGRAM_API_BASE_URL + config.TELEGRAM_BOT_ID
const cheerio = require('cheerio')
const bodyParser = require('body-parser')
const TelegramBot = require('node-telegram-bot-api')
const bot = new TelegramBot(config.TELEGRAM_BOT_ID)

// Commands
const helpCommand = require('./commands/help')

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static('public'))

app.get('/', (req, res) => res.send('Hello World!'))

app.post(`/new_message_${config.TELEGRAM_BOT_ID}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
})

bot.on('message', msg => {
  if (msg.message === '/help') {
    bot.sendMessage(msg.chat.id, helpCommand)
  }
  else {
    bot.sendMessage(msg.chat.id, 'I am alive!')
  }
});

app.get('/send_message/:message', (req, res) => {
  bot.sendMessage(config.TELEGRAM_CHAT_ID, req.params.message)
  return res.send('ok')
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
              const message = `${mangaName} chapter ${newest} is here! https://manganel.me/chapter/${mangaSlug}/chapter-${newest}`

              // Update latest chapter in database
              db.run(`UPDATE manga SET latest_chapter = ${newest} WHERE slug = '${mangaSlug}'`)

              // Send message
              bot.sendMessage(config.TELEGRAM_CHAT_ID, message)
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

app.listen(config.PORT, () => console.log(`Manga notifier kun listening on port ${config.PORT}!`))
