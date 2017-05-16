'use strict';

const jspath = require('jspath');

/**
* @name Stor
* @summary Stor class
* @return {undefined}
*/
class Stor {
  /**
  * @name constructor
  * @summary class constructor
  * @return {undefined}
  */
  constructor() {
    this.dataStor = {
      catalogs: {}
    };
    this.andRegex = new RegExp(' and ', 'g');
    this.orRegex = new RegExp(' or ', 'g');
    this.eqRegex = new RegExp(' eq ', 'g');
    this.neqRegex = new RegExp(' neq ', 'g');
  }

  /**
  * @name getCatalog
  * @summary get entire catalog
  * @param {string} catalog - name of catalog
  * @return {array} array - of records
  */
  getCatalog(catalog) {
    return this.dataStor.catalogs[catalog];
  }

  /**
  * @name getRecordIndexByID
  * @summary find a record in a catalog by ID
  * @param {string} catalog - catalog name
  * @param {string} id - record ID
  * @return {object} obj - record or null if not found
  */
  getRecordIndexByID(catalog, id) {
    let catalogList = this.dataStor.catalogs[catalog];
    if (!catalogList) {
      return -1;
    }
    let minIndex = 0;
    let maxIndex = catalogList.length - 1;
    let currentIndex = -1;
    let currentElement = -1;

    while (minIndex <= maxIndex) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      if (catalogList[currentIndex] === undefined) {
        return -1;
      }
      currentElement = catalogList[currentIndex]._id;

      if (currentElement < id) {
        minIndex = currentIndex + 1;
      } else if (currentElement > id) {
        maxIndex = currentIndex - 1;
      } else {
        return currentIndex;
      }
    }
    return -1;
  }

  /**
  * @name findRecordByID
  * @summary find a record in a catalog by ID
  * @param {string} catalog - catalog name
  * @param {string} id - record ID
  * @return {object} obj - record or null if not found
  */
  findRecordByID(catalog, id) {
    let catalogList = this.dataStor.catalogs[catalog];
    let idx = this.getRecordIndexByID(catalog, id);
    return (idx === -1) ? null : catalogList[idx];
  }

  /**
  * @name findInsertionPoint
  * @summary find the insertion point into a catalog
  * @param {string} catalog - catalog name
  * @param {string} id - record ID
  * @return {number} index - array index insertion point
  */
  findInsertionPoint(catalog, id) {
    let catalogList = this.dataStor.catalogs[catalog];
    let minIndex = 0;
    let maxIndex = catalogList.length - 1;
    let currentIndex = -1;
    let currentElement = -1;

    while (minIndex <= maxIndex) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      if (catalogList[currentIndex] === undefined) {
        return currentIndex + 1;
      }
      currentElement = catalogList[currentIndex]._id;
      if (currentElement < id) {
        minIndex = currentIndex + 1;
      } else if (currentElement > id) {
        maxIndex = currentIndex - 1;
      } else {
        return currentIndex;
      }
    }
    return maxIndex;
  }

  /**
  * @name insertRecord
  * @summary Insert a record into a catalog
  * @param {string} catalog - catalog name
  * @param {object} doc - document object
  * @return {undefined}
  */
  insertRecord(catalog, doc) {
    if (!this.dataStor.catalogs[catalog]) {
      this.dataStor.catalogs[catalog] = [];
      this.dataStor.catalogs[catalog].push(doc);
      return;
    }

    let idx = this.findInsertionPoint(catalog, doc._id);
    if (idx > this.dataStor.catalogs[catalog].length) {
      this.dataStor.catalogs[catalog].push(doc);
      return;
    }
    if (idx < 0) {
      this.dataStor.catalogs[catalog].unshift(doc);
      return;
    }

    this.dataStor.catalogs[catalog].splice(idx + 1, 0, doc);
  }

  /**
  * @name updateRecord
  * @summary update an existing record in a catalog
  * @param {string} catalog - catalog name
  * @param {string} doc - document
  * @return {undefined}
  */
  updateRecord(catalog, doc) {
    let idx = this.getRecordIndexByID(catalog, doc._id);
    if (idx) {
      this.dataStor.catalogs[catalog][idx] = doc;
    }
  }

  /**
  * @name deleteRecord
  * @summary Remove a record from a catalog
  * @param {string} catalog - catalog name
  * @param {string} id - record ID
  * @return {undefined}
  */
  deleteRecord(catalog, id) {
    let idx = this.getRecordIndexByID(catalog, id);
    if (idx !== -1) {
      this.dataStor.catalogs[catalog].splice(idx, 1);
    }
  }

  /**
  * @name deleteCatalog
  * @summary Remove an entire catalog
  * @param {string} catalog - catalog name
  * @return {undefined}
  */
  deleteCatalog(catalog) {
    delete this.dataStor.catalogs[catalog];
  }

  /**
  * @name queryString
  * @summary query a catalog
  * @param {string} catalog - catalog name
  * @param {string} queryString - query expression
  * @return {array} records - list of records
  */
  queryCatalog(catalog, queryString) {
    let result;

    queryString = queryString.replace(this.andRegex, ' && ');
    queryString = queryString.replace(this.orRegex, ' || ');
    queryString = queryString.replace(this.eqRegex, ' === ');
    queryString = queryString.replace(this.neqRegex, ' !== ');

    let newQuery = `.${catalog}${queryString}`;
    try {
      result = jspath.apply(newQuery, this.dataStor.catalogs);
    } catch (e) {
      result = {
        error: {
          reason: e.message
        }
      };
    }
    return result;
  }
}

module.exports = new Stor();
