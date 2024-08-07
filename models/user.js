const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: String,
    phone: String,
    password: String,
    verified: Boolean
});

const User = mongoose.model('User', UserSchema);

<<<<<<< HEAD
module.exports = User;
=======
module.exports = User;
>>>>>>> b913c834adfa81a4bca77b45bea2ec3c6df5a445
