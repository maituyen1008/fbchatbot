const request = require('request');

async function send(url, method = 'GET', requestBody = {}) {
    return new Promise(function (resolve, reject) {
        request({
            "uri": url,
            "method": method,
            "json": requestBody
        }, (err, res, body) => {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });

    });
}

module.exports = {
    send
}
