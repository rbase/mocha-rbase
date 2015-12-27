/* eslint-env mocha */
var fs = require('fs')
var temp = require('temp')
var runCommand = require('rwebreports').runCommand

function createBackup (dsn, table) {
  var backupPath = temp.path({
    prefix: 'mocha-rbase-' + table + '-',
    suffix: '.dat'
  })
  return runCommand({
    dsn: dsn,
    command:
      'OUTPUT ' + backupPath + '\n' +
      'UNLOAD DATA FOR ' + table + '\n' +
      'OUTPUT SCREEN\n'
  })
  .then(function () {
    var contents = fs.readFileSync(backupPath, 'utf8')
    if (contents.match(/^-ERROR-/)) {
      throw new Error(contents)
    }
    return backupPath
  })
}

function restoreBackup (dsn, table, backupPath) {
  return runCommand({
    dsn: dsn,
    command:
      'DELETE ROWS FROM ' + table + '\n' +
      'RUN ' + backupPath + '\n'
  })
}

function deleteBackup (backupPath) {
  fs.unlinkSync(backupPath)
}

module.exports = function backupTable (dsn, table) {
  var backupPath = null

  before('backup table ' + table, function () {
    return createBackup(dsn, table)
      .then(function (p) {
        backupPath = p
      })
  })

  beforeEach('restore table ' + table + ' from backup', function () {
    return restoreBackup(dsn, table, backupPath)
  })

  after('restore table ' + table + ' and delete backup', function () {
    if (backupPath) {
      return restoreBackup(dsn, table, backupPath)
        .then(function () {
          deleteBackup(backupPath)
        })
    }
  })
}
