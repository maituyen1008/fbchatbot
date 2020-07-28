var handles = require('../helpers/handle-helper');

function verifyWebhook(req, res, next) {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "123@123"

    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {

        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
}

function webhook(req, res, next) {
    // Parse the request body from the POST
    let body = req.body;

    // Check the webhook event is from a Page subscription
    if (body.object === 'page') {

        body.entry.forEach(function (entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(global.user)


            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            if(!user[sender_psid]) user[sender_psid] = {}; 
           
            // check tình trạng người dùng! Nếu đang tắt chat bot -> check thời gian hết hiệu lực!
            /* if(global.user[sender_psid] && !global.user[sender_psid].status) {
                // nếu user tồn tại và trạng thái đang tắt chatbot -> check hết hạn tắt chưa
                let updateTime = global.user[sender_psid].updateTime;
                if(updateTime) {
                    let dateExp = new Date();
                    dateExp.setDate(dateExp.getDate() + 1);
                    if(dateExp < updateTime.getDate()){ // hết hạn tắt => bật lại
                        global.user[sender_psid].status = true;
                        global.user[sender_psid].updateTime = new Date();
                    } else {
                        console.log('Đang tạm dừng chatbot với: ' + sender_psid);
                        return;
                    }
                }
                
            } */

            if (webhook_event.message) {
                handles.handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handles.handlePostback(sender_psid, webhook_event.postback);
            }

        });

        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');

    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
}

module.exports = {
    verifyWebhook,
    webhook
}