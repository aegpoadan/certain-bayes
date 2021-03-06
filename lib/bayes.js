var fs = require( 'fs' );
var saveUtility = require('./saveUtility.js');

module.exports = {//*****************************************************************************
  //*****************************************************************************
  /*

    @FILE:
      - bayes.js
    @VERSION:
      - 0.2a (ALPHA)
    @AUTHOR(S):
      - Eric Hill <ew_hill@yahoo.com>
      - Andrew Hayes <ahayes2425@gmail.com>
    @DESCRIPTION:
      - Javascript implementation Naive Baye's Classifier with
      modifictions for certainty and mutual exclusion of decisions    
  */
  //*****************************************************************************
  //*****************************************************************************

  /*
    Our main object constructor.
  */
  BAYES: function (input, bitsFunction, verbose) {  
    /*
      Ensure we are given valid inputs to start, if not
      exit by returning.
    */
    if(typeof input !== 'object' || input.length === 0) {
      console.error("[BAYES] ERROR: 'input' expected, but type is not of " +
        "array (object) or length of 'input' is zero.");
      return;
    }
    if(typeof bitsFunction !== 'function') {
      console.error("[BAYES] ERROR: 'bitsFunction' expected but is not of" +
        "function type or is not provided.");
      return;
    }
    
    /*
      Set up our instance, assign defaults to own properties
    */
    if(!input.bayes) {
      this.bitsFunction = bitsFunction;
      this.verbose = verbose || false;
      
      this.totalPositiveBits = 0;
      this.totalNegativeBits = 0;
      this.uniquePositiveBits = 0;
      this.uniqueNegativeBits = 0;
      this.totalPositiveInputs = 0;
      this.totalNegativeInputs = 0;
      this.totalInputs = input.length,
      this.positiveProbability = 0;
      this.negativeProbability = 0;
      this.bitClass = {};
      this.bayes = true;
    }

    this.save = function(filePathName, pretty) {
      saveUtility.save(this, filePathName, pretty);
    };

    this.saveAsync = function(filePathName, pretty, callback) {
      saveUtility.save(this, filePathName, pretty, callback);
    };

    this.calculateOverallProbabilities = function() {
      /*
        Determine our overall positive/negative probabilities.
      */
      this.positiveProbability = (this.totalPositiveInputs / this.totalInputs);
      this.negativeProbability = (this.totalNegativeInputs / this.totalInputs);
      
      /*
        Calculate the positive/negative probabilities for each bitClass (bit)
      */
      for(var bit in this.bitClass) {
        this.bitClass[bit].positiveProbability = 
          (this.bitClass[bit].positive / this.totalPositiveBits);
        this.bitClass[bit].negativeProbability = 
          (this.bitClass[bit].negative / this.totalNegativeBits);
      }
    };

    this.learn = function(singleInput, correctOutput) {
      this.learnHelper(singleInput, correctOutput);
      
      this.totalInputs++;
      this.calculateOverallProbabilities();
    };

    this.learnHelper = function(singleInput, correctOutput) {
      /*
        Ensure we are given the correct inputs for learning
      */
      if(typeof singleInput !== 'string' && typeof singleInput !== 'object') {
        console.error("[BAYES] ERROR: 'singleInput' expected to be of type 'string' " +
          "or 'object' but was not or was not given at all.");
        return;
      }
      
      if(typeof singleInput == 'object' && singleInput.length !== 0) {
        correctOutput = singleInput[1];
        singleInput = singleInput[0];
      }
      
      if(typeof correctOutput !== 'boolean') {
        console.error("[BAYES] ERROR: 'correctOutput' expected to be of type 'boolean' " +
          "but was not or was not given at all.");
        return;
      }
      
      /*
        Split the singleInput by the bitsFunction.
      */
      var bits = this.bitsFunction(singleInput);
      
      /*
        Cycle through the bits (Remember, 'singleInput' split by 'bitsFunction').
      */
      for(var j=0; j<bits.length; j++)  {
        /*
          if we've never encountered this bit before, add it to our 'bitClass'
        */
        if(typeof this.bitClass[bits[j]] == 'undefined') {
          this.bitClass[bits[j]] = {
            positive: 0,
            negative: 0,
            count: 0,
            weight: 1.0
          };
          
          /*
            Keep track of the number of unique positive/negative bits.
          */
          if(correctOutput)
            this.uniquePositiveBits++;
          else
            this.uniqueNegativeBits++;
        }
        
        /*
          Add to this bit's as positive/negative classification 
          given the singleInput's classification.
        */
        if(correctOutput) {
          this.bitClass[bits[j]].positive++;
          this.totalPositiveBits++;
        } else {
          this.bitClass[bits[j]].negative++;
          this.totalNegativeBits++;
        }
        
        /*
          Keep track of the times that this bit has appeared
        */
        this.bitClass[bits[j]].count++;
      }
      
      /*
        Keep track of the total number of positive/negative bits
      */
      if(correctOutput)
        this.totalPositiveInputs++;
      else
        this.totalNegativeInputs++;
    };

    this.score = function(scoreData, certaintyThreshold, debug) {
      var incorrect, certain, certainCorrect, kickflipPosts, falsePositive;
      var bayes = this;
      if(debug) {
        incorrect = [], certain = [], certainCorrect = [], kickflipPosts = [], falsePositive = [];
      } else {
        incorrect = 0, certain = 0, certainCorrect = 0, kickflipPosts = 0, falsePositive = 0;
      }

      scoreData.forEach(function(data, index){
        if(data.length === 2) {
          let result = bayes.guess(data[0]);
          let guess = result[0] > result[1];
          let certainty = result[2];

          if(certainty > certaintyThreshold) {
            if(debug) {
              certain.push(data);
            } else {
              certain++;
            }

            if(guess != data[1]) {
              if(debug) {
                incorrect.push(data);
              } else {
                incorrect++;
              }

              if(debug) {
                if(guess) {
                  falsePositive.push(data);
                } 
              } else {
                if(guess) {
                  falsePositive++;
                }
              }

              if(debug) {
                console.debug("Guessing for phrase:\n\t" + data[0] + "\n\t");
                console.debug("Our guess: " + guess + "|" + "Our certainty: " + certainty + "% | correct answer: " + data[1] + "\n");
              }
            } else {
              if(debug) {
                certainCorrect.push(data);
              } else {
                certainCorrect++;
              } 

              if(guess) {
                if(debug) {
                  kickflipPosts.push(data);
                } else {
                  kickflipPosts++;
                }
              } 
            }
          }
        } else {
          throw("scoreData incorrectly formatted in bayes.score()");
        }
      });

      var result =  {
                      scoreDataSize: scoreData.length, 
                      certain: certain, 
                      incorrect: incorrect, 
                      certainCorrect: certainCorrect, 
                      kickflipPosts: kickflipPosts,
                      falsePositive: falsePositive
                    };

      return result;
    }

    this.additionalTraining = function(trainingData, numLearningSteps, stopIfWorse) {
      function shuffle(a) {
        var j, x, i;
        for (i = a.length; i; i--) {
          j = Math.floor(Math.random() * i);
          x = a[i - 1];
          a[i - 1] = a[j];
          a[j] = x;
        }
      }

      var prevPercentage = 0;
      for(let learnStep=0; learnStep<numLearningSteps; learnStep++) {
        let numRight = 0, numWrong = 0;
        shuffle(trainingData);
  
        for(let i=0; i<trainingData.length; i++) {
          if(trainingData[i].length === 2) {
            let result = this.guess(trainingData[i][0]);
            let guess = result[0] > result[1];
            let certainty = result[2];
        
            if(trainingData[i][1] == guess) {
              numRight++;
            } else {
              numWrong++;
            }
          
            this.learn(trainingData[i][0], trainingData[i][1], (1.0-certainty) * (learnStep/100));
          }
        }   

        if(stopIfWorse) {
          let curPercentage = numRight/trainingData.length;
          if(prevPercentage >= curPercentage) break;
          else prevPercentage = curPercentage;
        }
      }
    };

    this.train = function(singleInput, correctOutput, learningRate) {
      //Ensure we are given the correct inputs for learning
      if(typeof singleInput !== 'string' && typeof singleInput !== 'object') {
        console.error("[BAYES] ERROR: 'singleInput' expected to be of type 'string' " +
          "or 'object' but was not or was not given at all.");
        return;
      }
      
      if(typeof singleInput == 'object' && singleInput.length !== 0) {
        correctOutput = singleInput[1];
        singleInput = singleInput[0];
      }
      
      if(typeof correctOutput !== 'boolean') {
        console.error("[BAYES] ERROR: 'correctOutput' expected to be of type 'boolean' " +
          "but was not or was not given at all.");
        return;
      }
      
      
      //Set out learningRate, default to 0.001 if none is given.
      this.learningRate = learningRate || 0.01;
      
      var guess = this.guess(singleInput);
      var guessBoolean = (guess[0] > guess[1]);
      
      //Split the input by the split function.
      var bits = this.bitsFunction(singleInput),
        j = 0;
      
      //Apply a gradient to the bitClass in order to 'learn' from
      //our mistake...
      for(j=0; j<bits.length; j++)  {
        if(typeof this.bitClass[bits[j]] !== 'undefined') {
          //E.G. - Correct output was supposed to be true, and we got
          //false, so we calculate the max of the negative counts of bits.
          
          //Weight the correction based on how confident we were that the
          //word is positive/negative. If we were very confident, then we punish 100%,
          //if we were pretty even, don't punish as much.
          var certainty = 
            Math.abs(this.bitClass[bits[j]].positive - this.bitClass[bits[j]].negative) /
            Math.max(this.bitClass[bits[j]].positive, this.bitClass[bits[j]].negative);
            
          //Adjust our weight to reflect the correction we calculated
          if(guessBoolean !== correctOutput) {
            this.bitClass[bits[j]].weight -= certainty * this.learningRate;
          } else {
            //this.bitClass[bits[j]].weight += certainty * this.learningRate;
          }
          
          this.bitClass[bits[j]].weight = Math.min(Math.max(this.bitClass[bits[j]].weight, 0), 1.0);
        }
      }
    };

    this.guess = function(input) {
      /*
        Split the input by the split function.
      */
      var bits = this.bitsFunction(input);
      
      /*
        Initialize some variables...
      */
      var prbPos = 0.0, //this.positiveProbability,
        prbNeg = 0.0, //this.negativeProbability,
        certainty = 0;
        
      for(var j=0; j<bits.length; j++)  {
        if(typeof this.bitClass[bits[j]] !== 'undefined') {
          /*
            Multiplicative function for both positive and negative
            probabilities to support mutually exclusive decisions
            (being high positive probability doesn't merit low
            negative probability and vice versa)
          */
          //prbPos *= this.bitClass[bits[j]].positiveProbability;
          //prbNeg *= this.bitClass[bits[j]].negativeProbability;
          
          prbPos += (this.bitClass[bits[j]].positiveProbability*this.bitClass[bits[j]].weight);
          prbNeg += (this.bitClass[bits[j]].negativeProbability*this.bitClass[bits[j]].weight);
          
          //prbPos *= (this.bitClass[bits[j]].positiveProbability + this.bitClass[bits[j]].weight);
          //prbNeg *= (this.bitClass[bits[j]].negativeProbability + this.bitClass[bits[j]].weight);
          
          certainty++;
        } else if(this.verbose) {
          /*
            We've never encountered this bit before, warn about it
          */
          console.warn("I Don't know about ", bits[j]);
        }
      }
      
      /*
      prbPos = 1/(1+Math.exp(Math.E, -prbPos));
      prbNeg = 1/(1+Math.exp(Math.E, -prbNeg));
      */
      
      /*
        Begin certainty calculation:
        Set base certainty to the percent of words we know in the phrase...
      */
      certainty = (certainty / bits.length);
      var divisor = Math.min(Math.max(prbPos, prbNeg), 1);
      
      if(divisor === 0) {
        /*
          divisor === 0 means prbPos === 0 && prbNeg === 0
          aka we know literally nothing about any of the words
          in this phrase, so we can't be certain of a decision and
          furthermore we divide by zero, so set certainty to zero.
        */
        certainty = 0.0;
      } else {
        /*
          Certainty multiplicative: factor in the difference in probabilities
          (the difference means we found a lot of positive or negative words
          and so the parity is evident) and normalize the data by the divisor
        */
        certainty = certainty * (Math.abs(prbPos - prbNeg) / divisor);
      }
      
      /*
        Return our guess.
      */
      return [prbPos, prbNeg, certainty];
    };

    this.guessBoolean = function(input) {
      var r = this.guess(input);
      return [r[0] > r[1], r[2]];
    };

    //Construction

    if(input.bayes) { //loading saved bayes
      this.bitsFunction = bitsFunction;
      this.totalPositiveBits = input.totalPositiveBits;
      this.totalNegativeBits = input.totalNegativeBits;
      this.uniquePositiveBits = input.uniquePositiveBits;
      this.uniqueNegativeBits = input.uniqueNegativeBits;
      this.totalPositiveInputs = input.totalPositiveInputs;
      this.totalNegativeInputs = input.totalNegativeInputs;
      this.totalInputs = input.totalInputs,
      this.positiveProbability = input.positiveProbability;
      this.negativeProbability = input.negativeProbability;
      this.bitClass = input.bitClass;

      return this;
    } else {
      /*
        Cycle through our inputs and determine some probabilities.
      */
      for(var i=0; i<input.length; i++) {
        /*
          this.verbose == debugging, log our progress
        */
        if(this.verbose)
          console.log(Math.floor(i/input.length*100) + "%");
        
        /*
          Learn from the training data
        */
        this.learnHelper(input[i][0], input[i][1]);
      }
      this.calculateOverallProbabilities();
    }
  }
};