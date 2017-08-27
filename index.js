require('dotenv').config();
const cheerio = require('cheerio');
const fs = require('fs');
const needle = require('needle');
const Telegraf = require('telegraf');
const { Extra, Markup } = Telegraf;
const util = require('util');
const get = util.promisify(needle.get);
const bot = new Telegraf(process.env.BOT_TOKEN);

let saveTimer = null;
const keys = ['case', 'cpu', 'gpu', 'ehdd', 'hdd', 'mb', 'mon', 'psu', 'ram',
  'ssd', 'other'];
let DB = {
  case: [], cpu: [], gpu: [], ehdd: [], hdd: [], mb: [], mon: [], psu: [],
  ram: [], ssd: [], other: []
};
let tempDB = null;
const categoryMap = {
  中央處理器: 'cpu', 主機板: 'mb', 顯示卡: 'gpu', 內置硬碟機: 'hdd', 顯示屏: 'mon',
  外置儲存設備: 'ehdd', SSD固態硬碟: 'ssd', 記憶體: 'ram', 機箱: 'case', 火牛: 'psu'
};
const jumboMap = {
  92: 'ehdd', 93: 'ehdd', 14: 'case', 3: 'cpu', 5: 'gpu', 6: 'hdd', 1: 'mb',
  21: 'mon', 55: 'psu', 4: 'ram', 94: 'ssd'
};
const seMap = {
  2: 'mb', 6: 'case', 3: 'cpu', 5: 'hdd', 7: 'mon', 8: 'psu', 1: 'ram',
  48: 'ssd', 4: 'gpu'
};
const timeout = s => new Promise(resolve => setTimeout(resolve, s));

const request = async url => {
  try {
    return await get(url);
  } catch (e) {
    await timeout(1000);
    return request(url);
  }
};

const handleJumbo = $ => {
  const id = $('#ctl00_PageTopCP_ddlProduct option[selected]').val();
  $('#ctl00_PageTopCP_gvProducts td:nth-child(1)').each((i, e) => {
    const name = $(e).text();
    const price = +$(e).next().text().replace('HK$ ', '');
    if (!isNaN(price)) {
      tempDB[jumboMap[id] || 'other'].push({ name, price, vendor: 'Jumbo' });
    }
  });
};

const handleSE = $ => {
  const id = $('#ProductTypeID').val();
  $('td.priceList_itemContent:nth-child(2)').each((i, e) => {
    const name = $(e).text();
    const price = +$(e).next().text();
    tempDB[seMap[id] || 'other'].push({ name, price, vendor: 'SE' });
  });
};

const saveDB = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    DB = Object.assign({}, tempDB);
    fs.writeFile('db.json', JSON.stringify(DB), () => {
      console.log('Done get all vendors data.');
    });
  }, 1000);
};

const getVendors = async () => {
  tempDB = {
    case: [], cpu: [], gpu: [], ehdd: [], hdd: [], mb: [], mon: [], psu: [],
    ram: [], ssd: [], other: []
  };
  let res = await request('http://www.terminalhk.com/api/public/product');
  res.body.products.filter(e => e.category !== '隱藏')
    .forEach(({ category, name, price }) => {
      tempDB[categoryMap[category] || 'other']
        .push({ name, price, vendor: 'Terminal' });
    });

  const jumboBase = 'http://www.jumbo-computer.com/pricelist.aspx';
  res = await request(jumboBase);
  let $ = cheerio.load(res.body);
  handleJumbo($);
  $('#ctl00_PageTopCP_ddlProduct option').slice(1).each(async (i, e) => {
    if (!$(e).text().match('系列')) {
      res = await request(`${jumboBase}?id=${$(e).val()}`);
      handleJumbo(cheerio.load(res.body));
      await timeout(500);
      saveDB();
    }
  });

  const seBase = 'http://www.secomputer.com.hk/';
  res = await request(`${seBase}pricelist.php`);
  $ = cheerio.load(res.body);
  handleSE($);
  $('.ProductTypeID option').slice(1).each(async (i, e) => {
    if (!$(e).text().match('廠機')) {
      res = await request(`${seBase}${$(e).attr('href')}`);
      handleSE(cheerio.load(res.body));
      await timeout(500);
      saveDB();
    }
  });
};

const calc = (price, n) => {
  const [, operator, p] = price.match(/(\D+)(\d+)/);
  switch (operator) {
    case '>=': return n >= +p;
    case '>': return n > +p;
    case '<=': return n <= +p;
    case '<': return n < +p;
    case '!=': return n !== +p;
    case '=': return n === +p;
    default: return true;
  }
};

try {
  fs.statSync('./db.json');
  DB = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
  console.log('Loaded all vendors data.');
} catch (e) {
  getVendors();
}

setInterval(() => {
  getVendors();
}, 1000 * 60 * 60 * 6);

const botDesc = `Jumbo/SE Computer/Terminal 查詢功能
用途 ([]為可選):
查詢硬件價格 - /price@HKPCbot <產品名稱> [類別] [價錢範圍]

價格查詢類別: case, cpu, mb, mon, psu, ram, ssd, gpu, hdd, ehdd
價錢範圍用法: $>=1000 $>1001 $<2000 $<=1999 $!=1500 $=1600`;

const handleMsg = ({ message, reply, editMessageText, update }, pageInput) => {
  const text = message.text.split(' ');
  console.log(message.text, pageInput);
  if (text.length > 1) {
    let price = text[text.length - 1].indexOf('$') > -1;
    if (price) {
      price = text.pop().slice(1);
    }
    const category = text[text.length - 1];
    const hasCategory = keys.indexOf(category) > -1;
    const q = (hasCategory ? text.slice(1, -1) : text.slice(1))
      .map(e => e.toLowerCase());
    const res = [];
    (hasCategory ? [category] : keys).forEach(key => {
      DB[key]
        .filter(e => q.map(w => e.name.toLowerCase().indexOf(w) > -1)
          .indexOf(false) === -1 && (price ? calc(price, e.price) : true))
        .forEach(e => res.push(e));
    });
    const len = res.length;
    if (!len) {
      return reply(`搵唔到${text.slice(1).join(' ')}呢件野喎。`);
    }
    const lastPage = Math.ceil(len / 5);
    const page = Math.max(1, Math.min(pageInput, lastPage));
    const start = (page - 1) * 5;
    const end = page * 5;
    let r = `搵到${len}件野${len > 5 ?
      ` (${start + 1}-${end}件 第${page}頁)` : ''}：\n`;
    res.sort((a, b) => a.price - b.price).slice(start, end).forEach(e => {
      r += `HKD$${e.price} - ${e.vendor} - ${e.name}\n`;
    });
    const average = ~~(res.reduce((a, e) => a + e.price, 0) / len);
    const half = Math.floor(len / 2);
    const median = !half ? res[half].price :
      (res[half - 1].price + res[half].price) / 2;
    const sd = ~~Math.sqrt(res.map(e => (e.price - average) ** 2)
      .reduce((a, e) => a + e, 0) / len);
    r += `最平: HKD$${res[0].price}, 最貴: HKD$${res[len - 1].price}\n` +
      `平均: HKD$${average}, 中位數: HKD$${median}, 標準差: HKD$${sd}`;
    const markups = [];
    if (page < lastPage) {
      markups.push(
        Markup.callbackButton('▶ 下1頁', `next ${page} ${message.text}`),
        Markup.callbackButton('⏩ 下10頁', `next-ten ${page} ${message.text}`),
        Markup.callbackButton('⏭ 最後', `last ${lastPage} ${message.text}`)
      );
    }
    if (page > 1) {
      markups.push(
        Markup.callbackButton('◀ 前1頁', `prev ${page} ${message.text}`),
        Markup.callbackButton('⏪ 前10頁', `prev-ten ${page} ${message.text}`),
        Markup.callbackButton('⏮ 最前', `first ${page} ${message.text}`)
      );
    }
    if (!update.callback_query) {
      return reply(r, Markup.inlineKeyboard(markups).extra());
    }
    return editMessageText(r, Markup.inlineKeyboard(markups, { columns: 3 })
      .extra());
  }
  return reply(botDesc);
};

bot.command('start', ({ reply }) => {
  reply(botDesc);
});
bot.command('/price', e => handleMsg(e, 1));
bot.command('/price@HKPCbot', e => handleMsg(e, 1));
bot.on('callback_query', ctx => {
  const text = ctx.update.callback_query.data.split(' ');
  const q = text.shift();
  let page = +text.shift();
  switch (q) {
    case 'next':
      page++;
      break;
    case 'next-ten':
      page += 10;
      break;
    case 'prev':
      page--;
      break;
    case 'prev-ten':
      page -= 10;
      break;
    case 'first':
      page = 1;
      break;
    default:
  }
  const newCtx = Object.assign({}, ctx, { message: { text: text.join(' ') } });
  handleMsg(newCtx, page);
});
bot.startPolling();
