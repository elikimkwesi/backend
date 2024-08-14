const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: String,
    phone: String,
    password: String,
    verified: Boolean,
    macAddress: String
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
