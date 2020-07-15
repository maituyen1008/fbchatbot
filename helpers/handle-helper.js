const request = require('request');
const fetch = require('node-fetch');
// var db = require('./db-helper');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_SIZE = 5;
const GREETING_TEXT = ['bắt đầu', 'hi', 'xin chào', 'chào', 'alo', '.'];

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

        if(user[sender_psid].inprocess && ['getting_name', 'getting_address', 'getting_phone'].includes(user[sender_psid].inprocess)) {
            order(sender_psid);

        } else if (GREETING_TEXT.includes(received_message.text.toLowerCase())) {
            greeting(sender_psid);

        } else if (user[sender_psid].action == 'search') {
            getProductByName(sender_psid, received_message.text);

        } else if (user[sender_psid].action == 'search_order_phone') {
            checkSearchOrderPhone(sender_psid, received_message.text);

        } else if (user[sender_psid].action == 'search_order_code') {
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
    /* if (postback.payload.includes('CONSULT')) {

        if (postback.payload == 'CONSULT') {
            consult(sender_psid);
        }
         else { // không dùng cái này nữa
            var regex = /_(\w+)$/gm;
            var arr = regex.exec(postback.payload);
            consult(sender_psid, arr[1]);
        }

    } */
    if (user[sender_psid] == null) {
        user[sender_psid] = {};
        user[sender_psid].action = 'chatting';
    }

    if (postback.payload.includes("DETAIL_PRODUCT")) {
        var arr = postback.payload.split("_");
        detailProduct(sender_psid, arr[arr.length -1]);
    } else {
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
            case 'ORDER':
                order(sender_psid);
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

async function order(sender_psid) {
    if (!global.user[sender_psid])
        global.user[sender_psid] = {};

    if(!global.user[sender_psid].inprocess) {
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
        global.user[sender_psid].inprocess = 'getting_address'
        // Hỏi địa chỉ
        await callSendAPI(sender_psid, {
            "text": `Địa chỉ nhận hàng:`
        });

    } else if(global.user[sender_psid].inprocess == 'getting_address') {
        global.user[sender_psid].inprocess = 'getting_phone';
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
        delete global.user[sender_psid].inprocess;

        callSendAPI(sender_psid, {
            "text": 'Cảm ơn quý khách đã đặt hàng tại Chiaki! Nhân viên hỗ trợ sẽ liên hệ với quý khách trong thời gian sớm nhất.'
        });
    }

}

function postQuickReplies(sender_psid) {
    let response = {
        "text": "Mình có thể giúp gì cho bạn?",
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
                "payload": "CONTACT",
                "image_url": "https://s4.shopbay.vn/files/269/box-5ed06c7a0f21b.png"
            }
        ]
    }
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
async function callSendAPI(sender_psid, response, typing = true) {

    if (typing) {
        setTypeStatus(sender_psid, true);
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

function setTypeStatus(sender_psid, isTyping = true) {
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

    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": typeStatus
    });
}

async function greeting(sender_psid) {

    if (global.user[sender_psid] && !global.user[sender_psid].status) {
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
        "text": `Chào mừng bạn đến với Chiaki - Siêu thị trực tuyến hàng đầu Việt Nam`
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
                "title": element.inventory > 0 ? "Đặt hàng" : "Báo tôi khi có hàng" ,
                "payload": element.inventory > 0 ? "ORDER" : "NOTIFICATION",
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

/* async function thanks(sender_psid, phone) {
    user[sender_psid].action == 'chatting';
    let fullName = await getFacebookName(sender_psid);
    db.query("INSERT INTO `contact`(`full_name`,`psid`,`phone`)VALUES('" + fullName + "', '" + sender_psid + "', '" + phone + "');");
    await callSendAPI(sender_psid, {
        "text": `Cảm ơn quý khách đã để lại thông tin liên hệ. Chúng tôi sẽ gọi điện cho quý khách trong thời gian sớm nhất. Trân trọng!`
    });
} */
async function reSubmitPhone(sender_psid) {
    await callSendAPI(sender_psid, {
        "text": `Số điện thoại không đúng định dạng. Vui lòng thử lại.`,
    });
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
        phone[sender_psid] = message;
        await callSendAPI(sender_psid, {
            "text": `Quý khách vui lòng nhập mã đơn hàng.`
        });
    } else {
        reSubmitPhone(sender_psid);
    }
}

async function searchOrderInfo(sender_psid, message) {
    var response = await getOrderInfo(phone[sender_psid], message);
    var message = `Có lỗi xảy ra. Vui lòng kiểm tra lại số điện thoại hoặc mã đơn hàng.`;
    if (response.status == 'successful' && response.result.order) {
        let order = response.result.order;
        let items = response.result.items;
        switch (order.status.code) {
            case 'pending':
                message = `Đơn hàng của bạn đang được chờ xác nhận.`;
                break;
            case 'confirmed':
                message = `Đơn hàng của bạn đã được xác nhận và sẽ được giao cho bên vận chuyển sớm nhất.`;
                break;
            case 'success':
                message = `Đơn hàng của bạn đã được giao thành công.`;
                break;
            case 'delivering':
                message = `Đơn hàng của bạn đã được giao cho ` + order.shipper_full_name + (order.shipper_code && order.shipper_code != null ? `, mã giao vận là ` + order.shipper_code : ``);
                break;
            case 'cancel':
                message = `Đơn hàng của bạn đã bị hủy.`;
                break;
            default:
                break;
        }
        let timestamp = order.sync_id.substr(0,10);
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
                        "city": order.status.status,
                        "postal_code": "10000",
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

        await callSendAPI(sender_psid, {text: message});
        await callSendAPI(sender_psid, object);

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
        "text": 'Cảm ơn bạn đã quan tâm! Nhân viên hỗ trợ sẽ liên hệ với bạn trong thời gian sớm nhất!' + ' (' + sender_psid + ')',
    });
    if (!global.user[sender_psid])
        global.user[sender_psid] = {};

    global.user[sender_psid].action = 'consult';
    toogleBot(sender_psid, false);

}

async function notificationPhone(sender_psid) {
    global.user[sender_psid].action = 'notification_phone';
    await callSendAPI(sender_psid, {
        "text": `Quý khách vui lòng để lại số điện thoại để chúng tôi.`
    });
}

async function notification (sender_psid, message) {
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
    var message = `Sản phẩm "${product.name}" của hãng sản xuất ${product.manufacturer}, nguồn gốc ${product.product_origin} có giá: ${moneyToString(product.sale_price)}₫.` + 
                `\n${product.description}` +
                `\nSản phẩm hiện ${product.inventory > 0 ? 'còn hàng' : 'hết hàng'}` + 
                `${product.inventory > 0 && product.expired_date != null ? (' và có hạn sử dụng là ' + product.expired_date + ' (tham khảo)') : '' } `;
    await callSendAPI(sender_psid, {"text": message});
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
                "payload": "NOTIFICATION",
                "image_url": product.inventory > 0 ? "https://s4.shopbay.vn/files/1/order-5f0d80ec87801.png" : "https://s4.shopbay.vn/files/1/call-5f0e658d1f55b.png"
            },
        ]
    }
    await callSendAPI(sender_psid, response);
    user[sender_psid].action = 'chatting';
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
    //ELSE:
    return phone.replace(/[^0-9]/g, "");
};

module.exports = {
    handleMessage,
    handlePostback,
    callSendAPI,
    toogleBot
}
