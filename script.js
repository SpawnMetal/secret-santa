import config from './config.js'
import nodeMailer from 'nodemailer'
import * as dotenv from 'dotenv'

console.log('Подготовка...')

dotenv.config()
const log = []
let sendedCount = 0
const {HOST, PORT, USER, PASS, FROM} = process.env

function start() {
  const {subject, text, recipients} = config
  const masResult = []

  if (!subject.length || !text.length) {
    console.error('Введите тему и текст сообщения')
    return
  }

  if (!parse(recipients, masResult)) {
    console.error('Участников должно быть более двух с соблюдением формата Outlook')
    return
  }

  distribute(masResult)
  send(masResult, text, subject)
}

// Парсит строку с участниками
function parse(recipients, masResult) {
  let str = recipients.trim()

  if (!str.length) return false

  let resultMas = str.split(';')

  if (!resultMas.length) return false

  const maxCount = resultMas[resultMas.length - 1].trim().length ? resultMas.length : resultMas.length - 1

  for (let i = 0; i < maxCount; i++) {
    const elemMas = resultMas[i].replace(/ +/g, ' ').trim().split(' ')
    const len = elemMas.length

    if (!len || (len === 1 && !elemMas[0].length)) continue

    for (let j = 0; j < len; j++) if (j === len - 1) elemMas[j] = j === len - 1 ? elemMas[j].replace(/[<>]/g, '').trim() : elemMas[j].trim()
    masResult.push({id: i, fio: elemMas.slice(0, len - 1).join(' '), email: elemMas[len - 1], to: null})
  }

  if (masResult.length < 3) return false

  return true
}

// Распределяет участников
function distribute(masResult) {
  const selected = []
  //Исключаем последнего, которому может выпасть он сам
  let rand = Random(masResult.length - 2)
  let sel = masResult[masResult.length - 1].id

  selected.push(sel)
  masResult[rand].to = sel

  for (
    let i = 0;
    i < masResult.length;
    i++ //Распределяем оставшихся
  ) {
    if (masResult[i].to !== null) continue

    const remains = masResult.filter(({id}) => selected.indexOf(id) === -1 && masResult[i].id !== id)
    rand = Random(remains.length - 1)
    sel = remains[rand].id
    selected.push(sel)
    masResult[i].to = sel
  }
}

// Рассылает сообщения участникам
function send(masResult, text, subject) {
  for (let i = 0; i < masResult.length; i++) {
    Promise.resolve().then(() => {
      const from = masResult[i]
      const to = masResult.find(({id}) => from.to === id)

      if (to?.to === undefined) {
        finish(masResult)
        return
      }

      const textSend = text.replace('#fio', to.fio + ' ' + to.email)
      sendMail(from.email, subject, textSend)
      finish(masResult, from, to)
    })
  }
}

// Вывод логов и окончание выполнения программы
function finish(masResult, from, to) {
  sendedCount++
  console.log(`Отправлено ${sendedCount} / ${masResult.length}`)
  log.push(`${from?.fio} <${from?.email}> дарит ${to?.fio} <${to?.email}>`)
  sendedCount === masResult.length && console.log(`Отправка завершена\n${log.join('\n')}`)
}

const sendMail = async function (to, subject, html) {
  const transporter = nodeMailer.createTransport({
    host: HOST,
    port: PORT,
    secure: false,
    auth: {
      user: USER,
      pass: PASS,
    },
  })

  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
  })
}

//Рандом, от Min до Max включительно. Если Max не указан, то Min = Max
function Random(Min, Max) {
  if (!Max) {
    Max = Min
    Min = 0
  }

  return Math.floor(Math.random() * (Max - Min + 1)) + Min
}

start()
