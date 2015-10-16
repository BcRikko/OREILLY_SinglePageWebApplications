/**
 * crud.js - CRUD　db昨日を提供するモジュール
 */

/*jslint           node : true, continue : true,
  devel  : true, indent : 2,      maxerr :50,
  newcap : true, nomen  : true, plusplus : true,
  regexp : true, sloppy : true,     vars : false,
   white : true
*/
/*global */

// モジュールスコープ変数開始
'use strict';
var
    loadSchema, checkSchema, clearIsOnline,
    checkType, constructObj, readObj,
    updateObj, destroyObj,

    mongodb = require('mondodb'),
    fsHandle = require('fs'),
    JSV = require('JSV').JSV,

    mongoServer = new mongodb.Server(
        'localhost',
        mongodb.Connection.DEFAULT_PORT
        ),
    dbHHandle = new mongodb.Db(
        'spa', mongoServer, { safe: true }
        ),
    validator = JSV.createEnvironment(),

    objTypeMap = { 'user': {} };
// モジュールスコープ変数終了

// ユーティリティメソッド開始
loadSchema = function (schema_name, schema_path) {
    fsHandle.readFile(schema_path, 'utf8', function (err, data) {
        objTypeMap[schema_name] = JSON.parse(data);
    });
};

checkSchema = function (obj_type, obj_map, callback) {
    var
        schema_map = objTypeMap[obj_type],
        report_map = validator.validate(obj_map, schema_map);
    
    callback(report_map.errors);
};

clearIsOnline = function () {
    updateObj(
        'user',
        { is_online: true },
        { is_online: false },
        function (response_map) {
            console.log('All users set to offline', response_map);
        }
    );
};
// ユーティリティメソッド終了

// パブリックメソッド開始
checkType = function (obj_type) {
    if (!objTypeMap[obj_type]) {
        return ({ error_msg: 'Object type "' + obj_type + '" is not supported.' });
    }
    return null;
};

constructObj = function (obj_type, obj_map, callback) {
    var type_check_map = checkType(obj_type);
    if (type_check_map) {
        callback(type_check_map);
        return;
    }
    checkSchema(
        obj_type, obj_map,
        function (error_list) {
            if (error_list.length === 0) {
                dbHHandle.collection(
                    obj_type,
                    function (outer_error, collection) {
                        var options_map = { safe: true };

                        collection.insert(
                            obj_map,
                            options_map,
                            function (inner_error, result_map) {
                                callback(result_map);
                            }
                            );
                    }
                    );
            }
            else {
                callback({
                    error_msg: 'Input document not valid',
                    error_list: error_list
                });
            }
        }
        );
};

readObj = function (obj_type, find_map, fields_map, callback) {
    var type_check_map = checkType(obj_type);
    if (type_check_map) {
        callback(type_check_map);
        return;
    }
    
    dbHHandle.collection(
        obj_type,
        function (outer_error, collection) {
            collection.find(find_map, fields_map).toArray(
                function (inner_error, map_list) {
                    callback(map_list);
                    return;
                }
            );
        }
        );
};

updateObj = function (obj_type, find_map, set_map, callback) {
    var type_check_map = checkType(obj_type);
    if (type_check_map) {
        callback(type_check_map);
        return;
    }
    
    checkSchema(
        obj_type, set_map,
        function (error_list) {
            if (error_list.length === 0) {
                dbHHandle.collection(
                    obj_type,
                    function (outer_error, collection) {
                        collection.update(
                            find_map,
                            { $set: set_map },
                            { safe: true, multi: true, upsert: false },
                            function (inner_error, update_count) {
                                callback({ uupdate_count: update_count });
                            }
                            );
                    }
                    );
            }
            else {
                callback({
                    error_msg: 'Input document not valid',
                    error_list: error_list
                });
            }
        }
        );
};

destroyObj = function (obj_type, find_map, callback) {
    var type_check_map = checkType(obj_type);
    if (type_check_map) {
        callback(type_check_map);
        return;
    }
    
    dbHHandle.collection(
        obj_type,
        function (outer_error, collection) {
            var options_map = { safe: true, single: true };

            collection.remove(find_map, options_map,
                function (inner_error, delete_coount) {
                    callback({ delete_coount: delete_coount });
                }
                );
        }
        );
};

module.export = {
    makeMongoId: mongodb.ObjectID,
    checkType: checkType,
    construct: constructObj,
    read: readObj,
    update: updateObj,
    destory: destroyObj
};
// パブリックメソッド終了

// モジュール初期化開始
dbHHandle.open(function () {
    console.log('** Connected to MongoDB **');
    clearIsOnline();
});

// メモリ（objTypeMap）にスキーマをロードする
(function () {
    var schema_name, schema_path;
    for (schema_name in objTypeMap) {
        if (objTypeMap.hasOwnProperty(schema_name)) {
            schema_path = __dirname + '/' + schema_name + '.json';
            loadSchema(schema_name, schema_path);
        }
    }
} ());
// モジュール初期化終了