//*****************************************************************************
//*****************************************************************************

/*

  @FILE:
    - bayes.js
  @VERSION:
    - 0.1a (ALPHA)
  @AUTHOR(S):
    - Eric Hill <ew_hill@yahoo.com>
  @DESCRIPTION:
    - Javascript implementation Naive Baye's Classifier with
    modifictions for certainty and mutual exclusion of decisions
    
*/

//*****************************************************************************
//*****************************************************************************

/*
  Our main object constructor.
*/
var BAYES = function (input, bitsFunction, verbose) {
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
  this.bitsFunction = bitsFunction;
  this.verbose = verbose || false;
  
  this.totalPositiveBits = 0;
  this.totalNegativeBits = 0;
  this.uniquePositiveBits = 0;
  this.uniqueNegativeBits = 0;
  this.totalPositiveInputs = 0;
  this.totalNegativeInputs = 0;
  this.totalInputs = input.length,
  this.positveProbability = 0;
  this.negativeProbability = 0;
  this.bitClass = {};
	
	/*
	  Cycle through our inputs and determine some probabilities.
	*/
  for(var i=0; i<input.length; i++)	{
    /*
      this.verbose == debugging, log our progress
    */
    if(this.verbose)
      console.log(Math.floor(i/input.length*100) + "%");
    
    /*
      Learn from the training data
    */
    this.learnHelper(input[i]);
	}
	
	this.calculateOverallProbabilities();
};

BAYES.prototype.calculateOverallProbabilities = function() {
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

BAYES.prototype.learn = function(singleInput, correctOutput) {
  this.learnHelper(singleInput, correctOutput);
  
  this.totalInputs++;
  this.calculateOverallProbabilities();
};

BAYES.prototype.learnHelper = function(singleInput, correctOutput) {
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
	for(var j=0; j<bits.length; j++)	{
    /*
      if we've never encountered this bit before, add it to our 'bitClass'
    */
    if(typeof this.bitClass[bits[j]] == 'undefined') {
      this.bitClass[bits[j]] = {
        positive: 0,
        negative: 0,
        count: 1
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

BAYES.prototype.guess = function(input) {
	/*
	  Split the input by the split function.
	*/
	var bits = this.bitsFunction(input);
	
	/*
	  Initialize some variables...
	*/
  var prbPos = this.positiveProbability,
    prbNeg = this.negativeProbability,
    certainty = 0;
    
	for(var j=0; j<bits.length; j++)	{
	  if(typeof this.bitClass[bits[j]] !== 'undefined') {
      /*
        Multiplicative function for both positive and negative
        probabilities to support mutually exclusive decisions
        (being high positive probability doesn't merit low
        negative probability and vice versa)
      */
      prbPos *= this.bitClass[bits[j]].positiveProbability;
      prbNeg *= this.bitClass[bits[j]].negativeProbability;
      certainty++;
    } else if(this.verbose) {
      /*
        We've never encountered this bit before, warn about it
      */
      console.warn("I Don't know about ", bits[j]);
    }
  }
  
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