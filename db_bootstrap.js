var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('database');

db.serialize(function() {
  db.run(`CREATE TABLE manga (
    slug TEXT NOT NULL UNIQUE,
    display TEXT,
    latest_chapter INTEGER
  )`);


  let values = `
    ('kingdom', 'Kingdom', 547),
    ('relife', 'ReLife', 217),
    ('hana-haru', 'Hana Haru', 35)
  `
  db.run(`INSERT INTO manga (slug, display, latest_chapter) VALUES ${values}`);

  db.each("SELECT * FROM manga", function(err, row) {
    console.log(row.slug + ": " + row.display + ": " + row.latest_chapter);
  });

});

db.close();
