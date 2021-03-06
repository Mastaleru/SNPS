/**
 * Created by Rafa on 5/17/2016.
 */

readFacebookSettings = [
    {
        name: "Who can see your future posts?",
        url: "https://www.facebook.com/settings?tab=privacy",
        jquery_selector:{
            element:".fbSettingsList:eq(0) .fbSettingsListItem:eq(0) ._nlm",
            valuePresence: "inner"
        }

    },
    {
        name: "Who cand send you friend requests?",
        url: "https://www.facebook.com/settings?tab=privacy",
        jquery_selector: {
          element :".fbSettingsList:eq(1) .fbSettingsListItem:eq(0) ._nlm",
          valuePresence: "inner"
        }
    },
    {
        name: "Who can look you up using the email address you provided?",
        url: "https://www.facebook.com/settings?tab=privacy",
        jquery_selector: {
            element: ".fbSettingsList:eq(2) .fbSettingsListItem:eq(0) ._nlm",
            valuePresence:"inner"
        }
    },
    {
        name: "Who can look you up using the phone number you provided?",
        url: "https://www.facebook.com/settings?tab=privacy",
        jquery_selector:{
          element:".fbSettingsList:eq(2) .fbSettingsListItem:eq(1) ._nlm",
          valuePresence: "inner"
        }
    },
    {
        name: "Do you want search engines outside of Facebook to link to your profile",
        url: "https://www.facebook.com/settings?tab=privacy",
        jquery_selector:{
          element:".fbSettingsList:eq(2) .fbSettingsListItem:eq(2) ._nlm",
          valuePresence: "inner"
        }
    },
    {
        name: "Who can post on your timeline",
        url: "https://www.facebook.com/settings?tab=timeline",
        jquery_selector:{
            element: ".fbSettingsList:eq(0) .fbSettingsListItem:eq(0) ._nlm",
            valuePresence: "inner"
        }
    },
    {
        name: "Review posts friends tag you in before they appear on your timeline?",
        url: "https://www.facebook.com/settings?tab=timeline",
        jquery_selector:{
            element:".fbSettingsList:eq(0) .fbSettingsListItem:eq(1) ._nlm",
            valuePresence: "inner"
        }
    }
];

readGoogleSettings =
    [
        {
            name: "Turn off (pause) your searches and browsing activity",
            url: "https://myaccount.google.com/privacy#accounthistory",
            jquery_selector: {
                element:"div[data-aid='search'] div",
                valuePresence:"attrValue", //could be attrValue (the value of attribute), attr(the presence of attribute), inner(inner text of element), classname
                attrValue:"aria-checked"
            }
        },

        {
            name: "Pause location history",
            url: "https://myaccount.google.com/privacy#accounthistory",

            jquery_selector:{
                element:"div[data-aid='location'] div",
                valuePresence:"attrValue", //could be attrValue (the value of attribute), attr(the presence of attribute), inner(inner text of element), classname
                attrValue:"aria-checked"
            } //return value 0 or 1
        },

        {
            name: "Pause voice searches and commands",
            url: "https://myaccount.google.com/privacy#accounthistory",
            jquery_selector:{
                element:"div[data-aid='audio'] div",
                valuePresence:"attrValue", //could be attrValue (the value of attribute), attr(the presence of attribute), inner(inner text of element), classname
                attrValue:"aria-checked"
            } //return value 0 or 1
        },

        {
            name: "Pause your YouTube search history",
            url: "https://myaccount.google.com/privacy#accounthistory",
            jquery_selector:{
                element:"div[data-aid='youtubeSearch'] div",
                valuePresence:"attrValue", //could be attrValue (the value of attribute), attr(the presence of attribute), inner(inner text of element), classname
                attrValue:"aria-checked"
            } //return value 0 or 1

        },

        {
            name: "Pause your YouTube watch history",
            url: "https://myaccount.google.com/privacy#accounthistory",
            jquery_selector:{
                element:"div[data-aid='youtubeWatch'] div",
                valuePresence:"attrValue", //could be attrValue (the value of attribute), attr(the presence of attribute), inner(inner text of element), classname
                attrValue:"aria-checked"
            } //return value 0 or 1
        },

        {
            name: "Turn off ads based on your interest",
            url: "https://www.google.com/settings/u/0/ads/authenticated",
            jquery_selector:{
                element:"div.Pu > span.iI > div[aria-checked]",
                valuePresence:"attrValue", //could be attrValue (the value of attribute), attr(the presence of attribute), inner(inner text of element), classname
                attrValue:"aria-checked"
            }  //return value true or false

        }

    ];



var currentSetting;
var currentTab;
var currentCallback;

(function () {
    chrome.runtime.onConnect.addListener(function (port) {

        if (port.name == "SNPS") {

            var sequence = Promise.resolve();
            privacySettings = readFacebookSettings.concat(readGoogleSettings);
            privacySettings.forEach(function (setting) {
                sequence = sequence.then(function () {
                    return queryPage(setting);
                }).then(function (result) {
                    console.log(result);
                }).catch(function (err) {
                    console.log(err)
                });

            });
        }
        else {

            if (port.name == "getSNSettings") {
                port.onMessage.addListener(function (msg) {
                    if (msg.status == "waitingCommand") {
                        if(currentSetting!== undefined){
                            port.postMessage({command: "scan", setting: currentSetting});
                        }
                    }
                    else {
                        if (msg.status == "finishedCommand") {
                            chrome.tabs.remove(currentTab.id);
                            console.log({name: currentSetting.name, result: msg.result});
                            persistSetting(currentSetting.name, msg.result);
                            currentCallback();
                        }
                    }
                })

            }
        }
    });
})();

function queryPage(setting) {

    return new Promise(function (resolve, reject) {

        chrome.tabs.create({url: setting.url,active:false}, function (tab) {
            currentSetting = setting;
            currentTab = tab;

            insertJavascriptFile(tab.id, "util/jquery-1.12.3.min.js", function () {
                insertJavascriptFile(tab.id, "execute_script.js", function () {


                    currentCallback = function () {
                        resolve("finishedCommand");
                    }

                });
            });
        });
    });
}


function insertJavascriptFile(id, file, callback) {
    chrome.tabs.executeScript(id, {
        file: file
    }, function () {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        }
        else if (callback) {
            callback();
        }
    });
}


function persistSetting (settingName, settingValue){
    chrome.storage.local.get('privacy_settings', function(settings){

        if(Object.keys(settings).length === 0){
            settings = [];
        }
        else{
            settings = settings.privacy_settings;
        }

        var isNew = true;
        for(var i = 0; i<settings.length; i++){

            if(settings[i].name == settingName){
                settings[i].value = settingValue;
                isNew = false;
                break;
            }
        }

        if(isNew == true){
            settings.push({'name': settingName, 'value': settingValue});
        }


        chrome.storage.local.set({'privacy_settings': settings}, function() {
            console.log("salvat");
        });

    })
}
