var fs = require( 'fs' );

module.exports = {//*****************************************************************************

	save: function(objectToSave, filePathName, pretty, callback) {
    if(pretty) {
    	if(callback) {
    		if(typeof objectToSave !== 'string') {
      		fs.writeFile(filePathName, JSON.stringify(objectToSave, null, 2), callback);
      	} else {
      		fs.writeFile(filePathName, objectToSave, callback);
      	}
  		} else {
  			if(typeof objectToSave !== 'string') {
  				fs.writeFileSync(filePathName, JSON.stringify(objectToSave, null, 2));
  			} else {
  				fs.writeFileSync(filePathName, objectToSave);
  			}
  		}
    } else {
      if(callback) {
      	if(typeof objectToSave !== 'string') {
      		fs.writeFile(filePathName, JSON.stringify(objectToSave), callback);
      	} else {
      		fs.writeFile(filePathName, objectToSave, callback);
      	}
  		} else {
  			if(typeof objectToSave !== 'string') {
  				fs.writeFileSync(filePathName, JSON.stringify(objectToSave));
  			} else {
  				fs.writeFileSync(filePathName, objectToSave);
  			}
  		}
    }
  },

  toCSV: function(array) {
  	var result = '';

  	for(let row of array) {
  		for(let i of row) {
  			result += i + ',';
  		}
  		result += "\n";
  	}

  	return result;
  }
}