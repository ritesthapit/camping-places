var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Campground = require("../models/campground");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
const { doesNotMatch } = require("assert");

//ROUTE ROUTE
router.get("/", function(req, res) {
    res.render("landing");
});

//==============================
//AUTH ROUTES
//==============================
//show register form
router.get("/register", function(req, res) {
    res.render("register", {page: 'register'});
});
//handle signup logic
router.post("/register", function(req, res){
    var newUser = new User({ 
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar
    });
    if(req.body.admincode === "secretcode123"){ //check if the user is admin ---set it to true---else nothing
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            //console.log(err);
            req.flash("error",err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success","Welcome to Yelp Camp " + user.username);
            res.redirect("/campgrounds");
        })
    });
});
//==============================
//LOGIN ROUTES
//==============================
//show login form
router.get("/login", function(req, res){
    res.render("login",{page:'login'});
});
//handling login logic
router.post("/login", passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login"
    }), function(req, res){

});
//logout route
router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success","You have successfully logged out!!!");
    res.redirect("/campgrounds");
});

//==============================
//FORGOT PASSWORD
//==============================
//show the forgot password page
router.get("/forgot",function(req, res){
    res.render("forgot");
});
//finding the correct user with matching email and sending the email
router.post("/forgot", function(req, res, next){
    async.waterfall([ //array of functions that get called one after another--avoid having to use bunch of call backs
        function (done) {
            crypto.randomBytes(20, function(err, buf){
                var token = buf.toString("hex"); //generate token for the user thats valid up to 1 hour---defined below
                done(err, token);
            });
        },
        function (token, done) {
            User.findOne({email: req.body.email}, function(err, user){ //find user by email address
                if(!user){
                    req.flash("error","No account with that email address exists!!");
                    return res.redirect("/forgot"); //comes out of the entire function and reloads the route
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour valid
                
                user.save(function(err){
                    done(err, token, user);
                });
            });
        },
        function (token, user, done) {
            var smtpTransport = nodemailer.createTransport({ //allows us to send mail--nodemailer
                //createTransport== method --- options passed in as objects (below)
                service: "Gmail",
                auth: {
                    user: 'ritesthapit@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions ={ //what user sees when email is sent to them
                to: user.email,
                from: "ritesthapit@gmail.com",
                subject: "Node.js Password Reset",
                text: "You are receiving this because you have requested to reset the password for your account." + "\n\n" + 
                "Please click on the following link or paste this into your browser to complete the process." + "\n\n" +
                "http://" + req.headers.host + "/reset/" + token + "\n\n" + "If you didnot request this, please ignore this email and your password will be unchanged." 
            };

            smtpTransport.sendMail(mailOptions, function(err){
                console.log("mail sent");
                req.flash("success","An e-mail has been sent to " + user.email + " with further instructions.");
                done(err, 'done');
            });
        }
    ], function(err){
        if (err) return next(err);
        res.redirect("/forgot"); //no error
    });
});

//==============================
//RESET PASSWORD
//==============================
//show the reset password page

router.get("/reset/:token",function(req, res){
    //look for user with resetpasswordtoken--which is passed from email when user clicks the link
    //resetpasswordtoken greater than date.now()
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt : Date.now()}}, function(err, user){
        if(!user){
            req.flash("error","Password reset token is invalid or has expired!!");
            return res.redirect("/forgot");
        }
        res.render("reset", {token: req.params.token});
    });
});

//reset the password
router.post("/reset/:token", function(req, res){
    async.waterfall([ //array of functions that get called one after another--avoid having to use bunch of call backs
        function (done){
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt : Date.now()}}, function(err, user){
                if(!user){
                    req.flash("error","Password reset token is invalid or has expired!!");
                    return res.redirect("back");
                }
                if(req.body.password === req.body.confirm){
                    //setPassword called from passport local mongoose --does all the scripting and hashing
                    //set new password
                    user.setPassword (req.body.password, function(err){
                        user.resetPasswordToken = undefined; // no longer needed
                        user.resetPasswordExpires = undefined;
                        
                        user.save(function(err){ //update user in db
                            req.logIn(user, function(err){ //login the user with new password
                                done(err, user);
                            });
                        });
                    });
                } else {
                    req.flash("error","Password do not match");
                    return res.redirect("back");
                }
            });
        },
        function (user, done) {
            var smtpTransport = nodemailer.createTransport({ //allows us to send mail--nodemailer
                //createTransport== method --- options passed in as objects (below)
                service: "Gmail",
                auth: {
                    user: 'ritesthapit@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions ={ //what user sees when email is sent to them
                to: user.email,
                from: "ritesthapit@gmail.com",
                subject: "Node.js Password Changed",
                text: "Hello,\n\n" +
                    "This is a confirmation that the password for your account " + user.email + " has been changed."
            };

            smtpTransport.sendMail(mailOptions, function(err){
               // console.log("mail sent");
                req.flash("success","Your password has been changed");
                done(err, 'done');
            });
        }
    ], function(err){
        res.redirect("/campgrounds"); //no error
    });
});

//USER PROFILES
router.get("/users/:id",function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            req.flash("error","Something went wrong!!");
            res.redirect("/");
        }
        Campground.find().where("author.id").equals(foundUser._id).exec(function(err, campgrounds){
            if(err){
                req.flash("error","Something went wrong!!");
                res.redirect("/");
            }
     
        res.render("users/show", {user: foundUser, campgrounds:campgrounds});
        });
    });
});
module.exports = router;