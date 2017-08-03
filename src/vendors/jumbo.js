const cheerio = require('cheerio');
const {newDatabase} = require('../lib/database');
const {get, print, timeout} = require('../lib/util');

const jumboMap = {
  92: 'ehdd', 93: 'ehdd', 14: 'case', 3: 'cpu', 5: 'gpu', 6: 'hdd', 1: 'mb',
  21: 'mon', 55: 'psu', 4: 'ram', 94: 'ssd'
};

async function getJumbo() {
  let db = newDatabase();

  const parse = $ => {
    const id = $('#ctl00_PageTopCP_ddlProduct option[selected]').val();
    $('#ctl00_PageTopCP_gvProducts td:nth-child(1)').each((i, e) => {
      const name = $(e).text();
      const price = +$(e).next().text().replace(/\D/g, '');
      // ignore product without price
      if (isNaN(price)) return;
      db[jumboMap[id] || 'other'].push({name, price, vendor: 'Jumbo'});
    });
  };

  const jumboBase = 'http://www.jumbo-computer.com/pricelist.aspx';

  let res = await get(jumboBase);
  let $ = cheerio.load(res.body);
  parse($);
  for (let e of $('#ctl00_PageTopCP_ddlProduct option').slice(1).get()) {
    let url = `${jumboBase}?id=${$(e).val()}`;
    print(`fetching ${url}`);
    let res = await get(url);
    parse(cheerio.load(res.body));
    await timeout(500);
  }

  return db;
}

module.exports = {
  getJumbo
};

if (!module.parent) {
  getJumbo().then(x => print(x));
}