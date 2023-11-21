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
  const startTime = Date.now(); 
  const pageSize = 40;
  const pageNumber = req.query.page || 1;
  let filter = req.query.filter || "all";
  let searchTerm = req.query.q;
  let queryParam;

  const offset = (pageNumber - 1) * pageSize;
  
  let countQuery;
  let dataQuery;

  const searchPattern = `${searchTerm}%`;

  if(searchTerm && filter == "all") {
    countQuery = `
      SELECT COUNT(DISTINCT uni_name) as total
      FROM final_data
      WHERE uni_name LIKE ?
    `;

    dataQuery = `
      SELECT DISTINCT
        uni_name,
        uni_image,
        uni_type
      FROM final_data
      WHERE uni_name LIKE ?
      ORDER BY uni_name
    `;

    queryParam = [searchPattern]

  }else if(searchTerm && filter != "all"){
    countQuery = `
      SELECT COUNT(DISTINCT uni_name) as total
      FROM final_data
      WHERE uni_name LIKE ? AND uni_type = ?
    `;

    dataQuery = `
      SELECT DISTINCT
        uni_name,
        uni_image,
        uni_type
      FROM final_data
      WHERE uni_name LIKE ? AND uni_type = ?
      ORDER BY uni_name
    `;

    queryParam = [searchPattern,filter]
  } else if(filter  === "all") {
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

    queryParam = [filter]
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

    queryParam = [filter]
  } 


  connection.query(countQuery, queryParam, (err, countResult) => {
    if (err) {
      console.error('Error querying count:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const totalRows = countResult[0].total;
    const totalPages = Math.ceil(totalRows / pageSize);

    connection.query(dataQuery, queryParam, (err, results) => {
      if (err) {
        console.error('Error querying data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      
      const universities = [];

      if(results.length == 0){
        res.json({
          totalPages: 0,
          data: []
        });
        return
      }

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
          ORDER BY tabanpuan DESC
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
          const endTime = Date.now(); // Sorgunun bitiş zamanını kaydet
          const elapsedTime = endTime - startTime; // Çalışma süresini hesapla
      
          console.log(`Universities Sorgu çalışma süresi: ${elapsedTime} ms`);

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
  const startTime = Date.now(); 
  const pageSize = 40;
  const pageNumber = req.query.page || 1;
  let filter = req.query.filter || "all";
  let searchTerm = req.query.q;
  let queryParam;

  const filterValues = filter.split(',');
  const placeholders = filterValues.map(() => '?').join(', ');

  const searchPattern = `${searchTerm}%`;
  
  const offset = (pageNumber - 1) * pageSize;
    
  let countQuery;
  let dataQuery;

  if(searchTerm && filter == "all") {
    countQuery = `
      SELECT COUNT(DISTINCT modified_programadi) as total
      FROM final_data
      WHERE programadi LIKE ?
    `;

    dataQuery = `
      SELECT DISTINCT
        modified_programadi AS programadi,
        puanturu
      FROM final_data
      WHERE programadi LIKE ?
      ORDER BY programadi
    `;

    queryParam = [searchPattern]
  }else if (searchTerm && filter != "all") {
    countQuery = `
      SELECT COUNT(DISTINCT modified_programadi) as total
      FROM final_data
      WHERE programadi LIKE ? AND puanturu IN (${placeholders})
    `;

    dataQuery = `
      SELECT DISTINCT
        modified_programadi AS programadi,
        puanturu
      FROM final_data
      WHERE programadi LIKE ? AND puanturu IN (${placeholders})
      ORDER BY programadi
    `;
    queryParam = [searchPattern,...filterValues]
  } else if(filter  === "all") {
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

    queryParam = []
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

    queryParam = [...filterValues]
  } 

  connection.query(countQuery, queryParam,(err, countResult) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const totalRows = countResult[0].total;
    const totalPages = Math.ceil(totalRows / pageSize);

    connection.query(dataQuery, queryParam, (err, results) => {
      if (err) {
        console.error('Error querying data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

    const programs = [];


    if(results.length == 0){
      res.json({
        totalPages: 0,
        data: []
      });
      return
    }

    for (const row of results) {
      const { programadi, puanturu } = row;

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
        ORDER BY tabanpuan DESC
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
            programkodu: uniRow.programkodu,
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

        const endTime = Date.now(); // Sorgunun bitiş zamanını kaydet
        const elapsedTime = endTime - startTime; // Çalışma süresini hesapla
    
        console.log(`Programs Sorgu çalışma süresi: ${elapsedTime} ms`);

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

app.get('/program-detail', (req, res) => {
  let programCode = req.query.code;

  const query = `
    SELECT pd.*,
      fd.uni_name, fd.uni_image,fd.modified_programadi,fd.fakulte,fd.puanturu,fd.bursturu
    FROM program_data pd
    JOIN final_data fd ON pd.programcode = fd.programkodu
    WHERE pd.programcode = ?;
  `;

  connection.query(query, [programCode], (err, results) => {
    if (err) {
      console.error('Error querying the database: ' + err.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'Program not found' });
    } else {
      const formattedResults = results.map((result) => {

        result.taban_puan = JSON.parse(result.taban_puan);
        result.kontenjan = JSON.parse(result.kontenjan);
        result.basarisirasi = JSON.parse(result.basarisirasi);

        const formattedYears = [2023, 2022, 2021, 2020].map((year) => {
          return {
            year,
            taban_puan: result.taban_puan[`taban_puan_${year}`],
            kontenjan: result.kontenjan[`kontenjan_${year}`],
            basarisirasi: result.basarisirasi[`basari_sirasi_${year}`],
          };
        });

        const uni_data = {
          uni_name: result.uni_name,
          uni_image: result.uni_image,
          programadi: result.modified_programadi,
          fakulte: result.fakulte,
          puanturu: result.puanturu,
          bursturu: result.bursturu,
        }

        return {uniData: uni_data ,data: formattedYears };
      });

      res.json(formattedResults[0]);
    }
  });
});

app.get('/favorites', (req, res) => {
  const programCodes = req.query.codes ? req.query.codes.split(',') : [];

  if (programCodes.length === 0) {
    res.status(400).json({ error: 'No program codes provided' });
    return;
  }
  
  const query = 'SELECT * FROM final_data WHERE programkodu IN (?) ORDER BY tabanpuan DESC';

  connection.query(query, [programCodes], (err, results) => {
    if (err) {
      console.error('Error executing query: ' + err.message);
      res.status(500).send('Internal Server Error');
    } else {
      res.json(results);
    }
  });
});

const port = process.env.PORT || 8080;
app.listen(port)
console.log(`Db app listening at http://localhost:${port}`);