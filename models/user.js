const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: String,
    phone: String,
    password: String,
    surname: String,
    other_names: String,
    secondary_contact: String,
    verified: Boolean,
    macAddress: String
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
