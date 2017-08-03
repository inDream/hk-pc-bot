let {newDatabase} = require('./lib/database');
let {print} = require('./lib/util');

const botDesc = `Jumbo/SE Computer/Terminal 查詢功能
用途 ([]為可選):
查詢硬件價格 - /price@HKPCbot <產品名稱> [類別] [價錢範圍]
價格查詢類別: case, cpu, mb, mon, psu, ram, ssd, gpu, hdd, ehdd
價錢範圍用法: $>=1000 $>1001 $<2000 $<=1999 $!=1500 $=1600`;

const categories = ['case', 'cpu', 'gpu', 'ehdd', 'hdd', 'mb', 'mon', 'psu', 'ram', 'ssd', 'other'];

const calc = (price, n) => {
  const [, operator, p] = price.match(/\$(\D)(\d+)/);
  switch (operator) {
    case '>=':
      return n >= +p;
    case '>':
      return n > +p;
    case '<=':
      return n <= +p;
    case '<':
      return n < +p;
    case '!=':
      return n < +p;
    case '=':
      return n === +p;
    default:
      return true;
  }
};

function handler(getDB){
  return ({message, reply}) => {
    let db = getDB();
    messageHandler(db, message.text, reply)
  }
}

function messageHandler(db, message, reply){
  // split as list of words and drop command
  let text = message.toLowerCase().split(/\s+/).slice(1);

  if (text.length === 0) {
    // no keywords
    reply(botDesc);
    return
  }

  let cats = [];
  let prices = [];
  let keywords = [];
  for (let t of text) {
    if (t[0] === '$') prices.push(t);
    else if (categories.indexOf(t) > -1) cats.push(t);
    else keywords.push(t)
  }
  if (cats.length === 0) cats = categories;
  if (keywords.length === 0) keywords = ['']; // match all in category

  // find all result
  const res = [];
  cats.forEach(cat => {
    db[cat]
      .filter(e => keywords.some(w => e.name.toLowerCase().indexOf(w) > -1) && prices.every(p => calc(p, e.price)))
      .forEach(e => res.push(e));
  });

  const len = res.length;
  if (!len) {
    return reply(`搵唔到${text.join(' ')}呢件野喎。`);
  }
  let r = `搵到${len}件野${len > 5 ? ' (只比頭5件你睇)' : ''}：\n`;
  res.sort((a, b) => a.price - b.price).slice(0, 5).forEach(e => {
    r += `HKD$${e.price} - ${e.vendor} - ${e.name}\n`;
  });

  const summation = lis => lis.reduce((acc, x) => acc + x, 0);
  const average = ~~(summation(res.map(e => e.price || 0)) / len);
  const half = ~~((len - 1) / 2);
  const median = (res[len - half - 1].price + res[half].price) / 2;
  const sd = ~~Math.sqrt(summation(res.map(e => (e.price - average) ** 2)) / len);

  r += `最平: HKD$${res[0].price}, 最貴: HKD$${res[len - 1].price}\n` +
    `平均: HKD$${average}, 中位數: HKD$${median}, 標準差: HKD$${sd}`;

  return reply(r);
}

module.exports = {
  botDesc,
  handler
};

if (!module.parent) {
  let db = newDatabase();
  let separator = () => console.log('_________________');

  messageHandler(db,'/price GTX1080', print);
  separator();

  db.gpu.push({
    name: 'Asus GTX1080',
    price: 4000,
    vendor: 'Jumbo'
  });
  db.gpu.push({
    name: 'AMD vega',
    price: 3900,
    vendor: 'Jumbo'
  });
  db.gpu.push({
    name: 'Inno3D GTX1080',
    price: 4200,
    vendor: 'SE'
  });
  db.cpu.push({
    name: 'Ryzen 1700x',
    price: 4200,
    vendor: 'Terminal'
  });
  messageHandler(db,'/price GTX1080', print);
  separator();
  messageHandler(db,'/price GTX1080 $>4100', print);
  separator();
  messageHandler(db,'/price inno3d', print);
  separator();
  messageHandler(db,'/price inno3d cpu', print);
  separator();
  messageHandler(db,'/price cpu', print);
}