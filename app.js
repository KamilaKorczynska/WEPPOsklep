var http = require('http');
var authorize = require('./authorize')  
var express = require('express');
var cookieParser = require('cookie-parser');
var {registerUser, loginUser, getUserRoles, editUserRoles, changeUserPassword, registerAdmin, getAllProducts, getProductById, addProduct, updateProduct, deleteProduct, getUserCart, addToCart } = require('./database');

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
app.get('/account', authorize(), async (req, res) => {
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



// Strona listy produktów
app.get('/products', async (req, res) => {
    let role = [];
    let isAdmin = false; // Dodajemy zmienną do sprawdzenia roli admina
    
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
        // Sprawdzamy, czy wśród ról użytkownika jest "admin"
        if (role.includes('admin')) {
            isAdmin = true;
        }
    }
    
    const products = await getAllProducts();
    res.render('products', { products, user: req.signedCookies.user || null, role, isAdmin });
});


// Strona konkretnego produktu
app.get('/product/:id', async (req, res) => {
    let role = [];
    let isAdmin = false; // Dodajemy zmienną do sprawdzenia roli admina
    
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
        // Sprawdzamy, czy wśród ról użytkownika jest "admin"
        if (role.includes('admin')) {
            isAdmin = true;
        }
    }

    const product = await getProductById(req.params.id);
    if (!product) {
        return res.status(404).send('Produkt nie znaleziony');
    }
    res.render('product', { product, user: req.signedCookies.user || null, role, isAdmin });
});

// Strona dodawania produktu (tylko dla adminów)
app.get('/addProduct', authorize('admin'), async (req, res) => {

    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }

    res.render('addProduct', { user: req.signedCookies.user || null, role });
});

// Obsługa dodawania produktu
app.post('/addProduct', authorize('admin'), async (req, res) => {
    
    const { name, description, price, imageUrl, quantity } = req.body;  
    if (!name || !price || !quantity) {  
        return res.render('addProduct', {
            message: "Nazwa, cena i ilość są wymagane.",
            user: req.signedCookies.user
        });
    }

    const newProduct = await addProduct(name, description, price, imageUrl, quantity);  
    if (newProduct) {
        res.redirect('/products');
    } else {
        res.render('addProduct', {
            message: "Błąd dodawania produktu.",
            user: req.signedCookies.user
        });
    }
});

// Strona edycji produktu (tylko dla adminów)
app.get('/editProduct/:id', authorize('admin'), async (req, res) => {

    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }
    
    const product = await getProductById(req.params.id);
    if (!product) {
        return res.status(404).send('Produkt nie znaleziony');
    }
    res.render('editProduct', { product, user: req.signedCookies.user || null, role });
});

// Obsługa edycji produktu
app.post('/editProduct/:id', authorize('admin'), async (req, res) => {
    const { name, description, price, imageUrl, quantity } = req.body;
    const updatedProduct = await updateProduct(req.params.id, name, description, price, imageUrl, quantity);
    if (updatedProduct) {
        res.redirect('/products');
    } else {
        res.render('editProduct', { message: "Błąd edytowania produktu.", product: req.body });
    }
});

// Obsługa usuwania produktu
app.post('/deleteProduct/:id', authorize('admin'), async (req, res) => {
    const deleted = await deleteProduct(req.params.id);
    if (deleted) {
        res.redirect('/products');
    } else {
        res.status(500).send('Błąd usuwania produktu');
    }
});

// Display the cart page
app.get('/cart', async (req, res) => {
    const userId = req.signedCookies.user;  
    console.log('User ID:', userId);  
    if (!userId) {
        return res.render('cart', {
            message: 'Musisz być zalogowany, aby zobaczyć swój koszyk.',
            cartItems: [],
            user: null,
            role: null
        });
    }

    let role = null;
    if (req.signedCookies.user) {
        role = await getUserRoles(req.signedCookies.user);
    }

    const cartItems = await getUserCart(userId);
    console.log('Cart Items:', cartItems); 

    res.render('cart', {
        user: req.signedCookies.user,  
        role,
        cartItems,
        message: cartItems.length === 0 ? 'Twój koszyk jest pusty.' : null
    });
});


app.post('/cart/add', authorize(), async (req, res) => {
    const userId = req.signedCookies.user;  
    const { product_id, quantity } = req.body;

    const addedProduct = await addToCart(userId, product_id, parseInt(quantity) || 1);

    if (addedProduct) {
        return res.redirect('/cart'); 
    } else {
        return res.status(500).send('Błąd dodawania produktu do koszyka');
    }
});

app.post('/cart/update', authorize(), async (req, res) => {
    const userId = req.signedCookies.user;  
    const { product_id, quantity } = req.body;

    const updatedItem = await updateCartItem(userId, product_id, parseInt(quantity));

    if (updatedItem) {
        return res.redirect('/cart'); 
    } else {
        return res.status(500).send('Błąd aktualizacji produktu w koszyku');
    }
});

app.post('/cart/delete', authorize(), async (req, res) => {
    const userId = req.signedCookies.user;  
    const { product_id } = req.body;

    const removedItem = await removeFromCart(userId, product_id);

    if (removedItem) {
        return res.redirect('/cart');  
    } else {
        return res.status(500).send('Błąd usuwania produktu z koszyka');
    }
});


http.createServer(app).listen(3000);
console.log('serwer działa, nawiguj do http://localhost:3000');
