//all middleware goes here
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middlewareObj = {};
//check campground ownership middleware -- authorisation
middlewareObj.checkCampgroundOwnership = function(req, res, next){
    //is user logged in
    if(req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, foundCampground){
            if(err || !foundCampground){
                req.flash("error","Campground not found!!"); //Highly unlikely
                res.redirect("back");
            } else {
                //does user owns the campground
                if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){ 
                        //foundCampground.author.id is a mongoose object whereas req.user._id is a string
                    next();
                } else {
                    req.flash("error","You don't have permission to do that!!");
                    res.redirect("back");
                }   
            }
        });
    } else {
        req.flash("error","You need to be logged in!!");
        res.redirect("back");
    }
}
//check comment ownership middleware -- authorisation
middlewareObj.checkCommentOwnership = function (req, res, next){
    //is user logged in
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundComment){
                req.flash("error","Comment not found!!!");
                res.redirect("back");
            } else {
                //does user owns the comment
                if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){ 
                        //foundComment.author.id is a mongoose object whereas req.user._id is a string
                    next();
                } else {
                    req.flash("error","You don't have permission to do that!!!");
                    res.redirect("back");
                }   
            }
        });
    } else {
        req.flash("error","You need to be logged in!!!");
        res.redirect("back");
    }
}

//authentication
middlewareObj.isLoggedIn = function ( req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need to be logged in first!!");
    res.redirect("/login");
}

module.exports = middlewareObj;
