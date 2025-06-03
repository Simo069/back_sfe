const {DataTypes} = require("sequelize");
const sequelize = require("../config/database");


const AccessRequest = sequelize.define(
    "Access"
)