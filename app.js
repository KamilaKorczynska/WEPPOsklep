var http = require('http');
var authorize = require('./authorize')  
var express = require('express');
var cookieParser = require('cookie-parser');
var { registerUser, loginUser, getUserRoles,editUserRoles, changeUserPassword, registerAdmin } = require('./database');

var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('sgs90890s8g90as8rg90as8g9r8a0srg8'));

app.set('view engine', 'ejs');
app.set('views', './views');


// PRZEKIEROWANIE z '/' na '/home' dla każdego
app.get('/', (req, res) => {
    res.redirect('/home');
});

// Strona dostępna dla wszystkich
app.get('/home', async (req, res) => {
    let role = [];
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }
    res.render('home', { user: req.signedCookies.user || null, role });
});


// strona logowania
app.get( '/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    var username = req.body.txtUser;
    var pwd = req.body.txtPwd;

    var user = await loginUser(username, pwd);

    if (user) {
        res.cookie('user', username, { signed: true });
        res.redirect(req.query.returnUrl || '/home');
    } else {
        res.render('login', { message: "Zła nazwa logowania lub hasło" });
    }
});

// Strona rejestracji
app.get('/register', (req, res) => {
    res.render('register');
});
  
// Obsługa rejestracji
app.post('/register', async (req, res) => {
    var username = req.body.txtUser;
    var pwd1 = req.body.txtPwd1;
    var pwd2 = req.body.txtPwd2;

    // Sprawdzenie, czy hasła są takie same
    if (pwd1 !== pwd2) {
        return res.render('register', { message: "Hasła nie są takie same. Proszę spróbować ponownie." });
    }

    var newUser = await registerUser(username, pwd1);

    if (newUser) {
        res.cookie('user', username, { signed: true });
        res.redirect('/home');
    } else {
        res.render('register', { message: "Błąd rejestracji. Użytkownik może już istnieć." });
    }
});

// Wylogowanie
app.get( '/logout', authorize(), (req, res) => {
    res.cookie('user', '', { maxAge: -1 } );
    res.redirect('/')
});

// Strona konta
app.get('/account', async (req, res) => {
    let role = [];
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }
    res.render('account', { user: req.signedCookies.user || null, role });
});

// Strona zmiany hasła
app.get('/changePassword', authorize(), (req, res) => {
    res.render('changePassword');
});

app.post('/changePassword', authorize(), async (req, res) => {
    const { txtOldPwd, txtNewPwd1, txtNewPwd2 } = req.body;

    if (txtNewPwd1 !== txtNewPwd2) {
        return res.render('changePassword', { message: "Nowe hasła muszą być takie same." });
    }

    const user = await loginUser(req.signedCookies.user, txtOldPwd);
    if (!user) {
        return res.render('changePassword', { message: "Stare hasło jest niepoprawne." });
    }

    const updatedUser = await changeUserPassword(req.signedCookies.user, txtNewPwd1);
    if (updatedUser) {
        return res.redirect('/account');
    } else {
        return res.render('changePassword', { message: "Wystąpił błąd podczas zmiany hasła." });
    }
});


// wymaga logowania dlatego strażnik – middleware „authorize”
app.get('/app', authorize(), async (req, res) => {
    let roles = await getUserRoles(req.user);
    res.render('app', { user: req.user, roles });
});

// strona tylko dla administratora
app.get( '/admin', authorize('admin'), (req, res) => {
    res.setHeader('Content-type', 'text/html; charset=utf-8');
    res.write('witaj administratorze');
    res.end();
})

http.createServer(app).listen(3000);
console.log( 'serwer działa, nawiguj do http://localhost:3000' );