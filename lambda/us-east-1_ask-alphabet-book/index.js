/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';
const Alexa = require('alexa-sdk');
const AWS = require("aws-sdk");
AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION
});
const ddb = new AWS.DynamoDB({apiVersion: '2012-10-08'});

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.
//Make sure to enclose your value in quotes, like this: const APP_ID = 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = 'amzn1.ask.skill.558c30f2-4b07-4d30-81d1-1db07ef5f136';

const SKILL_NAME = 'Alphabet Book';
const HELP_MESSAGE = 'You can ask me for a word starting with any letter.';
const HELP_REPROMPT = 'What letter would you like?';
const STOP_MESSAGE = 'Goodbye!';

const handlers = {
    'LaunchRequest': function () {
        this.response.speak('Welcome to Alphabet Book! You can ask me for a word starting with any letter.');
        this.response.listen('Ask me for a word starting with any letter.');
        this.emit(':responseReady');
    },
    'GetWordIntent': function () {
        const slotValues = getSlotValues(this.event.request.intent.slots);
        const letter = slotValues['Letter']['resolved'].substring(0, 1).toUpperCase();
        
        var params = {
            TableName: 'alphabet-book',
            Key: {
                'letter' : {'S': letter}
            },
            ProjectionExpression: 'words'
        };

        var wordArr;
        var self = this;

        ddb.getItem(params, function(err, data) {
            console.log("Getting items from DDB for letter: ", letter);

            if (err) {
                console.log("Error: ", err);

                self.response.speak('There was an issue finding a word that starts with ' + letter + '.');
                self.response.listen('Ask me for another word.');
                self.emit(':responseReady');
            } else {
                console.log("Success: ", JSON.stringify(data.Item));
                wordArr = data.Item['words'];

                const wordIndex = Math.floor(Math.random() * wordArr['L']['length']);
                const chosenWord = wordArr['L'][wordIndex]['M']['word']['S'];
                const chosenSound = wordArr['L'][wordIndex]['M']['sound']['S'];
                var speechOutput = letter + ' is for ' + chosenWord + '. ';

                if (chosenSound != "none") {
                    speechOutput = speechOutput + ' <audio src=\'' + chosenSound + '\' /> ';
                }

                for (var i = 0; i < chosenWord.length; i++) {
                    speechOutput = speechOutput + chosenWord.charAt(i) + '. ';
                }
                
                speechOutput = speechOutput + chosenWord + '. ';
                
                self.attributes.lastWord = speechOutput;

                console.log('Speaking line: ', speechOutput);

                self.response.speak(speechOutput);
                self.response.listen('Ask me for another word.');
                self.emit(':responseReady');
            }
        });

        
        
    },
    'AMAZON.RepeatIntent': function () {
        this.response.speak(this.attributes.lastWord);
        this.response.listen("Ask me for another word."); 
        this.emit(':responseReady'); 
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function getSlotValues(filledSlots) {
    //given event.request.intent.slots, a slots values object so you have
    //what synonym the person said - .synonym
    //what that resolved to - .resolved
    //and if it's a word that is in your slot values - .isValidated
    let slotValues = {};
  
    console.log('The filled slots: ' + JSON.stringify(filledSlots));
    Object.keys(filledSlots).forEach(function(item) {
      //console.log("item in filledSlots: "+JSON.stringify(filledSlots[item]));
      var name = filledSlots[item].name;
      //console.log("name: "+name);
      if (filledSlots[item] &&
        filledSlots[item].resolutions &&
        filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
        filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
        filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
  
        switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
          case "ER_SUCCESS_MATCH":
            slotValues[name] = {
              "synonym": filledSlots[item].value,
              "resolved": filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
              "isValidated": true
            };
            break;
          case "ER_SUCCESS_NO_MATCH":
            slotValues[name] = {
              "synonym": filledSlots[item].value,
              "resolved": filledSlots[item].value,
              "isValidated": false
            };
            break;
        }
      } else {
        slotValues[name] = {
          "synonym": filledSlots[item].value,
          "resolved": filledSlots[item].value,
          "isValidated": false
        };
      }
    }, this);
    //console.log("slot values: " + JSON.stringify(slotValues));
    return slotValues;
  }