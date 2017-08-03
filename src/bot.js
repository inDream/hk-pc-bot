let {newDatabase} = require('./lib/database');
let {print} = require('./lib/util');

const botDesc = `Jumbo/SE Computer/Terminal 查詢功能
用途 ([]為可選):
查詢硬件價格 - /price@HKPCbot <產品名稱> [類別]
價格查詢類別: case, cpu, mb, mon, psu, ram, ssd, gpu, hdd, ehdd`;


const categories = ['case', 'cpu', 'gpu', 'ehdd', 'hdd', 'mb', 'mon', 'psu', 'ram', 'ssd', 'other'];

const handleMsg = DB => ({message, reply}) => {

  let text = message.text.toLowerCase().split(/\s+/).slice(1);

  if (text.length === 0) {
    reply(botDesc);
    return
  }

  const category = text[text.length - 1];
  const hasCategory = categories.indexOf(category) > -1;
  const q = hasCategory ? text.slice(0, -1) : text;

  // find all result
  const res = [];
  (hasCategory ? [category] : categories).forEach(key => {
    DB[key]
      .filter(e => q.some(w => e.name.toLowerCase().indexOf(w) > -1))
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
  const half = ~~((len-1)/2);
  const median = (res[len - half - 1].price + res[half].price) / 2;
  const sd = ~~Math.sqrt(summation(res.map(e => (e.price - average) ** 2)) / len);

  r += `最平: HKD$${res[0].price}, 最貴: HKD$${res[len - 1].price}\n` +
    `平均: HKD$${average}, 中位數: HKD$${median}, 標準差: HKD$${sd}`;

  return reply(r);
};

module.exports = {
  botDesc,
  handleMsg
};

if (!module.parent) {
  let db = newDatabase();
  handleMsg(db)({
    message: {text: '/price GTX1080'},
    reply: print
  });
  db.gpu.push({
    name: 'Asus GTX1080',
    price: 4000,
    vendor: 'Jumbo'
  });
  handleMsg(db)({
    message: {text: '/price GTX1080'},
    reply: print
  })
}