require("dotenv").config();

var express               = require("express"),
    app                   = express(),
    bodyParser            = require("body-parser"),
    mongoose              = require("mongoose"),
    passport              = require("passport"),
    flash                 = require("connect-flash"),
    LocalStrategy         = require("passport-local"),
    Campground            = require("./models/campground"),
    Comment               = require("./models/comment"),
    seedDB                = require("./seeds"),
    methodOverride        = require("method-override"),
    User                  = require("./models/user")
//REQUIRING ROUTES
var commentRoutes = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    indexRoutes = require("./routes/index")

//connect with the database//create a new one if there isn't any
//for developer version --- local
//mongoose.connect("mongodb://localhost/yelpcamp", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
//for production version
var url = process.env.DATABASEURL;
//good practice to use both if there are any errors in env variable
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true});

// mongoose.connect("mongodb+srv://riteshdatabase:abcd1234@cluster0-xjy8k.mongodb.net/yelpcamp?retryWrites=true&w=majority", {
//     useNewUrlParser: true,
//     useCreateIndex: true
// })
//mongodb+srv://riteshdatabase:<password>@cluster0-xjy8k.mongodb.net/<dbname>?retryWrites=true&w=majority
//mongo "mongodb+srv://cluster0-xjy8k.mongodb.net/<dbname>" --username riteshdatabase
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.locals.moment = require("moment");
app.use(flash());

//seedDB(); //seed Database

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "I love my wife",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//middleware--function will be called on every route
app.use(function(req, res, next){
    res.locals.currentUser = req.user; //will be empty in no one is logged in //goes through every template
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

//EXPRESS ROUTERS
app.use(indexRoutes);
app.use("/campgrounds",campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(process.env.PORT || 3000, function(){
    console.log("Yelp Camp Server has started");
});