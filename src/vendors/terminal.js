const cheerio = require('cheerio');
const {newDatabase} = require('../lib/database');
const {get} = require('../lib/util');

const categoryMap = {
  中央處理器: 'cpu', 主機板: 'mb', 顯示卡: 'gpu', 內置硬碟機: 'hdd', 顯示屏: 'mon',
  外置儲存設備: 'ehdd', SSD固態硬碟: 'ssd', 記憶體: 'ram', 機箱: 'case', 火牛: 'psu'
};

async function getTerminal() {

  let db = newDatabase();
  let res = await get('http://www.terminalhk.com/api/public/product');
  res.body.products
    .filter(e => e.category !== '隱藏')
    .forEach(({category, name, price}) => {
      db[categoryMap[category] || 'other']
        .push({name, price, vendor: 'Terminal'});
    });

  return db
}

module.exports = {
  getTerminal
};

if (!module.parent) {
  getTerminal().then(x => console.log(x));
}

