require("dotenv").config()
const { Sequelize } = require("sequelize");
const PermissionModel = require("../../models/PermissionModel");
const SessionModel = require("../../models/SessionModel");
const UserModel = require("../../models/UserModel");
const init = require("./init");
const relations = require("./relations");

const sequelize = new Sequelize(process.env.DB_URL, {logging: false})

module.exports = async function() {
    try {
        await sequelize.authenticate();

        const db = {}

        db.users = await UserModel(sequelize, Sequelize)
        db.sessions = await SessionModel(sequelize, Sequelize)
        db.permissions = await PermissionModel(sequelize, Sequelize)

        await init(db);

        await relations(db)

        await sequelize.sync()

        return db;

    } catch (error) {
        console.log("DATABASE_ERROR", error);
    }
}