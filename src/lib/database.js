const fs = require('fs');

function newDatabase() {
  return {
    case: [], cpu: [], gpu: [], ehdd: [], hdd: [], mb: [], mon: [], psu: [],
    ram: [], ssd: [], other: []
  }
}

function loadDatabase(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

function mergeDatabase(tables) {
  let t = {};
  for (let table of tables) {
    for (let k in table) {
      let v = table[k];
      if (!t[k]) t[k] = [v];
      else t[k].push(v);
    }
  }
  return t;
}

function saveDatabase(path, DB) {
  fs.writeFileSync(path, JSON.stringify(DB));
}

module.exports = {
  newDatabase,
  loadDatabase,
  mergeDatabase,
  saveDatabase
};

if(!module.parent){
  saveDatabase('./db.json', newDatabase());
}