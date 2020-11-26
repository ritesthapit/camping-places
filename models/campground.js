var mongoose  = require("mongoose");

//SCHEMA SETUP
var campgroundSchema = new mongoose.Schema({
    name:String,
    price:String,
    image:String,
    imageId: String,
    description:String,
    createdAt: { type: Date, default: Date.now},
    author: {
        id: {
            type:  mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
      
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]

});
//create Campground object using schema ///compiling schema into a model --- now we can use methods like--find and create
module.exports = mongoose.model("Campground", campgroundSchema);