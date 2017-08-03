const cheerio = require('cheerio');
const {newDatabase} = require('../lib/database');
const {get, print, timeout} = require('../lib/util');

const seMap = {
  2: 'mb', 6: 'case', 3: 'cpu', 5: 'hdd', 7: 'mon', 8: 'psu', 1: 'ram', 48: 'ssd', 4: 'gpu'
};

async function getSE() {
  let db = newDatabase();

  const parse = $ => {
    const id = $('#ProductTypeID').val();
    $('td.priceList_itemContent:nth-child(2)').each((i, e) => {
      const name = $(e).text();
      const price = +$(e).next().text();
      db[seMap[id] || 'other'].push({name, price, vendor: 'SE'});
    });
  };

  const seBase = 'http://www.secomputer.com.hk/';
  let res = await get(`${seBase}pricelist.php`);
  let $ = cheerio.load(res.body);
  parse($);
  for(let e of $('.left_priceListItemBg a').slice(1).get() ){
    let url = `${seBase}${$(e).attr('href')}`;
    print(`fetching ${url}`);
    let res = await get(url);
    parse(cheerio.load(res.body));
    await timeout(500);
  }

  return db;
}

module.exports = {
  getSE
};

if (!module.parent) {
  getSE().then(x => print(x));
}