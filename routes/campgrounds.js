var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var multer = require("multer");
var storage = multer.diskStorage({ //METHOD
    filename: function(req, file, callback){
        callback(null, Date.now() + file.originalname); //CREATING CUSTOM NAME FOR THE FILE
    }
});
var imageFilter = function(req, file, cb){
    //accept only image file
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});
var cloudinary = require("cloudinary");
const campground = require("../models/campground");
const { update } = require("../models/comment");
cloudinary.config({
    cloud_name: "damvf8s0x",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
}); 
//============================
//INDEX ROUTE
//============================

router.get("/", function(req, res){

   //eval(require("locus")); //freezes the code when it reaches here
   if(req.query.search) { //searching for the query in search to match
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Campground.find({name:regex}, function(err, allcampgrounds){
        if(err){
            console.log(err);
        } else {
            
            if(allcampgrounds.length === 0){

              req.flash("error", "No campground found!! Please try again");
             return res.redirect("/campgrounds");
            }
            // console.log(noMatch);
            //console.log(req.query.search);
            res.render("campgrounds/index", {campgrounds: allcampgrounds, page:'campgrounds'});
        }
    });
   } else {
       //get all campgrounds from DB
    Campground.find({}, function(err, allcampgrounds){
        if(err){
            console.log(err);
        } else {
            res.render("campgrounds/index", {campgrounds: allcampgrounds, page:'campgrounds'});
        }
    });
   }  
});

//============================
//CREATE ROUTE
//============================

router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res) {
    // var name = req.body.name;
    // var price = req.body.price;
    // var image = req.body.image;
    // var descr = req.body.description;
    cloudinary.v2.uploader.upload(req.file.path, function(err,result){
        if(err){
            req.flash("error","Something went wrong!!!");
            return res.redirect("back");
        }
        //req.file--coming from multer---name of the file uploaded in the form + timestamp added above
        //get result which also has the secure_url property
        req.body.campground.image = result.secure_url;
        //secure (https) url to store it into database--security purpose---reference the image in cloudinary website
        req.body.campground.imageId = result.public_id;
        //image id came from public_id property of multer
        req.body.campground.author = {
            id: req.user._id,
            username: req.user.username
            }
    //var newCampground = {name:name, price:price, image:image, description:descr, author:author};
    
    // create a new campground and save to database
    Campground.create(req.body.campground, function(err, newCamp) {
        if(err){
            req.flash("error","Something went wrong!!");
            return res.redirect("back");
            } 
            //redirect back to index page
            //console.log(newCamp);
            req.flash("success","Successfully created campground!!");
            res.redirect("/campgrounds/" + newCamp._id);
        });
    });
});
//============================
//NEW ROUTE
//============================

router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("campgrounds/new"); //sends to the form page in new.ejs
});
//============================
//SHOW ROUTE--more info about one campground
//============================

router.get("/:id", function(req, res){
    //find the campground with provide id
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground) {
        if(err || !foundCampground){
            req.flash("error","Something went wrong!!!");
            return res.redirect("back");
        } 
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});

    });   
});
//============================
//EDIT CAMPGROUND ROUTE
//============================

router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
   Campground.findById(req.params.id, function(err, foundCampground){
       if(err){
           req.flash("error","Something went wrong!!!");
           return res.redirect("back");
       }
       res.render("campgrounds/edit", {campground: foundCampground});
   });
});
//============================
//UPDATE ROUTE
//============================

router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res){
    
    Campground.findById(req.params.id, async function(err, updatedCampground){
        if(err){
            req.flash("error","Something went wrong!!!");
            res.redirect("/campgrounds");
        } else {
            if(req.file){
                //if new file/ image has been updated
                try {
                //delete the existing file from cloudinary
                //wait on before async code to run first and finish--i.e.---destroy
                await cloudinary.v2.uploader.destroy(updatedCampground.imageId);
                //and update a new one
                var result = await cloudinary.v2.uploader.upload(req.file.path);
                //add image's public_id to campground object
                updatedCampground.imageId = result.public_id;
                //add cloudinary url for the image to the campground object under image property
                updatedCampground.image = result.secure_url;  
                } catch(err){
                    req.flash("error","Something went wrong!!!");
                    return res.redirect("back");
                }
            }
                // we don't need to check for other parameters as they are always there---only check for image above
                updatedCampground.name = req.body.campground.name;
                updatedCampground.description = req.body.campground.description;
                updatedCampground.price = req.body.campground.price;
                updatedCampground.save();
                req.flash("success","Successfully updated campground!!");
                res.redirect("/campgrounds/" + updatedCampground._id);
                
            }
        });
    });
   
    // for previous version 
    // Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
    //     if(err){
    //        req.flash("Something went wrong!!!");
    //         res.redirect("/campgrounds");
    //     } else {
    //         res.redirect("/campgrounds/" + updatedCampground._id);
    //     }
    // });

//============================
//DESTROY CAMPGROUND ROUTE
//============================

router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, async function(err, deleteCampground){
        if(err){
            req.flash("error", "Something went wrong!!!");
            return res.redirect("back");
        }
        try {
            await cloudinary.v2.uploader.destroy(deleteCampground.imageId);
            deleteCampground.remove();
            req.flash("success","Campground deleted successfully!!!");
            res.redirect("/campgrounds");
        } catch {
            if(err){
                req.flash("error", "Something went wrong!!!");
                return res.redirect("back");
            }
        }
    });
});
    // Campground.findByIdAndRemove(req.params.id, function(err){
    //     if(err){
    //         res.redirect("/campgrounds");
    //     } else {
    //         req.flash("success","Successfully deleted campground!!");
    //         res.redirect("/campgrounds");
    //     }
    // })


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;