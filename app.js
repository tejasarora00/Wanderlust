if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const express = require("express");                         //Requiring Express
const app = express();
const mongoose = require("mongoose");                       //Requiring Mongoose
const path = require("path");                               //Requiring for ejs
const methodOverride = require("method-override");          //Requiring method-override
const ejsMate = require("ejs-mate");                        //Requiring ejs-mate
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");            //For listing route
const reviewRouter = require("./routes/review.js");              //For Review Route
const userRouter = require("./routes/user.js");

app.set("view engine", "ejs");                              //Setting view engine for ejs
app.set("views", path.join(__dirname, "views"));            //for ejs, maintaining views folder
app.use(express.urlencoded({ extended: true }));            //Parsing data from req.body
app.use(methodOverride("_method"));                         //For method-override
app.use(express.static(path.join(__dirname, "/public")));   //For using static files (for ex- style.css)
app.engine('ejs', ejsMate);                                 //For ejs-mate

const dbUrl = process.env.ATLASDB_URL;

main().then(() => {
    console.log("connected to db");
}).catch(err => {
    console.log(err);
});

async function main() {
    await mongoose.connect(dbUrl);
}

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24*3600
});

store.on("error", ()=>{
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store: store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,     // In miliseconds, means after 7 days, 24hrs in 1day, 60min in 1hr, 60sec in 1min, 1000msec in 1sec.
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}

// app.get("/", (req, res) => {
//     res.send("Hi i am root");
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demouser", async (req, res) => {
//     let fakeUser = new User({
//         email: "student@gmail.com",
//         username: "delta-student"
//     });

//     let registeredUser = await User.register(fakeUser, "helloworld");
//     res.send(registeredUser);
// })

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!" } = err;
    res.status(statusCode).render("error.ejs", { message });
    // res.status(statusCode).send(message);
});

app.listen(8080, () => {
    console.log("server is listening on port 8080");
});