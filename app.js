const express = require("express"); 
const expressLayouts = require("express-ejs-layouts"); 
const mysql = require("mysql2");
const dbConfig = require("./config/db.config.js");

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

app.use(expressLayouts);
app.set("layout", "./layouts/layout");
app.set("view engine", "ejs");

app.get('', urlencodedParser, (request, response) => {
    get_all(response);    
});

app.post("/", urlencodedParser, function (request, response) {
    if(!request.body) return response.sendStatus(400);

    if (request.body.sum != null)
    {
        connection.query('INSERT Spending(user_id, sum, date, category, description, income) VALUES (?,?,?,?,?,?)',
        [
        1,
        request.body.sum * 100,
        request.body.date,
        request.body.category,
        request.body.description,
        request.body.type == 'income'
        ]);
    } else if (request.body.spending_id != null){
        connection.query('DELETE FROM Spending WHERE spending_id=' + request.body.spending_id 
                            + ' AND user_id=1', function (err, result) {

            if (err) throw err;
            console.log('delete' + request.body.spending_id);
          });
    }
    else {
        define_sort_type(request.body.sorting_type, request.body.sorting_direction);
        console.log(sorting_info + " " + request.body.sorting_direction + " " + request.body.sorting_type);
    }
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
        response.render('index', { fins: result, title: 'Трекер финансов', sorting_info:sorting_info});
        console.log('BBBB');
    });
}
