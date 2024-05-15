const PHONE_MIN_LENGTH = 13;
const PHONE_MAX_LENGTH = 14;
const ID_FOR_CARD_LENGTH = 13;

var lastLangSet = "uk";
var dev_inf = {};
let result_array = [];

const CUR_LANG = "lang";



var mqttSettings = {};
var form = null;

function setMqttSettingsDefault() {
    var array = {};
    array["lang"] = "uk";
    array["MQTT_SECURE"] = "false";
    array["FILE_OUT"] = "false";
    array["MQTT_LOGIN"] = "test333";
    array["MQTT_PASSWORD"] = "t88223311";
    array["MQTT_SERVER"] = "31.134.127.102";
    array["MQTT_CLIENT_ID"] = "webinterface";
    array["MQTT_TOPIC_NAME"] = "mbdevice/0123456789abcdef";
    array["MQTT_PORT"] = "8083";
    array["DEVICE_PASSWORD"] = "12345678";

    return array;
}

// Сохранение объекта при закрытии страницы
window.addEventListener('beforeunload', function () {
    localStorage.setItem('mqttSettings', JSON.stringify(mqttSettings));
});

// Чтение объекта при старте
document.addEventListener('DOMContentLoaded', function () {
    loadPage('control');
    var savedSettings = localStorage.getItem('mqttSettings');
    if (savedSettings) {
        mqttSettings = JSON.parse(savedSettings);
    }

    if (!savedSettings || Object.keys(mqttSettings).length == 0) {
        mqttSettings = setMqttSettingsDefault();
    }
    setLanguage(mqttSettings["lang"]);
    updateForm(mqttSettings);

    //пытаемся коннектится
    connectReconnect2MqttServer();
});

// Функция для установки языка
function setLanguage(lang) {
    lastLangSet = lang;
    var elements = document.querySelectorAll("[id]");
    elements.forEach(function (element) {
        var id = element.id;
        if (strings[id] && strings[id][lang]) {
            //element.textContent = strings[id][lang];
            if (element.tagName === 'INPUT') {
                element.value = strings[id][lang];
            } else {
                if (element.id === "usrCNT") element.textContent = getString(id, lang, { "val": dev_inf['uqnt'] });
                else if (element.id === "usrQNT") element.textContent = getString(id, lang, { "val": dev_inf['muqnt'] });
                else if (element.id === "gsmLevel") element.textContent = getString(id, lang, { "val": dev_inf['rssi'] });
                else if (element.id === "adminPh") element.textContent = getString(id, lang, { "val": dev_inf['admin'] });
                else element.textContent = strings[id][lang];
            }
        }
    });
}

// Функция для обновления значений на страницу из массива settings_array по типам input, select
function updateForm(settings_array) {
    // Получаем все элементы ввода на странице
    const inputElements = document.querySelectorAll("input, select");


    // Проходим по каждому элементу
    inputElements.forEach(element => {
        // Если элемент имеет id
        if (element.id) {
            // Проверяем, есть ли id элемента в settings_array
            if (settings_array.hasOwnProperty(element.id)) {
                // Обновляем значение в settings_array в зависимости от типа элемента
                if (element.type === "checkbox") {
                    // Преобразуем значение settings_array[element.id] в булевый тип данных
                    element.checked = settings_array[element.id]/* === "false" ? false : true*/;
                    element.dispatchEvent(new Event("change"))
                } else {
                    element.value = settings_array[element.id];
                }
            }
        }
    });
}


// Функция для обновления значений со страницы в массив settings_array по типам input, select
function readForm(settings_array) {
    // Получаем все элементы ввода на странице
    const inputElements = document.querySelectorAll("input, select");


    // Проходим по каждому элементу
    inputElements.forEach(element => {
        // Если элемент имеет id
        if (element.id) {
            // Проверяем, есть ли id элемента в settings_array

            // Обновляем значение в settings_array в зависимости от типа элемента
            if (element.type === "checkbox") {
                // Преобразуем значение settings_array[element.id] в булевый тип данных
                mqttSettings[element.id] = element.checked;
            } else {
                mqttSettings[element.id] = element.value;
            }

        }
    });
}




//------------------------------------------------------MQTT------------------------------------------------------

// Функция для изменения цвета светодиода
function changeLedColor(online) {
    // Получаем ссылку на элементы
    var led = document.getElementById('led');
    if (online) {
        led.style.backgroundColor = 'green'; // светодиод включен (онлайн)
    } else {
        led.style.backgroundColor = 'red'; // светодиод отключен (офлайн)
    }
}

let isConnected = false; // Флаг для отслеживания состояния связи
let client;

// Функция установки флага связи
function setConnectionFlag(value) {
    isConnected = value;
    //let connectionStatusElement = document.getElementById("connection-status");
    if (isConnected) {
        changeLedColor(true);
        //connectionStatusElement.textContent = "Online";
    } else {
        //connectionStatusElement.textContent = "Offline";
        changeLedColor(false);
    }
}

// Функция получения текущего состояния флага связи
function getConnectionFlag() {
    return isConnected;
}

// Функция обработки ошибки подключения
function handleConnectionError(client) {
    console.error('Connection error');
    setConnectionFlag(false);
    // Здесь вы можете выполнить необходимые действия при потере связи, например, установить флаг
}

// Функция обработки успешного восстановления связи
function handleReconnect(client) {
    console.log('Reconnected to MQTT server');
    // Здесь вы можете выполнить необходимые действия при восстановлении связи, например, сбросить флаг
}


// Функция подключения к серверу MQTT и подписки на топик
function connectAndSubscribeMQTT(server, port, userID, topicName, login, password, callback) {
    //const mqttUrl = `mqtt://${server}:${port}`; // Указываем порт в URL подключения
    let protocol_signature = 'ws';
    if (mqttSettings.MQTT_SECURE !== false) protocol_signature = 'wss';
    const mqttUrl = `${protocol_signature}://${server}:${port}/mqtt`; // Указываем порт в URL подключения


    client = mqtt.connect(mqttUrl, {
        username: login,
        password: password,
        clientId: userID
    });





    client.on('connect', () => {
        console.log('Connected to MQTT server');
        // setConnectionFlag(true);
        // callback(true);
        client.subscribe(topicName + "/d2s", (err) => {
            if (!err) {
                console.log(`Subscribed to ${topicName}`);
                callback(true);
                //запросы для получения информации об устройстве
                createRequest('inf', '');
                createRequest('get', '');
            } else {
                console.error('Failed to subscribe to the topic', err);
                callback(false);
            }
        });//
    });


    client.on('message', (receivedTopic, message) => {
        console.log(`Received message from topic ${receivedTopic}: ${message.toString()}`);
        const textDecoder = new TextDecoder();
        var params = parseQueryString(textDecoder.decode(message));
        if (params.hasOwnProperty('cmd')) {
            switch (params.cmd) {
                case 'answer':
                    handler_answer(params);
                    break;
            }
        }
    });



    // Обработка события ошибки
    client.on('error', (error) => {
        console.error('MQTT error:', error);
        handleConnectionError(client);
    });

    // Обработка события восстановления связи
    client.on('reconnect', () => {
        handleReconnect(client);
    });
}


// Функция отправки сообщения на MQTT-сервер
function sendMessage(topic, message) {
    // Публикуем сообщение в указанный топик
    client.publish(topic, message);
    console.log(`Message sent to ${topic}: ${message}`);
}


function sendData(params) {
    if (getConnectionFlag() == true) {
        sendMessage(mqttSettings.MQTT_TOPIC_NAME + "/s2d", params);
    }
    // console.log(params.toString());
}


function areAllValuesDefined(obj) {
    return Object.values(obj).every(value => value !== undefined);
}

function connectReconnect2MqttServer() {
    if (getConnectionFlag() === true) {
        client.end();
        console.log("mqqt stop!!!");
        setConnectionFlag(false);
    }


    if (Object.keys(mqttSettings).length > 0 && areAllValuesDefined(mqttSettings) === true) {


        connectAndSubscribeMQTT(mqttSettings.MQTT_SERVER, mqttSettings.MQTT_PORT, mqttSettings.MQTT_CLIENT_ID,
            mqttSettings.MQTT_TOPIC_NAME, mqttSettings.MQTT_LOGIN, mqttSettings.MQTT_PASSWORD, setConnectionFlag);
    }
}


function parseUriParams(uriString) {
    const params = new URLSearchParams(uriString);
    const paramsObject = {};

    params.forEach((value, key) => {
        paramsObject[key] = value;
    });

    return paramsObject;
}

//-----------------запросы

var wait_UID;
var lastSendedCmd;

function getMillis() {
    var now = new Date();
    var millisString = (now.getTime() + now.getMilliseconds()).toString();
    if (millisString.length > 8) {
        millisString = millisString.substring(0, 8); // или millisString.slice(0, 8)
    }
    return millisString.padStart(8, "0");
}

//---формируем данные на отправку
// function make_cmd(uid, psw, cmd, params) {
//     const formData = new FormData();
//     if (uid.length === 0) uid = getMillis();
//     formData.append('t_uid', uid);
//     formData.append('psw', psw);
//     formData.append('cmd', cmd);
//     formData.append('params', params);
//     formData.append('type', 'r_w_2_d');
//     formData.append('proof', 'w_p_i');
//     formData.append('sender', 'WEB');


//     const params_temp = new URLSearchParams(formData);
//     const formDataString = params_temp.toString();

//     return formDataString;
// }


function make_cmd(uid, psw, cmd, params) {
    var formData;
    if (uid.length === 0) uid = getMillis();
    formData = 't_uid=' + uid;
    formData += '&psw=' + psw;
    formData += '&cmd=' + cmd;
    formData += '&params=' + params;
    formData += '&type=r_w_2_d';
    formData += '&proof=w_p_i';
    formData += '&sender=WEB';

    return formData;
}



function createRequest(cmd, params) {
    var send_UID = getMillis();
    if (cmd !== 'get') {
        lastSendedCmd = cmd;
        wait_UID = send_UID;
    }
    var cmdStr = make_cmd(send_UID, mqttSettings.DEVICE_PASSWORD, cmd, params);
    sendData(cmdStr);
}

//-------------------Handlers




function handler_answer(params) {
    var element;
    if (params.hasOwnProperty('t_uid') && wait_UID === params.t_uid) {
        if (answerTimerID !== null) {//сброс таймера ожидание ответа от модуля
            clearTimeout(answerTimerID);
            answerTimerID = null;
            retParams = params;
        }
        //обновление параметров на экране
        if (params.hasOwnProperty('uqnt')) {
            element = document.getElementById('usrCNT');
            if (element !== null) {
                element.textContent = getString('usrCNT', mqttSettings.lang, { "val": params['uqnt'] });
                dev_inf.uqnt = params['uqnt'];
            }
        }
        if (params.hasOwnProperty('muqnt')) {
            element = document.getElementById('usrQNT');
            if (element !== null) {
                element.textContent = getString('usrQNT', mqttSettings.lang, { "val": params['muqnt'] });
                dev_inf.muqnt = params['muqnt'];
            }
        }
        if (params.hasOwnProperty('rssi')) {
            element = document.getElementById('gsmLevel');
            if (element !== null) {
                element.textContent = getString('gsmLevel', mqttSettings.lang, { "val": params['rssi'] });
                dev_inf.rssi = params['rssi'];
            }
        }

        if (params.hasOwnProperty('admin')) {
            element = document.getElementById('adminPh');
            if (element !== null) {
                element.textContent = getString('adminPh', mqttSettings.lang, { "val": params['admin'] });
                dev_inf.admin = params['admin'];
            }
        }

        return true;
    }
    return false;
}

//---------------------------конверторы
function parseQueryString(queryString) {
    const pairs = queryString.split('&');
    const result = {};

    pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        result[key] = value;
    });

    return result;
}
//---------------------------коммуникации

var answerTimerID = null; //таймер ожидания ответа от устройства
var retParams = null;//строка с параметрами ответа от устройства


// Функция для передачи данных на устройство
function sendTransaction(CMD, data, onCancel) {
    return new Promise((resolve, reject) => {
        //преобразуем в строку с разделителем ';'
        let params = '';
        if (data !== null) {
            params = data.join(';');
        }

        //отправляем запрос с командой
        createRequest(CMD, params);
        //отправляем запрос для того чтобы устройство прислало ответ
        createRequest('get', '');

        //ставим таймер на 60сек и ждем пока девайс ответит
        answerTimerID = setTimeout(function () {
            answerTimerID = null;
            reject("err:device not answered!");
        }, 60000);

        // регистрируем обработчик и передаем ему колбек функцию
        if (onCancel !== null) {
            console.log("\nрегистрируем обработчик");
            onCancel(() => {
                //тело колбек функции
                clearTimeout(answerTimerID);
                reject(new Error(strings["CAN_USR"][lastLangSet]));
            });
        }

        function waitForAnswer() {
            // Проверяем, сработал ли таймер
            if (answerTimerID !== null) {
                // Если таймер еще не сработал, ждем еще некоторое время и повторяем проверку
                setTimeout(waitForAnswer, 100); // Проверяем каждые 100 миллисекунд
            } else {
                // Если таймер сработал, выполняем необходимые действия
                resolve(retParams);
            }
        }

        // Запускаем функцию ожидания ответа
        waitForAnswer();
    });
}

// Функция для передачи команды управления списком данных на устройство
function cmdToDevice(CMD, dataList, fileName, plusMessage, minusMessage, multipleMessage) {
    // Константа с максимальным количеством передаваемых номеров телефонов или карт за один раз
    const NUM_PER_TRANSACTION = 10;

    // Создаем модальное окно с прогрессбаром и кнопкой
    var myModal = createModal();

    // Если список данных пустой, выводим сообщение об ошибке
    if (!dataList || dataList.length === 0) {
        myModal.messageText.textContent = strings["LIST_EMPTY"][lastLangSet];
        myModal.Btn.textContent = "OK";
        //регистрация обработчика нажатия на кнопку
        myModal.Btn.onclick = function () {//собственно и сам обработчик
            document.body.removeChild(myModal.modalContainer);
        }
        return;
    }



    // Функция для отправки списка данных на устройство
    function sendList(list) {


        var index = 0;

        myModal.messageText.textContent = strings["DEV_COM"][lastLangSet];
        myModal.Btn.textContent = strings["CANCEL_USR"][lastLangSet];

        function process() {
            var chunkSize = Math.min(NUM_PER_TRANSACTION, list.length - index); // Вычисляем размер текущего блока данных
            if (chunkSize <= 0) {
                return Promise.resolve(chunkSize); // Если блок данных пуст, завершаем передачу                
            }

            var chunk = list.slice(index, index + chunkSize);
            index += chunkSize;

            console.log("\nrun sendTransaction!");
            return sendTransaction(CMD, chunk, onCancel)
                .then(() => {
                    console.log("\nsendTransaction resolve!");
                    //складируем текущий ответ в массив ответов
                    result_array = result_array.concat(retParams.ret.split(/\s*;\s*/));
                    // Обновление прогресса передачи
                    myModal.progressBar.value = (index / list.length) * 100;
                    // return process(); // Рекурсивный вызов для передачи следующего блока данных
                    return process()
                        .then((chunkSize) => {
                            // Успешное завершение передачи                
                            console.log("\nrecursive process resolve!");
                        })
                        .catch(() => {
                            console.log("\n recuirsive process reject!");
                            return Promise.reject();
                        });
                })
                .catch((error) => {
                    console.log("\nsendTransaction reject!");
                    return Promise.reject();
                });
        }

        // регистрация обработки кнопки отмена
        function onCancel(callback) {
            myModal.Btn.onclick = function () {
                //строки самого обработчика
                callback();
                document.body.removeChild(myModal.modalContainer);
            };
        }

        return process()
            .then((chunkSize) => {
                // Успешное завершение передачи                
                console.log("\nprocess resolve!");
                myModal.messageText.innerHTML = strings["COM_GOOD"][lastLangSet];
                result2File(fileName, dataList, result_array, plusMessage, minusMessage, multipleMessage);
                if ((mqttSettings["FILE_OUT"] === "false" || mqttSettings["FILE_OUT"] === false) && CMD === "IsPresent") {
                    displayNumbersWithStatus(dataList, result_array);
                }
                myModal.Btn.textContent = 'OK';// Показываем кнопку "OK"

                //запросы для получения информации об устройстве
                createRequest('inf', '');
                createRequest('get', '');
            })
            .catch(() => {
                console.log("\nprocess reject!");
                myModal.messageText.innerHTML = strings["COM_ERR"][lastLangSet];
                myModal.Btn.textContent = strings["BACK_BTN"][lastLangSet];
            });
    }




    // Вызов функции для передачи данных на устройство
    sendList(dataList);
}


// Функция для передачи на устройство некоторых команд (del all , backup , restore)
function sendSpecCommand(CMD) {
    return new Promise((resolve, reject) => {

        var params = null;
        if (CMD === 'del') {
            params = [];
            params.push('*');
        }
        showLoadingIndicator();
        sendTransaction(CMD, params, null)
            .then(() => {
                console.log("\nsendSpecCommand resolve!");
                //складируем текущий ответ в массив ответов
                //result_array = result_array.concat(retParams.ret.split(/\s*;\s*/));

                //запросы для получения информации об устройстве
                createRequest('inf', '');
                createRequest('get', '');
                hideLoadingIndicator();
                infoAfterProcedure(retParams.ret);
                resolve(retParams.ret);
            })
            .catch((error) => {
                if (CMD === 'rst') {
                    location.reload();
                }
                else {
                    console.log("\nsendTransaction reject!");
                    hideLoadingIndicator();
                    infoAfterProcedure("!");
                    reject("err");
                }
            });
    });
}

//------------------------------MODAL
// Функция для создания модального окна с прогрессбаром и кнопкой отмены
function createModal() {
    // Создаем элементы модального окна
    var modalContainer = document.createElement('div');
    modalContainer.classList.add('modal-container');

    var modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    // Установка фиксированной ширины и высоты для модального окна
    modalContent.style.width = '400px';
    modalContent.style.height = '120px';

    var progressBar = document.createElement('progress');
    progressBar.value = 0;
    progressBar.max = 100;

    // Добавляем текстовое поле для вывода сообщений
    var messageText = document.createElement('div');
    messageText.style.marginBottom = '20px'; // Устанавливаем отступ снизу
    messageText.style.textAlign = 'center'; // Выравниваем текст по центру


    // Добавляем кнопку
    var Button = document.createElement('button');



    // Добавляем элементы в модальное окно
    modalContent.appendChild(progressBar);
    modalContent.appendChild(messageText);
    modalContent.appendChild(Button);
    modalContainer.appendChild(modalContent);

    // Добавляем модальное окно на страницу
    document.body.appendChild(modalContainer);

    // Возвращаем ссылку на элементы модального окна
    return {
        modalContainer: modalContainer,
        progressBar: progressBar,
        messageText: messageText,
        Btn: Button,
    };
}


function infoAfterProcedure(ret) {
    var myModal = createModal();
    myModal.messageText.textContent = strings[ret === '+' ? "PR_OK" : "PR_NOT_OK"][lastLangSet];
    myModal.Btn.textContent = "OK";

    myModal.Btn.onclick = function () {
        document.body.removeChild(myModal.modalContainer);
    }
}


function customConfirm(message, yesText, noText) {
    // Создание и возврат promise для обработки выбора пользователя
    return new Promise(function (resolve, reject) {

        // Создание модального окна
        var modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.zIndex = "1000";
        modal.style.left = "50%";
        modal.style.top = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        modal.style.background = "white";
        modal.style.padding = "20px";
        modal.style.border = "1px solid #ccc";
        modal.style.borderRadius = "5px";
        modal.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
        modal.style.textAlign = "center";

        // Добавление сообщения
        var messageElement = document.createElement("p");
        messageElement.textContent = message;
        modal.appendChild(messageElement);

        // Добавление кнопки "Да"
        var yesButton = document.createElement("button");
        yesButton.textContent = yesText;
        yesButton.style.marginRight = "10px";
        yesButton.addEventListener("click", function () {
            closeModal();
            resolve(true);
        });
        modal.appendChild(yesButton);

        // Добавление кнопки "Нет"
        var noButton = document.createElement("button");
        noButton.textContent = noText;
        noButton.addEventListener("click", function () {
            closeModal();
            resolve(false);
        });
        modal.appendChild(noButton);

        // Функция для закрытия модального окна
        function closeModal() {
            document.body.removeChild(modal);
        }

        // Добавление модального окна в DOM
        document.body.appendChild(modal);


    });
}

//-------------парсеры
// Функция для парсинга содержимого текстовой области и поиска номеров телефонов и ID карт
function parseTextarea(textarea) {
    var resultList = [];
    var buffer = '';
    var isPhone = false;
    var isId = false;

    var text = textarea.value;

    // Преобразуем текст в бинарный буфер (последовательность байтов)
    var fileData = new Uint8Array(text.length);
    for (var i = 0; i < text.length; i++) {
        fileData[i] = text.charCodeAt(i);
    }

    // Парсим бинарный буфер
    for (let i = 0; i < fileData.length; i++) {
        const byte = fileData[i];

        if (byte === 0x2B || byte === 0x23) { // Символ "+" или "#"
            if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
                resultList.push(buffer);
            }
            isPhone = byte === 0x2B;
            isId = byte === 0x23;
            buffer = String.fromCharCode(byte);
        } else if (byte >= 0x30 && byte <= 0x39) { // Десятичная цифра
            if (isPhone || isId) {
                buffer += String.fromCharCode(byte);
            }
        } else { // Другой символ
            if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
                resultList.push(buffer);
            }
            buffer = '';
            isPhone = false;
            isId = false;
        }
    }

    if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
        resultList.push(buffer);
    }

    // Удаление повторяющихся элементов
    const uniqueList = Array.from(new Set(resultList));

    return uniqueList;
}

function parseBinaryFile(fileData) {
    const resultList = [];
    let buffer = '';
    let isPhone = false;
    let isId = false;


    for (let i = 0; i < fileData.length; i++) {
        const byte = fileData[i];

        if (byte === 0x2B || byte === 0x23) { // Символ "+" или "#"
            if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
                resultList.push(buffer);
            }
            isPhone = byte === 0x2B;
            isId = byte === 0x23;
            buffer = String.fromCharCode(byte);
        } else if (byte >= 0x30 && byte <= 0x39) { // Десятичная цифра
            if (isPhone || isId) {
                buffer += String.fromCharCode(byte);
            }
        } else { // Другой символ
            if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
                resultList.push(buffer);
            }
            buffer = '';
            isPhone = false;
            isId = false;
        }
    }

    if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
        resultList.push(buffer);
    }

    // Удаление повторяющихся элементов
    const uniqueList = Array.from(new Set(resultList));
    //alert("Вы загрузили" + uniqueList.length + "телефонов");
    return uniqueList;
}

function parseBuffer(fileData) {

    var resultList = [];
    var buffer = '';
    var isPhone = false;
    var isId = false;
    // Парсим бинарный буфер
    for (let i = 0; i < fileData.length; i++) {
        const byte = fileData[i];

        if (byte === 0x2B || byte === 0x23) { // Символ "+" или "#"
            if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
                resultList.push(buffer);
            }
            isPhone = byte === 0x2B;
            isId = byte === 0x23;
            buffer = String.fromCharCode(byte);
        } else if (byte >= 0x30 && byte <= 0x39) { // Десятичная цифра
            if (isPhone || isId) {
                buffer += String.fromCharCode(byte);
            }
        } else { // Другой символ
            if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
                resultList.push(buffer);
            }
            buffer = '';
            isPhone = false;
            isId = false;
        }
    }

    if (buffer.length >= PHONE_MIN_LENGTH && buffer.length <= PHONE_MAX_LENGTH && isPhone || buffer.length === ID_FOR_CARD_LENGTH && isId) {
        resultList.push(buffer);
    }

    // Удаление повторяющихся элементов
    const uniqueList = Array.from(new Set(resultList));

    return uniqueList;
}


function processXLSXBuffer(xlsxBuffer) {
    return new Promise((resolve, reject) => {
        const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        let dataString = ''; // Строка для объединения всех данных

        sheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            jsonData.forEach((row) => {
                row.forEach((cellValue) => {
                    dataString += cellValue; // Добавляем значение ячейки к строке данных
                });
            });
        });

        const buffer = new Uint8Array(dataString.length);

        for (let i = 0; i < dataString.length; i++) {
            buffer[i] = dataString.charCodeAt(i); // Преобразуем строку данных в массив бинарных байтов
        }

        resolve(parseBuffer(buffer));
    });
}

//-------------события нажатия на кнопки

function isPresentNumber() {
    var textareaForPhonesAndIDs = document.getElementById('phone');
    if (textareaForPhonesAndIDs.value.length > 0) {
        var list = parseTextarea(textareaForPhonesAndIDs);
        if (list.length > 0) {
            result_array = [];
            cmdToDevice('IsPresent', list, 'work_log.txt', strings["ALSO_PRESENT"][lastLangSet], strings["NOT_PRESENT"][lastLangSet], strings["INC_FMT"][lastLangSet]);
        }
    }
}


function addPhoneNumber() {
    var textareaForPhonesAndIDs = document.getElementById('phone');
    if (textareaForPhonesAndIDs.value.length > 0) {
        var list = parseTextarea(textareaForPhonesAndIDs);
        if (list.length > 0) {
            result_array = [];
            cmdToDevice('add', list, 'work_log.txt', strings["ADDED"][lastLangSet], strings["ALSO_PRESENT"][lastLangSet], strings["INC_FMT"][lastLangSet]);
        }
    }
}

function deletePhoneNumber() {
    var textareaForPhonesAndIDs = document.getElementById('phone');
    if (textareaForPhonesAndIDs.value.length > 0) {
        var list = parseTextarea(textareaForPhonesAndIDs);
        if (list.length > 0) {
            result_array = [];
            cmdToDevice('del', list, 'work_log.txt', strings["DELETED"][lastLangSet], strings["NOT_PRESENT"][lastLangSet], strings["INC_FMT"][lastLangSet]);
        }
    }
}


function addFromFile_process(readData, file) {
    if (readData.length > 0) {
        result_array = [];
        if (hasExcelExtension(file) === false) {
            var list = parseBinaryFile(readData);
            cmdToDevice('add', list, 'work_log.txt', strings["ADDED"][lastLangSet], strings["ALSO_PRESENT"][lastLangSet], strings["INC_FMT"][lastLangSet]);
        }
        else {
            processXLSXBuffer(readData)
                .then(function (data) {
                    //console.log('Полученные строки:', data);
                    if (data.length > 0) {

                        cmdToDevice('add', data, 'work_log.txt', strings["ADDED"][lastLangSet], strings["ALSO_PRESENT"][lastLangSet], strings["INC_FMT"][lastLangSet]);
                    }
                })
                .catch(function (error) {
                    //console.error('Ошибка:', error);
                });
        }
    }
}

function addFromFile() {
    openFileDialogAndParse(addFromFile_process);
}



function deleteFromFile_process(readData, file) {

    if (readData.length > 0) {
        result_array = [];
        if (hasExcelExtension(file) === false) {
            var list = parseBinaryFile(readData);
            cmdToDevice('del', list, 'work_log.txt', strings["DELETED"][lastLangSet], strings["NOT_PRESENT"][lastLangSet], strings["INC_FMT"][lastLangSet]);
        }
        else {
            processXLSXBuffer(readData)
                .then(function (data) {
                    //console.log('Полученные строки:', data);
                    if (data.length > 0) {

                        cmdToDevice('del', data, 'work_log.txt', strings["DELETED"][lastLangSet], strings["NOT_PRESENT"][lastLangSet], strings["INC_FMT"][lastLangSet]);
                    }
                })
                .catch(function (error) {
                    //console.error('Ошибка:', error);
                });
        }
    }
}

function deleteFromFile() {
    openFileDialogAndParse(deleteFromFile_process);
}


function deleteAllRecords() {
    customConfirm(strings["confirm"][lastLangSet], strings["YES"][lastLangSet], strings["NO"][lastLangSet]).then(function (result) {
        if (result) {
            sendSpecCommand('del');
        }
    });
}

function makeBackup() {
    customConfirm(strings["confirm"][lastLangSet], strings["YES"][lastLangSet], strings["NO"][lastLangSet]).then(function (result) {
        if (result) {
            sendSpecCommand('ubkp');
        }
    });
}

function restoreBackup() {
    customConfirm(strings["confirm"][lastLangSet], strings["YES"][lastLangSet], strings["NO"][lastLangSet]).then(function (result) {
        if (result) {
            sendSpecCommand('urest');
        }
    });
}


//------отчет
function result2File(fileName, numberList, resultList, plusMessage, minusMessage, multipleMessage) {
    // Проверяем, что количество номеров соответствует количеству результатов
    if (numberList.length !== resultList.length) {
        console.error("Ошибка: количество номеров не соответствует количеству результатов.");
        return;
    }
    if (fileName.length === 0 || mqttSettings["FILE_OUT"] === "false" || mqttSettings["FILE_OUT"] === false) {
        console.error("запрещен вывод в файл");
        return;
    }


    let fileContent = '\ufeff'; // BOM для UTF-8

    // Формируем сообщение для операции "+"
    const plusCount = resultList.filter(result => result === '+').length;
    fileContent += plusMessage + ' [' + plusCount + ']:\n';
    numberList.forEach((num, index) => {
        if (resultList[index] === '+') {
            fileContent += num + '\n';
        }
    });
    fileContent += '\n';

    // Формируем сообщение для операции "-"
    const minusCount = resultList.filter(result => result === '-').length;
    fileContent += minusMessage + ' [' + minusCount + ']:\n';
    numberList.forEach((num, index) => {
        if (resultList[index] === '-') {
            fileContent += num + '\n';
        }
    });
    fileContent += '\n';

    // Формируем сообщение для операции "*"
    const multipleCount = resultList.filter(result => result === '*').length;
    fileContent += multipleMessage + ' [' + multipleCount + ']:\n';
    numberList.forEach((num, index) => {
        if (resultList[index] === '*') {
            fileContent += num + '\n';
        }
    });
    fileContent += '\n';

    // Создаем Blob из текстового содержимого с указанием кодировки UTF-8
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

    // Создаем ссылку на Blob
    const url = URL.createObjectURL(blob);

    // Создаем ссылку для скачивания файла
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    // Добавляем ссылку на страницу и эмулируем клик для скачивания файла
    document.body.appendChild(a);
    a.click();

    // Очищаем ссылку
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}


function displayNumbersWithStatus(Numbers, Status) {
    // Проверяем, одинаковое ли количество строк в обоих массивах
    if (Numbers.length !== Status.length) {
        console.error("Ошибка: количество строк в массивах не совпадает.");
        return;
    }

    var element = document.getElementById("phone");
    if (element !== null && element !== undefined) {
        // Очищаем содержимое textarea с id="phone"
        element.value = "";

        // Формируем строки в заданном формате и выводим их в textarea
        for (let i = 0; i < Numbers.length; i++) {
            let formattedString = Numbers[i] + " (" + Status[i] + ")";
            element.value += formattedString + "\n";
        }
    }
}

//-------------tools
function hasExcelExtension(file) {
    if (file instanceof File) {
        var fileName = file.name;
        return fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
    }
    return false;
}

// Функция для открытия окна выбора файла и передачи его содержимого в колбэк-функцию
function openFileDialogAndParse(callback) {
    // Создаем элемент input для выбора файла
    var input = document.createElement('input');
    input.type = 'file';
    //input.multiple = true; // Позволяем выбирать несколько файлов
    input.accept = '*/*'; // Разрешить выбор только текстовых файлов



    // Обработчик события изменения, который вызывается при выборе файла
    input.onchange = function (event) {
        // Если файл не был выбран, выходим из функции
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        // Получаем первый выбранный файл
        var file = event.target.files[0];

        // Создаем объект FileReader для чтения содержимого файла
        var reader = new FileReader();

        // Обработчик события загрузки, который вызывается после успешного чтения файла
        reader.onload = function (event) {
            // Получаем содержимое файла в виде бинарных данных
            var fileData = new Uint8Array(event.target.result);

            // Передаем содержимое файла в колбэк-функцию для обработки
            callback(fileData, file);
        };

        // Читаем содержимое файла в виде бинарных данных
        reader.readAsArrayBuffer(file);
    };

    // Запускаем окно выбора файла
    input.click();
}

//-----SPINNER
// Функция для показа индикатора ожидания
function showLoadingIndicator() {
    var modal = document.getElementById("myModal");
    modal.style.display = "block";
}

// Функция для скрытия индикатора ожидания
function hideLoadingIndicator() {
    var modal = document.getElementById("myModal");
    modal.style.display = "none";
}



function reset_fnc() {
    customConfirm(strings["confirm"][lastLangSet], strings["YES"][lastLangSet], strings["NO"][lastLangSet]).then(function (result) {
        if (result) {
            sendSpecCommand('rst');
        }
    });
}


