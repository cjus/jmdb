'use strict';

const fs = require('fs');
const jspath = require('jspath');
const objectID = require('bson-objectid');
const JMDBFile = './jmdb.json';

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
    this.catalogList = {};
    this.andRegex = new RegExp(' and ', 'g');
    this.orRegex = new RegExp(' or ', 'g');
    this.eqRegex = new RegExp(' eq ', 'g');
    this.neqRegex = new RegExp(' neq ', 'g');
  }

  /**
  * @name loadDatabase
  * @summary attempt to load database from files
  * @param {object} somename - description
  * @return {undefined}
  */
  loadDatabase() {
    try {
      let manifest = fs.readFileSync(JMDBFile, 'utf8');
      this.catalogList = JSON.parse(manifest);
      console.log('Initializing database...');
      Object.keys(this.catalogList.catalogs).forEach((key) => {
        let entry = this.catalogList.catalogs[key];
        console.log(`\tloading ${entry.filename}...`);
        let content = fs.readFileSync(`./${entry.filename}`, 'utf8');
        let js = JSON.parse(content);
        js.forEach((record) => {
          if (!record._id) {
            record._id = objectID();
            entry.dirty = true;
          }
        });
        this.dataStor.catalogs[key] = js;
      });
      console.log('Database loaded');
      console.log();
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.log(e);
      }
    }
  }

  /**
  * @name save
  * @summary save dirty catalogs to disk
  * @return {undefined}
  */
  save() {
    let updated = false;
    Object.keys(this.catalogList.catalogs).forEach((key) => {
      let entry = this.catalogList.catalogs[key];
      if (entry.dirty) {
        this.writeFile(`./${entry.filename}`, this.dataStor.catalogs[key]);
        delete entry.dirty;
        updated = true;
      }
    });
    if (updated) {
      this.writeFile(JMDBFile, this.catalogList);
    }
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
  * @return {string} _id - new document ID
  */
  insertRecord(catalog, doc) {
    if (!this.dataStor.catalogs[catalog]) {
      this.dataStor.catalogs[catalog] = [];
      doc._id = objectID();
      this.dataStor.catalogs[catalog].push(doc);
      this.catalogList.catalogs[catalog] = {
        'filename': `${catalog}.json`,
        'dirty': true
      };
      return doc._id;
    }
    this.catalogList.catalogs[catalog]['dirty'] = true;
    doc._id = objectID();
    let idx = this.findInsertionPoint(catalog, doc._id);
    if (idx > this.dataStor.catalogs[catalog].length) {
      this.dataStor.catalogs[catalog].push(doc);
      return doc._id;
    }
    if (idx < 0) {
      this.dataStor.catalogs[catalog].unshift(doc);
      return doc._id;
    }
    this.dataStor.catalogs[catalog].splice(idx + 1, 0, doc);
    return doc._id;
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
      this.catalogList.catalogs[catalog].dirty = true;
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
      this.catalogList.catalogs[catalog].dirty = true;
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
    fs.unlinkSync(`./${this.catalogList.catalogs[catalog].filename}`);
    delete this.catalogList.catalogs[catalog];
    this.writeFile(JMDBFile, this.catalogList);
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

  /**
  * @name writeFile
  * @summary write to file
  * @param {string} filename - filename and path to file
  * @param {object} obj - object to serialize
  * @return {undefined}
  */
  writeFile(filename, obj) {
    fs.writeFileSync(filename, JSON.stringify(obj, null, 2), 'utf8');
  }
}

module.exports = new Stor();
