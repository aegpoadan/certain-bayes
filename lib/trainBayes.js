var lib = require('../lib/bayes.js');
var saveUtility = require('../lib/saveUtility.js');
var fs = require( 'fs' );

const trainDataDir = '../trainingData/';
const trainedDir = '../trained/';
const testDataFileName = './testData.json';
const bayesLoc = '../trained/bayes.json';
const scrapeCleanDir = '../../scrapeFiltered/';

var trainingPosts = getTrainingPosts();
var fileLocs = {};

function generateCSVStats() {
  var bayes = JSON.parse(fs.readFileSync(bayesLoc), 'utf8');
  bayes.length = 1; //hack to get around input length req. probably should change this at some point
  bayes = new lib.BAYES(bayes, function(text) {
    return removeA(text.split(/\s/), '');
  });

  var data = [[
                'certainty threshold',
                'total data size', 
                'number of certain', 
                'number of certain/correct', 
                'number of certain/correct/kickflip', 
                'number of certain/incorrect', 
                'number of certain/incorrect/kickflip (aka false positives)',
                'accuracy'
              ]];

  var trainingData = createTestDataArray(trainingPosts);
  for(let i=0; i<.5; i+=.05) {
    var metrics = bayes.score(trainingData, i, false);
    var dataPoint = [i, metrics.scoreDataSize, metrics.certain, metrics.certainCorrect, metrics.kickflipPosts, metrics.incorrect, metrics.falsePositive,(1 - (metrics.incorrect/metrics.certain))];
    data.push(dataPoint);
  }

  saveUtility.save(saveUtility.toCSV(data), 'bayesStats.csv');
}

function buildAndTrainNewBayes() {
  var trainingData = createTestDataArray(trainingPosts);
  shuffle(trainingData);

  var half_length = Math.ceil(trainingData.length / 2); 
  var leftSideTrainingData = trainingData.splice(0,half_length);

  var bayes = new lib.BAYES(leftSideTrainingData, function(text) {
    return removeA(text.split(/\s/), '');
  });

  var accuracyScores = [];
  //These will only be useful with a larger trainingData set
  /*
  var certainScores = [];
  var certainToTotalScores = [];
  var certainCorrectScores = [];
  var numKickflipPostsScores = [];
  var kickflipToPostsScores = [];*/

  for(let i=0;i<100;i++) {
    console.log('Learning run: '  + i);
    let metrics = bayes.score(trainingData, .25, false);
    let accuracy = (1 - (metrics.incorrect/metrics.certain));
    accuracyScores.push(accuracy);
    console.log('\taccuracy: ' + accuracy);

    trainingData = trainingData.concat(leftSideTrainingData);
    shuffle(trainingData);
    leftSideTrainingData = trainingData.splice(0,half_length);
    bayes.additionalTraining(leftSideTrainingData, 10, false);
  }

  var metrics = bayes.score(trainingData, .25, true);
  console.log("Number of test posts: " + metrics.scoreDataSize);
  console.log("Number of certain posts: " + metrics.certain.length);
  console.log("Of posts we were certain about, we were incorrect " + metrics.incorrect.length + " times.");
  console.log("Ratio of certain posts to total test posts: " + metrics.certain.length / metrics.scoreDataSize);
  console.log("Number of posts that were correctly predicted with certainty: " + metrics.certainCorrect.length);
  console.log("Number of kickflip posts that were correctly predicted with certainty: " + metrics.kickflipPosts.length);
  console.log("Ratio of correct/certain/kickflip posts to total trainingData posts: " + metrics.kickflipPosts.length / metrics.scoreDataSize);
  console.log("Accuracy: " + (1 - (metrics.incorrect.length/metrics.certain.length)));

  console.log("Accuracy over time: " + accuracyScores);

  bayes.save(trainedDir + 'bayes.json', true);
  saveUtility.save(accuracyScores, 'accuracyScores.json', true);
}

function getTrainingPosts() {
  var fileNames = fs.readdirSync(trainDataDir);
  var trainingPosts = [];

  fileNames.forEach(function(fileName, index) {
    if(fileName.charAt(0) !== '.') { //ignore system files
      let fileContents = JSON.parse(fs.readFileSync(trainDataDir+fileName, 'utf8'));
      fileContents.posts.forEach(function(post, index) {
        post.fileName = fileName;
        trainingPosts.push(post);
      })
    }
  });

  return trainingPosts;
}

function removeA(arr) {
  var what, a = arguments, L = a.length, ax;
  while (L > 1 && arr.length) {
    what = a[--L];
    while ((ax= arr.indexOf(what)) !== -1) {
      arr.splice(ax, 1);    
    }
  }
  return arr;
}

function createTestDataArray(trainingPosts) {
  var result = [];
  for(let post of trainingPosts) {
    let trainingText = createTrainingText(post);
    if(trainingText) {
      //let key = [trainingText, post.kickflip]; use this to debug training data
      result.push([trainingText, post.kickflip]); //post.kickflip is boolean to mark whether bayes should return true or false
      //fileLocs[key] = post.fileName; 
    }
  }
  
  return result;
}

function createTrainingText(trainPost) {
  var trainingText = '';
  if(trainPost.summary) {
    trainingText += trainPost.summary + ' ';
  }
  trainingText += trainPost.text;
  return cleanText(trainingText);
}

function cleanText(text) {
  var removeRegex = /[^A-Za-z\s$]/gi;
  var blacklistRegex = /\b([a|an|and|the]+(?=\b))/gi;

  return text.replace(removeRegex, ' ')
              .replace(blacklistRegex, '')
              .toLowerCase()
              .trim();
}

function shuffle(a) {
    var j, x, i;
    for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function saveCleanPosts(posts, uuid, readyToBeSent) {
  var objectToSave = {
    posts: posts,
    cleanedTimestamp: Date.now(),
    readyToBeSent: readyToBeSent
  };

  saveUtility.save(objectToSave, scrapeCleanDir + uuid  + '.json', true);
}

function saveCleanPostsAsync(posts, callback) {
  var objectToSave = {
    posts: posts,
    cleanedTimestamp: Date.now()
  };
  var uuid = uuidv4();


  saveUtility.save(objectToSave, scrapeCleanDir + uuid + '.json', false, callback);
}

module.exports = {
  createTestDataArray: createTestDataArray,
  createTrainingText: createTrainingText,
  cleanText: cleanText,
  getTrainingPosts: getTrainingPosts,
  buildAndTrainNewBayes: buildAndTrainNewBayes,
  generateCSVStats: generateCSVStats,
  shuffle: shuffle,
  removeA: removeA,
  saveCleanPosts: saveCleanPosts,
  saveCleanPostsAsync: saveCleanPostsAsync
};