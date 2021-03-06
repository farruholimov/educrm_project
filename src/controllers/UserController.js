const permissionChecker = require("../helpers/permissionChecker");
const { generateCrypt, comparePassword } = require("../modules/bcrypt");
const { createToken } = require("../modules/jwt");

const {
    UserSignUpValidation, UserSignInValidation
} = require("../modules/validations")

module.exports = class UserController {
    static async CreateUserController(req, res, next) {
        try {

            permissionChecker("admin", req.user_permissions, res.error)

            const data = await UserSignUpValidation(req.body, res.error)

            if (!data) throw new res.error(400, "Given data is not valid");

            const new_user = await req.db.users.create({
                user_username: data.username,
                user_name: data.name,
                user_password: await generateCrypt(data.password),
                user_gender: data.gender
            })

            res.status(201).json({
                ok: true,
                message: "User created successfully"
            })
        } catch (error) {
            if (error.message == "Validation error") {
				error.errorCode = 400;
				error.message = "Username already exists";
			}

            console.log(error);
			next(error);
        }
    }
    static async UserSignInController(req, res, next) {
        try {
            const data = await UserSignInValidation(req.body, res.error)

            if (!data) throw new res.error(400, "Given data is not valid");

            const user = await req.db.users.findOne(
                {
                    where: {
                        user_username: data.username
                    },
                    raw: true
                }
            )
            
            if(!user) throw new res.error(400, "User not found")
            
            const check_password = await comparePassword(data.password, user.user_password);

            if (!check_password) throw new res.error(400, "Password is incorrect");


            await req.db.sessions.destroy({
				where: {
					session_useragent: req.headers["user-agent"] || "Unknown",
					user_id: user.user_id,
				},
			});

            const session  = await req.db.sessions.create(
                {
                    session_useragent: req.headers["user-agent"] || "Unknown",
                    user_id: user.user_id
                }
            )

            console.log(session);

            const token = await createToken({
                session_id: session.dataValues.session_id
            })

            res.status(201).json({
                ok: true,
                message: "Token created successfully",
                data: {
                    token,
                }
            })

        } catch (error) {
            console.log(error);
            next(error)
        }
    }
    static async GetAllUsersController(req, res, next) {
        try {
            permissionChecker("admin", req.user_permissions, res.error)

            let page = req.query.page ? req.query.page - 1 : 0;
            let limit = req.query.limit || 15;
            let order = req.query.order == "DESC" ? "DESC" : "ASC";

            const users = await req.db.users.findAll({
                attributes: {
                    exclude: ["user_password"]
                },
                limit: limit,
                offset: page * 15,
                order: [["createdAt", order]] 
            })

            if(!users) throw new res.error(404, "No users found")

            res.status(200).json({
                ok: true,
                data: {
                    users
                }
            })

        } catch (error) {
            next(error)
        }
    }
}