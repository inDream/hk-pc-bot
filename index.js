require('dotenv').config();

const Telegraf = require('telegraf');

let {getJumbo} = require('./src/vendors/jumbo');
let {getTerminal} = require('./src/vendors/terminal');
let {getSE} = require('./src/vendors/se');
let {newDatabase, mergeDatabase, loadDatabase, saveDatabase} = require('./src/lib/database');
let {print, join} = require('./src/lib/util');
let {botDesc, handler} = require('./src/bot');

async function getVendors() {
  let tables = await Promise.all([
    getJumbo(),
    getSE(),
    getTerminal()
  ]);
  return mergeDatabase(tables)
}

async function main() {

  // read database from file or fetch new data
  let path = join(__dirname, 'db.json');
  let DB = newDatabase();
  try {
    DB = loadDatabase(path);
    print('Loaded all vendors data from', path);
  } catch (e) {
    DB = await getVendors();
    try {
      saveDatabase(path, DB);
      print('New data saved to', path);
    } catch (e) {
      console.error(e && e.stack ? e.stack : e);
      print(typeof path);
      print('Fail to save data to', path);
    }
  }

  // update every 6 hours
  setInterval(() => {
    DB = getVendors();
    saveDatabase(path, DB);
  }, 1000 * 60 * 60 * 6);

  let getDB = () => DB;
  let bot = new Telegraf(process.env.BOT_TOKEN);
  bot.command('start', ({reply}) => reply(botDesc));
  bot.command('/price', handler(getDB));
  bot.command('/price@HKPCbot', handler(getDB));
  bot.startPolling();
}

main().catch(e => console.error(e && e.stack ? e.stack : e));
