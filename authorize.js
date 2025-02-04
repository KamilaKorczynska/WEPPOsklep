const { getUserRoles } = require('./database');

/**
*
* @param {http.IncomingMessage} req
* @param {http.ServerResponse} res
* @param {*} next
*/

function authorize(...requiredRoles) {
    return async function (req, res, next) {
        if (req.signedCookies.user) {
            let user = req.signedCookies.user;
            let roles = await getUserRoles(user);

            if (requiredRoles.length === 0 || requiredRoles.some(role => roles.includes(role))) {
                req.user = user;
                req.userRoles = roles;
                return next();
            }
        }

        res.redirect('/login?returnUrl=' + req.url);
    };
}

module.exports = authorize;
