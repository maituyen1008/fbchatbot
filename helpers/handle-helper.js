const request = require('request');
const fetch = require('node-fetch');
// var db = require('./db-helper');

const PAGE_ACCESS_TOKEN =  process.env.PAGE_ACCESS_TOKEN;
const SECURITY_TOKEN = process.env.SECURITY_TOKEN;
// Handles messages events
function handleMessage(sender_psid, received_message) {

    let response;

    // Check if the message contains text
    if (received_message.text) {
        if(received_message.text.toLowerCase() == 'bắt đầu') {
            greeting(sender_psid);
        } else if (user.sender_psid == 'search') {
            getProductByName(sender_psid, received_message.text);
        } else if (user.sender_psid == 'consult') {
            checkPhone(sender_psid, received_message.text);
        } else if (user.sender_psid == 'search_order_phone'){
            checkSearchOrderPhone(sender_psid, received_message.text);
        } else if (user.sender_psid == 'search_order_code'){
            searchOrderInfo(sender_psid, received_message.text);
        } else if(received_message.quick_reply && received_message.quick_reply.payload) {
            console.log(received_message.quick_reply.payload)
            handlePostback(sender_psid, received_message.quick_reply);
            
        }
    }

    
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, postback) {
    if (postback.payload.includes('CONSULT')) {

        if(postback.payload == 'CONSULT') {
            consult(sender_psid);
        } else {
            var regex = /_(\w+)$/gm;
            var arr = regex.exec(postback.payload);
            consult(sender_psid, arr[1]);
        }

    }
    switch (postback.payload) {
        case 'GET_STARTED':
            greeting(sender_psid);
            break;
        case 'SEARCH_PRODUCT':
            searchProduct(sender_psid);
            break;
        case 'SEARCH_ORDER':
            searchOrder(sender_psid);
            break;
        case 'CONTACT':
            contact(sender_psid);
            break;
        // case 'DELIVERY_POLICY':
        //     deliveryPolicy(sender_psid);
        //     break;
        // case 'PAYMENT_METHODS':
        //     paymentMethods(sender_psid);
        //     break;
        default:
    }
}

function postQuickReplies(sender_psid) {
    let response = {
        "text": "Mình có thể giúp gì cho bạn?",
        "quick_replies":[
            {
                "content_type":"text",
                "title":"Tìm Kiếm sản phẩm",
                "payload":"SEARCH_PRODUCT",
                "image_url":"https://images-eu.ssl-images-amazon.com/images/I/51KHmHZGHUL.png"
            },
            {
                "content_type":"text",
                "title":"Tư vấn cho tôi",
                "payload":"CONSULT",
                "image_url":"https://www.mossreports.com/wp-content/uploads/consult-standard.png"
            },
            {
                "content_type":"text",
                "title":"Thông tin liên hệ",
                "payload":"CONTACT",
                "image_url":"https://cgomedia.com/wp-content/uploads/2019/11/contact-us.png"
            }
        ]
    }
    callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
async function callSendAPI(sender_psid, response, typing = true) {

    if(typing) {
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

            if(typing) {
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
    if(!isTyping){
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
    let fullName = await getFacebookName(sender_psid);
    await callSendAPI(sender_psid, {
        "text": `Chào mừng ${fullName} tới sàn thương mại điện điện tử lớn nhất Thế giới!`
    });
    await callSendAPI(sender_psid, {
        "text": `Hotline : 0981518218`
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

async function getProductByName (sender_psid, name = null) {
    setTypeStatus(sender_psid, true);
    var products = await getProductAPI(name);
    var elementsData = [];

    products.result.length > 0 && products.result.forEach(element => {
        var newObj = {};
        newObj.title = element.title;
        newObj.image_url = getImageCdn('https://chiaki.vn/upload/' +element.image_url, 340, 177);
        newObj.subtitle = "Giá: " + moneyToString(element.sale_price) + " ₫";
        // newObj.subtitle = "Tình trạng: "  + element.inventory > 0 ? "còn hàng" : "tạm hết hàng";
        // newObj.subtitle = "Xuất sứ: " + element.manufacturer;
        // newObj.default_action = {
        //     "type": "web_url",
        //     "url": "https://chiaki.vn/" + element.slug,
        //     "webview_height_ratio": "tall",
        // };
        // newObj.buttons = [
        //     {
        //         "type":"web_url",
        //         "url":"https://chiaki.vn/" + element.slug,
        //         "title":"Đặt hàng ngay",
        //         "webview_height_ratio": "full"
        //     },
        //     {
        //         "type": "postback",
        //         "title": "Gọi tư vấn cho tôi",
        //         "payload": "CONSULT_" + element.code,
        //     },
        // ];
        elementsData.push(newObj);
    });
    console.log('elementsData' , elementsData)

    let response = {};
    if (products.result.length == 0) {
        response = {
            "text": `Không có sản phẩm cần tìm. Quý khách vui lòng tìm sp khác`
        }
    } else {
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": elementsData
                }
            }
        }
    }
    await callSendAPI(sender_psid, response);
    user.sender_psid = 'chatting';
}

async function thanks (sender_psid, phone) {
    user.sender_psid == 'chatting';
    let fullName = await getFacebookName(sender_psid);
    // db.query("INSERT INTO `contact`(`full_name`,`psid`,`phone`)VALUES('" + fullName + "', '" + sender_psid + "', '" + phone + "');");
    await callSendAPI(sender_psid, {
        "text": `Cảm ơn quý khách đã để lại thông tin liên hệ. Chúng tôi sẽ gọi điện cho quý khách trong thời gian sớm nhất. Trân trọng!`
    });
}
async function reSubmitPhone (sender_psid) {
    await callSendAPI(sender_psid, {
        "text": `Số điện thoại không đúng định dạng. Vui lòng thử lại!`,
    });
}

async function searchProduct (sender_psid) {
    user.sender_psid = 'search';
    await callSendAPI(sender_psid, {
        "text": `Quý khách vui lòng nhập tên sản phẩm!`
    });
}

async function getProductAPI(name) {
    return new Promise(function(resolve, reject) {
        request({
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            uri: "https://api.chiaki.vn/api/search/" + encodeURI(name) + "?page_id=0&page_size=5",
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

async function searchOrder (sender_psid) {
    user.sender_psid = 'search_order_phone';
    await callSendAPI(sender_psid, {
        "text": `Quý khách vui lòng nhập số điện thoại đặt hàng!`
    });
}

async function checkSearchOrderPhone(sender_psid, message) {
    if (isValidPhone(message)) {
        user.sender_psid = 'search_order_code';
        user.phone = message;
        await callSendAPI(sender_psid, {
            "text": `Quý khách vui lòng nhập mã đơn hàng!`
        });
    } else {
        reSubmitPhone(sender_psid);
    }
}

async function getOrderInfo(phone, orderCode) {
    var data = { 
        "phone": phone,
        'orderCode': orderCode
    };
    var contentLength = data.length;
    return new Promise(function(resolve, reject) {
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

async function consult(sender_psid, productCode = '') {

    await callSendAPI(sender_psid, {
        "text": `Quý khách vui lòng điền số điện thoại để được hỗ trợ tư vấn sản phẩm: ` + productCode,
    });
    global.user.sender_psid = 'consult';

    // check số điện thoại
    /* db.query("SELECT * FROM `contact` where `psid` = '" + sender_psid + "';", async function (err, rows, fields) {
        if (err) throw err
        if(!rows.length){
            await callSendAPI(sender_psid, {
                "text": `Quý khách vui lòng điền số điện thoại để được hỗ trợ tư vấn sản phẩm: ` + productCode,
            });
            global.user.sender_psid = 'consult';
        } else {
            await callSendAPI(sender_psid, {
                "text": `Chúng tôi sẽ sớm hỗ trợ tư vấn sản phẩm: ` + productCode,
            });
            global.user.sender_psid = 'chatting';
        }
    }) */

}

function deliveryPolicy(sender_psid) {
    setTypeStatus(sender_psid, true);
    // get delerery in database
    db.query("SELECT value FROM `option` where `key` = 'DELIVERY_POLICY';", function (err, rows, fields) {
        if (err) throw err
        callSendAPI(sender_psid, {
            "text": rows[0].value,
        });
        setTypeStatus(sender_psid, false);
    })
}

function paymentMethods(sender_psid) {
    // get delerery in database
    db.query("SELECT value FROM `option` where `key` = 'PAYMENT_METHODS';", function (err, rows, fields) {
        if (err) throw err
        callSendAPI(sender_psid, {
            "text": rows[0].value,
        });
    })
}

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
    callSendAPI
}