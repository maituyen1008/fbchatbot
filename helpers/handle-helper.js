const requestAPI = require('./requestAPI');

const request = require('request');
const fetch = require('node-fetch');
const { finished } = require('stream');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_SIZE = 5;
const GREETING_TEXT = ['bắt đầu', 'hi', 'xin chào', 'chào', 'alo', '.'];

const API_TOKEN = process.env.API_TOKEN;
const WH_API_URL = process.env.WH_API_URL;

// Handles messages events
function handleMessage(sender_psid, received_message) {
    if (user[sender_psid] == null) {
        user[sender_psid] = {};
        user[sender_psid].action = 'chatting';
    }

    /*  else if (user[sender_psid].action == 'consult') {
            checkPhone(sender_psid, received_message.text);
        } */

    if (received_message.text) {

        if (user[sender_psid].inprocess && ['getting_name', 'getting_address', 'getting_phone'].includes(user[sender_psid].inprocess)) {
            order(sender_psid, received_message.text);

        } else if (GREETING_TEXT.includes(received_message.text.toLowerCase())) {
            greeting(sender_psid);

        } else if (user[sender_psid].action == 'search') {
            getProductByName(sender_psid, received_message.text);

        } else if (user[sender_psid].action == 'search_order_phone') {
            checkSearchOrderPhone(sender_psid, received_message.text);

        } else if (user[sender_psid].action == 'search_order_code' && !received_message.quick_reply) {
            searchOrderInfo(sender_psid, received_message.text);
        } else if (user[sender_psid].action == 'notification_phone') {
            notification(sender_psid, received_message.text)
        } else if (received_message.quick_reply && received_message.quick_reply.payload) {
            console.log(received_message.quick_reply.payload)
            handlePostback(sender_psid, received_message.quick_reply);

        }
    }


}

// Handles messaging_postbacks events
function handlePostback(sender_psid, postback) {
    if (user[sender_psid] == null) {
        user[sender_psid] = {};
        user[sender_psid].action = 'chatting';
    }

    delete global.user[sender_psid].inprocess;

    if (postback.payload.includes("DETAIL_PRODUCT")) {
        var arr = postback.payload.split("_");
        detailProduct(sender_psid, arr[arr.length - 1]);

    } else if (postback.payload.includes("ORDER")) {
        var arr = postback.payload.split("_");
        if (typeof global.user[sender_psid].info == "undefined") {
            global.user[sender_psid].info = {};
        }
        global.user[sender_psid].info.product_id = arr[arr.length - 1];
        order(sender_psid);

    } else if (postback.payload.includes("EVALUATE")) {
        var arr = postback.payload.split("_");
        postEvaluate(sender_psid, arr[arr.length - 1]);

    } {
        switch (postback.payload) {
            case 'GET_STARTED':
                greeting(sender_psid);
                break;
            case 'SEARCH_PRODUCT':
                searchProduct(sender_psid);
                break;
            case 'TRACKING_ORDER':
                searchOrder(sender_psid);
                break;
            case 'NOTIFICATION':
                notificationPhone(sender_psid);
                break;
            case 'CONSULT':
                consult(sender_psid);
                break;
            case 'PHONE_NUMBER':
                callSendAPI(sender_psid, {
                    "text": 'Cảm ơn quý khách đã đặt hàng tại Chiaki! Nhân viên hỗ trợ sẽ liên hệ với quý khách trong thời gian sớm nhất.'
                });
                break;
            case 'CANCEL_TRACKING_ORDER':
                global.user[sender_psid].action = 'chatting';
                postQuickReplies(sender_psid);
                break;
            case 'CONTINUE_TRACKING_ORDER':
                reSubmitOrderCode(sender_psid);
                break;
            default:

            /*
            case 'CONTACT':
                contact(sender_psid);
                break;
            case 'DELIVERY_POLICY':
                deliveryPolicy(sender_psid);
                break;
            case 'PAYMENT_METHODS':
                paymentMethods(sender_psid);
                break;
            */
        }
    }

}

async function postNotifiOrder(sender_psid) {
    let product = await getProductById(global.user[sender_psid].info.product_id);
    product = product.result;
    let orderInfo = global.user[sender_psid].info;

    let inoutputData = {
        inoutput: {
            status: "pending",
            amount: product.sale_price,
            delivery_address: orderInfo.address,
            related_user_name: orderInfo.name,
            source: "fb-chatbot",
            payment_type: "home",
            is_draft: 1,
            draft_data: {
                "phone": orderInfo.phone,
                "full_name": orderInfo.name,
                "email": "",
                "address": orderInfo.address,
                "payment_type": "home",
                "type": "customer"
            }
        },
        inoutput_item: [
            {
                product_id: product.id,
                quantity: 1,
                unit_price: product.sale_price,
                product_name: product.title,
                product_code: product.code
            }
        ]
    }

    /* let orderInfo = global.user[sender_psid].info;
    let chatbotOrder = await requestAPI.send(WH_API_URL + 'service/chatbot/order', 'POST', {
        name: orderInfo.name,
        address: orderInfo.address,
        phone: orderInfo.phone,
        psid: sender_psid,
        status: 'pending'
    });

    if(chatbotOrder.status == 'successful') {
        global.user[sender_psid].info.latest_order = chatbotOrder;
    } else {
        console.log("Lỗi khi thông báo có đơn hàng: ", chatbotOrder);
    } */

}

async function postEvaluate(sender_psid, value) {
    await insertTracking(sender_psid, 'vote', value);
    await callSendAPI(sender_psid, {
        "text": `Cảm ơn quý khách đã đánh giá.`
    });
    postQuickRepliesButton(sender_psid);
}

async function askForEvaluate(sender_psid) {

    let response = {
        "text": "Quý khách vui lòng đánh giá cho lần phục vụ này.",
        "quick_replies": [
            {
                "content_type": "text",
                "title": "1✯ Không hài lòng",
                "payload": "EVALUATE_1"
            },
            {
                "content_type": "text",
                "title": "2✯ Tạm được",
                "payload": "EVALUATE_2"
            },
            {
                "content_type": "text",
                "title": "3✯ Hài lòng",
                "payload": "EVALUATE_3"
            },
            {
                "content_type": "text",
                "title": "4✯ Tốt",
                "payload": "EVALUATE_4"
            },
            {
                "content_type": "text",
                "title": "5✯ Rất tốt",
                "payload": "EVALUATE_5"
            },
        ]
    }
    await callSendAPI(sender_psid, response);
}

async function reSubmitOrderCode(sender_psid) {
    global.user[sender_psid].action = 'search_order_code';
    await callSendAPI(sender_psid, {
        "text": `Quý khách vui lòng nhập mã đơn hàng.`
    });
}

async function order(sender_psid, message = null) {
    if (!global.user[sender_psid])
        global.user[sender_psid] = {};

    if (!global.user[sender_psid].inprocess) {
        // tạo trạng thái đang thu thập thông tin order
        global.user[sender_psid].inprocess = 'getting_name';
        await callSendAPI(sender_psid, {
            "text": `Quý khách vui lòng để lại thông tin nhận hàng.`
        });

        // Hỏi tên
        await callSendAPI(sender_psid, {
            "text": `Họ và tên: `
        });

    } else if (global.user[sender_psid].inprocess == 'getting_name') {
        global.user[sender_psid].inprocess = 'getting_address';
        if (typeof global.user[sender_psid].info == "undefined") {
            global.user[sender_psid].info = {};
        }
        global.user[sender_psid].info.name = message;

        // Hỏi địa chỉ
        await callSendAPI(sender_psid, {
            "text": `Địa chỉ nhận hàng:`
        });

    } else if (global.user[sender_psid].inprocess == 'getting_address') {
        global.user[sender_psid].inprocess = 'getting_phone';
        if (typeof global.user[sender_psid].info == "undefined") {
            global.user[sender_psid].info = {};
        }
        global.user[sender_psid].info.address = message;

        // Hỏi số điện thoại
        let response = {
            "text": "Số điện thoại liên hệ:",
            "quick_replies": [
                {
                    "content_type": "user_phone_number",
                    "payload": "PHONE_NUMBER"
                }
            ]
        }

        await callSendAPI(sender_psid, response);
    } else if (global.user[sender_psid].inprocess == 'getting_phone') {
        if (isValidPhone(message)) {
            finishOrder(sender_psid, message);

        } else {
            global.user[sender_psid].inprocess = 'getting_phone';
            reSubmitPhone(sender_psid);

        }
    }

}

async function finishOrder(sender_psid, message) {
    delete global.user[sender_psid].inprocess;
    await callSendAPI(sender_psid, {
        "text": 'Cảm ơn quý khách đã đặt hàng tại Chiaki! Nhân viên hỗ trợ sẽ liên hệ với quý khách trong thời gian sớm nhất.'
    });

    if (typeof global.user[sender_psid].info == "undefined") {
        global.user[sender_psid].info = {};
    }
    global.user[sender_psid].info.phone = message;

    await postNotifiOrder(sender_psid);
    await askForEvaluate(sender_psid);
}

function postQuickReplies(sender_psid) {
    let response = {
        "text": "Mình có thể giúp gì cho quý khách?",
        "quick_replies": [
            {
                "content_type": "text",
                "title": "Đặt hàng",
                "payload": "SEARCH_PRODUCT",
                "image_url": "https://s4.shopbay.vn/files/269/51khmhzghul-5ed06bae48853.png"
            },
            {
                "content_type": "text",
                "title": "Chat với tư vấn viên",
                "payload": "CONSULT",
                "image_url": "https://s4.shopbay.vn/files/269/consult-standard-5ed06bae47e78.png"
            },
            {
                "content_type": "text",
                "title": "Tra cứu đơn hàng",
                "payload": "TRACKING_ORDER",
                "image_url": "https://s4.shopbay.vn/files/269/box-5ed06c7a0f21b.png"
            }
        ]
    }
    callSendAPI(sender_psid, response);
}

function postQuickRepliesButton(sender_psid) {
    let response = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": "Quý khách cần giúp gì ạ?",
                "buttons": [
                    {
                        "type": "postback",
                        "title": "Đặt hàng",
                        "payload": "SEARCH_PRODUCT"
                    },
                    {
                        "type": "postback",
                        "title": "Chat với tư vấn viên",
                        "payload": "CONSULT"
                    },
                    {
                        "type": "postback",
                        "title": "Tra cứu đơn hàng",
                        "payload": "TRACKING_ORDER"
                    }
                ]
            }
        }
    }
    callSendAPI(sender_psid, response);
}

function checkContinueTrackOrder(sender_psid) {
    let response = {
        "text": "Thử lại?",
        "quick_replies": [
            {
                "content_type": "text",
                "title": "Có, nhập lại mã",
                "payload": "CONTINUE_TRACKING_ORDER",
            },
            {
                "content_type": "text",
                "title": "Bỏ qua",
                "payload": "CANCEL_TRACKING_ORDER",
            }
        ]
    }
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
async function callSendAPI(sender_psid, response, typing = true) {

    if (typing) {
        await setTypeStatus(sender_psid, true);
    }

    return new Promise(function (resolve, reject) {
        let request_body = {
            "recipient": {
                "id": sender_psid
            },
            "message": response
        }

        request({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            "qs": { "access_token": PAGE_ACCESS_TOKEN },
            "method": "POST",
            "json": request_body
        }, (err, res, body) => {

            if (typing) {
                setTypeStatus(sender_psid, false);
            }

            if (!err) {
                console.log(request_body);
                console.log("Da gui duoc tin nhan");
                resolve('message sent!')
            } else {
                console.log("Khong gui duoc tin nhan");
                reject("Unable to send message:" + err);
            }
        });

    });
}

async function setTypeStatus(sender_psid, isTyping = true) {
    let type_on = {
        "recipient": {
            "id": sender_psid
        },
        "sender_action": "typing_on"
    }
    let type_off = {
        "recipient": {
            "id": sender_psid
        },
        "sender_action": "type_off"
    }
    let typeStatus = type_on;
    if (!isTyping) {
        typeStatus = type_off;
    }

    return new Promise(function (resolve, reject) {
        request({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            "qs": { "access_token": PAGE_ACCESS_TOKEN },
            "method": "POST",
            "json": typeStatus
        }, (err, res, body) => {
            if (!err) {
                console.log("typing status updated");
                resolve(true)
            } else {
                console.log("typing status update fail");
                reject(err);
            }
        });

    });
}

async function greeting(sender_psid) {
    if (global.user[sender_psid]) { // && !global.user[sender_psid].status

        global.user[sender_psid].action = 'chatting';
        if (global.user[sender_psid].inprocess)
            delete global.user[sender_psid].inprocess;

        // nếu user tồn tại và trạng thái đang tắt chatbot -> check hết hạn tắt chưa
        let updateTime = global.user[sender_psid].updateTime;
        if (updateTime) {
            let dateExp = new Date();
            dateExp.setDate(dateExp.getDate() + 1);
            if (dateExp < updateTime.getDate()) { // hết hạn tắt => bật lại
                global.user[sender_psid].status = true;
                global.user[sender_psid].updateTime = new Date();
            } else {
                console.log('Đang tạm dừng chatbot với: ' + sender_psid);
                return;
            }
        }

    }

    let fullName = await getFacebookName(sender_psid);
    await callSendAPI(sender_psid, {
        "text": `Chào mừng quý khách đến với Chiaki - Siêu thị trực tuyến hàng đầu Việt Nam`
    });

    postQuickReplies(sender_psid);
}

async function checkPhone(sender_psid, message) {
    if (isValidPhone(message)) {
        thanks(sender_psid, message);
    } else {
        reSubmitPhone(sender_psid);
    }
}


async function getFacebookName(sender_psid) {
    return new Promise(function (resolve, reject) {
        let url = `https://graph.facebook.com/${sender_psid}?fields=first_name,last_name&access_token=${PAGE_ACCESS_TOKEN}>`;
        fetch(url)
            .then(res => res.json())
            .then(json => resolve(json.first_name + " " + json.last_name));
    });
}

async function getProductByName(sender_psid, name = null) {
    setTypeStatus(sender_psid, true);
    await insertTracking(sender_psid, 'search_product', name);
    var products = await getProductAPI(name);
    var elementsData = [];
    products.result && products.result.products.length > 0 && products.result.products.forEach(element => {
        var newObj = {};
        newObj.title = element.title;
        newObj.image_url = getImageCdn(element.image_url, 800, 800);
        newObj.subtitle = "Giá: " + moneyToString(element.sale_price) + " ₫";
        newObj.default_action = {
            "type": "web_url",
            "url": "https://chiaki.vn/" + element.slug,
            "webview_height_ratio": "tall",
        };
        newObj.buttons = [
            /* {
                "type": "web_url",
                "url": "https://chiaki.vn/" + element.slug,
                "title": "Đặt hàng ngay",
                "webview_height_ratio": "full"
            } */
            {
                "type": "postback",
                "title": element.inventory > 0 ? "Đặt hàng" : "Báo tôi khi có hàng",
                "payload": element.inventory > 0 ? "ORDER_" + element.id : "NOTIFICATION",
            },
            {
                "type": "postback",
                "title": "Chi tiết",
                "payload": "DETAIL_PRODUCT_" + element.id,
            },
        ];
        elementsData.push(newObj);
    });

    let response = {};
    if (products.result && products.result.products.length == 0) {
        response = {
            "text": `Không có sản phẩm cần tìm. Quý khách vui lòng tìm sản phẩm khác`
        }
    } else {
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "image_aspect_ratio": "square",
                    "elements": elementsData,
                }
            }
        }
        user[sender_psid].action = 'chatting';
    }
    await callSendAPI(sender_psid, response);
}

async function thanks(sender_psid, phone) {
    user[sender_psid].action == 'chatting';
    let fullName = await getFacebookName(sender_psid);
    db.query("INSERT INTO `contact`(`full_name`,`psid`,`phone`)VALUES('" + fullName + "', '" + sender_psid + "', '" + phone + "');");
    await callSendAPI(sender_psid, {
        "text": `Cảm ơn quý khách đã để lại thông tin liên hệ. Chúng tôi sẽ gọi điện cho quý khách trong thời gian sớm nhất. Trân trọng!`
    });
}
async function reSubmitPhone(sender_psid) {
    await callSendAPI(sender_psid, {
        "text": `Số điện thoại không đúng định dạng. Vui lòng nhập lại số điện thoại.`,
    });
    let response = {
        "text": "Số điện thoại liên hệ:",
        "quick_replies": [
            {
                "content_type": "user_phone_number",
                "payload": "PHONE_NUMBER"
            }
        ]
    }
    await callSendAPI(sender_psid, response);
}

async function searchProduct(sender_psid) {
    user[sender_psid].action = 'search';
    await callSendAPI(sender_psid, {
        "text": `Quý khách vui lòng nhập tên sản phẩm.`
    });
}

async function getProductAPI(name) {
    return new Promise(function (resolve, reject) {
        request({
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            uri: "https://api.chiaki.vn/api/search/" + encodeURI(name) + "?page_id=0&page_size=" + PAGE_SIZE,
            method: 'GET'
        }, (err, res, body) => {
            if (!err) {
                resolve(JSON.parse(body));
            } else {
                reject(err);
            }
        });
    });
}

async function searchOrder(sender_psid) {
    user[sender_psid].action = 'search_order_phone';
    await callSendAPI(sender_psid, {
        "text": `Quý khách vui lòng nhập số điện thoại đặt hàng.`
    });
}

async function checkSearchOrderPhone(sender_psid, message) {
    if (isValidPhone(message)) {
        user[sender_psid].action = 'search_order_code';
        phone[sender_psid] = standardizePhone(message);
        await callSendAPI(sender_psid, {
            "text": `Quý khách vui lòng nhập mã đơn hàng.`
        });
    } else {
        reSubmitPhone(sender_psid);
    }
}

async function searchOrderInfo(sender_psid, message) {
    var response = await getOrderInfo(phone[sender_psid], message);
    await insertTracking(sender_psid, 'tracking_order', message);
    var message = `Có lỗi xảy ra. Vui lòng kiểm tra lại số điện thoại hoặc mã đơn hàng.`;
    if (response.status == 'successful' && response.result.order) {
        let order = response.result.order;
        let items = response.result.items;
        switch (order.status.code) {
            case 'pending':
                message = `Đơn hàng của quý khách đang được chờ xác nhận.`;
                break;
            case 'confirmed':
                message = `Đơn hàng của quý khách đã được xác nhận và sẽ được giao cho bên vận chuyển sớm nhất.`;
                break;
            case 'success':
                message = `Đơn hàng của quý khách đã được giao thành công.`;
                break;
            case 'delivering':
                message = `Đơn hàng của quý khách đã được giao cho ` + order.shipper_full_name + (order.shipper_code && order.shipper_code != null ? `, mã giao vận là ` + order.shipper_code : ``);
                break;
            case 'cancel':
                message = `Đơn hàng của quý khách đã bị hủy.`;
                break;
            default:
                break;
        }

        let createdTime = mysqlTimeStampToDate(order.create_time);
        let timestamp = createdTime.getTime() / 1000;

        let elements = [];

        for (var i = 0; i < items.length; i++) {
            elements.push({
                "title": items[i].name,
                "subtitle": "",
                "quantity": items[i].quantity,
                "price": items[i].unit_price,
                "currency": "VND",
                "image_url": items[i].image_url
            });
        }

        let object = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "receipt",
                    "recipient_name": order.related_user_name,
                    "order_number": order.code,
                    "currency": "VND",
                    "payment_method": "COD",
                    "order_url": "https://chiaki.vn/",
                    "timestamp": timestamp,
                    "address": {
                        "street_1": order.delivery_address,
                        "street_2": order.shipping.name,
                        "city": "100000",
                        "postal_code": " Trạng thái: " + order.status.status,
                        "state": "HN",
                        "country": "VI"
                    },
                    "summary": {
                        "subtotal": order.amount_temporary,
                        "shipping_cost": order.shipping_fee,
                        "total_cost": order.amount
                    },
                    "elements": elements
                }
            }

        }

        await callSendAPI(sender_psid, { text: message });
        await callSendAPI(sender_psid, object);

        postQuickReplies(sender_psid);

    } else {
        await callSendAPI(sender_psid, {
            "text": `Có lỗi xảy ra! vui lòng kiểm tra lại mã đơn hàng.`,
        });
        checkContinueTrackOrder(sender_psid);
        return;
    }

    user[sender_psid].action = 'chatting';
}

async function getOrderInfo(phone, orderCode) {
    var data = {
        "phone": phone,
        'orderCode': orderCode
    };
    var contentLength = data.length;
    return new Promise(function (resolve, reject) {
        request({
            headers: {
                'Content-Length': contentLength,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            uri: "https://api.chiaki.vn/api/order/detail",
            qs: data,
            method: 'GET'
        }, (err, res, body) => {
            if (!err) {
                resolve(JSON.parse(body));
            } else {
                reject(err);
            }
        });
    });
}

async function contact(sender_psid) {
    await callSendAPI(sender_psid, {
        "text": `Địa chỉ  : Tầng 3, Tòa nhà 24T3 Thanh Xuân Complex, Số 6 Lê Văn Thiêm, Thanh Xuân Trung, Thanh Xuân, Hà Nội`
    });
    await callSendAPI(sender_psid, {
        "text": `Hotline : ` + formatPhone('02466507460'),
    }, false);
}

async function consult(sender_psid) {

    await callSendAPI(sender_psid, {
        "text": 'Cảm ơn quý khách đã quan tâm! Nhân viên hỗ trợ sẽ liên hệ với quý khách trong thời gian sớm nhất!',
    });
    if (!global.user[sender_psid])
        global.user[sender_psid] = {};

    global.user[sender_psid].action = 'consult';
    toogleBot(sender_psid, false);

}

async function notificationPhone(sender_psid) {
    global.user[sender_psid].action = 'notification_phone';
    await callSendAPI(sender_psid, {
        "text": `Quý khách vui lòng để lại số điện thoại để chúng tôi có thể liên hệ khi có hàng.`
    });
}

async function notification(sender_psid, message) {
    if (isValidPhone(message)) {
        user[sender_psid].action = 'chatting';
        await callSendAPI(sender_psid, {
            "text": `Cảm ơn quý khách đã quan tâm. Chúng tôi sẽ liên hệ với quý khách ngay khi có hàng.`
        });
    } else {
        reSubmitPhone(sender_psid);
    }
}

async function detailProduct(sender_psid, id) {
    var product = await getProductById(id);
    product = product.result;
    await insertTracking(sender_psid, 'detail_product', product.code);
    let datestring = 'không rõ';
    let expTime = mysqlTimeStampToDate(product.expired_date);
    if (expTime) {
        datestring = ("0" + expTime.getDate()).slice(-2) + "/" + ("0" + (expTime.getMonth() + 1)).slice(-2) + "/" +
            expTime.getFullYear();
    }

    var message = `Sản phẩm "${product.name}" của hãng sản xuất ${product.manufacturer}, nguồn gốc ${product.product_origin} có giá: ${moneyToString(product.sale_price)}₫.` +
        `\n${product.description}` +
        `\nSản phẩm hiện ${product.inventory > 0 ? 'còn hàng' : 'hết hàng'}`;

    // `${product.inventory > 0 && product.expired_date != null ? (' và có hạn sử dụng: ' + datestring + ' (tham khảo)') : ''} `;

    await callSendAPI(sender_psid, { "text": message });
    let response = {
        "text": "Bạn có muốn đặt hàng?",
        "quick_replies": [
            {
                "content_type": "text",
                "title": "Tìm sản phẩm khác",
                "payload": "SEARCH_PRODUCT",
                "image_url": "https://s4.shopbay.vn/files/269/51khmhzghul-5ed06bae48853.png"
            },
            {
                "content_type": "text",
                "title": product.inventory > 0 ? "Đặt hàng" : "Báo khi có hàng",
                "payload": product.inventory > 0 ? "ORDER_" + id : "NOTIFICATION",
                "image_url": product.inventory > 0 ? "https://s4.shopbay.vn/files/1/order-5f0d80ec87801.png" : "https://s4.shopbay.vn/files/1/call-5f0e658d1f55b.png"
            },
        ]
    }
    await callSendAPI(sender_psid, response);
    user[sender_psid].action = 'chatting';
}

function mysqlTimeStampToDate(timestamp) {
    if (!timestamp) return null;
    //function parses mysql datetime string and returns javascript Date object
    //input has to be in this format: 2007-06-05 15:26:02
    var regex = /^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9]) (?:([0-2][0-9]):([0-5][0-9]):([0-5][0-9]))?$/;
    var parts = timestamp.replace(regex, "$1 $2 $3 $4 $5 $6").split(' ');
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
}

function getProductById(id) {
    return new Promise(function (resolve, reject) {
        request({
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            uri: "https://api.chiaki.vn/api/product/" + id,
            method: 'GET'
        }, (err, res, body) => {
            if (!err) {
                resolve(JSON.parse(body));
            } else {
                reject(err);
            }
        });
    });
}

function toogleBot(sender_psid, status = null) {
    if (status === null) status = !global.user[sender_psid].status;

    global.user[sender_psid].status = status;
    global.user[sender_psid].updateTime = new Date();

}

/* function deliveryPolicy(sender_psid) {
    setTypeStatus(sender_psid, true);
    // get delerery in database
    db.query("SELECT value FROM `option` where `key` = 'DELIVERY_POLICY';", function (err, rows, fields) {
        if (err) throw err
        callSendAPI(sender_psid, {
            "text": rows[0].value,
        });
        setTypeStatus(sender_psid, false);
    })
} */

/* function paymentMethods(sender_psid) {
    // get delerery in database
    db.query("SELECT value FROM `option` where `key` = 'PAYMENT_METHODS';", function (err, rows, fields) {
        if (err) throw err
        callSendAPI(sender_psid, {
            "text": rows[0].value,
        });
    })
} */

function getImageCdn($url, $width = 0, $height = 0, $fitIn = true, $webp = false) {
    $originUrl = $url;
    if ($url.substr(0, 4) == 'http') {
        $url = $url.replace('https://', '');
        $url = $url.replace('http://', '');
    }

    $baseCdnUrl = "https://cdn.shopbay.vn/unsafe/";
    $fitIn = ($fitIn && $width && $height);
    // $fitIn = false;
    if ($fitIn) {
        $baseCdnUrl += "fit-in/";
    }
    if ($width || $height) {
        $baseCdnUrl += $width + "x" + $height + "/";
    }
    if ($fitIn || $webp) {
        $baseCdnUrl += "filters";
    }
    if ($fitIn) {
        $baseCdnUrl += "-fill-fff-";
    }
    if ($webp) {
        $baseCdnUrl += "-format-webp-";
    }
    if ($fitIn || $webp) {
        $baseCdnUrl += "/";
    }
    $baseCdnUrl += $url;
    return $baseCdnUrl;
}

function formatPhone(phoneStr) {
    var phoneStrClear = phoneStr.replace(/\D/g, '');
    var length = phoneStrClear.length;
    var phone = phoneStrClear;
    if (length > 3 && length <= 6) {
        phone = phoneStrClear.replace(/^(\d{3})(\d+)+$/, "$1.$2");
    } else if (length > 6 && length <= 9) {
        phone = phoneStrClear.replace(/^(\d{3})(\d{3})(\d+)+$/, "$1.$2.$3");
    } else if (length == 10) {
        phone = phoneStrClear.replace(/^(\d{4})(\d{3})(\d{3})+$/, "$1.$2.$3");
    } else if (length == 11) {
        phone = phoneStrClear.replace(/^(\d{5})(\d{3})(\d{3})+$/, "$1.$2.$3");
    } else {
        phone = phoneStrClear.replace(/^(\d{5})(\d{3})(\d{3})(\d+)+$/, "$1.$2.$3$4");
    }
    return phone;
}

function moneyToString(price) {
    if (price == null || price.toString().match(/^\-?[0-9]+(\.[0-9]+)?$/) == null) {
        return "NA";
    }
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

isValidPhone = function (phone) {
    if (phone == null) {
        return false;
    }
    //ELSE:
    var stdPhone = standardizePhone(phone);
    var regex = /^0(9\d{8}|1\d{9}|[2345678]\d{7,14})$/;
    return stdPhone.match(regex) != null;
};

standardizePhone = function (phone) {
    if (phone == null) {
        return phone;
    }

    phone = phone.replace(/\+[0-9]{2}/, "0");
    return phone.replace(/[^0-9]/g, "");
};

async function insertTracking(sender_psid, type, value) {
    let response = await requestAPI.send(WH_API_URL + '/service/save-facebook-chatbot-tracking', 'POST', {
        psid: sender_psid,
        type: type,
        value: value,
        token: API_TOKEN
    });
}

module.exports = {
    handleMessage,
    handlePostback,
    callSendAPI,
    toogleBot
}
