const express = require("express"); 
const expressLayouts = require("express-ejs-layouts"); 
const mysql = require("mysql2");
const formidable = require('formidable');
const fs = require('fs');
const dbConfig = require("./config/db.config.js");
const multer = require('multer');
const path = require('path');

const connection = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    password: dbConfig.password
});

connection.connect(function(err){
if (err) {
    return console.error("Ошибка: " + err.message);
}
else {
    console.log("Подключение к серверу MySQL успешно установлено");    
}
});    

const app = express();
const port = 3000;
const urlencodedParser = express.urlencoded({extended: false});
const sorting_info = ["spending_id", true]; 

app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.use('/img', express.static(__dirname + 'public/img'));
app.use('/uploads', express.static(__dirname + 'public/uploads'));

app.use(expressLayouts);
app.set("layout", "./layouts/layout");
app.set("view engine", "ejs");

const storage = multer.diskStorage ({
    destination: (req, file, cb) =>{
        cb(null, "public/uploads");
    },
    filename: (req, file, cb) =>{
        cb(null, file.originalname);
    }
})
const upload = multer({storage: storage})

app.get('', urlencodedParser, (request, response) => {
    get_all(response);    
});

app.get('/public/uploads/:filename', urlencodedParser, (request, response) => {

    response.status(200).sendFile(__dirname + '/public/uploads/' + request.params.filename, (err, file) => {
        if (err) response.sendStatus(400);
        response.end(file);
      });
});

app.post("/update", urlencodedParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    if (typeof(request.body.delete) != "undefined" && request.body.delete !== null) {

        connection.query('SELECT filename FROM Spending WHERE spending_id=' + request.body.spending_id + ' AND user_id=1', function (err, result) {
            if (err) throw err;
            fs.unlinkSync(__dirname + '\\public\\uploads\\' + result[0].filename);
        });

        connection.query('DELETE FROM Spending WHERE spending_id=' + request.body.spending_id 
                            + ' AND user_id=1', function (err, result) {
            if (err) throw err;
            });

        get_all(response); 
    } else if (typeof(request.body.edit) != "undefined" && request.body.edit !== null) {

        connection.query('SELECT * FROM Spending WHERE spending_id=' + request.body.spending_id + ' AND user_id=1', function (err, currFin) {
            if (err) throw err;
            connection.query('SELECT * FROM Spending ORDER BY ' + sorting_info[0] + (sorting_info[1] == false ? " DESC":""), function (err, result) {
                if (err) throw err;
                console.log(currFin);
                response.render('index', { fins: result, title: 'Трекер финансов', sorting_info:sorting_info, submitValue: "Обновить", editFin: currFin[0]});
            });
        });
        
    }
 });

app.post("/add",upload.single('fileToUpload'), urlencodedParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    if (request.body.edit_id == -1) {
        connection.query('INSERT Spending(user_id, sum, date, category, description, income, filename) VALUES (?,?,?,?,?,?,?)',
        [
        1,
        request.body.sum * 100,
        request.body.date,
        request.body.category,
        request.body.description,
        request.body.type == 'income',
        request.file ? request.file.originalname : null
        ], function (err, result) {
            if (err) throw err;
          //  file_rename(request, 1, result.insertId);
        }); 
    } else {
       // file_rename(request, 1, request.body.edit_id);
        connection.query('UPDATE Spending SET sum = ?, date = ?, category = ?, description = ?, income = ?, filename = ? WHERE spending_id = ?  AND user_id=1',
        [
        request.body.sum * 100,
        request.body.date,
        request.body.category,
        request.body.description,
        request.body.type == 'income',
        request.file ? request.file.originalname : null,
        request.body.edit_id
        ]); 
    }

    get_all(response); 
 });

app.post("/sort", urlencodedParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    define_sort_type(request.body.sorting_type, request.body.sorting_direction);

    get_all(response); 
 });


app.listen(port, () => console.log('App listening...')); 

function define_sort_type(sorting_type, sorting_direction)
{
    if (sorting_info[0] == sorting_type && sorting_info[1]) {
        sorting_info[1] = false;
    } else if (sorting_info[0] == sorting_type && !sorting_info[1]) {
        sorting_info[0] = "spending_id";
        sorting_info[1] = true;
    } else {
        sorting_info[0] = sorting_type;
        sorting_info[1] = true;
    } 
}

function get_all(response) {
    connection.query('SELECT * FROM Spending ORDER BY ' + sorting_info[0] + (sorting_info[1] == false ? " DESC":""), function (err, result) {
        if (err) throw err;
        response.render('index', { fins: result, title: 'Трекер финансов', sorting_info:sorting_info, submitValue: "Добавить" });
    });
}

function file_rename(request, user_id, spending_id) {
    if (request.file !== null) {        
        const oldpath = __dirname + '/public/uploads/temp/' + request.file.originalname;
        const newpath = __dirname + '/public/uploads/' + spending_id;
        fs.rename(oldpath, newpath, function (err) {
            if (err) throw err;
        });
    }
}
