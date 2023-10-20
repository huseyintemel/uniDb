const express = require('express');
const app = express();
var mysql = require('mysql');

app.use(express.json());

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "bachelor",
  port: 8889
})

connection.connect((err) => {
  if(err) throw err
  console.log("Mysql connected")
})

app.get("/",function(req,res){
  res.send("Index sayfası");
})


app.get('/universities', (req, res) => {
  const pageSize = 40;
  const pageNumber = req.query.page || 1;
  let filter = req.query.filter || "all";

  const offset = (pageNumber - 1) * pageSize;
  
  let countQuery;
  let dataQuery;

  if(filter  === "all") {
    countQuery = `
      SELECT COUNT(DISTINCT uni_name) as total
      FROM final_data
    `;

    dataQuery = `
      SELECT DISTINCT
        uni_name,
        uni_image,
        uni_type
      FROM final_data
      ORDER BY uni_name
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } else {
    countQuery = `
      SELECT COUNT(DISTINCT uni_name) as total
      FROM final_data
      WHERE uni_type = ?
    `;

    dataQuery = `
      SELECT DISTINCT
        uni_name,
        uni_image,
        uni_type
      FROM final_data
      WHERE uni_type = ?
      ORDER BY uni_name
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } 

  connection.query(countQuery, [filter], (err, countResult) => {
    if (err) {
      console.error('Error querying count:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const totalRows = countResult[0].total;
    const totalPages = Math.ceil(totalRows / pageSize);

    connection.query(dataQuery, [filter], (err, results) => {
      if (err) {
        console.error('Error querying data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      const universities = [];

      for (const row of results) {
        const { uni_name, uni_image, uni_type } = row;

        const programQuery = `
          SELECT
            programadi,
            programkodu,
            fakulte,
            puanturu,
            bursturu,
            tabanpuan,
            basarisirasi
          FROM final_data
          WHERE uni_name = ?
        `;

        connection.query(programQuery, [uni_name], (err, programResults) => {
          if (err) {
            console.error('Error querying program data:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }

          const universityData = {
            uni_name,
            uni_image,
            uni_type,
            bolumler: programResults,
          };

          universities.push(universityData);

          if (universities.length === results.length) {
            res.json({
              totalPages: totalPages,
              data: universities
            });
          }
        });
      }
    });
  });
});

app.get('/programs', (req, res) => {
  const pageSize = 40;
  const pageNumber = req.query.page || 1;
  let filter = req.query.filter || "all";

  const filterValues = filter.split(',');
  const placeholders = filterValues.map(() => '?').join(', ');

  
  const offset = (pageNumber - 1) * pageSize;
    
  let countQuery;
  let dataQuery;

  if(filter  === "all") {
    countQuery = `
      SELECT COUNT(DISTINCT modified_programadi) as total
      FROM final_data
    `;

    dataQuery = `
      SELECT DISTINCT
        modified_programadi AS programadi,
        puanturu
      FROM final_data
      ORDER BY programadi
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } else {
    countQuery = `
      SELECT COUNT(DISTINCT modified_programadi) as total
      FROM final_data
      WHERE puanturu IN (${placeholders})
    `;

    dataQuery = `
      SELECT DISTINCT
        modified_programadi AS programadi,
        puanturu
      FROM final_data
      WHERE puanturu IN (${placeholders})
      ORDER BY programadi
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } 

  connection.query(countQuery, filter === "all" ? [] : filterValues,(err, countResult) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const totalRows = countResult[0].total;
    const totalPages = Math.ceil(totalRows / pageSize);

    connection.query(dataQuery, filter === "all" ? [] : filterValues, (err, results) => {
      if (err) {
        console.error('Error querying data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

    const programs = [];

    // Loop through distinct programadi values
    for (const row of results) {
      const { programadi, puanturu } = row;

      // Fetch universities for each programadi
      const universitiesQuery = `
        SELECT
          uni_name,
          uni_image,
          uni_type,
          programadi,
          programkodu,
          fakulte,
          bursturu,
          puanturu,
          tabanpuan,
          basarisirasi
        FROM final_data
        WHERE modified_programadi = ? AND puanturu = ?
      `;

      connection.query(universitiesQuery, [programadi, puanturu], (err, universitiesResult) => {
        if (err) {
          console.error('Error querying universities:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }

        const universities = universitiesResult.map((uniRow) => {
          return {
            uni_name: uniRow.uni_name,
            uni_image: uniRow.uni_image,
            uni_type: uniRow.uni_type,
            programadi: uniRow.programadi,
            puanturu: uniRow.puanturu,
            tabanpuan: uniRow.tabanpuan,
            basarisirasi: uniRow.basarisirasi,
          };
        });

        const programData = {
          programadi,
          puanturu,
          universities,
        };

        programs.push(programData);

        // Check if all program data has been collected
        if (programs.length === results.length) {
          res.json({
            totalPages: totalPages,
            data: programs
          });
        }
      });
    }
  });
});
});


const port = process.env.PORT || 8080;
app.listen(port)
console.log(`Db app listening at http://localhost:${port}`);