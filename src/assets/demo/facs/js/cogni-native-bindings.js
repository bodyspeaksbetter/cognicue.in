var Module;
if (typeof Module === "undefined")
    Module = {};
if (!Module.expectedDataFileDownloads) {
    Module.expectedDataFileDownloads = 0;
    Module.finishedDataFileDownloads = 0
}
Module.expectedDataFileDownloads++;
((function() {
    var loadPackage = (function(metadata) {
        var PACKAGE_PATH;
        if (typeof window === "object") {
            PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf("/")) + "/")
        } else if (typeof location !== "undefined") {
            PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf("/")) + "/")
        } else {
            throw "using preloaded data can only be done on a web page or in a web worker"
        }
        var PACKAGE_NAME = "../bin/cogni-native-bindings.data";
        var REMOTE_PACKAGE_BASE = "cogni-native-bindings.data";
        if (typeof Module["locateFilePackage"] === "function" && !Module["locateFile"]) {
            Module["locateFile"] = Module["locateFilePackage"];
            Module.printErr("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)")
        }
        var REMOTE_PACKAGE_NAME = typeof Module["locateFile"] === "function" ? Module["locateFile"](REMOTE_PACKAGE_BASE) : (Module["filePackagePrefixURL"] || "") + REMOTE_PACKAGE_BASE;
        var REMOTE_PACKAGE_SIZE = metadata.remote_package_size;
        var PACKAGE_UUID = metadata.package_uuid;
        function fetchRemotePackage(packageName, packageSize, callback, errback) {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", packageName, true);
            xhr.responseType = "arraybuffer";
            xhr.onprogress = (function(event) {
                var url = packageName;
                var size = packageSize;
                if (event.total)
                    size = event.total;
                if (event.loaded) {
                    if (!xhr.addedTotal) {
                        xhr.addedTotal = true;
                        if (!Module.dataFileDownloads)
                            Module.dataFileDownloads = {};
                        Module.dataFileDownloads[url] = {
                            loaded: event.loaded,
                            total: size
                        }
                    } else {
                        Module.dataFileDownloads[url].loaded = event.loaded
                    }
                    var total = 0;
                    var loaded = 0;
                    var num = 0;
                    for (var download in Module.dataFileDownloads) {
                        var data = Module.dataFileDownloads[download];
                        total += data.total;
                        loaded += data.loaded;
                        num++
                    }
                    total = Math.ceil(total * Module.expectedDataFileDownloads / num);
                    if (Module["setStatus"])
                        Module["setStatus"]("Downloading data... (" + loaded + "/" + total + ")")
                } else if (!Module.dataFileDownloads) {
                    if (Module["setStatus"])
                        Module["setStatus"]("Downloading data...")
                }
            }
            );
            xhr.onerror = (function(event) {
                throw new Error("NetworkError for: " + packageName)
            }
            );
            xhr.onload = (function(event) {
                if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || xhr.status == 0 && xhr.response) {
                    var packageData = xhr.response;
                    callback(packageData)
                } else {
                    throw new Error(xhr.statusText + " : " + xhr.responseURL)
                }
            }
            );
            xhr.send(null)
        }
        function handleError(error) {
            console.error("package error:", error)
        }
        var fetched = null
          , fetchedCallback = null;
        fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, (function(data) {
            if (fetchedCallback) {
                fetchedCallback(data);
                fetchedCallback = null
            } else {
                fetched = data
            }
        }
        ), handleError);
        function runWithFS() {
            function assert(check, msg) {
                if (!check)
                    throw msg + (new Error).stack
            }
            Module["FS_createPath"]("/", "data", true, true);
            Module["FS_createPath"]("/data", "CT_pack", true, true);
            Module["FS_createPath"]("/data", "haarcascade", true, true);
            Module["FS_createPath"]("/data", "noctali0.83", true, true);
            Module["FS_createPath"]("/data", "PA_pack", true, true);
            Module["FS_createPath"]("/data", "production_config", true, true);
            Module["FS_createPath"]("/data/production_config", "aliases", true, true);
            Module["FS_createPath"]("/data/production_config", "emotion", true, true);
            Module["FS_createPath"]("/data/production_config", "postprocess", true, true);
            Module["FS_createPath"]("/data/production_config", "raw", true, true);
            Module["FS_createPath"]("/data/production_config", "tracker", true, true);
            function DataRequest(start, end, crunched, audio) {
                this.start = start;
                this.end = end;
                this.crunched = crunched;
                this.audio = audio
            }
            DataRequest.prototype = {
                requests: {},
                open: (function(mode, name) {
                    this.name = name;
                    this.requests[name] = this;
                    Module["addRunDependency"]("fp " + this.name)
                }
                ),
                send: (function() {}
                ),
                onload: (function() {
                    var byteArray = this.byteArray.subarray(this.start, this.end);
                    this.finish(byteArray)
                }
                ),
                finish: (function(byteArray) {
                    var that = this;
                    Module["FS_createDataFile"](this.name, null, byteArray, true, true, true);
                    Module["removeRunDependency"]("fp " + that.name);
                    this.requests[this.name] = null
                }
                )
            };
            var files = metadata.files;
            for (i = 0; i < files.length; ++i) {
                (new DataRequest(files[i].start,files[i].end,files[i].crunched,files[i].audio)).open("GET", files[i].filename)
            }
            function processPackageData(arrayBuffer) {
                Module.finishedDataFileDownloads++;
                assert(arrayBuffer, "Loading data file failed.");
                assert(arrayBuffer instanceof ArrayBuffer, "bad input to processPackageData");
                var byteArray = new Uint8Array(arrayBuffer);
                if (Module["SPLIT_MEMORY"])
                    Module.printErr("warning: you should run the file packager with --no-heap-copy when SPLIT_MEMORY is used, otherwise copying into the heap may fail due to the splitting");
                var ptr = Module["getMemory"](byteArray.length);
                Module["HEAPU8"].set(byteArray, ptr);
                DataRequest.prototype.byteArray = Module["HEAPU8"].subarray(ptr, ptr + byteArray.length);
                var files = metadata.files;
                for (i = 0; i < files.length; ++i) {
                    DataRequest.prototype.requests[files[i].filename].onload()
                }
                Module["removeRunDependency"]("datafile_../bin/cogni-native-bindings.data")
            }
            Module["addRunDependency"]("datafile_../bin/cogni-native-bindings.data");
            if (!Module.preloadResults)
                Module.preloadResults = {};
            Module.preloadResults[PACKAGE_NAME] = {
                fromCache: false
            };
            if (fetched) {
                processPackageData(fetched);
                fetched = null
            } else {
                fetchedCallback = processPackageData
            }
        }
        if (Module["calledRun"]) {
            runWithFS()
        } else {
            if (!Module["preRun"])
                Module["preRun"] = [];
            Module["preRun"].push(runWithFS)
        }
    }
    );
    loadPackage({
        "files": [{
            "audio": 0,
            "start": 0,
            "crunched": 0,
            "end": 3358290,
            "filename": "/affdexface-sdk-4-data.zip"
        }, {
            "audio": 0,
            "start": 3358290,
            "crunched": 0,
            "end": 3358608,
            "filename": "/VERSION.txt"
        }, {
            "audio": 0,
            "start": 3358608,
            "crunched": 0,
            "end": 3430349,
            "filename": "/data/face_model_3d.bin"
        }, {
            "audio": 0,
            "start": 3430349,
            "crunched": 0,
            "end": 3632184,
            "filename": "/data/CT_pack/agect_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3632184,
            "crunched": 0,
            "end": 3636159,
            "filename": "/data/CT_pack/au01ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3636159,
            "crunched": 0,
            "end": 3640134,
            "filename": "/data/CT_pack/au02ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3640134,
            "crunched": 0,
            "end": 3644109,
            "filename": "/data/CT_pack/au04ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3644109,
            "crunched": 0,
            "end": 3648084,
            "filename": "/data/CT_pack/au05ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3648084,
            "crunched": 0,
            "end": 3652059,
            "filename": "/data/CT_pack/au06ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3652059,
            "crunched": 0,
            "end": 3656034,
            "filename": "/data/CT_pack/au07ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3656034,
            "crunched": 0,
            "end": 3660009,
            "filename": "/data/CT_pack/au09de_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3660009,
            "crunched": 0,
            "end": 3662736,
            "filename": "/data/CT_pack/au10ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3662736,
            "crunched": 0,
            "end": 3666711,
            "filename": "/data/CT_pack/au14ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3666711,
            "crunched": 0,
            "end": 3676446,
            "filename": "/data/CT_pack/au15ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3676446,
            "crunched": 0,
            "end": 3680421,
            "filename": "/data/CT_pack/au17ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3680421,
            "crunched": 0,
            "end": 3684396,
            "filename": "/data/CT_pack/au18ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3684396,
            "crunched": 0,
            "end": 3688371,
            "filename": "/data/CT_pack/au20ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3688371,
            "crunched": 0,
            "end": 3692346,
            "filename": "/data/CT_pack/au24ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3692346,
            "crunched": 0,
            "end": 3696321,
            "filename": "/data/CT_pack/au25ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3696321,
            "crunched": 0,
            "end": 3700296,
            "filename": "/data/CT_pack/au26ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3700296,
            "crunched": 0,
            "end": 3704271,
            "filename": "/data/CT_pack/au28ct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3704271,
            "crunched": 0,
            "end": 3708246,
            "filename": "/data/CT_pack/disgustct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3708246,
            "crunched": 0,
            "end": 3852453,
            "filename": "/data/CT_pack/ethnicityct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3852453,
            "crunched": 0,
            "end": 3856428,
            "filename": "/data/CT_pack/eye_closurect_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3856428,
            "crunched": 0,
            "end": 3866163,
            "filename": "/data/CT_pack/genderct_raw_linear_largeface.pbin"
        }, {
            "audio": 0,
            "start": 3866163,
            "crunched": 0,
            "end": 3870138,
            "filename": "/data/CT_pack/glassesct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3870138,
            "crunched": 0,
            "end": 3879873,
            "filename": "/data/CT_pack/smilect_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3879873,
            "crunched": 0,
            "end": 3889608,
            "filename": "/data/CT_pack/smirkct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3889608,
            "crunched": 0,
            "end": 3893583,
            "filename": "/data/CT_pack/tongue_outct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3893583,
            "crunched": 0,
            "end": 3897558,
            "filename": "/data/CT_pack/winkct_raw_linear.pbin"
        }, {
            "audio": 0,
            "start": 3897558,
            "crunched": 0,
            "end": 3990621,
            "filename": "/data/haarcascade/004_lbp_15stage.xml"
        }, {
            "audio": 0,
            "start": 3990621,
            "crunched": 0,
            "end": 4828083,
            "filename": "/data/haarcascade/haarcascade_frontalface_alt2.xml"
        }, {
            "audio": 0,
            "start": 4828083,
            "crunched": 0,
            "end": 4830317,
            "filename": "/data/noctali0.83/classifier_22.arc"
        }, {
            "audio": 0,
            "start": 4830317,
            "crunched": 0,
            "end": 4830642,
            "filename": "/data/noctali0.83/classifier_5.arc"
        }, {
            "audio": 0,
            "start": 4830642,
            "crunched": 0,
            "end": 5422831,
            "filename": "/data/noctali0.83/pca_lr_12.arc"
        }, {
            "audio": 0,
            "start": 5422831,
            "crunched": 0,
            "end": 6015020,
            "filename": "/data/noctali0.83/pca_lr_15.arc"
        }, {
            "audio": 0,
            "start": 6015020,
            "crunched": 0,
            "end": 6607209,
            "filename": "/data/noctali0.83/pca_lr_18.arc"
        }, {
            "audio": 0,
            "start": 6607209,
            "crunched": 0,
            "end": 7199398,
            "filename": "/data/noctali0.83/pca_lr_9.arc"
        }, {
            "audio": 0,
            "start": 7199398,
            "crunched": 0,
            "end": 7212029,
            "filename": "/data/noctali0.83/Detector.conf"
        }, {
            "audio": 0,
            "start": 7212029,
            "crunched": 0,
            "end": 7221764,
            "filename": "/data/PA_pack/au15pa_raw.pbin"
        }, {
            "audio": 0,
            "start": 7221764,
            "crunched": 0,
            "end": 7246727,
            "filename": "/data/production_config/aliases/alias.conf"
        }, {
            "audio": 0,
            "start": 7246727,
            "crunched": 0,
            "end": 7322791,
            "filename": "/data/production_config/emotion/emoji.conf"
        }, {
            "audio": 0,
            "start": 7322791,
            "crunched": 0,
            "end": 7389913,
            "filename": "/data/production_config/emotion/emotion.conf"
        }, {
            "audio": 0,
            "start": 7389913,
            "crunched": 0,
            "end": 7389917,
            "filename": "/data/production_config/postprocess/acausal.conf"
        }, {
            "audio": 0,
            "start": 7389917,
            "crunched": 0,
            "end": 7523667,
            "filename": "/data/production_config/postprocess/causal.conf"
        }, {
            "audio": 0,
            "start": 7523667,
            "crunched": 0,
            "end": 7609178,
            "filename": "/data/production_config/postprocess/static.conf"
        }, {
            "audio": 0,
            "start": 7609178,
            "crunched": 0,
            "end": 7637876,
            "filename": "/data/production_config/raw/linear.conf"
        }, {
            "audio": 0,
            "start": 7637876,
            "crunched": 0,
            "end": 7656094,
            "filename": "/data/production_config/raw/nonlinear.conf"
        }, {
            "audio": 0,
            "start": 7656094,
            "crunched": 0,
            "end": 7657388,
            "filename": "/data/production_config/tracker/default.conf"
        }, {
            "audio": 0,
            "start": 7657388,
            "crunched": 0,
            "end": 7657931,
            "filename": "/data/production_config/tracker/facedet_0.1.conf"
        }, {
            "audio": 0,
            "start": 7657931,
            "crunched": 0,
            "end": 7658504,
            "filename": "/data/production_config/tracker/facedet_0.1_emoto.conf"
        }, {
            "audio": 0,
            "start": 7658504,
            "crunched": 0,
            "end": 7659034,
            "filename": "/data/production_config/tracker/facedet_0.2.conf"
        }, {
            "audio": 0,
            "start": 7659034,
            "crunched": 0,
            "end": 7659594,
            "filename": "/data/production_config/tracker/facedet_0.2_emoto.conf"
        }, {
            "audio": 0,
            "start": 7659594,
            "crunched": 0,
            "end": 7660583,
            "filename": "/data/production_config/tracker/multi_noctali0.83.conf"
        }, {
            "audio": 0,
            "start": 7660583,
            "crunched": 0,
            "end": 7661876,
            "filename": "/data/production_config/tracker/noctali0.81.conf"
        }, {
            "audio": 0,
            "start": 7661876,
            "crunched": 0,
            "end": 7663195,
            "filename": "/data/production_config/tracker/single_lbp_noctali0.83.conf"
        }, {
            "audio": 0,
            "start": 7663195,
            "crunched": 0,
            "end": 7664509,
            "filename": "/data/production_config/tracker/single_lbp_noctali0.83_emoto.conf"
        }, {
            "audio": 0,
            "start": 7664509,
            "crunched": 0,
            "end": 7665802,
            "filename": "/data/production_config/tracker/single_noctali0.81.conf"
        }, {
            "audio": 0,
            "start": 7665802,
            "crunched": 0,
            "end": 7667096,
            "filename": "/data/production_config/tracker/single_noctali0.83.conf"
        }, {
            "audio": 0,
            "start": 7667096,
            "crunched": 0,
            "end": 7668423,
            "filename": "/data/production_config/tracker/single_noctali0.83_emoto.conf"
        }],
        "remote_package_size": 7668423,
        "package_uuid": "a1dba9e2-f1be-46fe-ba4b-f07400df1294"
    })
}
))();
var Module;
if (!Module)
    Module = (typeof Module !== "undefined" ? Module : null) || {};
var moduleOverrides = {};
for (var key in Module) {
    if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key]
    }
}
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
if (Module["ENVIRONMENT"]) {
    if (Module["ENVIRONMENT"] === "WEB") {
        ENVIRONMENT_IS_WEB = true
    } else if (Module["ENVIRONMENT"] === "WORKER") {
        ENVIRONMENT_IS_WORKER = true
    } else if (Module["ENVIRONMENT"] === "NODE") {
        ENVIRONMENT_IS_NODE = true
    } else if (Module["ENVIRONMENT"] === "SHELL") {
        ENVIRONMENT_IS_SHELL = true
    } else {
        throw new Error("The provided Module['ENVIRONMENT'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.")
    }
} else {
    ENVIRONMENT_IS_WEB = typeof window === "object";
    ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
    ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER
}
if (ENVIRONMENT_IS_NODE) {
    if (!Module["print"])
        Module["print"] = console.log;
    if (!Module["printErr"])
        Module["printErr"] = console.warn;
    var nodeFS;
    var nodePath;
    Module["read"] = function read(filename, binary) {
        if (!nodeFS)
            nodeFS = require("fs");
        if (!nodePath)
            nodePath = require("path");
        filename = nodePath["normalize"](filename);
        var ret = nodeFS["readFileSync"](filename);
        if (!ret && filename != nodePath["resolve"](filename)) {
            filename = path.join(__dirname, "..", "src", filename);
            ret = nodeFS["readFileSync"](filename)
        }
        if (ret && !binary)
            ret = ret.toString();
        return ret
    }
    ;
    Module["readBinary"] = function readBinary(filename) {
        var ret = Module["read"](filename, true);
        if (!ret.buffer) {
            ret = new Uint8Array(ret)
        }
        assert(ret.buffer);
        return ret
    }
    ;
    Module["load"] = function load(f) {
        globalEval(read(f))
    }
    ;
    if (!Module["thisProgram"]) {
        if (process["argv"].length > 1) {
            Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
        } else {
            Module["thisProgram"] = "unknown-program"
        }
    }
    Module["arguments"] = process["argv"].slice(2);
    if (typeof module !== "undefined") {
        module["exports"] = Module
    }
    process["on"]("uncaughtException", (function(ex) {
        if (!(ex instanceof ExitStatus)) {
            throw ex
        }
    }
    ));
    Module["inspect"] = (function() {
        return "[Emscripten Module object]"
    }
    )
} else if (ENVIRONMENT_IS_SHELL) {
    if (!Module["print"])
        Module["print"] = print;
    if (typeof printErr != "undefined")
        Module["printErr"] = printErr;
    if (typeof read != "undefined") {
        Module["read"] = read
    } else {
        Module["read"] = function read() {
            throw "no read() available (jsc?)"
        }
    }
    Module["readBinary"] = function readBinary(f) {
        if (typeof readbuffer === "function") {
            return new Uint8Array(readbuffer(f))
        }
        var data = read(f, "binary");
        assert(typeof data === "object");
        return data
    }
    ;
    if (typeof scriptArgs != "undefined") {
        Module["arguments"] = scriptArgs
    } else if (typeof arguments != "undefined") {
        Module["arguments"] = arguments
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module["read"] = function read(url) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        xhr.send(null);
        return xhr.responseText
    }
    ;
    Module["readAsync"] = function readAsync(url, onload, onerror) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = function xhr_onload() {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                onload(xhr.response)
            } else {
                onerror()
            }
        }
        ;
        xhr.onerror = onerror;
        xhr.send(null)
    }
    ;
    if (typeof arguments != "undefined") {
        Module["arguments"] = arguments
    }
    if (typeof console !== "undefined") {
        if (!Module["print"])
            Module["print"] = function print(x) {
                console.log(x)
            }
            ;
        if (!Module["printErr"])
            Module["printErr"] = function printErr(x) {
                console.warn(x)
            }
    } else {
        var TRY_USE_DUMP = false;
        if (!Module["print"])
            Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function(x) {
                dump(x)
            }
            ) : (function(x) {}
            )
    }
    if (ENVIRONMENT_IS_WORKER) {
        Module["load"] = importScripts
    }
    if (typeof Module["setWindowTitle"] === "undefined") {
        Module["setWindowTitle"] = (function(title) {
            document.title = title
        }
        )
    }
} else {
    throw "Unknown runtime environment. Where are we?"
}
function globalEval(x) {
    eval.call(null, x)
}
if (!Module["load"] && Module["read"]) {
    Module["load"] = function load(f) {
        globalEval(Module["read"](f))
    }
}
if (!Module["print"]) {
    Module["print"] = (function() {}
    )
}
if (!Module["printErr"]) {
    Module["printErr"] = Module["print"]
}
if (!Module["arguments"]) {
    Module["arguments"] = []
}
if (!Module["thisProgram"]) {
    Module["thisProgram"] = "./this.program"
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
Module["preRun"] = [];
Module["postRun"] = [];
for (var key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key]
    }
}
moduleOverrides = undefined;
var Runtime = {
    setTempRet0: (function(value) {
        tempRet0 = value
    }
    ),
    getTempRet0: (function() {
        return tempRet0
    }
    ),
    stackSave: (function() {
        return STACKTOP
    }
    ),
    stackRestore: (function(stackTop) {
        STACKTOP = stackTop
    }
    ),
    getNativeTypeSize: (function(type) {
        switch (type) {
        case "i1":
        case "i8":
            return 1;
        case "i16":
            return 2;
        case "i32":
            return 4;
        case "i64":
            return 8;
        case "float":
            return 4;
        case "double":
            return 8;
        default:
            {
                if (type[type.length - 1] === "*") {
                    return Runtime.QUANTUM_SIZE
                } else if (type[0] === "i") {
                    var bits = parseInt(type.substr(1));
                    assert(bits % 8 === 0);
                    return bits / 8
                } else {
                    return 0
                }
            }
        }
    }
    ),
    getNativeFieldSize: (function(type) {
        return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE)
    }
    ),
    STACK_ALIGN: 16,
    prepVararg: (function(ptr, type) {
        if (type === "double" || type === "i64") {
            if (ptr & 7) {
                assert((ptr & 7) === 4);
                ptr += 4
            }
        } else {
            assert((ptr & 3) === 0)
        }
        return ptr
    }
    ),
    getAlignSize: (function(type, size, vararg) {
        if (!vararg && (type == "i64" || type == "double"))
            return 8;
        if (!type)
            return Math.min(size, 8);
        return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE)
    }
    ),
    dynCall: (function(sig, ptr, args) {
        if (args && args.length) {
            if (!args.splice)
                args = Array.prototype.slice.call(args);
            args.splice(0, 0, ptr);
            return Module["dynCall_" + sig].apply(null, args)
        } else {
            return Module["dynCall_" + sig].call(null, ptr)
        }
    }
    ),
    functionPointers: [],
    addFunction: (function(func) {
        for (var i = 0; i < Runtime.functionPointers.length; i++) {
            if (!Runtime.functionPointers[i]) {
                Runtime.functionPointers[i] = func;
                return 2 * (1 + i)
            }
        }
        throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."
    }
    ),
    removeFunction: (function(index) {
        Runtime.functionPointers[(index - 2) / 2] = null
    }
    ),
    warnOnce: (function(text) {
        if (!Runtime.warnOnce.shown)
            Runtime.warnOnce.shown = {};
        if (!Runtime.warnOnce.shown[text]) {
            Runtime.warnOnce.shown[text] = 1;
            Module.printErr(text)
        }
    }
    ),
    funcWrappers: {},
    getFuncWrapper: (function(func, sig) {
        assert(sig);
        if (!Runtime.funcWrappers[sig]) {
            Runtime.funcWrappers[sig] = {}
        }
        var sigCache = Runtime.funcWrappers[sig];
        if (!sigCache[func]) {
            sigCache[func] = function dynCall_wrapper() {
                return Runtime.dynCall(sig, func, arguments)
            }
        }
        return sigCache[func]
    }
    ),
    getCompilerSetting: (function(name) {
        throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"
    }
    ),
    stackAlloc: (function(size) {
        var ret = STACKTOP;
        STACKTOP = STACKTOP + size | 0;
        STACKTOP = STACKTOP + 15 & -16;
        return ret
    }
    ),
    staticAlloc: (function(size) {
        var ret = STATICTOP;
        STATICTOP = STATICTOP + size | 0;
        STATICTOP = STATICTOP + 15 & -16;
        return ret
    }
    ),
    dynamicAlloc: (function(size) {
        var ret = DYNAMICTOP;
        DYNAMICTOP = DYNAMICTOP + size | 0;
        DYNAMICTOP = DYNAMICTOP + 15 & -16;
        if (DYNAMICTOP >= TOTAL_MEMORY) {
            var success = enlargeMemory();
            if (!success) {
                DYNAMICTOP = ret;
                return 0
            }
        }
        return ret
    }
    ),
    alignMemory: (function(size, quantum) {
        var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
        return ret
    }
    ),
    makeBigInt: (function(low, high, unsigned) {
        var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * +4294967296 : +(low >>> 0) + +(high | 0) * +4294967296;
        return ret
    }
    ),
    GLOBAL_BASE: 8,
    QUANTUM_SIZE: 4,
    __dummy__: 0
};
Module["Runtime"] = Runtime;
var ABORT = false;
var EXITSTATUS = 0;
function assert(condition, text) {
    if (!condition) {
        abort("Assertion failed: " + text)
    }
}
function getCFunc(ident) {
    var func = Module["_" + ident];
    if (!func) {
        try {
            func = eval("_" + ident)
        } catch (e) {}
    }
    assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
    return func
}
var cwrap, ccall;
((function() {
    var JSfuncs = {
        "stackSave": (function() {
            Runtime.stackSave()
        }
        ),
        "stackRestore": (function() {
            Runtime.stackRestore()
        }
        ),
        "arrayToC": (function(arr) {
            var ret = Runtime.stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return ret
        }
        ),
        "stringToC": (function(str) {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
                ret = Runtime.stackAlloc((str.length << 2) + 1);
                writeStringToMemory(str, ret)
            }
            return ret
        }
        )
    };
    var toC = {
        "string": JSfuncs["stringToC"],
        "array": JSfuncs["arrayToC"]
    };
    ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
        var func = getCFunc(ident);
        var cArgs = [];
        var stack = 0;
        if (args) {
            for (var i = 0; i < args.length; i++) {
                var converter = toC[argTypes[i]];
                if (converter) {
                    if (stack === 0)
                        stack = Runtime.stackSave();
                    cArgs[i] = converter(args[i])
                } else {
                    cArgs[i] = args[i]
                }
            }
        }
        var ret = func.apply(null, cArgs);
        if (returnType === "string")
            ret = Pointer_stringify(ret);
        if (stack !== 0) {
            if (opts && opts.async) {
                EmterpreterAsync.asyncFinalizers.push((function() {
                    Runtime.stackRestore(stack)
                }
                ));
                return
            }
            Runtime.stackRestore(stack)
        }
        return ret
    }
    ;
    var sourceRegex = /^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
    function parseJSFunc(jsfunc) {
        var parsed = jsfunc.toString().match(sourceRegex).slice(1);
        return {
            arguments: parsed[0],
            body: parsed[1],
            returnValue: parsed[2]
        }
    }
    var JSsource = null;
    function ensureJSsource() {
        if (!JSsource) {
            JSsource = {};
            for (var fun in JSfuncs) {
                if (JSfuncs.hasOwnProperty(fun)) {
                    JSsource[fun] = parseJSFunc(JSfuncs[fun])
                }
            }
        }
    }
    cwrap = function cwrap(ident, returnType, argTypes) {
        argTypes = argTypes || [];
        var cfunc = getCFunc(ident);
        var numericArgs = argTypes.every((function(type) {
            return type === "number"
        }
        ));
        var numericRet = returnType !== "string";
        if (numericRet && numericArgs) {
            return cfunc
        }
        var argNames = argTypes.map((function(x, i) {
            return "$" + i
        }
        ));
        var funcstr = "(function(" + argNames.join(",") + ") {";
        var nargs = argTypes.length;
        if (!numericArgs) {
            ensureJSsource();
            funcstr += "var stack = " + JSsource["stackSave"].body + ";";
            for (var i = 0; i < nargs; i++) {
                var arg = argNames[i]
                  , type = argTypes[i];
                if (type === "number")
                    continue;
                var convertCode = JSsource[type + "ToC"];
                funcstr += "var " + convertCode.arguments + " = " + arg + ";";
                funcstr += convertCode.body + ";";
                funcstr += arg + "=(" + convertCode.returnValue + ");"
            }
        }
        var cfuncname = parseJSFunc((function() {
            return cfunc
        }
        )).returnValue;
        funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
        if (!numericRet) {
            var strgfy = parseJSFunc((function() {
                return Pointer_stringify
            }
            )).returnValue;
            funcstr += "ret = " + strgfy + "(ret);"
        }
        if (!numericArgs) {
            ensureJSsource();
            funcstr += JSsource["stackRestore"].body.replace("()", "(stack)") + ";"
        }
        funcstr += "return ret})";
        return eval(funcstr)
    }
}
))();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;
function setValue(ptr, value, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*")
        type = "i32";
    switch (type) {
    case "i1":
        HEAP8[ptr >> 0] = value;
        break;
    case "i8":
        HEAP8[ptr >> 0] = value;
        break;
    case "i16":
        HEAP16[ptr >> 1] = value;
        break;
    case "i32":
        HEAP32[ptr >> 2] = value;
        break;
    case "i64":
        tempI64 = [value >>> 0, (tempDouble = value,
        +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0)],
        HEAP32[ptr >> 2] = tempI64[0],
        HEAP32[ptr + 4 >> 2] = tempI64[1];
        break;
    case "float":
        HEAPF32[ptr >> 2] = value;
        break;
    case "double":
        HEAPF64[ptr >> 3] = value;
        break;
    default:
        abort("invalid type for setValue: " + type)
    }
}
Module["setValue"] = setValue;
function getValue(ptr, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*")
        type = "i32";
    switch (type) {
    case "i1":
        return HEAP8[ptr >> 0];
    case "i8":
        return HEAP8[ptr >> 0];
    case "i16":
        return HEAP16[ptr >> 1];
    case "i32":
        return HEAP32[ptr >> 2];
    case "i64":
        return HEAP32[ptr >> 2];
    case "float":
        return HEAPF32[ptr >> 2];
    case "double":
        return HEAPF64[ptr >> 3];
    default:
        abort("invalid type for setValue: " + type)
    }
    return null
}
Module["getValue"] = getValue;
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;
var ALLOC_STATIC = 2;
var ALLOC_DYNAMIC = 3;
var ALLOC_NONE = 4;
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;
function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === "number") {
        zeroinit = true;
        size = slab
    } else {
        zeroinit = false;
        size = slab.length
    }
    var singleType = typeof types === "string" ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
        ret = ptr
    } else {
        ret = [typeof _malloc === "function" ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length))
    }
    if (zeroinit) {
        var ptr = ret, stop;
        assert((ret & 3) == 0);
        stop = ret + (size & ~3);
        for (; ptr < stop; ptr += 4) {
            HEAP32[ptr >> 2] = 0
        }
        stop = ret + size;
        while (ptr < stop) {
            HEAP8[ptr++ >> 0] = 0
        }
        return ret
    }
    if (singleType === "i8") {
        if (slab.subarray || slab.slice) {
            HEAPU8.set(slab, ret)
        } else {
            HEAPU8.set(new Uint8Array(slab), ret)
        }
        return ret
    }
    var i = 0, type, typeSize, previousType;
    while (i < size) {
        var curr = slab[i];
        if (typeof curr === "function") {
            curr = Runtime.getFunctionIndex(curr)
        }
        type = singleType || types[i];
        if (type === 0) {
            i++;
            continue
        }
        if (type == "i64")
            type = "i32";
        setValue(ret + i, curr, type);
        if (previousType !== type) {
            typeSize = Runtime.getNativeTypeSize(type);
            previousType = type
        }
        i += typeSize
    }
    return ret
}
Module["allocate"] = allocate;
function getMemory(size) {
    if (!staticSealed)
        return Runtime.staticAlloc(size);
    if (typeof _sbrk !== "undefined" && !_sbrk.called || !runtimeInitialized)
        return Runtime.dynamicAlloc(size);
    return _malloc(size)
}
Module["getMemory"] = getMemory;
function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr)
        return "";
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
        t = HEAPU8[ptr + i >> 0];
        hasUtf |= t;
        if (t == 0 && !length)
            break;
        i++;
        if (length && i == length)
            break
    }
    if (!length)
        length = i;
    var ret = "";
    if (hasUtf < 128) {
        var MAX_CHUNK = 1024;
        var curr;
        while (length > 0) {
            curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
            ret = ret ? ret + curr : curr;
            ptr += MAX_CHUNK;
            length -= MAX_CHUNK
        }
        return ret
    }
    return Module["UTF8ToString"](ptr)
}
Module["Pointer_stringify"] = Pointer_stringify;
function AsciiToString(ptr) {
    var str = "";
    while (1) {
        var ch = HEAP8[ptr++ >> 0];
        if (!ch)
            return str;
        str += String.fromCharCode(ch)
    }
}
Module["AsciiToString"] = AsciiToString;
function stringToAscii(str, outPtr) {
    return writeAsciiToMemory(str, outPtr, false)
}
Module["stringToAscii"] = stringToAscii;
function UTF8ArrayToString(u8Array, idx) {
    var u0, u1, u2, u3, u4, u5;
    var str = "";
    while (1) {
        u0 = u8Array[idx++];
        if (!u0)
            return str;
        if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue
        }
        u1 = u8Array[idx++] & 63;
        if ((u0 & 224) == 192) {
            str += String.fromCharCode((u0 & 31) << 6 | u1);
            continue
        }
        u2 = u8Array[idx++] & 63;
        if ((u0 & 240) == 224) {
            u0 = (u0 & 15) << 12 | u1 << 6 | u2
        } else {
            u3 = u8Array[idx++] & 63;
            if ((u0 & 248) == 240) {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
            } else {
                u4 = u8Array[idx++] & 63;
                if ((u0 & 252) == 248) {
                    u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
                } else {
                    u5 = u8Array[idx++] & 63;
                    u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
                }
            }
        }
        if (u0 < 65536) {
            str += String.fromCharCode(u0)
        } else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
        }
    }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;
function UTF8ToString(ptr) {
    return UTF8ArrayToString(HEAPU8, ptr)
}
Module["UTF8ToString"] = UTF8ToString;
function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0))
        return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343)
            u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) {
            if (outIdx >= endIdx)
                break;
            outU8Array[outIdx++] = u
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx)
                break;
            outU8Array[outIdx++] = 192 | u >> 6;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx)
                break;
            outU8Array[outIdx++] = 224 | u >> 12;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 2097151) {
            if (outIdx + 3 >= endIdx)
                break;
            outU8Array[outIdx++] = 240 | u >> 18;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 67108863) {
            if (outIdx + 4 >= endIdx)
                break;
            outU8Array[outIdx++] = 248 | u >> 24;
            outU8Array[outIdx++] = 128 | u >> 18 & 63;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else {
            if (outIdx + 5 >= endIdx)
                break;
            outU8Array[outIdx++] = 252 | u >> 30;
            outU8Array[outIdx++] = 128 | u >> 24 & 63;
            outU8Array[outIdx++] = 128 | u >> 18 & 63;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx
}
Module["stringToUTF8Array"] = stringToUTF8Array;
function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}
Module["stringToUTF8"] = stringToUTF8;
function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343)
            u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) {
            ++len
        } else if (u <= 2047) {
            len += 2
        } else if (u <= 65535) {
            len += 3
        } else if (u <= 2097151) {
            len += 4
        } else if (u <= 67108863) {
            len += 5
        } else {
            len += 6
        }
    }
    return len
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;
function demangle(func) {
    var hasLibcxxabi = !!Module["___cxa_demangle"];
    if (hasLibcxxabi) {
        try {
            var buf = _malloc(func.length);
            writeStringToMemory(func.substr(1), buf);
            var status = _malloc(4);
            var ret = Module["___cxa_demangle"](buf, 0, 0, status);
            if (getValue(status, "i32") === 0 && ret) {
                return Pointer_stringify(ret)
            }
        } catch (e) {
            return func
        } finally {
            if (buf)
                _free(buf);
            if (status)
                _free(status);
            if (ret)
                _free(ret)
        }
    }
    Runtime.warnOnce("warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");
    return func
}
function demangleAll(text) {
    return text.replace(/__Z[\w\d_]+/g, (function(x) {
        var y = demangle(x);
        return x === y ? x : x + " [" + y + "]"
    }
    ))
}
function jsStackTrace() {
    var err = new Error;
    if (!err.stack) {
        try {
            throw new Error(0)
        } catch (e) {
            err = e
        }
        if (!err.stack) {
            return "(no stack trace available)"
        }
    }
    return err.stack.toString()
}
function stackTrace() {
    return demangleAll(jsStackTrace())
}
Module["stackTrace"] = stackTrace;
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
    if (x % 4096 > 0) {
        x += 4096 - x % 4096
    }
    return x
}
var HEAP;
var buffer;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBuffer(buf) {
    Module["buffer"] = buffer = buf
}
function updateGlobalBufferViews() {
    Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
    Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
    Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer)
}
var STATIC_BASE = 0
  , STATICTOP = 0
  , staticSealed = false;
var STACK_BASE = 0
  , STACKTOP = 0
  , STACK_MAX = 0;
var DYNAMIC_BASE = 0
  , DYNAMICTOP = 0;
if (!Module["reallocBuffer"])
    Module["reallocBuffer"] = (function(size) {
        var ret;
        try {
            if (ArrayBuffer.transfer) {
                ret = ArrayBuffer.transfer(buffer, size)
            } else {
                var oldHEAP8 = HEAP8;
                ret = new ArrayBuffer(size);
                var temp = new Int8Array(ret);
                temp.set(oldHEAP8)
            }
        } catch (e) {
            return false
        }
        var success = _emscripten_replace_memory(ret);
        if (!success)
            return false;
        return ret
    }
    );
function enlargeMemory() {
    var LIMIT = Math.pow(2, 31);
    if (DYNAMICTOP >= LIMIT)
        return false;
    while (TOTAL_MEMORY <= DYNAMICTOP) {
        if (TOTAL_MEMORY < LIMIT / 2) {
            TOTAL_MEMORY = alignMemoryPage(2 * TOTAL_MEMORY)
        } else {
            var last = TOTAL_MEMORY;
            TOTAL_MEMORY = alignMemoryPage((3 * TOTAL_MEMORY + LIMIT) / 4);
            if (TOTAL_MEMORY <= last)
                return false
        }
    }
    TOTAL_MEMORY = Math.max(TOTAL_MEMORY, 16 * 1024 * 1024);
    if (TOTAL_MEMORY >= LIMIT)
        return false;
    var replacement = Module["reallocBuffer"](TOTAL_MEMORY);
    if (!replacement)
        return false;
    updateGlobalBuffer(replacement);
    updateGlobalBufferViews();
    return true
}
var byteLength;
try {
    byteLength = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get);
    byteLength(new ArrayBuffer(4))
} catch (e) {
    byteLength = (function(buffer) {
        return buffer.byteLength
    }
    )
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 5e8;
var totalMemory = 64 * 1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
    if (totalMemory < 16 * 1024 * 1024) {
        totalMemory *= 2
    } else {
        totalMemory += 16 * 1024 * 1024
    }
}
totalMemory = Math.max(totalMemory, 16 * 1024 * 1024);
if (totalMemory !== TOTAL_MEMORY) {
    TOTAL_MEMORY = totalMemory
}
if (Module["buffer"]) {
    buffer = Module["buffer"]
} else {
    buffer = new ArrayBuffer(TOTAL_MEMORY)
}
updateGlobalBufferViews();
HEAP32[0] = 255;
if (HEAPU8[0] !== 255 || HEAPU8[3] !== 0)
    throw "Typed arrays 2 must be run on a little-endian system";
Module["HEAP"] = HEAP;
Module["buffer"] = buffer;
Module["HEAP8"] = HEAP8;
Module["HEAP16"] = HEAP16;
Module["HEAP32"] = HEAP32;
Module["HEAPU8"] = HEAPU8;
Module["HEAPU16"] = HEAPU16;
Module["HEAPU32"] = HEAPU32;
Module["HEAPF32"] = HEAPF32;
Module["HEAPF64"] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == "function") {
            callback();
            continue
        }
        var func = callback.func;
        if (typeof func === "number") {
            if (callback.arg === undefined) {
                Runtime.dynCall("v", func)
            } else {
                Runtime.dynCall("vi", func, [callback.arg])
            }
        } else {
            func(callback.arg === undefined ? null : callback.arg)
        }
    }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function")
            Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPRERUN__)
}
function ensureInitRuntime() {
    if (runtimeInitialized)
        return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__)
}
function preMain() {
    callRuntimeCallbacks(__ATMAIN__)
}
function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true
}
function postRun() {
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function")
            Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
}
function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
}
Module["addOnPreRun"] = addOnPreRun;
function addOnInit(cb) {
    __ATINIT__.unshift(cb)
}
Module["addOnInit"] = addOnInit;
function addOnPreMain(cb) {
    __ATMAIN__.unshift(cb)
}
Module["addOnPreMain"] = addOnPreMain;
function addOnExit(cb) {
    __ATEXIT__.unshift(cb)
}
Module["addOnExit"] = addOnExit;
function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
}
Module["addOnPostRun"] = addOnPostRun;
function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull)
        u8array.length = numBytesWritten;
    return u8array
}
Module["intArrayFromString"] = intArrayFromString;
function intArrayToString(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
        var chr = array[i];
        if (chr > 255) {
            chr &= 255
        }
        ret.push(String.fromCharCode(chr))
    }
    return ret.join("")
}
Module["intArrayToString"] = intArrayToString;
function writeStringToMemory(string, buffer, dontAddNull) {
    var array = intArrayFromString(string, dontAddNull);
    var i = 0;
    while (i < array.length) {
        var chr = array[i];
        HEAP8[buffer + i >> 0] = chr;
        i = i + 1
    }
}
Module["writeStringToMemory"] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
    for (var i = 0; i < array.length; i++) {
        HEAP8[buffer++ >> 0] = array[i]
    }
}
Module["writeArrayToMemory"] = writeArrayToMemory;
function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i)
    }
    if (!dontAddNull)
        HEAP8[buffer >> 0] = 0
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;
if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5)
    Math["imul"] = function imul(a, b) {
        var ah = a >>> 16;
        var al = a & 65535;
        var bh = b >>> 16;
        var bl = b & 65535;
        return al * bl + (ah * bl + al * bh << 16) | 0
    }
    ;
Math.imul = Math["imul"];
if (!Math["clz32"])
    Math["clz32"] = (function(x) {
        x = x >>> 0;
        for (var i = 0; i < 32; i++) {
            if (x & 1 << 31 - i)
                return i
        }
        return 32
    }
    );
Math.clz32 = Math["clz32"];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function getUniqueRunDependency(id) {
    return id
}
function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
}
Module["addRunDependency"] = addRunDependency;
function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
}
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var memoryInitializer = null;
var ASM_CONSTS = [(function() {
    if (Module.onLoaded) {
        Module.onLoaded()
    }
}
)];
function _emscripten_asm_const_v(code) {
    return ASM_CONSTS[code]()
}
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 990080;
__ATINIT__.push({
    func: (function() {
        __GLOBAL__I_000101()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_154()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_173()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_172()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_171()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_169()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_168()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_165()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_163()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_162()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_161()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_159()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_158()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_157()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_156()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_155()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_174()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_153()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_152()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_151()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_150()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_149()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_148()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_147()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_146()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_144()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_142()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_141()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_140()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_113_2253()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_56_2411()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_55_2408()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_50_2407()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_49_2406()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_48_2405()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_47_2404()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_45_2403()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_44_2402()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_43_2401()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_42_2399()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_41_2398()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_40_2397()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_base_Mapper_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_137()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_112_2252()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_111_2251()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_110_2250()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_109_2249()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_108_2248()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_107_2247()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_106_2246()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_105_2245()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_104_2244()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_103_2243()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_102_2242()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_TimeSeries_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_88()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_105()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_104()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_103()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_102()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_101()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_100()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_99()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_96_2016()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_95_2015()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_94_2014()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_93_2013()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_92_2012()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_91_2011()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_106()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_87_2010()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_86_2006()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_85_2005()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_82_2004()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_81_2003()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_78_2002()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_77_2001()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_76_2000()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_75_1999()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_74_1998()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_73_1997()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_72_1996()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_71_1995()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_122()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_57_2412()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_136()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_135()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_134()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_133()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_132()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_131()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_129_2036()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_128_2035()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_127_2034()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_125_2033()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_124_2019()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_123_2018()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_138()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_120()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_118()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_117()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_116()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_114()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_113()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_112()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_111()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_110()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_109()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_108()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_107()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_92_2599()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_opencv_serialization_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_117_2610()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_115()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_113_2609()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_111_2608()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_109_2607()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_106_2606()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_105_2605()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_103_2604()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_101_2603()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_99_2602()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_97_2601()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_95_2600()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_2620()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_91_2598()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_89_2597()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_87_2596()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_85_2595()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_83_2594()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_81_2593()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_78_2592()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_77_2591()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_63_2590()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_61_2589()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_59_2588()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_57_2587()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_55_2586()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_operations_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_iostream_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_bind_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_5994()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_17()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_16()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_5924()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_5914()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_1()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_5898()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_5888()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_5868()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_regex_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_path_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_53_2585()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_error_code_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_hog_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_haar_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_features2d_init_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_imgwarp_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_histogram_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_system_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_persistence_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_stl_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_rolling_algo_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_ptree_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_2646()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_78_2426()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_91_2442()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_90_2441()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_89_2440()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_88_2439()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_87_2438()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_86_2437()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_85_2436()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_84_2432()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_83_2431()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_82_2430()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_81_2429()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_80_2428()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_79_2427()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_92_2443()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_77_2425()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_76_2423()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_75_2422()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_72_2421()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_71_2420()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_70_2419()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_67_2418()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_66_2417()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_65_2416()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_62_2415()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_61_2414()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_60_2413()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_BoundingBox_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_50_2584()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_49_2583()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_47_2582()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_45_2581()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_43_2580()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_41_2579()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_39_2578()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_36_2577()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_35_2576()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_21()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_file_utils_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_cv_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_configuration_utils_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_70_1994()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Feature_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_134_2454()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_128_2453()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_122_2452()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_117_2451()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_112_2450()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_106_2449()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_97_2448()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_96_2447()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_95_2446()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_94_2445()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_93_2444()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_39_983()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_59_1138()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_55_1137()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_54_1136()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_53_1135()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_52_1134()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_51_1133()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_50_1132()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_BaselinePercentile_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Average1D_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Attention_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_ApproxKernel_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_AffineWarp_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Warp3D_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_60_1139()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_38_982()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_ViolaJonesPOI_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_ViolaJones_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Tracker_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_RandomForest_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_65()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_64()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_63()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_62_824()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_61_823()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_60_822()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_59_821()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_58_820()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_32_1390()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_54_1421()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_52_1420()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_50_1419()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_49_1418()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_47_1417()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_46_1416()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_44_1415()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_42_1414()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_41_1413()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_39_1412()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_38_1411()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_35_1410()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_33_1391()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_57()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_LinearRegression_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Label_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_LDAProjection_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_HOG_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Gender_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Emotion_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Emoji_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Digitizer_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_DataQuality_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_DataMultiplication_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_ClassifierSVM_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_61_1140()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_25()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Pose3D_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_PCAProjection_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_OCVFeatureDetector_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Multiclass_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Mirror_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_MetricsNotchFilter_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_MetricsFilter_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_MeanGuess_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_30()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_29()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_28()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_27()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_26()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_30_819()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_MapperFactory_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Mapper_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_62()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_61()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_60()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_59()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_58()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_base_Integration_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_AffdexFace_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_SyncFrameDetector_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_SingleFaceDetectorBase_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Face_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_DetectorBase_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_43()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_56()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_55()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_54()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_53()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_52()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_51()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_50()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_49()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_48()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_47()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_46()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_45()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_44()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_55_1422()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_42()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_41()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_40()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_39()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_38()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_37()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_36()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_35()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_34()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_33()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_32()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_31()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_92_1590()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_37_1719()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_35_1718()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_34_1717()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_33_1716()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_32_1709()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_31_1708()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_svm_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_98()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_97()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_96()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_95_1594()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_94_1593()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_93_1591()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_38_1720()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_91_1561()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_89_1559()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_86_1558()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_85_1557()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_82_1556()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_81_1555()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_80_1554()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_77_1553()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_76_1552()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_75_1551()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_72_1550()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_71_1549()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_70_1536()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Indexes_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_69_1986()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_68_1985()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_67_1984()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_66_1983()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_65_1982()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_63_1981()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_61_1980()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_60_1979()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_59_1978()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_58_1973()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_57_1972()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_TSKey_cpp()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_Mask_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_67_1535()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_50_1732()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_49_1731()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_48_1730()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_47_1729()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_46_1728()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_45_1727()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_44_1726()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_43_1725()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_42_1724()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_41_1723()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_40_1722()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_39_1721()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_68()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_81()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_80()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_79()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_78()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_77()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_76()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_75()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_74()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_73()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_72()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_71()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_70()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_69()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_82()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_67()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_66()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_65_1434()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_64_1433()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_63_1432()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_62_1431()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_61_1430()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_60_1429()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_59_1428()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_58_1427()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_57_1426()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_56_1425()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_123()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_66_1534()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_65_1517()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_60_1516()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_52_1515()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_51_1514()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_rtrees_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_130()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_129()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_128()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_127()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_126()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_125()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_124()
    }
    )
}, {
    func: (function() {
        __GLOBAL__sub_I_affdex_native_bindings_cpp()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_95()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_94()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_93()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_92()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_91()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_90()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_89()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_87()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_86()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_85()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_84()
    }
    )
}, {
    func: (function() {
        ___cxx_global_var_init_83()
    }
    )
});
memoryInitializer = "cogni-native-bindings.js.mem";
var tempDoublePtr = STATICTOP;
STATICTOP += 16;
Module["_i64Subtract"] = _i64Subtract;
Module["_i64Add"] = _i64Add;
function __ZSt18uncaught_exceptionv() {
    return !!__ZSt18uncaught_exceptionv.uncaught_exception
}
var EXCEPTIONS = {
    last: 0,
    caught: [],
    infos: {},
    deAdjust: (function(adjusted) {
        if (!adjusted || EXCEPTIONS.infos[adjusted])
            return adjusted;
        for (var ptr in EXCEPTIONS.infos) {
            var info = EXCEPTIONS.infos[ptr];
            if (info.adjusted === adjusted) {
                return ptr
            }
        }
        return adjusted
    }
    ),
    addRef: (function(ptr) {
        if (!ptr)
            return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount++
    }
    ),
    decRef: (function(ptr) {
        if (!ptr)
            return;
        var info = EXCEPTIONS.infos[ptr];
        assert(info.refcount > 0);
        info.refcount--;
        if (info.refcount === 0) {
            if (info.destructor) {
                Runtime.dynCall("vi", info.destructor, [ptr])
            }
            delete EXCEPTIONS.infos[ptr];
            ___cxa_free_exception(ptr)
        }
    }
    ),
    clearRef: (function(ptr) {
        if (!ptr)
            return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount = 0
    }
    )
};
function ___resumeException(ptr) {
    if (!EXCEPTIONS.last) {
        EXCEPTIONS.last = ptr
    }
    EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr));
    throw ptr
}
function ___cxa_find_matching_catch() {
    var thrown = EXCEPTIONS.last;
    if (!thrown) {
        return (asm["setTempRet0"](0),
        0) | 0
    }
    var info = EXCEPTIONS.infos[thrown];
    var throwntype = info.type;
    if (!throwntype) {
        return (asm["setTempRet0"](0),
        thrown) | 0
    }
    var typeArray = Array.prototype.slice.call(arguments);
    var pointer = Module["___cxa_is_pointer_type"](throwntype);
    if (!___cxa_find_matching_catch.buffer)
        ___cxa_find_matching_catch.buffer = _malloc(4);
    HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
    thrown = ___cxa_find_matching_catch.buffer;
    for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && Module["___cxa_can_catch"](typeArray[i], throwntype, thrown)) {
            thrown = HEAP32[thrown >> 2];
            info.adjusted = thrown;
            return (asm["setTempRet0"](typeArray[i]),
            thrown) | 0
        }
    }
    thrown = HEAP32[thrown >> 2];
    return (asm["setTempRet0"](throwntype),
    thrown) | 0
}
function ___cxa_throw(ptr, type, destructor) {
    EXCEPTIONS.infos[ptr] = {
        ptr: ptr,
        adjusted: ptr,
        type: type,
        destructor: destructor,
        refcount: 0
    };
    EXCEPTIONS.last = ptr;
    if (!("uncaught_exception"in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1
    } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++
    }
    throw ptr
}
function getShiftFromSize(size) {
    switch (size) {
    case 1:
        return 0;
    case 2:
        return 1;
    case 4:
        return 2;
    case 8:
        return 3;
    default:
        throw new TypeError("Unknown type size: " + size)
    }
}
function embind_init_charCodes() {
    var codes = new Array(256);
    for (var i = 0; i < 256; ++i) {
        codes[i] = String.fromCharCode(i)
    }
    embind_charCodes = codes
}
var embind_charCodes = undefined;
function readLatin1String(ptr) {
    var ret = "";
    var c = ptr;
    while (HEAPU8[c]) {
        ret += embind_charCodes[HEAPU8[c++]]
    }
    return ret
}
var awaitingDependencies = {};
var registeredTypes = {};
var typeDependencies = {};
var char_0 = 48;
var char_9 = 57;
function makeLegalFunctionName(name) {
    if (undefined === name) {
        return "_unknown"
    }
    name = name.replace(/[^a-zA-Z0-9_]/g, "$");
    var f = name.charCodeAt(0);
    if (f >= char_0 && f <= char_9) {
        return "_" + name
    } else {
        return name
    }
}
function createNamedFunction(name, body) {
    name = makeLegalFunctionName(name);
    return (new Function("body","return function " + name + "() {\n" + '    "use strict";' + "    return body.apply(this, arguments);\n" + "};\n"))(body)
}
function extendError(baseErrorType, errorName) {
    var errorClass = createNamedFunction(errorName, (function(message) {
        this.name = errorName;
        this.message = message;
        var stack = (new Error(message)).stack;
        if (stack !== undefined) {
            this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "")
        }
    }
    ));
    errorClass.prototype = Object.create(baseErrorType.prototype);
    errorClass.prototype.constructor = errorClass;
    errorClass.prototype.toString = (function() {
        if (this.message === undefined) {
            return this.name
        } else {
            return this.name + ": " + this.message
        }
    }
    );
    return errorClass
}
var BindingError = undefined;
function throwBindingError(message) {
    throw new BindingError(message)
}
var InternalError = undefined;
function throwInternalError(message) {
    throw new InternalError(message)
}
function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
    myTypes.forEach((function(type) {
        typeDependencies[type] = dependentTypes
    }
    ));
    function onComplete(typeConverters) {
        var myTypeConverters = getTypeConverters(typeConverters);
        if (myTypeConverters.length !== myTypes.length) {
            throwInternalError("Mismatched type converter count")
        }
        for (var i = 0; i < myTypes.length; ++i) {
            registerType(myTypes[i], myTypeConverters[i])
        }
    }
    var typeConverters = new Array(dependentTypes.length);
    var unregisteredTypes = [];
    var registered = 0;
    dependentTypes.forEach((function(dt, i) {
        if (registeredTypes.hasOwnProperty(dt)) {
            typeConverters[i] = registeredTypes[dt]
        } else {
            unregisteredTypes.push(dt);
            if (!awaitingDependencies.hasOwnProperty(dt)) {
                awaitingDependencies[dt] = []
            }
            awaitingDependencies[dt].push((function() {
                typeConverters[i] = registeredTypes[dt];
                ++registered;
                if (registered === unregisteredTypes.length) {
                    onComplete(typeConverters)
                }
            }
            ))
        }
    }
    ));
    if (0 === unregisteredTypes.length) {
        onComplete(typeConverters)
    }
}
function registerType(rawType, registeredInstance, options) {
    options = options || {};
    if (!("argPackAdvance"in registeredInstance)) {
        throw new TypeError("registerType registeredInstance requires argPackAdvance")
    }
    var name = registeredInstance.name;
    if (!rawType) {
        throwBindingError('type "' + name + '" must have a positive integer typeid pointer')
    }
    if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
            return
        } else {
            throwBindingError("Cannot register type '" + name + "' twice")
        }
    }
    registeredTypes[rawType] = registeredInstance;
    delete typeDependencies[rawType];
    if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach((function(cb) {
            cb()
        }
        ))
    }
}
function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": (function(wt) {
            return !!wt
        }
        ),
        "toWireType": (function(destructors, o) {
            return o ? trueValue : falseValue
        }
        ),
        "argPackAdvance": 8,
        "readValueFromPointer": (function(pointer) {
            var heap;
            if (size === 1) {
                heap = HEAP8
            } else if (size === 2) {
                heap = HEAP16
            } else if (size === 4) {
                heap = HEAP32
            } else {
                throw new TypeError("Unknown boolean type size: " + name)
            }
            return this["fromWireType"](heap[pointer >> shift])
        }
        ),
        destructorFunction: null
    })
}
function _pthread_mutex_lock() {}
var ERRNO_CODES = {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
    EAGAIN: 11,
    EWOULDBLOCK: 11,
    ENOMEM: 12,
    EACCES: 13,
    EFAULT: 14,
    ENOTBLK: 15,
    EBUSY: 16,
    EEXIST: 17,
    EXDEV: 18,
    ENODEV: 19,
    ENOTDIR: 20,
    EISDIR: 21,
    EINVAL: 22,
    ENFILE: 23,
    EMFILE: 24,
    ENOTTY: 25,
    ETXTBSY: 26,
    EFBIG: 27,
    ENOSPC: 28,
    ESPIPE: 29,
    EROFS: 30,
    EMLINK: 31,
    EPIPE: 32,
    EDOM: 33,
    ERANGE: 34,
    ENOMSG: 42,
    EIDRM: 43,
    ECHRNG: 44,
    EL2NSYNC: 45,
    EL3HLT: 46,
    EL3RST: 47,
    ELNRNG: 48,
    EUNATCH: 49,
    ENOCSI: 50,
    EL2HLT: 51,
    EDEADLK: 35,
    ENOLCK: 37,
    EBADE: 52,
    EBADR: 53,
    EXFULL: 54,
    ENOANO: 55,
    EBADRQC: 56,
    EBADSLT: 57,
    EDEADLOCK: 35,
    EBFONT: 59,
    ENOSTR: 60,
    ENODATA: 61,
    ETIME: 62,
    ENOSR: 63,
    ENONET: 64,
    ENOPKG: 65,
    EREMOTE: 66,
    ENOLINK: 67,
    EADV: 68,
    ESRMNT: 69,
    ECOMM: 70,
    EPROTO: 71,
    EMULTIHOP: 72,
    EDOTDOT: 73,
    EBADMSG: 74,
    ENOTUNIQ: 76,
    EBADFD: 77,
    EREMCHG: 78,
    ELIBACC: 79,
    ELIBBAD: 80,
    ELIBSCN: 81,
    ELIBMAX: 82,
    ELIBEXEC: 83,
    ENOSYS: 38,
    ENOTEMPTY: 39,
    ENAMETOOLONG: 36,
    ELOOP: 40,
    EOPNOTSUPP: 95,
    EPFNOSUPPORT: 96,
    ECONNRESET: 104,
    ENOBUFS: 105,
    EAFNOSUPPORT: 97,
    EPROTOTYPE: 91,
    ENOTSOCK: 88,
    ENOPROTOOPT: 92,
    ESHUTDOWN: 108,
    ECONNREFUSED: 111,
    EADDRINUSE: 98,
    ECONNABORTED: 103,
    ENETUNREACH: 101,
    ENETDOWN: 100,
    ETIMEDOUT: 110,
    EHOSTDOWN: 112,
    EHOSTUNREACH: 113,
    EINPROGRESS: 115,
    EALREADY: 114,
    EDESTADDRREQ: 89,
    EMSGSIZE: 90,
    EPROTONOSUPPORT: 93,
    ESOCKTNOSUPPORT: 94,
    EADDRNOTAVAIL: 99,
    ENETRESET: 102,
    EISCONN: 106,
    ENOTCONN: 107,
    ETOOMANYREFS: 109,
    EUSERS: 87,
    EDQUOT: 122,
    ESTALE: 116,
    ENOTSUP: 95,
    ENOMEDIUM: 123,
    EILSEQ: 84,
    EOVERFLOW: 75,
    ECANCELED: 125,
    ENOTRECOVERABLE: 131,
    EOWNERDEAD: 130,
    ESTRPIPE: 86
};
var ERRNO_MESSAGES = {
    0: "Success",
    1: "Not super-user",
    2: "No such file or directory",
    3: "No such process",
    4: "Interrupted system call",
    5: "I/O error",
    6: "No such device or address",
    7: "Arg list too long",
    8: "Exec format error",
    9: "Bad file number",
    10: "No children",
    11: "No more processes",
    12: "Not enough core",
    13: "Permission denied",
    14: "Bad address",
    15: "Block device required",
    16: "Mount device busy",
    17: "File exists",
    18: "Cross-device link",
    19: "No such device",
    20: "Not a directory",
    21: "Is a directory",
    22: "Invalid argument",
    23: "Too many open files in system",
    24: "Too many open files",
    25: "Not a typewriter",
    26: "Text file busy",
    27: "File too large",
    28: "No space left on device",
    29: "Illegal seek",
    30: "Read only file system",
    31: "Too many links",
    32: "Broken pipe",
    33: "Math arg out of domain of func",
    34: "Math result not representable",
    35: "File locking deadlock error",
    36: "File or path name too long",
    37: "No record locks available",
    38: "Function not implemented",
    39: "Directory not empty",
    40: "Too many symbolic links",
    42: "No message of desired type",
    43: "Identifier removed",
    44: "Channel number out of range",
    45: "Level 2 not synchronized",
    46: "Level 3 halted",
    47: "Level 3 reset",
    48: "Link number out of range",
    49: "Protocol driver not attached",
    50: "No CSI structure available",
    51: "Level 2 halted",
    52: "Invalid exchange",
    53: "Invalid request descriptor",
    54: "Exchange full",
    55: "No anode",
    56: "Invalid request code",
    57: "Invalid slot",
    59: "Bad font file fmt",
    60: "Device not a stream",
    61: "No data (for no delay io)",
    62: "Timer expired",
    63: "Out of streams resources",
    64: "Machine is not on the network",
    65: "Package not installed",
    66: "The object is remote",
    67: "The link has been severed",
    68: "Advertise error",
    69: "Srmount error",
    70: "Communication error on send",
    71: "Protocol error",
    72: "Multihop attempted",
    73: "Cross mount point (not really error)",
    74: "Trying to read unreadable message",
    75: "Value too large for defined data type",
    76: "Given log. name not unique",
    77: "f.d. invalid for this operation",
    78: "Remote address changed",
    79: "Can   access a needed shared lib",
    80: "Accessing a corrupted shared lib",
    81: ".lib section in a.out corrupted",
    82: "Attempting to link in too many libs",
    83: "Attempting to exec a shared library",
    84: "Illegal byte sequence",
    86: "Streams pipe error",
    87: "Too many users",
    88: "Socket operation on non-socket",
    89: "Destination address required",
    90: "Message too long",
    91: "Protocol wrong type for socket",
    92: "Protocol not available",
    93: "Unknown protocol",
    94: "Socket type not supported",
    95: "Not supported",
    96: "Protocol family not supported",
    97: "Address family not supported by protocol family",
    98: "Address already in use",
    99: "Address not available",
    100: "Network interface is not configured",
    101: "Network is unreachable",
    102: "Connection reset by network",
    103: "Connection aborted",
    104: "Connection reset by peer",
    105: "No buffer space available",
    106: "Socket is already connected",
    107: "Socket is not connected",
    108: "Can't send after socket shutdown",
    109: "Too many references",
    110: "Connection timed out",
    111: "Connection refused",
    112: "Host is down",
    113: "Host is unreachable",
    114: "Socket already connected",
    115: "Connection already in progress",
    116: "Stale file handle",
    122: "Quota exceeded",
    123: "No medium (in tape drive)",
    125: "Operation canceled",
    130: "Previous owner died",
    131: "State not recoverable"
};
function ___setErrNo(value) {
    if (Module["___errno_location"])
        HEAP32[Module["___errno_location"]() >> 2] = value;
    return value
}
var PATH = {
    splitPath: (function(filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1)
    }
    ),
    normalizeArray: (function(parts, allowAboveRoot) {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
                parts.splice(i, 1)
            } else if (last === "..") {
                parts.splice(i, 1);
                up++
            } else if (up) {
                parts.splice(i, 1);
                up--
            }
        }
        if (allowAboveRoot) {
            for (; up--; up) {
                parts.unshift("..")
            }
        }
        return parts
    }
    ),
    normalize: (function(path) {
        var isAbsolute = path.charAt(0) === "/"
          , trailingSlash = path.substr(-1) === "/";
        path = PATH.normalizeArray(path.split("/").filter((function(p) {
            return !!p
        }
        )), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    }
    ),
    dirname: (function(path) {
        var result = PATH.splitPath(path)
          , root = result[0]
          , dir = result[1];
        if (!root && !dir) {
            return "."
        }
        if (dir) {
            dir = dir.substr(0, dir.length - 1)
        }
        return root + dir
    }
    ),
    basename: (function(path) {
        if (path === "/")
            return "/";
        var lastSlash = path.lastIndexOf("/");
        if (lastSlash === -1)
            return path;
        return path.substr(lastSlash + 1)
    }
    ),
    extname: (function(path) {
        return PATH.splitPath(path)[3]
    }
    ),
    join: (function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join("/"))
    }
    ),
    join2: (function(l, r) {
        return PATH.normalize(l + "/" + r)
    }
    ),
    resolve: (function() {
        var resolvedPath = ""
          , resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = i >= 0 ? arguments[i] : FS.cwd();
            if (typeof path !== "string") {
                throw new TypeError("Arguments to path.resolve must be strings")
            } else if (!path) {
                return ""
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = path.charAt(0) === "/"
        }
        resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function(p) {
            return !!p
        }
        )), !resolvedAbsolute).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    }
    ),
    relative: (function(from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
                if (arr[start] !== "")
                    break
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
                if (arr[end] !== "")
                    break
            }
            if (start > end)
                return [];
            return arr.slice(start, end - start + 1)
        }
        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
                samePartsLength = i;
                break
            }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push("..")
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/")
    }
    )
};
var TTY = {
    ttys: [],
    init: (function() {}
    ),
    shutdown: (function() {}
    ),
    register: (function(dev, ops) {
        TTY.ttys[dev] = {
            input: [],
            output: [],
            ops: ops
        };
        FS.registerDevice(dev, TTY.stream_ops)
    }
    ),
    stream_ops: {
        open: (function(stream) {
            var tty = TTY.ttys[stream.node.rdev];
            if (!tty) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            stream.tty = tty;
            stream.seekable = false
        }
        ),
        close: (function(stream) {
            stream.tty.ops.flush(stream.tty)
        }
        ),
        flush: (function(stream) {
            stream.tty.ops.flush(stream.tty)
        }
        ),
        read: (function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.get_char) {
                throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
            }
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
                var result;
                try {
                    result = stream.tty.ops.get_char(stream.tty)
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
                if (result === undefined && bytesRead === 0) {
                    throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
                }
                if (result === null || result === undefined)
                    break;
                bytesRead++;
                buffer[offset + i] = result
            }
            if (bytesRead) {
                stream.node.timestamp = Date.now()
            }
            return bytesRead
        }
        ),
        write: (function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.put_char) {
                throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
            }
            for (var i = 0; i < length; i++) {
                try {
                    stream.tty.ops.put_char(stream.tty, buffer[offset + i])
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
            }
            if (length) {
                stream.node.timestamp = Date.now()
            }
            return i
        }
        )
    },
    default_tty_ops: {
        get_char: (function(tty) {
            if (!tty.input.length) {
                var result = null;
                if (ENVIRONMENT_IS_NODE) {
                    var BUFSIZE = 256;
                    var buf = new Buffer(BUFSIZE);
                    var bytesRead = 0;
                    var fd = process.stdin.fd;
                    var usingDevice = false;
                    try {
                        fd = fs.openSync("/dev/stdin", "r");
                        usingDevice = true
                    } catch (e) {}
                    bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
                    if (usingDevice) {
                        fs.closeSync(fd)
                    }
                    if (bytesRead > 0) {
                        result = buf.slice(0, bytesRead).toString("utf-8")
                    } else {
                        result = null
                    }
                } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                    result = window.prompt("Input: ");
                    if (result !== null) {
                        result += "\n"
                    }
                } else if (typeof readline == "function") {
                    result = readline();
                    if (result !== null) {
                        result += "\n"
                    }
                }
                if (!result) {
                    return null
                }
                tty.input = intArrayFromString(result, true)
            }
            return tty.input.shift()
        }
        ),
        put_char: (function(tty, val) {
            if (val === null || val === 10) {
                Module["print"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0)
                    tty.output.push(val)
            }
        }
        ),
        flush: (function(tty) {
            if (tty.output && tty.output.length > 0) {
                Module["print"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
        )
    },
    default_tty1_ops: {
        put_char: (function(tty, val) {
            if (val === null || val === 10) {
                Module["printErr"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0)
                    tty.output.push(val)
            }
        }
        ),
        flush: (function(tty) {
            if (tty.output && tty.output.length > 0) {
                Module["printErr"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
        )
    }
};
var MEMFS = {
    ops_table: null,
    mount: (function(mount) {
        return MEMFS.createNode(null, "/", 16384 | 511, 0)
    }
    ),
    createNode: (function(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (!MEMFS.ops_table) {
            MEMFS.ops_table = {
                dir: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        lookup: MEMFS.node_ops.lookup,
                        mknod: MEMFS.node_ops.mknod,
                        rename: MEMFS.node_ops.rename,
                        unlink: MEMFS.node_ops.unlink,
                        rmdir: MEMFS.node_ops.rmdir,
                        readdir: MEMFS.node_ops.readdir,
                        symlink: MEMFS.node_ops.symlink
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek
                    }
                },
                file: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek,
                        read: MEMFS.stream_ops.read,
                        write: MEMFS.stream_ops.write,
                        allocate: MEMFS.stream_ops.allocate,
                        mmap: MEMFS.stream_ops.mmap,
                        msync: MEMFS.stream_ops.msync
                    }
                },
                link: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        readlink: MEMFS.node_ops.readlink
                    },
                    stream: {}
                },
                chrdev: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: FS.chrdev_stream_ops
                }
            }
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
            node.node_ops = MEMFS.ops_table.dir.node;
            node.stream_ops = MEMFS.ops_table.dir.stream;
            node.contents = {}
        } else if (FS.isFile(node.mode)) {
            node.node_ops = MEMFS.ops_table.file.node;
            node.stream_ops = MEMFS.ops_table.file.stream;
            node.usedBytes = 0;
            node.contents = null
        } else if (FS.isLink(node.mode)) {
            node.node_ops = MEMFS.ops_table.link.node;
            node.stream_ops = MEMFS.ops_table.link.stream
        } else if (FS.isChrdev(node.mode)) {
            node.node_ops = MEMFS.ops_table.chrdev.node;
            node.stream_ops = MEMFS.ops_table.chrdev.stream
        }
        node.timestamp = Date.now();
        if (parent) {
            parent.contents[name] = node
        }
        return node
    }
    ),
    getFileDataAsRegularArray: (function(node) {
        if (node.contents && node.contents.subarray) {
            var arr = [];
            for (var i = 0; i < node.usedBytes; ++i)
                arr.push(node.contents[i]);
            return arr
        }
        return node.contents
    }
    ),
    getFileDataAsTypedArray: (function(node) {
        if (!node.contents)
            return new Uint8Array;
        if (node.contents.subarray)
            return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    }
    ),
    expandFileStorage: (function(node, newCapacity) {
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
            node.contents = MEMFS.getFileDataAsRegularArray(node);
            node.usedBytes = node.contents.length
        }
        if (!node.contents || node.contents.subarray) {
            var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
            if (prevCapacity >= newCapacity)
                return;
            var CAPACITY_DOUBLING_MAX = 1024 * 1024;
            newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
            if (prevCapacity != 0)
                newCapacity = Math.max(newCapacity, 256);
            var oldContents = node.contents;
            node.contents = new Uint8Array(newCapacity);
            if (node.usedBytes > 0)
                node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
            return
        }
        if (!node.contents && newCapacity > 0)
            node.contents = [];
        while (node.contents.length < newCapacity)
            node.contents.push(0)
    }
    ),
    resizeFileStorage: (function(node, newSize) {
        if (node.usedBytes == newSize)
            return;
        if (newSize == 0) {
            node.contents = null;
            node.usedBytes = 0;
            return
        }
        if (!node.contents || node.contents.subarray) {
            var oldContents = node.contents;
            node.contents = new Uint8Array(new ArrayBuffer(newSize));
            if (oldContents) {
                node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
            }
            node.usedBytes = newSize;
            return
        }
        if (!node.contents)
            node.contents = [];
        if (node.contents.length > newSize)
            node.contents.length = newSize;
        else
            while (node.contents.length < newSize)
                node.contents.push(0);
        node.usedBytes = newSize
    }
    ),
    node_ops: {
        getattr: (function(node) {
            var attr = {};
            attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
            attr.ino = node.id;
            attr.mode = node.mode;
            attr.nlink = 1;
            attr.uid = 0;
            attr.gid = 0;
            attr.rdev = node.rdev;
            if (FS.isDir(node.mode)) {
                attr.size = 4096
            } else if (FS.isFile(node.mode)) {
                attr.size = node.usedBytes
            } else if (FS.isLink(node.mode)) {
                attr.size = node.link.length
            } else {
                attr.size = 0
            }
            attr.atime = new Date(node.timestamp);
            attr.mtime = new Date(node.timestamp);
            attr.ctime = new Date(node.timestamp);
            attr.blksize = 4096;
            attr.blocks = Math.ceil(attr.size / attr.blksize);
            return attr
        }
        ),
        setattr: (function(node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
            if (attr.size !== undefined) {
                MEMFS.resizeFileStorage(node, attr.size)
            }
        }
        ),
        lookup: (function(parent, name) {
            throw FS.genericErrors[ERRNO_CODES.ENOENT]
        }
        ),
        mknod: (function(parent, name, mode, dev) {
            return MEMFS.createNode(parent, name, mode, dev)
        }
        ),
        rename: (function(old_node, new_dir, new_name) {
            if (FS.isDir(old_node.mode)) {
                var new_node;
                try {
                    new_node = FS.lookupNode(new_dir, new_name)
                } catch (e) {}
                if (new_node) {
                    for (var i in new_node.contents) {
                        throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
                    }
                }
            }
            delete old_node.parent.contents[old_node.name];
            old_node.name = new_name;
            new_dir.contents[new_name] = old_node;
            old_node.parent = new_dir
        }
        ),
        unlink: (function(parent, name) {
            delete parent.contents[name]
        }
        ),
        rmdir: (function(parent, name) {
            var node = FS.lookupNode(parent, name);
            for (var i in node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
            }
            delete parent.contents[name]
        }
        ),
        readdir: (function(node) {
            var entries = [".", ".."];
            for (var key in node.contents) {
                if (!node.contents.hasOwnProperty(key)) {
                    continue
                }
                entries.push(key)
            }
            return entries
        }
        ),
        symlink: (function(parent, newname, oldpath) {
            var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
            node.link = oldpath;
            return node
        }
        ),
        readlink: (function(node) {
            if (!FS.isLink(node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return node.link
        }
        )
    },
    stream_ops: {
        read: (function(stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= stream.node.usedBytes)
                return 0;
            var size = Math.min(stream.node.usedBytes - position, length);
            assert(size >= 0);
            if (size > 8 && contents.subarray) {
                buffer.set(contents.subarray(position, position + size), offset)
            } else {
                for (var i = 0; i < size; i++)
                    buffer[offset + i] = contents[position + i]
            }
            return size
        }
        ),
        write: (function(stream, buffer, offset, length, position, canOwn) {
            if (!length)
                return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray)
                node.contents.set(buffer.subarray(offset, offset + length), position);
            else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        }
        ),
        llseek: (function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.usedBytes
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        }
        ),
        allocate: (function(stream, offset, length) {
            MEMFS.expandFileStorage(stream.node, offset + length);
            stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
        }
        ),
        mmap: (function(stream, buffer, offset, length, position, prot, flags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            var ptr;
            var allocated;
            var contents = stream.node.contents;
            if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
                allocated = false;
                ptr = contents.byteOffset
            } else {
                if (position > 0 || position + length < stream.node.usedBytes) {
                    if (contents.subarray) {
                        contents = contents.subarray(position, position + length)
                    } else {
                        contents = Array.prototype.slice.call(contents, position, position + length)
                    }
                }
                allocated = true;
                ptr = _malloc(length);
                if (!ptr) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENOMEM)
                }
                buffer.set(contents, ptr)
            }
            return {
                ptr: ptr,
                allocated: allocated
            }
        }
        ),
        msync: (function(stream, buffer, offset, length, mmapFlags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            if (mmapFlags & 2) {
                return 0
            }
            var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
            return 0
        }
        )
    }
};
var IDBFS = {
    dbs: {},
    indexedDB: (function() {
        if (typeof indexedDB !== "undefined")
            return indexedDB;
        var ret = null;
        if (typeof window === "object")
            ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, "IDBFS used, but indexedDB not supported");
        return ret
    }
    ),
    DB_VERSION: 21,
    DB_STORE_NAME: "FILE_DATA",
    mount: (function(mount) {
        return MEMFS.mount.apply(null, arguments)
    }
    ),
    syncfs: (function(mount, populate, callback) {
        IDBFS.getLocalSet(mount, (function(err, local) {
            if (err)
                return callback(err);
            IDBFS.getRemoteSet(mount, (function(err, remote) {
                if (err)
                    return callback(err);
                var src = populate ? remote : local;
                var dst = populate ? local : remote;
                IDBFS.reconcile(src, dst, callback)
            }
            ))
        }
        ))
    }
    ),
    getDB: (function(name, callback) {
        var db = IDBFS.dbs[name];
        if (db) {
            return callback(null, db)
        }
        var req;
        try {
            req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)
        } catch (e) {
            return callback(e)
        }
        req.onupgradeneeded = (function(e) {
            var db = e.target.result;
            var transaction = e.target.transaction;
            var fileStore;
            if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
                fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)
            } else {
                fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)
            }
            if (!fileStore.indexNames.contains("timestamp")) {
                fileStore.createIndex("timestamp", "timestamp", {
                    unique: false
                })
            }
        }
        );
        req.onsuccess = (function() {
            db = req.result;
            IDBFS.dbs[name] = db;
            callback(null, db)
        }
        );
        req.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
        }
        )
    }
    ),
    getLocalSet: (function(mount, callback) {
        var entries = {};
        function isRealDir(p) {
            return p !== "." && p !== ".."
        }
        function toAbsolute(root) {
            return (function(p) {
                return PATH.join2(root, p)
            }
            )
        }
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
        while (check.length) {
            var path = check.pop();
            var stat;
            try {
                stat = FS.stat(path)
            } catch (e) {
                return callback(e)
            }
            if (FS.isDir(stat.mode)) {
                check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
            }
            entries[path] = {
                timestamp: stat.mtime
            }
        }
        return callback(null, {
            type: "local",
            entries: entries
        })
    }
    ),
    getRemoteSet: (function(mount, callback) {
        var entries = {};
        IDBFS.getDB(mount.mountpoint, (function(err, db) {
            if (err)
                return callback(err);
            var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
            transaction.onerror = (function(e) {
                callback(this.error);
                e.preventDefault()
            }
            );
            var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
            var index = store.index("timestamp");
            index.openKeyCursor().onsuccess = (function(event) {
                var cursor = event.target.result;
                if (!cursor) {
                    return callback(null, {
                        type: "remote",
                        db: db,
                        entries: entries
                    })
                }
                entries[cursor.primaryKey] = {
                    timestamp: cursor.key
                };
                cursor.continue()
            }
            )
        }
        ))
    }
    ),
    loadLocalEntry: (function(path, callback) {
        var stat, node;
        try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path)
        } catch (e) {
            return callback(e)
        }
        if (FS.isDir(stat.mode)) {
            return callback(null, {
                timestamp: stat.mtime,
                mode: stat.mode
            })
        } else if (FS.isFile(stat.mode)) {
            node.contents = MEMFS.getFileDataAsTypedArray(node);
            return callback(null, {
                timestamp: stat.mtime,
                mode: stat.mode,
                contents: node.contents
            })
        } else {
            return callback(new Error("node type not supported"))
        }
    }
    ),
    storeLocalEntry: (function(path, entry, callback) {
        try {
            if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode)
            } else if (FS.isFile(entry.mode)) {
                FS.writeFile(path, entry.contents, {
                    encoding: "binary",
                    canOwn: true
                })
            } else {
                return callback(new Error("node type not supported"))
            }
            FS.chmod(path, entry.mode);
            FS.utime(path, entry.timestamp, entry.timestamp)
        } catch (e) {
            return callback(e)
        }
        callback(null)
    }
    ),
    removeLocalEntry: (function(path, callback) {
        try {
            var lookup = FS.lookupPath(path);
            var stat = FS.stat(path);
            if (FS.isDir(stat.mode)) {
                FS.rmdir(path)
            } else if (FS.isFile(stat.mode)) {
                FS.unlink(path)
            }
        } catch (e) {
            return callback(e)
        }
        callback(null)
    }
    ),
    loadRemoteEntry: (function(store, path, callback) {
        var req = store.get(path);
        req.onsuccess = (function(event) {
            callback(null, event.target.result)
        }
        );
        req.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
        }
        )
    }
    ),
    storeRemoteEntry: (function(store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = (function() {
            callback(null)
        }
        );
        req.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
        }
        )
    }
    ),
    removeRemoteEntry: (function(store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = (function() {
            callback(null)
        }
        );
        req.onerror = (function(e) {
            callback(this.error);
            e.preventDefault()
        }
        )
    }
    ),
    reconcile: (function(src, dst, callback) {
        var total = 0;
        var create = [];
        Object.keys(src.entries).forEach((function(key) {
            var e = src.entries[key];
            var e2 = dst.entries[key];
            if (!e2 || e.timestamp > e2.timestamp) {
                create.push(key);
                total++
            }
        }
        ));
        var remove = [];
        Object.keys(dst.entries).forEach((function(key) {
            var e = dst.entries[key];
            var e2 = src.entries[key];
            if (!e2) {
                remove.push(key);
                total++
            }
        }
        ));
        if (!total) {
            return callback(null)
        }
        var completed = 0;
        var db = src.type === "remote" ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        function done(err) {
            if (err) {
                if (!done.errored) {
                    done.errored = true;
                    return callback(err)
                }
                return
            }
            if (++completed >= total) {
                return callback(null)
            }
        }
        transaction.onerror = (function(e) {
            done(this.error);
            e.preventDefault()
        }
        );
        create.sort().forEach((function(path) {
            if (dst.type === "local") {
                IDBFS.loadRemoteEntry(store, path, (function(err, entry) {
                    if (err)
                        return done(err);
                    IDBFS.storeLocalEntry(path, entry, done)
                }
                ))
            } else {
                IDBFS.loadLocalEntry(path, (function(err, entry) {
                    if (err)
                        return done(err);
                    IDBFS.storeRemoteEntry(store, path, entry, done)
                }
                ))
            }
        }
        ));
        remove.sort().reverse().forEach((function(path) {
            if (dst.type === "local") {
                IDBFS.removeLocalEntry(path, done)
            } else {
                IDBFS.removeRemoteEntry(store, path, done)
            }
        }
        ))
    }
    )
};
var NODEFS = {
    isWindows: false,
    staticInit: (function() {
        NODEFS.isWindows = !!process.platform.match(/^win/)
    }
    ),
    mount: (function(mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0)
    }
    ),
    createNode: (function(parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node
    }
    ),
    getMode: (function(path) {
        var stat;
        try {
            stat = fs.lstatSync(path);
            if (NODEFS.isWindows) {
                stat.mode = stat.mode | (stat.mode & 146) >> 1
            }
        } catch (e) {
            if (!e.code)
                throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        return stat.mode
    }
    ),
    realPath: (function(node) {
        var parts = [];
        while (node.parent !== node) {
            parts.push(node.name);
            node = node.parent
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts)
    }
    ),
    flagsToPermissionStringMap: {
        0: "r",
        1: "r+",
        2: "r+",
        64: "r",
        65: "r+",
        66: "r+",
        129: "rx+",
        193: "rx+",
        514: "w+",
        577: "w",
        578: "w+",
        705: "wx",
        706: "wx+",
        1024: "a",
        1025: "a",
        1026: "a+",
        1089: "a",
        1090: "a+",
        1153: "ax",
        1154: "ax+",
        1217: "ax",
        1218: "ax+",
        4096: "rs",
        4098: "rs+"
    },
    flagsToPermissionString: (function(flags) {
        flags &= ~32768;
        flags &= ~524288;
        if (flags in NODEFS.flagsToPermissionStringMap) {
            return NODEFS.flagsToPermissionStringMap[flags]
        } else {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
    }
    ),
    node_ops: {
        getattr: (function(node) {
            var path = NODEFS.realPath(node);
            var stat;
            try {
                stat = fs.lstatSync(path)
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            if (NODEFS.isWindows && !stat.blksize) {
                stat.blksize = 4096
            }
            if (NODEFS.isWindows && !stat.blocks) {
                stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0
            }
            return {
                dev: stat.dev,
                ino: stat.ino,
                mode: stat.mode,
                nlink: stat.nlink,
                uid: stat.uid,
                gid: stat.gid,
                rdev: stat.rdev,
                size: stat.size,
                atime: stat.atime,
                mtime: stat.mtime,
                ctime: stat.ctime,
                blksize: stat.blksize,
                blocks: stat.blocks
            }
        }
        ),
        setattr: (function(node, attr) {
            var path = NODEFS.realPath(node);
            try {
                if (attr.mode !== undefined) {
                    fs.chmodSync(path, attr.mode);
                    node.mode = attr.mode
                }
                if (attr.timestamp !== undefined) {
                    var date = new Date(attr.timestamp);
                    fs.utimesSync(path, date, date)
                }
                if (attr.size !== undefined) {
                    fs.truncateSync(path, attr.size)
                }
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        ),
        lookup: (function(parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            var mode = NODEFS.getMode(path);
            return NODEFS.createNode(parent, name, mode)
        }
        ),
        mknod: (function(parent, name, mode, dev) {
            var node = NODEFS.createNode(parent, name, mode, dev);
            var path = NODEFS.realPath(node);
            try {
                if (FS.isDir(node.mode)) {
                    fs.mkdirSync(path, node.mode)
                } else {
                    fs.writeFileSync(path, "", {
                        mode: node.mode
                    })
                }
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            return node
        }
        ),
        rename: (function(oldNode, newDir, newName) {
            var oldPath = NODEFS.realPath(oldNode);
            var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
            try {
                fs.renameSync(oldPath, newPath)
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        ),
        unlink: (function(parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            try {
                fs.unlinkSync(path)
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        ),
        rmdir: (function(parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            try {
                fs.rmdirSync(path)
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        ),
        readdir: (function(node) {
            var path = NODEFS.realPath(node);
            try {
                return fs.readdirSync(path)
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        ),
        symlink: (function(parent, newName, oldPath) {
            var newPath = PATH.join2(NODEFS.realPath(parent), newName);
            try {
                fs.symlinkSync(oldPath, newPath)
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        ),
        readlink: (function(node) {
            var path = NODEFS.realPath(node);
            try {
                path = fs.readlinkSync(path);
                path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
                return path
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        )
    },
    stream_ops: {
        open: (function(stream) {
            var path = NODEFS.realPath(stream.node);
            try {
                if (FS.isFile(stream.node.mode)) {
                    stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags))
                }
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        ),
        close: (function(stream) {
            try {
                if (FS.isFile(stream.node.mode) && stream.nfd) {
                    fs.closeSync(stream.nfd)
                }
            } catch (e) {
                if (!e.code)
                    throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }
        ),
        read: (function(stream, buffer, offset, length, position) {
            if (length === 0)
                return 0;
            var nbuffer = new Buffer(length);
            var res;
            try {
                res = fs.readSync(stream.nfd, nbuffer, 0, length, position)
            } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            if (res > 0) {
                for (var i = 0; i < res; i++) {
                    buffer[offset + i] = nbuffer[i]
                }
            }
            return res
        }
        ),
        write: (function(stream, buffer, offset, length, position) {
            var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
            var res;
            try {
                res = fs.writeSync(stream.nfd, nbuffer, 0, length, position)
            } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            return res
        }
        ),
        llseek: (function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    try {
                        var stat = fs.fstatSync(stream.nfd);
                        position += stat.size
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES[e.code])
                    }
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        }
        )
    }
};
var WORKERFS = {
    DIR_MODE: 16895,
    FILE_MODE: 33279,
    reader: null,
    mount: (function(mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader)
            WORKERFS.reader = new FileReaderSync;
        var root = WORKERFS.createNode(null, "/", WORKERFS.DIR_MODE, 0);
        var createdParents = {};
        function ensureParent(path) {
            var parts = path.split("/");
            var parent = root;
            for (var i = 0; i < parts.length - 1; i++) {
                var curr = parts.slice(0, i + 1).join("/");
                if (!createdParents[curr]) {
                    createdParents[curr] = WORKERFS.createNode(parent, curr, WORKERFS.DIR_MODE, 0)
                }
                parent = createdParents[curr]
            }
            return parent
        }
        function base(path) {
            var parts = path.split("/");
            return parts[parts.length - 1]
        }
        Array.prototype.forEach.call(mount.opts["files"] || [], (function(file) {
            WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate)
        }
        ));
        (mount.opts["blobs"] || []).forEach((function(obj) {
            WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"])
        }
        ));
        (mount.opts["packages"] || []).forEach((function(pack) {
            pack["metadata"].files.forEach((function(file) {
                var name = file.filename.substr(1);
                WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack["blob"].slice(file.start, file.end))
            }
            ))
        }
        ));
        return root
    }
    ),
    createNode: (function(parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
            node.size = contents.size;
            node.contents = contents
        } else {
            node.size = 4096;
            node.contents = {}
        }
        if (parent) {
            parent.contents[name] = node
        }
        return node
    }
    ),
    node_ops: {
        getattr: (function(node) {
            return {
                dev: 1,
                ino: undefined,
                mode: node.mode,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: undefined,
                size: node.size,
                atime: new Date(node.timestamp),
                mtime: new Date(node.timestamp),
                ctime: new Date(node.timestamp),
                blksize: 4096,
                blocks: Math.ceil(node.size / 4096)
            }
        }
        ),
        setattr: (function(node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
        }
        ),
        lookup: (function(parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        ),
        mknod: (function(parent, name, mode, dev) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        ),
        rename: (function(oldNode, newDir, newName) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        ),
        unlink: (function(parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        ),
        rmdir: (function(parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        ),
        readdir: (function(node) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        ),
        symlink: (function(parent, newName, oldPath) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        ),
        readlink: (function(node) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        )
    },
    stream_ops: {
        read: (function(stream, buffer, offset, length, position) {
            if (position >= stream.node.size)
                return 0;
            var chunk = stream.node.contents.slice(position, position + length);
            var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
            buffer.set(new Uint8Array(ab), offset);
            return chunk.size
        }
        ),
        write: (function(stream, buffer, offset, length, position) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
        }
        ),
        llseek: (function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.size
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        }
        )
    }
};
STATICTOP += 16;
STATICTOP += 16;
STATICTOP += 16;
var FS = {
    root: null,
    mounts: [],
    devices: [null],
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    trackingDelegate: {},
    tracking: {
        openFlags: {
            READ: 1,
            WRITE: 2
        }
    },
    ErrnoError: null,
    genericErrors: {},
    filesystems: null,
    syncFSRequests: 0,
    handleFSError: (function(e) {
        if (!(e instanceof FS.ErrnoError))
            throw e + " : " + stackTrace();
        return ___setErrNo(e.errno)
    }
    ),
    lookupPath: (function(path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
        if (!path)
            return {
                path: "",
                node: null
            };
        var defaults = {
            follow_mount: true,
            recurse_count: 0
        };
        for (var key in defaults) {
            if (opts[key] === undefined) {
                opts[key] = defaults[key]
            }
        }
        if (opts.recurse_count > 8) {
            throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
        }
        var parts = PATH.normalizeArray(path.split("/").filter((function(p) {
            return !!p
        }
        )), false);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
                break
            }
            current = FS.lookupNode(current, parts[i]);
            current_path = PATH.join2(current_path, parts[i]);
            if (FS.isMountpoint(current)) {
                if (!islast || islast && opts.follow_mount) {
                    current = current.mounted.root
                }
            }
            if (!islast || opts.follow) {
                var count = 0;
                while (FS.isLink(current.mode)) {
                    var link = FS.readlink(current_path);
                    current_path = PATH.resolve(PATH.dirname(current_path), link);
                    var lookup = FS.lookupPath(current_path, {
                        recurse_count: opts.recurse_count
                    });
                    current = lookup.node;
                    if (count++ > 40) {
                        throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
                    }
                }
            }
        }
        return {
            path: current_path,
            node: current
        }
    }
    ),
    getPath: (function(node) {
        var path;
        while (true) {
            if (FS.isRoot(node)) {
                var mount = node.mount.mountpoint;
                if (!path)
                    return mount;
                return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
            }
            path = path ? node.name + "/" + path : node.name;
            node = node.parent
        }
    }
    ),
    hashName: (function(parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = (hash << 5) - hash + name.charCodeAt(i) | 0
        }
        return (parentid + hash >>> 0) % FS.nameTable.length
    }
    ),
    hashAddNode: (function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node
    }
    ),
    hashRemoveNode: (function(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
            FS.nameTable[hash] = node.name_next
        } else {
            var current = FS.nameTable[hash];
            while (current) {
                if (current.name_next === node) {
                    current.name_next = node.name_next;
                    break
                }
                current = current.name_next
            }
        }
    }
    ),
    lookupNode: (function(parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
            throw new FS.ErrnoError(err,parent)
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
            var nodeName = node.name;
            if (node.parent.id === parent.id && nodeName === name) {
                return node
            }
        }
        return FS.lookup(parent, name)
    }
    ),
    createNode: (function(parent, name, mode, rdev) {
        if (!FS.FSNode) {
            FS.FSNode = (function(parent, name, mode, rdev) {
                if (!parent) {
                    parent = this
                }
                this.parent = parent;
                this.mount = parent.mount;
                this.mounted = null;
                this.id = FS.nextInode++;
                this.name = name;
                this.mode = mode;
                this.node_ops = {};
                this.stream_ops = {};
                this.rdev = rdev
            }
            );
            FS.FSNode.prototype = {};
            var readMode = 292 | 73;
            var writeMode = 146;
            Object.defineProperties(FS.FSNode.prototype, {
                read: {
                    get: (function() {
                        return (this.mode & readMode) === readMode
                    }
                    ),
                    set: (function(val) {
                        val ? this.mode |= readMode : this.mode &= ~readMode
                    }
                    )
                },
                write: {
                    get: (function() {
                        return (this.mode & writeMode) === writeMode
                    }
                    ),
                    set: (function(val) {
                        val ? this.mode |= writeMode : this.mode &= ~writeMode
                    }
                    )
                },
                isFolder: {
                    get: (function() {
                        return FS.isDir(this.mode)
                    }
                    )
                },
                isDevice: {
                    get: (function() {
                        return FS.isChrdev(this.mode)
                    }
                    )
                }
            })
        }
        var node = new FS.FSNode(parent,name,mode,rdev);
        FS.hashAddNode(node);
        return node
    }
    ),
    destroyNode: (function(node) {
        FS.hashRemoveNode(node)
    }
    ),
    isRoot: (function(node) {
        return node === node.parent
    }
    ),
    isMountpoint: (function(node) {
        return !!node.mounted
    }
    ),
    isFile: (function(mode) {
        return (mode & 61440) === 32768
    }
    ),
    isDir: (function(mode) {
        return (mode & 61440) === 16384
    }
    ),
    isLink: (function(mode) {
        return (mode & 61440) === 40960
    }
    ),
    isChrdev: (function(mode) {
        return (mode & 61440) === 8192
    }
    ),
    isBlkdev: (function(mode) {
        return (mode & 61440) === 24576
    }
    ),
    isFIFO: (function(mode) {
        return (mode & 61440) === 4096
    }
    ),
    isSocket: (function(mode) {
        return (mode & 49152) === 49152
    }
    ),
    flagModes: {
        "r": 0,
        "rs": 1052672,
        "r+": 2,
        "w": 577,
        "wx": 705,
        "xw": 705,
        "w+": 578,
        "wx+": 706,
        "xw+": 706,
        "a": 1089,
        "ax": 1217,
        "xa": 1217,
        "a+": 1090,
        "ax+": 1218,
        "xa+": 1218
    },
    modeStringToFlags: (function(str) {
        var flags = FS.flagModes[str];
        if (typeof flags === "undefined") {
            throw new Error("Unknown file open mode: " + str)
        }
        return flags
    }
    ),
    flagsToPermissionString: (function(flag) {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
            perms += "w"
        }
        return perms
    }
    ),
    nodePermissions: (function(node, perms) {
        if (FS.ignorePermissions) {
            return 0
        }
        if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
            return ERRNO_CODES.EACCES
        } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
            return ERRNO_CODES.EACCES
        } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
            return ERRNO_CODES.EACCES
        }
        return 0
    }
    ),
    mayLookup: (function(dir) {
        var err = FS.nodePermissions(dir, "x");
        if (err)
            return err;
        if (!dir.node_ops.lookup)
            return ERRNO_CODES.EACCES;
        return 0
    }
    ),
    mayCreate: (function(dir, name) {
        try {
            var node = FS.lookupNode(dir, name);
            return ERRNO_CODES.EEXIST
        } catch (e) {}
        return FS.nodePermissions(dir, "wx")
    }
    ),
    mayDelete: (function(dir, name, isdir) {
        var node;
        try {
            node = FS.lookupNode(dir, name)
        } catch (e) {
            return e.errno
        }
        var err = FS.nodePermissions(dir, "wx");
        if (err) {
            return err
        }
        if (isdir) {
            if (!FS.isDir(node.mode)) {
                return ERRNO_CODES.ENOTDIR
            }
            if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                return ERRNO_CODES.EBUSY
            }
        } else {
            if (FS.isDir(node.mode)) {
                return ERRNO_CODES.EISDIR
            }
        }
        return 0
    }
    ),
    mayOpen: (function(node, flags) {
        if (!node) {
            return ERRNO_CODES.ENOENT
        }
        if (FS.isLink(node.mode)) {
            return ERRNO_CODES.ELOOP
        } else if (FS.isDir(node.mode)) {
            if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
                return ERRNO_CODES.EISDIR
            }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    }
    ),
    MAX_OPEN_FDS: 4096,
    nextfd: (function(fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
            if (!FS.streams[fd]) {
                return fd
            }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE)
    }
    ),
    getStream: (function(fd) {
        return FS.streams[fd]
    }
    ),
    createStream: (function(stream, fd_start, fd_end) {
        if (!FS.FSStream) {
            FS.FSStream = (function() {}
            );
            FS.FSStream.prototype = {};
            Object.defineProperties(FS.FSStream.prototype, {
                object: {
                    get: (function() {
                        return this.node
                    }
                    ),
                    set: (function(val) {
                        this.node = val
                    }
                    )
                },
                isRead: {
                    get: (function() {
                        return (this.flags & 2097155) !== 1
                    }
                    )
                },
                isWrite: {
                    get: (function() {
                        return (this.flags & 2097155) !== 0
                    }
                    )
                },
                isAppend: {
                    get: (function() {
                        return this.flags & 1024
                    }
                    )
                }
            })
        }
        var newStream = new FS.FSStream;
        for (var p in stream) {
            newStream[p] = stream[p]
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream
    }
    ),
    closeStream: (function(fd) {
        FS.streams[fd] = null
    }
    ),
    chrdev_stream_ops: {
        open: (function(stream) {
            var device = FS.getDevice(stream.node.rdev);
            stream.stream_ops = device.stream_ops;
            if (stream.stream_ops.open) {
                stream.stream_ops.open(stream)
            }
        }
        ),
        llseek: (function() {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        )
    },
    major: (function(dev) {
        return dev >> 8
    }
    ),
    minor: (function(dev) {
        return dev & 255
    }
    ),
    makedev: (function(ma, mi) {
        return ma << 8 | mi
    }
    ),
    registerDevice: (function(dev, ops) {
        FS.devices[dev] = {
            stream_ops: ops
        }
    }
    ),
    getDevice: (function(dev) {
        return FS.devices[dev]
    }
    ),
    getMounts: (function(mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
            var m = check.pop();
            mounts.push(m);
            check.push.apply(check, m.mounts)
        }
        return mounts
    }
    ),
    syncfs: (function(populate, callback) {
        if (typeof populate === "function") {
            callback = populate;
            populate = false
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
            console.log("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
        function doCallback(err) {
            assert(FS.syncFSRequests > 0);
            FS.syncFSRequests--;
            return callback(err)
        }
        function done(err) {
            if (err) {
                if (!done.errored) {
                    done.errored = true;
                    return doCallback(err)
                }
                return
            }
            if (++completed >= mounts.length) {
                doCallback(null)
            }
        }
        mounts.forEach((function(mount) {
            if (!mount.type.syncfs) {
                return done(null)
            }
            mount.type.syncfs(mount, populate, done)
        }
        ))
    }
    ),
    mount: (function(type, opts, mountpoint) {
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        } else if (!root && !pseudo) {
            var lookup = FS.lookupPath(mountpoint, {
                follow_mount: false
            });
            mountpoint = lookup.path;
            node = lookup.node;
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
            }
            if (!FS.isDir(node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
            }
        }
        var mount = {
            type: type,
            opts: opts,
            mountpoint: mountpoint,
            mounts: []
        };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
            FS.root = mountRoot
        } else if (node) {
            node.mounted = mount;
            if (node.mount) {
                node.mount.mounts.push(mount)
            }
        }
        return mountRoot
    }
    ),
    unmount: (function(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, {
            follow_mount: false
        });
        if (!FS.isMountpoint(lookup.node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach((function(hash) {
            var current = FS.nameTable[hash];
            while (current) {
                var next = current.name_next;
                if (mounts.indexOf(current.mount) !== -1) {
                    FS.destroyNode(current)
                }
                current = next
            }
        }
        ));
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1)
    }
    ),
    lookup: (function(parent, name) {
        return parent.node_ops.lookup(parent, name)
    }
    ),
    mknod: (function(path, mode, dev) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === "." || name === "..") {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.mknod) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return parent.node_ops.mknod(parent, name, mode, dev)
    }
    ),
    create: (function(path, mode) {
        mode = mode !== undefined ? mode : 438;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0)
    }
    ),
    mkdir: (function(path, mode) {
        mode = mode !== undefined ? mode : 511;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0)
    }
    ),
    mkdev: (function(path, mode, dev) {
        if (typeof dev === "undefined") {
            dev = mode;
            mode = 438
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev)
    }
    ),
    symlink: (function(oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        var lookup = FS.lookupPath(newpath, {
            parent: true
        });
        var parent = lookup.node;
        if (!parent) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.symlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return parent.node_ops.symlink(parent, newname, oldpath)
    }
    ),
    rename: (function(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        try {
            lookup = FS.lookupPath(old_path, {
                parent: true
            });
            old_dir = lookup.node;
            lookup = FS.lookupPath(new_path, {
                parent: true
            });
            new_dir = lookup.node
        } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        if (!old_dir || !new_dir)
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        if (old_dir.mount !== new_dir.mount) {
            throw new FS.ErrnoError(ERRNO_CODES.EXDEV)
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
        }
        var new_node;
        try {
            new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}
        if (old_node === new_node) {
            return
        }
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!old_dir.node_ops.rename) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        if (new_dir !== old_dir) {
            err = FS.nodePermissions(old_dir, "w");
            if (err) {
                throw new FS.ErrnoError(err)
            }
        }
        try {
            if (FS.trackingDelegate["willMovePath"]) {
                FS.trackingDelegate["willMovePath"](old_path, new_path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
        FS.hashRemoveNode(old_node);
        try {
            old_dir.node_ops.rename(old_node, new_dir, new_name)
        } catch (e) {
            throw e
        } finally {
            FS.hashAddNode(old_node)
        }
        try {
            if (FS.trackingDelegate["onMovePath"])
                FS.trackingDelegate["onMovePath"](old_path, new_path)
        } catch (e) {
            console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
    }
    ),
    rmdir: (function(path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.rmdir) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"])
                FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    }
    ),
    readdir: (function(path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        return node.node_ops.readdir(node)
    }
    ),
    unlink: (function(path) {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
            if (err === ERRNO_CODES.EISDIR)
                err = ERRNO_CODES.EPERM;
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.unlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"])
                FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    }
    ),
    readlink: (function(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (!link.node_ops.readlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
    }
    ),
    stat: (function(path, dontFollow) {
        var lookup = FS.lookupPath(path, {
            follow: !dontFollow
        });
        var node = lookup.node;
        if (!node) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (!node.node_ops.getattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return node.node_ops.getattr(node)
    }
    ),
    lstat: (function(path) {
        return FS.stat(path, true)
    }
    ),
    chmod: (function(path, mode, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        node.node_ops.setattr(node, {
            mode: mode & 4095 | node.mode & ~4095,
            timestamp: Date.now()
        })
    }
    ),
    lchmod: (function(path, mode) {
        FS.chmod(path, mode, true)
    }
    ),
    fchmod: (function(fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        FS.chmod(stream.node, mode)
    }
    ),
    chown: (function(path, uid, gid, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        node.node_ops.setattr(node, {
            timestamp: Date.now()
        })
    }
    ),
    lchown: (function(path, uid, gid) {
        FS.chown(path, uid, gid, true)
    }
    ),
    fchown: (function(fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        FS.chown(stream.node, uid, gid)
    }
    ),
    truncate: (function(path, len) {
        if (len < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {
                follow: true
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!FS.isFile(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var err = FS.nodePermissions(node, "w");
        if (err) {
            throw new FS.ErrnoError(err)
        }
        node.node_ops.setattr(node, {
            size: len,
            timestamp: Date.now()
        })
    }
    ),
    ftruncate: (function(fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        FS.truncate(stream.node, len)
    }
    ),
    utime: (function(path, atime, mtime) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        node.node_ops.setattr(node, {
            timestamp: Math.max(atime, mtime)
        })
    }
    ),
    open: (function(path, flags, mode, fd_start, fd_end) {
        if (path === "") {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === "undefined" ? 438 : mode;
        if (flags & 64) {
            mode = mode & 4095 | 32768
        } else {
            mode = 0
        }
        var node;
        if (typeof path === "object") {
            node = path
        } else {
            path = PATH.normalize(path);
            try {
                var lookup = FS.lookupPath(path, {
                    follow: !(flags & 131072)
                });
                node = lookup.node
            } catch (e) {}
        }
        var created = false;
        if (flags & 64) {
            if (node) {
                if (flags & 128) {
                    throw new FS.ErrnoError(ERRNO_CODES.EEXIST)
                }
            } else {
                node = FS.mknod(path, mode, 0);
                created = true
            }
        }
        if (!node) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (FS.isChrdev(node.mode)) {
            flags &= ~512
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        if (!created) {
            var err = FS.mayOpen(node, flags);
            if (err) {
                throw new FS.ErrnoError(err)
            }
        }
        if (flags & 512) {
            FS.truncate(node, 0)
        }
        flags &= ~(128 | 512);
        var stream = FS.createStream({
            node: node,
            path: FS.getPath(node),
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            ungotten: [],
            error: false
        }, fd_start, fd_end);
        if (stream.stream_ops.open) {
            stream.stream_ops.open(stream)
        }
        if (Module["logReadFiles"] && !(flags & 1)) {
            if (!FS.readFiles)
                FS.readFiles = {};
            if (!(path in FS.readFiles)) {
                FS.readFiles[path] = 1;
                Module["printErr"]("read file: " + path)
            }
        }
        try {
            if (FS.trackingDelegate["onOpenFile"]) {
                var trackingFlags = 0;
                if ((flags & 2097155) !== 1) {
                    trackingFlags |= FS.tracking.openFlags.READ
                }
                if ((flags & 2097155) !== 0) {
                    trackingFlags |= FS.tracking.openFlags.WRITE
                }
                FS.trackingDelegate["onOpenFile"](path, trackingFlags)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
        }
        return stream
    }
    ),
    close: (function(stream) {
        if (stream.getdents)
            stream.getdents = null;
        try {
            if (stream.stream_ops.close) {
                stream.stream_ops.close(stream)
            }
        } catch (e) {
            throw e
        } finally {
            FS.closeStream(stream.fd)
        }
    }
    ),
    llseek: (function(stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position
    }
    ),
    read: (function(stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!stream.stream_ops.read) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var seeking = true;
        if (typeof position === "undefined") {
            position = stream.position;
            seeking = false
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking)
            stream.position += bytesRead;
        return bytesRead
    }
    ),
    write: (function(stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!stream.stream_ops.write) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if (stream.flags & 1024) {
            FS.llseek(stream, 0, 2)
        }
        var seeking = true;
        if (typeof position === "undefined") {
            position = stream.position;
            seeking = false
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking)
            stream.position += bytesWritten;
        try {
            if (stream.path && FS.trackingDelegate["onWriteToFile"])
                FS.trackingDelegate["onWriteToFile"](stream.path)
        } catch (e) {
            console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message)
        }
        return bytesWritten
    }
    ),
    allocate: (function(stream, offset, length) {
        if (offset < 0 || length <= 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        if (!stream.stream_ops.allocate) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
        }
        stream.stream_ops.allocate(stream, offset, length)
    }
    ),
    mmap: (function(stream, buffer, offset, length, position, prot, flags) {
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(ERRNO_CODES.EACCES)
        }
        if (!stream.stream_ops.mmap) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
    }
    ),
    msync: (function(stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
            return 0
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    }
    ),
    munmap: (function(stream) {
        return 0
    }
    ),
    ioctl: (function(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTTY)
        }
        return stream.stream_ops.ioctl(stream, cmd, arg)
    }
    ),
    readFile: (function(path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || "r";
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
            ret = UTF8ArrayToString(buf, 0)
        } else if (opts.encoding === "binary") {
            ret = buf
        }
        FS.close(stream);
        return ret
    }
    ),
    writeFile: (function(path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || "w";
        opts.encoding = opts.encoding || "utf8";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === "utf8") {
            var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
            var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
            FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn)
        } else if (opts.encoding === "binary") {
            FS.write(stream, data, 0, data.length, 0, opts.canOwn)
        }
        FS.close(stream)
    }
    ),
    cwd: (function() {
        return FS.currentPath
    }
    ),
    chdir: (function(path) {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        if (!FS.isDir(lookup.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        var err = FS.nodePermissions(lookup.node, "x");
        if (err) {
            throw new FS.ErrnoError(err)
        }
        FS.currentPath = lookup.path
    }
    ),
    createDefaultDirectories: (function() {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user")
    }
    ),
    createDefaultDevices: (function() {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
            read: (function() {
                return 0
            }
            ),
            write: (function(stream, buffer, offset, length, pos) {
                return length
            }
            )
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var random_device;
        if (typeof crypto !== "undefined") {
            var randomBuffer = new Uint8Array(1);
            random_device = (function() {
                crypto.getRandomValues(randomBuffer);
                return randomBuffer[0]
            }
            )
        } else if (ENVIRONMENT_IS_NODE) {
            random_device = (function() {
                return require("crypto").randomBytes(1)[0]
            }
            )
        } else {
            random_device = (function() {
                return Math.random() * 256 | 0
            }
            )
        }
        FS.createDevice("/dev", "random", random_device);
        FS.createDevice("/dev", "urandom", random_device);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp")
    }
    ),
    createSpecialDirectories: (function() {
        FS.mkdir("/proc");
        FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount({
            mount: (function() {
                var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
                node.node_ops = {
                    lookup: (function(parent, name) {
                        var fd = +name;
                        var stream = FS.getStream(fd);
                        if (!stream)
                            throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                        var ret = {
                            parent: null,
                            mount: {
                                mountpoint: "fake"
                            },
                            node_ops: {
                                readlink: (function() {
                                    return stream.path
                                }
                                )
                            }
                        };
                        ret.parent = ret;
                        return ret
                    }
                    )
                };
                return node
            }
            )
        }, {}, "/proc/self/fd")
    }
    ),
    createStandardStreams: (function() {
        if (Module["stdin"]) {
            FS.createDevice("/dev", "stdin", Module["stdin"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdin")
        }
        if (Module["stdout"]) {
            FS.createDevice("/dev", "stdout", null, Module["stdout"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdout")
        }
        if (Module["stderr"]) {
            FS.createDevice("/dev", "stderr", null, Module["stderr"])
        } else {
            FS.symlink("/dev/tty1", "/dev/stderr")
        }
        var stdin = FS.open("/dev/stdin", "r");
        assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
        var stdout = FS.open("/dev/stdout", "w");
        assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
        var stderr = FS.open("/dev/stderr", "w");
        assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")")
    }
    ),
    ensureErrnoError: (function() {
        if (FS.ErrnoError)
            return;
        FS.ErrnoError = function ErrnoError(errno, node) {
            this.node = node;
            this.setErrno = (function(errno) {
                this.errno = errno;
                for (var key in ERRNO_CODES) {
                    if (ERRNO_CODES[key] === errno) {
                        this.code = key;
                        break
                    }
                }
            }
            );
            this.setErrno(errno);
            this.message = ERRNO_MESSAGES[errno]
        }
        ;
        FS.ErrnoError.prototype = new Error;
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        [ERRNO_CODES.ENOENT].forEach((function(code) {
            FS.genericErrors[code] = new FS.ErrnoError(code);
            FS.genericErrors[code].stack = "<generic error, no stack>"
        }
        ))
    }
    ),
    staticInit: (function() {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = {
            "MEMFS": MEMFS,
            "IDBFS": IDBFS,
            "NODEFS": NODEFS,
            "WORKERFS": WORKERFS
        }
    }
    ),
    init: (function(input, output, error) {
        assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
        FS.init.initialized = true;
        FS.ensureErrnoError();
        Module["stdin"] = input || Module["stdin"];
        Module["stdout"] = output || Module["stdout"];
        Module["stderr"] = error || Module["stderr"];
        FS.createStandardStreams()
    }
    ),
    quit: (function() {
        FS.init.initialized = false;
        var fflush = Module["_fflush"];
        if (fflush)
            fflush(0);
        for (var i = 0; i < FS.streams.length; i++) {
            var stream = FS.streams[i];
            if (!stream) {
                continue
            }
            FS.close(stream)
        }
    }
    ),
    getMode: (function(canRead, canWrite) {
        var mode = 0;
        if (canRead)
            mode |= 292 | 73;
        if (canWrite)
            mode |= 146;
        return mode
    }
    ),
    joinPath: (function(parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == "/")
            path = path.substr(1);
        return path
    }
    ),
    absolutePath: (function(relative, base) {
        return PATH.resolve(base, relative)
    }
    ),
    standardizePath: (function(path) {
        return PATH.normalize(path)
    }
    ),
    findObject: (function(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
            return ret.object
        } else {
            ___setErrNo(ret.error);
            return null
        }
    }
    ),
    analyzePath: (function(path, dontResolveLastLink) {
        try {
            var lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            path = lookup.path
        } catch (e) {}
        var ret = {
            isRoot: false,
            exists: false,
            error: 0,
            name: null,
            path: null,
            object: null,
            parentExists: false,
            parentPath: null,
            parentObject: null
        };
        try {
            var lookup = FS.lookupPath(path, {
                parent: true
            });
            ret.parentExists = true;
            ret.parentPath = lookup.path;
            ret.parentObject = lookup.node;
            ret.name = PATH.basename(path);
            lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            ret.exists = true;
            ret.path = lookup.path;
            ret.object = lookup.node;
            ret.name = lookup.node.name;
            ret.isRoot = lookup.path === "/"
        } catch (e) {
            ret.error = e.errno
        }
        return ret
    }
    ),
    createFolder: (function(parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode)
    }
    ),
    createPath: (function(parent, path, canRead, canWrite) {
        parent = typeof parent === "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
            var part = parts.pop();
            if (!part)
                continue;
            var current = PATH.join2(parent, part);
            try {
                FS.mkdir(current)
            } catch (e) {}
            parent = current
        }
        return current
    }
    ),
    createFile: (function(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode)
    }
    ),
    createDataFile: (function(parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
            if (typeof data === "string") {
                var arr = new Array(data.length);
                for (var i = 0, len = data.length; i < len; ++i)
                    arr[i] = data.charCodeAt(i);
                data = arr
            }
            FS.chmod(node, mode | 146);
            var stream = FS.open(node, "w");
            FS.write(stream, data, 0, data.length, 0, canOwn);
            FS.close(stream);
            FS.chmod(node, mode)
        }
        return node
    }
    ),
    createDevice: (function(parent, name, input, output) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major)
            FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
            open: (function(stream) {
                stream.seekable = false
            }
            ),
            close: (function(stream) {
                if (output && output.buffer && output.buffer.length) {
                    output(10)
                }
            }
            ),
            read: (function(stream, buffer, offset, length, pos) {
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                    var result;
                    try {
                        result = input()
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES.EIO)
                    }
                    if (result === undefined && bytesRead === 0) {
                        throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
                    }
                    if (result === null || result === undefined)
                        break;
                    bytesRead++;
                    buffer[offset + i] = result
                }
                if (bytesRead) {
                    stream.node.timestamp = Date.now()
                }
                return bytesRead
            }
            ),
            write: (function(stream, buffer, offset, length, pos) {
                for (var i = 0; i < length; i++) {
                    try {
                        output(buffer[offset + i])
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES.EIO)
                    }
                }
                if (length) {
                    stream.node.timestamp = Date.now()
                }
                return i
            }
            )
        });
        return FS.mkdev(path, mode, dev)
    }
    ),
    createLink: (function(parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path)
    }
    ),
    forceLoadFile: (function(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents)
            return true;
        var success = true;
        if (typeof XMLHttpRequest !== "undefined") {
            throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
        } else if (Module["read"]) {
            try {
                obj.contents = intArrayFromString(Module["read"](obj.url), true);
                obj.usedBytes = obj.contents.length
            } catch (e) {
                success = false
            }
        } else {
            throw new Error("Cannot load without read() or XMLHttpRequest.")
        }
        if (!success)
            ___setErrNo(ERRNO_CODES.EIO);
        return success
    }
    ),
    createLazyFile: (function(parent, name, url, canRead, canWrite) {
        function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length - 1 || idx < 0) {
                return undefined
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset]
        }
        ;
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter
        }
        ;
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            var xhr = new XMLHttpRequest;
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
                throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing)
                chunkSize = datalength;
            var doXHR = (function(from, to) {
                if (from > to)
                    throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength - 1)
                    throw new Error("only " + datalength + " bytes available! programmer error!");
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                if (datalength !== chunkSize)
                    xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                if (typeof Uint8Array != "undefined")
                    xhr.responseType = "arraybuffer";
                if (xhr.overrideMimeType) {
                    xhr.overrideMimeType("text/plain; charset=x-user-defined")
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
                    throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                    return new Uint8Array(xhr.response || [])
                } else {
                    return intArrayFromString(xhr.responseText || "", true)
                }
            }
            );
            var lazyArray = this;
            lazyArray.setDataGetter((function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum + 1) * chunkSize - 1;
                end = Math.min(end, datalength - 1);
                if (typeof lazyArray.chunks[chunkNum] === "undefined") {
                    lazyArray.chunks[chunkNum] = doXHR(start, end)
                }
                if (typeof lazyArray.chunks[chunkNum] === "undefined")
                    throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum]
            }
            ));
            if (usesGzip || !datalength) {
                chunkSize = datalength = 1;
                datalength = this.getter(0).length;
                chunkSize = datalength;
                console.log("LazyFiles on gzip forces download of the whole file when length is accessed")
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true
        }
        ;
        if (typeof XMLHttpRequest !== "undefined") {
            if (!ENVIRONMENT_IS_WORKER)
                throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
            var lazyArray = new LazyUint8Array;
            Object.defineProperties(lazyArray, {
                length: {
                    get: (function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._length
                    }
                    )
                },
                chunkSize: {
                    get: (function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._chunkSize
                    }
                    )
                }
            });
            var properties = {
                isDevice: false,
                contents: lazyArray
            }
        } else {
            var properties = {
                isDevice: false,
                url: url
            }
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
            node.contents = properties.contents
        } else if (properties.url) {
            node.contents = null;
            node.url = properties.url
        }
        Object.defineProperties(node, {
            usedBytes: {
                get: (function() {
                    return this.contents.length
                }
                )
            }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((function(key) {
            var fn = node.stream_ops[key];
            stream_ops[key] = function forceLoadLazyFile() {
                if (!FS.forceLoadFile(node)) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
                return fn.apply(null, arguments)
            }
        }
        ));
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
            if (!FS.forceLoadFile(node)) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO)
            }
            var contents = stream.node.contents;
            if (position >= contents.length)
                return 0;
            var size = Math.min(contents.length - position, length);
            assert(size >= 0);
            if (contents.slice) {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents[position + i]
                }
            } else {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents.get(position + i)
                }
            }
            return size
        }
        ;
        node.stream_ops = stream_ops;
        return node
    }
    ),
    createPreloadedFile: (function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency("cp " + fullname);
        function processData(byteArray) {
            function finish(byteArray) {
                if (preFinish)
                    preFinish();
                if (!dontCreateFile) {
                    FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
                }
                if (onload)
                    onload();
                removeRunDependency(dep)
            }
            var handled = false;
            Module["preloadPlugins"].forEach((function(plugin) {
                if (handled)
                    return;
                if (plugin["canHandle"](fullname)) {
                    plugin["handle"](byteArray, fullname, finish, (function() {
                        if (onerror)
                            onerror();
                        removeRunDependency(dep)
                    }
                    ));
                    handled = true
                }
            }
            ));
            if (!handled)
                finish(byteArray)
        }
        addRunDependency(dep);
        if (typeof url == "string") {
            Browser.asyncLoad(url, (function(byteArray) {
                processData(byteArray)
            }
            ), onerror)
        } else {
            processData(url)
        }
    }
    ),
    indexedDB: (function() {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    }
    ),
    DB_NAME: (function() {
        return "EM_FS_" + window.location.pathname
    }
    ),
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: (function(paths, onload, onerror) {
        onload = onload || (function() {}
        );
        onerror = onerror || (function() {}
        );
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
            console.log("creating db");
            var db = openRequest.result;
            db.createObjectStore(FS.DB_STORE_NAME)
        }
        ;
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0
              , fail = 0
              , total = paths.length;
            function finish() {
                if (fail == 0)
                    onload();
                else
                    onerror()
            }
            paths.forEach((function(path) {
                var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                putRequest.onsuccess = function putRequest_onsuccess() {
                    ok++;
                    if (ok + fail == total)
                        finish()
                }
                ;
                putRequest.onerror = function putRequest_onerror() {
                    fail++;
                    if (ok + fail == total)
                        finish()
                }
            }
            ));
            transaction.onerror = onerror
        }
        ;
        openRequest.onerror = onerror
    }
    ),
    loadFilesFromDB: (function(paths, onload, onerror) {
        onload = onload || (function() {}
        );
        onerror = onerror || (function() {}
        );
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = onerror;
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            try {
                var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
            } catch (e) {
                onerror(e);
                return
            }
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0
              , fail = 0
              , total = paths.length;
            function finish() {
                if (fail == 0)
                    onload();
                else
                    onerror()
            }
            paths.forEach((function(path) {
                var getRequest = files.get(path);
                getRequest.onsuccess = function getRequest_onsuccess() {
                    if (FS.analyzePath(path).exists) {
                        FS.unlink(path)
                    }
                    FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                    ok++;
                    if (ok + fail == total)
                        finish()
                }
                ;
                getRequest.onerror = function getRequest_onerror() {
                    fail++;
                    if (ok + fail == total)
                        finish()
                }
            }
            ));
            transaction.onerror = onerror
        }
        ;
        openRequest.onerror = onerror
    }
    )
};
var SYSCALLS = {
    DEFAULT_POLLMASK: 5,
    mappings: {},
    umask: 511,
    calculateAt: (function(dirfd, path) {
        if (path[0] !== "/") {
            var dir;
            if (dirfd === -100) {
                dir = FS.cwd()
            } else {
                var dirstream = FS.getStream(dirfd);
                if (!dirstream)
                    throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                dir = dirstream.path
            }
            path = PATH.join2(dir, path)
        }
        return path
    }
    ),
    doStat: (function(func, path, buf) {
        try {
            var stat = func(path)
        } catch (e) {
            if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                return -ERRNO_CODES.ENOTDIR
            }
            throw e
        }
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = 0;
        HEAP32[buf + 8 >> 2] = stat.ino;
        HEAP32[buf + 12 >> 2] = stat.mode;
        HEAP32[buf + 16 >> 2] = stat.nlink;
        HEAP32[buf + 20 >> 2] = stat.uid;
        HEAP32[buf + 24 >> 2] = stat.gid;
        HEAP32[buf + 28 >> 2] = stat.rdev;
        HEAP32[buf + 32 >> 2] = 0;
        HEAP32[buf + 36 >> 2] = stat.size;
        HEAP32[buf + 40 >> 2] = 4096;
        HEAP32[buf + 44 >> 2] = stat.blocks;
        HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0;
        HEAP32[buf + 52 >> 2] = 0;
        HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0;
        HEAP32[buf + 60 >> 2] = 0;
        HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0;
        HEAP32[buf + 68 >> 2] = 0;
        HEAP32[buf + 72 >> 2] = stat.ino;
        return 0
    }
    ),
    doMsync: (function(addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags)
    }
    ),
    doMkdir: (function(path, mode) {
        path = PATH.normalize(path);
        if (path[path.length - 1] === "/")
            path = path.substr(0, path.length - 1);
        FS.mkdir(path, mode, 0);
        return 0
    }
    ),
    doMknod: (function(path, mode, dev) {
        switch (mode & 61440) {
        case 32768:
        case 8192:
        case 24576:
        case 4096:
        case 49152:
            break;
        default:
            return -ERRNO_CODES.EINVAL
        }
        FS.mknod(path, mode, dev);
        return 0
    }
    ),
    doReadlink: (function(path, buf, bufsize) {
        if (bufsize <= 0)
            return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);
        ret = ret.slice(0, Math.max(0, bufsize));
        writeStringToMemory(ret, buf, true);
        return ret.length
    }
    ),
    doAccess: (function(path, amode) {
        if (amode & ~7) {
            return -ERRNO_CODES.EINVAL
        }
        var node;
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        node = lookup.node;
        var perms = "";
        if (amode & 4)
            perms += "r";
        if (amode & 2)
            perms += "w";
        if (amode & 1)
            perms += "x";
        if (perms && FS.nodePermissions(node, perms)) {
            return -ERRNO_CODES.EACCES
        }
        return 0
    }
    ),
    doDup: (function(path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest)
            FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd
    }
    ),
    doReadv: (function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.read(stream, HEAP8, ptr, len, offset);
            if (curr < 0)
                return -1;
            ret += curr;
            if (curr < len)
                break
        }
        return ret
    }
    ),
    doWritev: (function(stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.write(stream, HEAP8, ptr, len, offset);
            if (curr < 0)
                return -1;
            ret += curr
        }
        return ret
    }
    ),
    varargs: 0,
    get: (function(varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
        return ret
    }
    ),
    getStr: (function() {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret
    }
    ),
    getStreamFromFD: (function() {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream)
            throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream
    }
    ),
    getSocketFromFD: (function() {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket)
            throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket
    }
    ),
    getSocketAddress: (function(allowNull) {
        var addrp = SYSCALLS.get()
          , addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0)
            return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno)
            throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info
    }
    ),
    get64: (function() {
        var low = SYSCALLS.get()
          , high = SYSCALLS.get();
        if (low >= 0)
            assert(high === 0);
        else
            assert(high === -1);
        return low
    }
    ),
    getZero: (function() {
        assert(SYSCALLS.get() === 0)
    }
    )
};
function ___syscall195(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var path = SYSCALLS.getStr()
          , buf = SYSCALLS.get();
        return SYSCALLS.doStat(FS.stat, path, buf)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function _free() {}
Module["_free"] = _free;
function _malloc(bytes) {
    var ptr = Runtime.dynamicAlloc(bytes + 8);
    return ptr + 8 & 4294967288
}
Module["_malloc"] = _malloc;
function simpleReadValueFromPointer(pointer) {
    return this["fromWireType"](HEAPU32[pointer >> 2])
}
function __embind_register_std_string(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": (function(value) {
            var length = HEAPU32[value >> 2];
            var a = new Array(length);
            for (var i = 0; i < length; ++i) {
                a[i] = String.fromCharCode(HEAPU8[value + 4 + i])
            }
            _free(value);
            return a.join("")
        }
        ),
        "toWireType": (function(destructors, value) {
            if (value instanceof ArrayBuffer) {
                value = new Uint8Array(value)
            }
            function getTAElement(ta, index) {
                return ta[index]
            }
            function getStringElement(string, index) {
                return string.charCodeAt(index)
            }
            var getElement;
            if (value instanceof Uint8Array) {
                getElement = getTAElement
            } else if (value instanceof Int8Array) {
                getElement = getTAElement
            } else if (typeof value === "string") {
                getElement = getStringElement
            } else {
                throwBindingError("Cannot pass non-string to std::string")
            }
            var length = value.length;
            var ptr = _malloc(4 + length);
            HEAPU32[ptr >> 2] = length;
            for (var i = 0; i < length; ++i) {
                var charCode = getElement(value, i);
                if (charCode > 255) {
                    _free(ptr);
                    throwBindingError("String has UTF-16 code units that do not fit in 8 bits")
                }
                HEAPU8[ptr + 4 + i] = charCode
            }
            if (destructors !== null) {
                destructors.push(_free, ptr)
            }
            return ptr
        }
        ),
        "argPackAdvance": 8,
        "readValueFromPointer": simpleReadValueFromPointer,
        destructorFunction: (function(ptr) {
            _free(ptr)
        }
        )
    })
}
function _embind_repr(v) {
    if (v === null) {
        return "null"
    }
    var t = typeof v;
    if (t === "object" || t === "array" || t === "function") {
        return v.toString()
    } else {
        return "" + v
    }
}
function integerReadValueFromPointer(name, shift, signed) {
    switch (shift) {
    case 0:
        return signed ? function readS8FromPointer(pointer) {
            return HEAP8[pointer]
        }
        : function readU8FromPointer(pointer) {
            return HEAPU8[pointer]
        }
        ;
    case 1:
        return signed ? function readS16FromPointer(pointer) {
            return HEAP16[pointer >> 1]
        }
        : function readU16FromPointer(pointer) {
            return HEAPU16[pointer >> 1]
        }
        ;
    case 2:
        return signed ? function readS32FromPointer(pointer) {
            return HEAP32[pointer >> 2]
        }
        : function readU32FromPointer(pointer) {
            return HEAPU32[pointer >> 2]
        }
        ;
    default:
        throw new TypeError("Unknown integer type: " + name)
    }
}
function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
    name = readLatin1String(name);
    if (maxRange === -1) {
        maxRange = 4294967295
    }
    var shift = getShiftFromSize(size);
    var fromWireType = (function(value) {
        return value
    }
    );
    if (minRange === 0) {
        var bitshift = 32 - 8 * size;
        fromWireType = (function(value) {
            return value << bitshift >>> bitshift
        }
        )
    }
    registerType(primitiveType, {
        name: name,
        "fromWireType": fromWireType,
        "toWireType": (function(destructors, value) {
            if (typeof value !== "number" && typeof value !== "boolean") {
                throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name)
            }
            if (value < minRange || value > maxRange) {
                throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ", " + maxRange + "]!")
            }
            return value | 0
        }
        ),
        "argPackAdvance": 8,
        "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0),
        destructorFunction: null
    })
}
function _pthread_mutex_init() {}
var emval_free_list = [];
var emval_handle_array = [{}, {
    value: undefined
}, {
    value: null
}, {
    value: true
}, {
    value: false
}];
function __emval_decref(handle) {
    if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
        emval_handle_array[handle] = undefined;
        emval_free_list.push(handle)
    }
}
function ___assert_fail(condition, filename, line, func) {
    ABORT = true;
    throw "Assertion failed: " + Pointer_stringify(condition) + ", at: " + [filename ? Pointer_stringify(filename) : "unknown filename", line, func ? Pointer_stringify(func) : "unknown function"] + " at " + stackTrace()
}
var PTHREAD_SPECIFIC = {};
var PTHREAD_SPECIFIC_NEXT_KEY = 1;
function _pthread_key_create(key, destructor) {
    if (key == 0) {
        return ERRNO_CODES.EINVAL
    }
    HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
    PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
    PTHREAD_SPECIFIC_NEXT_KEY++;
    return 0
}
function count_emval_handles() {
    var count = 0;
    for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== undefined) {
            ++count
        }
    }
    return count
}
function get_first_emval() {
    for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== undefined) {
            return emval_handle_array[i]
        }
    }
    return null
}
function init_emval() {
    Module["count_emval_handles"] = count_emval_handles;
    Module["get_first_emval"] = get_first_emval
}
function __emval_register(value) {
    switch (value) {
    case undefined:
        {
            return 1
        }
        ;
    case null:
        {
            return 2
        }
        ;
    case true:
        {
            return 3
        }
        ;
    case false:
        {
            return 4
        }
        ;
    default:
        {
            var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
            emval_handle_array[handle] = {
                refcount: 1,
                value: value
            };
            return handle
        }
    }
}
function getTypeName(type) {
    var ptr = ___getTypeName(type);
    var rv = readLatin1String(ptr);
    _free(ptr);
    return rv
}
function requireRegisteredType(rawType, humanName) {
    var impl = registeredTypes[rawType];
    if (undefined === impl) {
        throwBindingError(humanName + " has unknown type " + getTypeName(rawType))
    }
    return impl
}
function __emval_take_value(type, argv) {
    type = requireRegisteredType(type, "_emval_take_value");
    var v = type["readValueFromPointer"](argv);
    return __emval_register(v)
}
var _llvm_pow_f32 = Math_pow;
function ___syscall54(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD()
          , op = SYSCALLS.get();
        switch (op) {
        case 21505:
            {
                if (!stream.tty)
                    return -ERRNO_CODES.ENOTTY;
                return 0
            }
            ;
        case 21506:
            {
                if (!stream.tty)
                    return -ERRNO_CODES.ENOTTY;
                return 0
            }
            ;
        case 21519:
            {
                if (!stream.tty)
                    return -ERRNO_CODES.ENOTTY;
                var argp = SYSCALLS.get();
                HEAP32[argp >> 2] = 0;
                return 0
            }
            ;
        case 21520:
            {
                if (!stream.tty)
                    return -ERRNO_CODES.ENOTTY;
                return -ERRNO_CODES.EINVAL
            }
            ;
        case 21531:
            {
                var argp = SYSCALLS.get();
                return FS.ioctl(stream, op, argp)
            }
            ;
        default:
            abort("bad ioctl syscall " + op)
        }
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
Module["_bitshift64Ashr"] = _bitshift64Ashr;
Module["_bitshift64Lshr"] = _bitshift64Lshr;
function ___syscall196(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var path = SYSCALLS.getStr()
          , buf = SYSCALLS.get();
        return SYSCALLS.doStat(FS.lstat, path, buf)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function _pthread_cleanup_push(routine, arg) {
    __ATEXIT__.push((function() {
        Runtime.dynCall("vi", routine, [arg])
    }
    ));
    _pthread_cleanup_push.level = __ATEXIT__.length
}
function _pthread_cond_broadcast() {
    return 0
}
function _pthread_cleanup_pop() {
    assert(_pthread_cleanup_push.level == __ATEXIT__.length, "cannot pop if something else added meanwhile!");
    __ATEXIT__.pop();
    _pthread_cleanup_push.level = __ATEXIT__.length
}
function _pthread_mutex_unlock() {}
function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest
}
Module["_memcpy"] = _memcpy;
function __embind_register_enum_value(rawEnumType, name, enumValue) {
    var enumType = requireRegisteredType(rawEnumType, "enum");
    name = readLatin1String(name);
    var Enum = enumType.constructor;
    var Value = Object.create(enumType.constructor.prototype, {
        value: {
            value: enumValue
        },
        constructor: {
            value: createNamedFunction(enumType.name + "_" + name, (function() {}
            ))
        }
    });
    Enum.values[enumValue] = Value;
    Enum[name] = Value
}
var _llvm_pow_f64 = Math_pow;
function _sbrk(bytes) {
    var self = _sbrk;
    if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = (function() {
            abort("cannot dynamically allocate, sbrk now has control")
        }
        )
    }
    var ret = DYNAMICTOP;
    if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success)
            return -1 >>> 0
    }
    return ret
}
Module["_bitshift64Shl"] = _bitshift64Shl;
Module["_memmove"] = _memmove;
function ___gxx_personality_v0() {}
function _pthread_mutex_destroy() {}
function ___syscall85(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var path = SYSCALLS.getStr()
          , buf = SYSCALLS.get()
          , bufsize = SYSCALLS.get();
        return SYSCALLS.doReadlink(path, buf, bufsize)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function _pthread_cond_wait() {
    return 0
}
var _llvm_fabs_f32 = Math_abs;
Module["_llvm_bswap_i32"] = _llvm_bswap_i32;
function __embind_register_memory_view(rawType, dataTypeIndex, name) {
    var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
    var TA = typeMapping[dataTypeIndex];
    function decodeMemoryView(handle) {
        handle = handle >> 2;
        var heap = HEAPU32;
        var size = heap[handle];
        var data = heap[handle + 1];
        return new TA(heap["buffer"],data,size)
    }
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": decodeMemoryView,
        "argPackAdvance": 8,
        "readValueFromPointer": decodeMemoryView
    }, {
        ignoreDuplicateRegistrations: true
    })
}
function ___cxa_guard_release() {}
function ensureOverloadTable(proto, methodName, humanName) {
    if (undefined === proto[methodName].overloadTable) {
        var prevFunc = proto[methodName];
        proto[methodName] = (function() {
            if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!")
            }
            return proto[methodName].overloadTable[arguments.length].apply(this, arguments)
        }
        );
        proto[methodName].overloadTable = [];
        proto[methodName].overloadTable[prevFunc.argCount] = prevFunc
    }
}
function exposePublicSymbol(name, value, numArguments) {
    if (Module.hasOwnProperty(name)) {
        if (undefined === numArguments || undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments]) {
            throwBindingError("Cannot register public name '" + name + "' twice")
        }
        ensureOverloadTable(Module, name, name);
        if (Module.hasOwnProperty(numArguments)) {
            throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!")
        }
        Module[name].overloadTable[numArguments] = value
    } else {
        Module[name] = value;
        if (undefined !== numArguments) {
            Module[name].numArguments = numArguments
        }
    }
}
function enumReadValueFromPointer(name, shift, signed) {
    switch (shift) {
    case 0:
        return (function(pointer) {
            var heap = signed ? HEAP8 : HEAPU8;
            return this["fromWireType"](heap[pointer])
        }
        );
    case 1:
        return (function(pointer) {
            var heap = signed ? HEAP16 : HEAPU16;
            return this["fromWireType"](heap[pointer >> 1])
        }
        );
    case 2:
        return (function(pointer) {
            var heap = signed ? HEAP32 : HEAPU32;
            return this["fromWireType"](heap[pointer >> 2])
        }
        );
    default:
        throw new TypeError("Unknown integer type: " + name)
    }
}
function __embind_register_enum(rawType, name, size, isSigned) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    function constructor() {}
    constructor.values = {};
    registerType(rawType, {
        name: name,
        constructor: constructor,
        "fromWireType": (function(c) {
            return this.constructor.values[c]
        }
        ),
        "toWireType": (function(destructors, c) {
            return c.value
        }
        ),
        "argPackAdvance": 8,
        "readValueFromPointer": enumReadValueFromPointer(name, shift, isSigned),
        destructorFunction: null
    });
    exposePublicSymbol(name, constructor)
}
function __emval_incref(handle) {
    if (handle > 4) {
        emval_handle_array[handle].refcount += 1
    }
}
function _sysconf(name) {
    switch (name) {
    case 30:
        return PAGE_SIZE;
    case 85:
        return totalMemory / PAGE_SIZE;
    case 132:
    case 133:
    case 12:
    case 137:
    case 138:
    case 15:
    case 235:
    case 16:
    case 17:
    case 18:
    case 19:
    case 20:
    case 149:
    case 13:
    case 10:
    case 236:
    case 153:
    case 9:
    case 21:
    case 22:
    case 159:
    case 154:
    case 14:
    case 77:
    case 78:
    case 139:
    case 80:
    case 81:
    case 82:
    case 68:
    case 67:
    case 164:
    case 11:
    case 29:
    case 47:
    case 48:
    case 95:
    case 52:
    case 51:
    case 46:
        return 200809;
    case 79:
        return 0;
    case 27:
    case 246:
    case 127:
    case 128:
    case 23:
    case 24:
    case 160:
    case 161:
    case 181:
    case 182:
    case 242:
    case 183:
    case 184:
    case 243:
    case 244:
    case 245:
    case 165:
    case 178:
    case 179:
    case 49:
    case 50:
    case 168:
    case 169:
    case 175:
    case 170:
    case 171:
    case 172:
    case 97:
    case 76:
    case 32:
    case 173:
    case 35:
        return -1;
    case 176:
    case 177:
    case 7:
    case 155:
    case 8:
    case 157:
    case 125:
    case 126:
    case 92:
    case 93:
    case 129:
    case 130:
    case 131:
    case 94:
    case 91:
        return 1;
    case 74:
    case 60:
    case 69:
    case 70:
    case 4:
        return 1024;
    case 31:
    case 42:
    case 72:
        return 32;
    case 87:
    case 26:
    case 33:
        return 2147483647;
    case 34:
    case 1:
        return 47839;
    case 38:
    case 36:
        return 99;
    case 43:
    case 37:
        return 2048;
    case 0:
        return 2097152;
    case 3:
        return 65536;
    case 28:
        return 32768;
    case 44:
        return 32767;
    case 75:
        return 16384;
    case 39:
        return 1e3;
    case 89:
        return 700;
    case 71:
        return 256;
    case 40:
        return 255;
    case 2:
        return 100;
    case 180:
        return 64;
    case 25:
        return 20;
    case 5:
        return 16;
    case 6:
        return 6;
    case 73:
        return 4;
    case 84:
        {
            if (typeof navigator === "object")
                return navigator["hardwareConcurrency"] || 1;
            return 1
        }
    }
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
}
function __embind_register_void(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
        isVoid: true,
        name: name,
        "argPackAdvance": 0,
        "fromWireType": (function() {
            return undefined
        }
        ),
        "toWireType": (function(destructors, o) {
            return undefined
        }
        )
    })
}
Module["_memset"] = _memset;
function __isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}
function __arraySum(array, index) {
    var sum = 0;
    for (var i = 0; i <= index; sum += array[i++])
        ;
    return sum
}
var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function __addDays(date, days) {
    var newDate = new Date(date.getTime());
    while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth - newDate.getDate()) {
            days -= daysInCurrentMonth - newDate.getDate() + 1;
            newDate.setDate(1);
            if (currentMonth < 11) {
                newDate.setMonth(currentMonth + 1)
            } else {
                newDate.setMonth(0);
                newDate.setFullYear(newDate.getFullYear() + 1)
            }
        } else {
            newDate.setDate(newDate.getDate() + days);
            return newDate
        }
    }
    return newDate
}
function _strftime(s, maxsize, format, tm) {
    var tm_zone = HEAP32[tm + 40 >> 2];
    var date = {
        tm_sec: HEAP32[tm >> 2],
        tm_min: HEAP32[tm + 4 >> 2],
        tm_hour: HEAP32[tm + 8 >> 2],
        tm_mday: HEAP32[tm + 12 >> 2],
        tm_mon: HEAP32[tm + 16 >> 2],
        tm_year: HEAP32[tm + 20 >> 2],
        tm_wday: HEAP32[tm + 24 >> 2],
        tm_yday: HEAP32[tm + 28 >> 2],
        tm_isdst: HEAP32[tm + 32 >> 2],
        tm_gmtoff: HEAP32[tm + 36 >> 2],
        tm_zone: tm_zone ? Pointer_stringify(tm_zone) : ""
    };
    var pattern = Pointer_stringify(format);
    var EXPANSION_RULES_1 = {
        "%c": "%a %b %d %H:%M:%S %Y",
        "%D": "%m/%d/%y",
        "%F": "%Y-%m-%d",
        "%h": "%b",
        "%r": "%I:%M:%S %p",
        "%R": "%H:%M",
        "%T": "%H:%M:%S",
        "%x": "%m/%d/%y",
        "%X": "%H:%M:%S"
    };
    for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule,"g"), EXPANSION_RULES_1[rule])
    }
    var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function leadingSomething(value, digits, character) {
        var str = typeof value === "number" ? value.toString() : value || "";
        while (str.length < digits) {
            str = character[0] + str
        }
        return str
    }
    function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0")
    }
    function compareByDay(date1, date2) {
        function sgn(value) {
            return value < 0 ? -1 : value > 0 ? 1 : 0
        }
        var compare;
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
            if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
                compare = sgn(date1.getDate() - date2.getDate())
            }
        }
        return compare
    }
    function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
        case 0:
            return new Date(janFourth.getFullYear() - 1,11,29);
        case 1:
            return janFourth;
        case 2:
            return new Date(janFourth.getFullYear(),0,3);
        case 3:
            return new Date(janFourth.getFullYear(),0,2);
        case 4:
            return new Date(janFourth.getFullYear(),0,1);
        case 5:
            return new Date(janFourth.getFullYear() - 1,11,31);
        case 6:
            return new Date(janFourth.getFullYear() - 1,11,30)
        }
    }
    function getWeekBasedYear(date) {
        var thisDate = __addDays(new Date(date.tm_year + 1900,0,1), date.tm_yday);
        var janFourthThisYear = new Date(thisDate.getFullYear(),0,4);
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1,0,4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
                return thisDate.getFullYear() + 1
            } else {
                return thisDate.getFullYear()
            }
        } else {
            return thisDate.getFullYear() - 1
        }
    }
    var EXPANSION_RULES_2 = {
        "%a": (function(date) {
            return WEEKDAYS[date.tm_wday].substring(0, 3)
        }
        ),
        "%A": (function(date) {
            return WEEKDAYS[date.tm_wday]
        }
        ),
        "%b": (function(date) {
            return MONTHS[date.tm_mon].substring(0, 3)
        }
        ),
        "%B": (function(date) {
            return MONTHS[date.tm_mon]
        }
        ),
        "%C": (function(date) {
            var year = date.tm_year + 1900;
            return leadingNulls(year / 100 | 0, 2)
        }
        ),
        "%d": (function(date) {
            return leadingNulls(date.tm_mday, 2)
        }
        ),
        "%e": (function(date) {
            return leadingSomething(date.tm_mday, 2, " ")
        }
        ),
        "%g": (function(date) {
            return getWeekBasedYear(date).toString().substring(2)
        }
        ),
        "%G": (function(date) {
            return getWeekBasedYear(date)
        }
        ),
        "%H": (function(date) {
            return leadingNulls(date.tm_hour, 2)
        }
        ),
        "%I": (function(date) {
            var twelveHour = date.tm_hour;
            if (twelveHour == 0)
                twelveHour = 12;
            else if (twelveHour > 12)
                twelveHour -= 12;
            return leadingNulls(twelveHour, 2)
        }
        ),
        "%j": (function(date) {
            return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3)
        }
        ),
        "%m": (function(date) {
            return leadingNulls(date.tm_mon + 1, 2)
        }
        ),
        "%M": (function(date) {
            return leadingNulls(date.tm_min, 2)
        }
        ),
        "%n": (function() {
            return "\n"
        }
        ),
        "%p": (function(date) {
            if (date.tm_hour >= 0 && date.tm_hour < 12) {
                return "AM"
            } else {
                return "PM"
            }
        }
        ),
        "%S": (function(date) {
            return leadingNulls(date.tm_sec, 2)
        }
        ),
        "%t": (function() {
            return "\t"
        }
        ),
        "%u": (function(date) {
            var day = new Date(date.tm_year + 1900,date.tm_mon + 1,date.tm_mday,0,0,0,0);
            return day.getDay() || 7
        }
        ),
        "%U": (function(date) {
            var janFirst = new Date(date.tm_year + 1900,0,1);
            var firstSunday = janFirst.getDay() === 0 ? janFirst : __addDays(janFirst, 7 - janFirst.getDay());
            var endDate = new Date(date.tm_year + 1900,date.tm_mon,date.tm_mday);
            if (compareByDay(firstSunday, endDate) < 0) {
                var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
                var firstSundayUntilEndJanuary = 31 - firstSunday.getDate();
                var days = firstSundayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
                return leadingNulls(Math.ceil(days / 7), 2)
            }
            return compareByDay(firstSunday, janFirst) === 0 ? "01" : "00"
        }
        ),
        "%V": (function(date) {
            var janFourthThisYear = new Date(date.tm_year + 1900,0,4);
            var janFourthNextYear = new Date(date.tm_year + 1901,0,4);
            var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
            var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
            var endDate = __addDays(new Date(date.tm_year + 1900,0,1), date.tm_yday);
            if (compareByDay(endDate, firstWeekStartThisYear) < 0) {
                return "53"
            }
            if (compareByDay(firstWeekStartNextYear, endDate) <= 0) {
                return "01"
            }
            var daysDifference;
            if (firstWeekStartThisYear.getFullYear() < date.tm_year + 1900) {
                daysDifference = date.tm_yday + 32 - firstWeekStartThisYear.getDate()
            } else {
                daysDifference = date.tm_yday + 1 - firstWeekStartThisYear.getDate()
            }
            return leadingNulls(Math.ceil(daysDifference / 7), 2)
        }
        ),
        "%w": (function(date) {
            var day = new Date(date.tm_year + 1900,date.tm_mon + 1,date.tm_mday,0,0,0,0);
            return day.getDay()
        }
        ),
        "%W": (function(date) {
            var janFirst = new Date(date.tm_year,0,1);
            var firstMonday = janFirst.getDay() === 1 ? janFirst : __addDays(janFirst, janFirst.getDay() === 0 ? 1 : 7 - janFirst.getDay() + 1);
            var endDate = new Date(date.tm_year + 1900,date.tm_mon,date.tm_mday);
            if (compareByDay(firstMonday, endDate) < 0) {
                var februaryFirstUntilEndMonth = __arraySum(__isLeapYear(endDate.getFullYear()) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, endDate.getMonth() - 1) - 31;
                var firstMondayUntilEndJanuary = 31 - firstMonday.getDate();
                var days = firstMondayUntilEndJanuary + februaryFirstUntilEndMonth + endDate.getDate();
                return leadingNulls(Math.ceil(days / 7), 2)
            }
            return compareByDay(firstMonday, janFirst) === 0 ? "01" : "00"
        }
        ),
        "%y": (function(date) {
            return (date.tm_year + 1900).toString().substring(2)
        }
        ),
        "%Y": (function(date) {
            return date.tm_year + 1900
        }
        ),
        "%z": (function(date) {
            var off = date.tm_gmtoff;
            var ahead = off >= 0;
            off = Math.abs(off) / 60;
            off = off / 60 * 100 + off % 60;
            return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
        }
        ),
        "%Z": (function(date) {
            return date.tm_zone
        }
        ),
        "%%": (function() {
            return "%"
        }
        )
    };
    for (var rule in EXPANSION_RULES_2) {
        if (pattern.indexOf(rule) >= 0) {
            pattern = pattern.replace(new RegExp(rule,"g"), EXPANSION_RULES_2[rule](date))
        }
    }
    var bytes = intArrayFromString(pattern, false);
    if (bytes.length > maxsize) {
        return 0
    }
    writeArrayToMemory(bytes, s);
    return bytes.length - 1
}
function _strftime_l(s, maxsize, format, tm) {
    return _strftime(s, maxsize, format, tm)
}
function _abort() {
    Module["abort"]()
}
function requireFunction(signature, rawFunction) {
    signature = readLatin1String(signature);
    function makeDynCaller(dynCall) {
        var args = [];
        for (var i = 1; i < signature.length; ++i) {
            args.push("a" + i)
        }
        var name = "dynCall_" + signature + "_" + rawFunction;
        var body = "return function " + name + "(" + args.join(", ") + ") {\n";
        body += "    return dynCall(rawFunction" + (args.length ? ", " : "") + args.join(", ") + ");\n";
        body += "};\n";
        return (new Function("dynCall","rawFunction",body))(dynCall, rawFunction)
    }
    var fp;
    if (Module["FUNCTION_TABLE_" + signature] !== undefined) {
        fp = Module["FUNCTION_TABLE_" + signature][rawFunction]
    } else if (typeof FUNCTION_TABLE !== "undefined") {
        fp = FUNCTION_TABLE[rawFunction]
    } else {
        var dc = asm["dynCall_" + signature];
        if (dc === undefined) {
            dc = asm["dynCall_" + signature.replace(/f/g, "d")];
            if (dc === undefined) {
                throwBindingError("No dynCall invoker for signature: " + signature)
            }
        }
        fp = makeDynCaller(dc)
    }
    if (typeof fp !== "function") {
        throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction)
    }
    return fp
}
function runDestructors(destructors) {
    while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr)
    }
}
var UnboundTypeError = undefined;
function throwUnboundTypeError(message, types) {
    var unboundTypes = [];
    var seen = {};
    function visit(type) {
        if (seen[type]) {
            return
        }
        if (registeredTypes[type]) {
            return
        }
        if (typeDependencies[type]) {
            typeDependencies[type].forEach(visit);
            return
        }
        unboundTypes.push(type);
        seen[type] = true
    }
    types.forEach(visit);
    throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([", "]))
}
function upcastPointer(ptr, ptrClass, desiredClass) {
    while (ptrClass !== desiredClass) {
        if (!ptrClass.upcast) {
            throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name)
        }
        ptr = ptrClass.upcast(ptr);
        ptrClass = ptrClass.baseClass
    }
    return ptr
}
function validateThis(this_, classType, humanName) {
    if (!(this_ instanceof Object)) {
        throwBindingError(humanName + ' with invalid "this": ' + this_)
    }
    if (!(this_ instanceof classType.registeredClass.constructor)) {
        throwBindingError(humanName + ' incompatible with "this" of type ' + this_.constructor.name)
    }
    if (!this_.$$.ptr) {
        throwBindingError("cannot call emscripten binding method " + humanName + " on deleted object")
    }
    return upcastPointer(this_.$$.ptr, this_.$$.ptrType.registeredClass, classType.registeredClass)
}
function __embind_register_class_property(classType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
    fieldName = readLatin1String(fieldName);
    getter = requireFunction(getterSignature, getter);
    whenDependentTypesAreResolved([], [classType], (function(classType) {
        classType = classType[0];
        var humanName = classType.name + "." + fieldName;
        var desc = {
            get: (function() {
                throwUnboundTypeError("Cannot access " + humanName + " due to unbound types", [getterReturnType, setterArgumentType])
            }
            ),
            enumerable: true,
            configurable: true
        };
        if (setter) {
            desc.set = (function() {
                throwUnboundTypeError("Cannot access " + humanName + " due to unbound types", [getterReturnType, setterArgumentType])
            }
            )
        } else {
            desc.set = (function(v) {
                throwBindingError(humanName + " is a read-only property")
            }
            )
        }
        Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
        whenDependentTypesAreResolved([], setter ? [getterReturnType, setterArgumentType] : [getterReturnType], (function(types) {
            var getterReturnType = types[0];
            var desc = {
                get: (function() {
                    var ptr = validateThis(this, classType, humanName + " getter");
                    return getterReturnType["fromWireType"](getter(getterContext, ptr))
                }
                ),
                enumerable: true
            };
            if (setter) {
                setter = requireFunction(setterSignature, setter);
                var setterArgumentType = types[1];
                desc.set = (function(v) {
                    var ptr = validateThis(this, classType, humanName + " setter");
                    var destructors = [];
                    setter(setterContext, ptr, setterArgumentType["toWireType"](destructors, v));
                    runDestructors(destructors)
                }
                )
            }
            Object.defineProperty(classType.registeredClass.instancePrototype, fieldName, desc);
            return []
        }
        ));
        return []
    }
    ))
}
function _pthread_once(ptr, func) {
    if (!_pthread_once.seen)
        _pthread_once.seen = {};
    if (ptr in _pthread_once.seen)
        return;
    Runtime.dynCall("v", func);
    _pthread_once.seen[ptr] = 1
}
function ClassHandle_isAliasOf(other) {
    if (!(this instanceof ClassHandle)) {
        return false
    }
    if (!(other instanceof ClassHandle)) {
        return false
    }
    var leftClass = this.$$.ptrType.registeredClass;
    var left = this.$$.ptr;
    var rightClass = other.$$.ptrType.registeredClass;
    var right = other.$$.ptr;
    while (leftClass.baseClass) {
        left = leftClass.upcast(left);
        leftClass = leftClass.baseClass
    }
    while (rightClass.baseClass) {
        right = rightClass.upcast(right);
        rightClass = rightClass.baseClass
    }
    return leftClass === rightClass && left === right
}
function shallowCopyInternalPointer(o) {
    return {
        count: o.count,
        deleteScheduled: o.deleteScheduled,
        preservePointerOnDelete: o.preservePointerOnDelete,
        ptr: o.ptr,
        ptrType: o.ptrType,
        smartPtr: o.smartPtr,
        smartPtrType: o.smartPtrType
    }
}
function throwInstanceAlreadyDeleted(obj) {
    function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name
    }
    throwBindingError(getInstanceTypeName(obj) + " instance already deleted")
}
function ClassHandle_clone() {
    if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this)
    }
    if (this.$$.preservePointerOnDelete) {
        this.$$.count.value += 1;
        return this
    } else {
        var clone = Object.create(Object.getPrototypeOf(this), {
            $$: {
                value: shallowCopyInternalPointer(this.$$)
            }
        });
        clone.$$.count.value += 1;
        clone.$$.deleteScheduled = false;
        return clone
    }
}
function runDestructor(handle) {
    var $$ = handle.$$;
    if ($$.smartPtr) {
        $$.smartPtrType.rawDestructor($$.smartPtr)
    } else {
        $$.ptrType.registeredClass.rawDestructor($$.ptr)
    }
}
function ClassHandle_delete() {
    if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this)
    }
    if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError("Object already scheduled for deletion")
    }
    this.$$.count.value -= 1;
    var toDelete = 0 === this.$$.count.value;
    if (toDelete) {
        runDestructor(this)
    }
    if (!this.$$.preservePointerOnDelete) {
        this.$$.smartPtr = undefined;
        this.$$.ptr = undefined
    }
}
function ClassHandle_isDeleted() {
    return !this.$$.ptr
}
var delayFunction = undefined;
var deletionQueue = [];
function flushPendingDeletes() {
    while (deletionQueue.length) {
        var obj = deletionQueue.pop();
        obj.$$.deleteScheduled = false;
        obj["delete"]()
    }
}
function ClassHandle_deleteLater() {
    if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this)
    }
    if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError("Object already scheduled for deletion")
    }
    deletionQueue.push(this);
    if (deletionQueue.length === 1 && delayFunction) {
        delayFunction(flushPendingDeletes)
    }
    this.$$.deleteScheduled = true;
    return this
}
function init_ClassHandle() {
    ClassHandle.prototype["isAliasOf"] = ClassHandle_isAliasOf;
    ClassHandle.prototype["clone"] = ClassHandle_clone;
    ClassHandle.prototype["delete"] = ClassHandle_delete;
    ClassHandle.prototype["isDeleted"] = ClassHandle_isDeleted;
    ClassHandle.prototype["deleteLater"] = ClassHandle_deleteLater
}
function ClassHandle() {}
var registeredPointers = {};
function RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast) {
    this.name = name;
    this.constructor = constructor;
    this.instancePrototype = instancePrototype;
    this.rawDestructor = rawDestructor;
    this.baseClass = baseClass;
    this.getActualType = getActualType;
    this.upcast = upcast;
    this.downcast = downcast;
    this.pureVirtualFunctions = []
}
function constNoSmartPtrRawPointerToWireType(destructors, handle) {
    if (handle === null) {
        if (this.isReference) {
            throwBindingError("null is not a valid " + this.name)
        }
        return 0
    }
    if (!handle.$$) {
        throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name)
    }
    if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name)
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    return ptr
}
function genericPointerToWireType(destructors, handle) {
    if (handle === null) {
        if (this.isReference) {
            throwBindingError("null is not a valid " + this.name)
        }
        if (this.isSmartPointer) {
            var ptr = this.rawConstructor();
            if (destructors !== null) {
                destructors.push(this.rawDestructor, ptr)
            }
            return ptr
        } else {
            return 0
        }
    }
    if (!handle.$$) {
        throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name)
    }
    if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name)
    }
    if (!this.isConst && handle.$$.ptrType.isConst) {
        throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name)
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    if (this.isSmartPointer) {
        if (undefined === handle.$$.smartPtr) {
            throwBindingError("Passing raw pointer to smart pointer is illegal")
        }
        switch (this.sharingPolicy) {
        case 0:
            if (handle.$$.smartPtrType === this) {
                ptr = handle.$$.smartPtr
            } else {
                throwBindingError("Cannot convert argument of type " + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + " to parameter type " + this.name)
            }
            break;
        case 1:
            ptr = handle.$$.smartPtr;
            break;
        case 2:
            if (handle.$$.smartPtrType === this) {
                ptr = handle.$$.smartPtr
            } else {
                var clonedHandle = handle["clone"]();
                ptr = this.rawShare(ptr, __emval_register((function() {
                    clonedHandle["delete"]()
                }
                )));
                if (destructors !== null) {
                    destructors.push(this.rawDestructor, ptr)
                }
            }
            break;
        default:
            throwBindingError("Unsupporting sharing policy")
        }
    }
    return ptr
}
function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
    if (handle === null) {
        if (this.isReference) {
            throwBindingError("null is not a valid " + this.name)
        }
        return 0
    }
    if (!handle.$$) {
        throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name)
    }
    if (!handle.$$.ptr) {
        throwBindingError("Cannot pass deleted object as a pointer of type " + this.name)
    }
    if (handle.$$.ptrType.isConst) {
        throwBindingError("Cannot convert argument of type " + handle.$$.ptrType.name + " to parameter type " + this.name)
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    return ptr
}
function RegisteredPointer_getPointee(ptr) {
    if (this.rawGetPointee) {
        ptr = this.rawGetPointee(ptr)
    }
    return ptr
}
function RegisteredPointer_destructor(ptr) {
    if (this.rawDestructor) {
        this.rawDestructor(ptr)
    }
}
function RegisteredPointer_deleteObject(handle) {
    if (handle !== null) {
        handle["delete"]()
    }
}
function downcastPointer(ptr, ptrClass, desiredClass) {
    if (ptrClass === desiredClass) {
        return ptr
    }
    if (undefined === desiredClass.baseClass) {
        return null
    }
    var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
    if (rv === null) {
        return null
    }
    return desiredClass.downcast(rv)
}
function getInheritedInstanceCount() {
    return Object.keys(registeredInstances).length
}
function getLiveInheritedInstances() {
    var rv = [];
    for (var k in registeredInstances) {
        if (registeredInstances.hasOwnProperty(k)) {
            rv.push(registeredInstances[k])
        }
    }
    return rv
}
function setDelayFunction(fn) {
    delayFunction = fn;
    if (deletionQueue.length && delayFunction) {
        delayFunction(flushPendingDeletes)
    }
}
function init_embind() {
    Module["getInheritedInstanceCount"] = getInheritedInstanceCount;
    Module["getLiveInheritedInstances"] = getLiveInheritedInstances;
    Module["flushPendingDeletes"] = flushPendingDeletes;
    Module["setDelayFunction"] = setDelayFunction
}
var registeredInstances = {};
function getBasestPointer(class_, ptr) {
    if (ptr === undefined) {
        throwBindingError("ptr should not be undefined")
    }
    while (class_.baseClass) {
        ptr = class_.upcast(ptr);
        class_ = class_.baseClass
    }
    return ptr
}
function getInheritedInstance(class_, ptr) {
    ptr = getBasestPointer(class_, ptr);
    return registeredInstances[ptr]
}
function makeClassHandle(prototype, record) {
    if (!record.ptrType || !record.ptr) {
        throwInternalError("makeClassHandle requires ptr and ptrType")
    }
    var hasSmartPtrType = !!record.smartPtrType;
    var hasSmartPtr = !!record.smartPtr;
    if (hasSmartPtrType !== hasSmartPtr) {
        throwInternalError("Both smartPtrType and smartPtr must be specified")
    }
    record.count = {
        value: 1
    };
    return Object.create(prototype, {
        $$: {
            value: record
        }
    })
}
function RegisteredPointer_fromWireType(ptr) {
    var rawPointer = this.getPointee(ptr);
    if (!rawPointer) {
        this.destructor(ptr);
        return null
    }
    var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
    if (undefined !== registeredInstance) {
        if (0 === registeredInstance.$$.count.value) {
            registeredInstance.$$.ptr = rawPointer;
            registeredInstance.$$.smartPtr = ptr;
            return registeredInstance["clone"]()
        } else {
            var rv = registeredInstance["clone"]();
            this.destructor(ptr);
            return rv
        }
    }
    function makeDefaultHandle() {
        if (this.isSmartPointer) {
            return makeClassHandle(this.registeredClass.instancePrototype, {
                ptrType: this.pointeeType,
                ptr: rawPointer,
                smartPtrType: this,
                smartPtr: ptr
            })
        } else {
            return makeClassHandle(this.registeredClass.instancePrototype, {
                ptrType: this,
                ptr: ptr
            })
        }
    }
    var actualType = this.registeredClass.getActualType(rawPointer);
    var registeredPointerRecord = registeredPointers[actualType];
    if (!registeredPointerRecord) {
        return makeDefaultHandle.call(this)
    }
    var toType;
    if (this.isConst) {
        toType = registeredPointerRecord.constPointerType
    } else {
        toType = registeredPointerRecord.pointerType
    }
    var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
    if (dp === null) {
        return makeDefaultHandle.call(this)
    }
    if (this.isSmartPointer) {
        return makeClassHandle(toType.registeredClass.instancePrototype, {
            ptrType: toType,
            ptr: dp,
            smartPtrType: this,
            smartPtr: ptr
        })
    } else {
        return makeClassHandle(toType.registeredClass.instancePrototype, {
            ptrType: toType,
            ptr: dp
        })
    }
}
function init_RegisteredPointer() {
    RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
    RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
    RegisteredPointer.prototype["argPackAdvance"] = 8;
    RegisteredPointer.prototype["readValueFromPointer"] = simpleReadValueFromPointer;
    RegisteredPointer.prototype["deleteObject"] = RegisteredPointer_deleteObject;
    RegisteredPointer.prototype["fromWireType"] = RegisteredPointer_fromWireType
}
function RegisteredPointer(name, registeredClass, isReference, isConst, isSmartPointer, pointeeType, sharingPolicy, rawGetPointee, rawConstructor, rawShare, rawDestructor) {
    this.name = name;
    this.registeredClass = registeredClass;
    this.isReference = isReference;
    this.isConst = isConst;
    this.isSmartPointer = isSmartPointer;
    this.pointeeType = pointeeType;
    this.sharingPolicy = sharingPolicy;
    this.rawGetPointee = rawGetPointee;
    this.rawConstructor = rawConstructor;
    this.rawShare = rawShare;
    this.rawDestructor = rawDestructor;
    if (!isSmartPointer && registeredClass.baseClass === undefined) {
        if (isConst) {
            this["toWireType"] = constNoSmartPtrRawPointerToWireType;
            this.destructorFunction = null
        } else {
            this["toWireType"] = nonConstNoSmartPtrRawPointerToWireType;
            this.destructorFunction = null
        }
    } else {
        this["toWireType"] = genericPointerToWireType
    }
}
function replacePublicSymbol(name, value, numArguments) {
    if (!Module.hasOwnProperty(name)) {
        throwInternalError("Replacing nonexistant public symbol")
    }
    if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
        Module[name].overloadTable[numArguments] = value
    } else {
        Module[name] = value
    }
}
function __embind_register_class(rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualType, upcastSignature, upcast, downcastSignature, downcast, name, destructorSignature, rawDestructor) {
    name = readLatin1String(name);
    getActualType = requireFunction(getActualTypeSignature, getActualType);
    if (upcast) {
        upcast = requireFunction(upcastSignature, upcast)
    }
    if (downcast) {
        downcast = requireFunction(downcastSignature, downcast)
    }
    rawDestructor = requireFunction(destructorSignature, rawDestructor);
    var legalFunctionName = makeLegalFunctionName(name);
    exposePublicSymbol(legalFunctionName, (function() {
        throwUnboundTypeError("Cannot construct " + name + " due to unbound types", [baseClassRawType])
    }
    ));
    whenDependentTypesAreResolved([rawType, rawPointerType, rawConstPointerType], baseClassRawType ? [baseClassRawType] : [], (function(base) {
        base = base[0];
        var baseClass;
        var basePrototype;
        if (baseClassRawType) {
            baseClass = base.registeredClass;
            basePrototype = baseClass.instancePrototype
        } else {
            basePrototype = ClassHandle.prototype
        }
        var constructor = createNamedFunction(legalFunctionName, (function() {
            if (Object.getPrototypeOf(this) !== instancePrototype) {
                throw new BindingError("Use 'new' to construct " + name)
            }
            if (undefined === registeredClass.constructor_body) {
                throw new BindingError(name + " has no accessible constructor")
            }
            var body = registeredClass.constructor_body[arguments.length];
            if (undefined === body) {
                throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!")
            }
            return body.apply(this, arguments)
        }
        ));
        var instancePrototype = Object.create(basePrototype, {
            constructor: {
                value: constructor
            }
        });
        constructor.prototype = instancePrototype;
        var registeredClass = new RegisteredClass(name,constructor,instancePrototype,rawDestructor,baseClass,getActualType,upcast,downcast);
        var referenceConverter = new RegisteredPointer(name,registeredClass,true,false,false);
        var pointerConverter = new RegisteredPointer(name + "*",registeredClass,false,false,false);
        var constPointerConverter = new RegisteredPointer(name + " const*",registeredClass,false,true,false);
        registeredPointers[rawType] = {
            pointerType: pointerConverter,
            constPointerType: constPointerConverter
        };
        replacePublicSymbol(legalFunctionName, constructor);
        return [referenceConverter, pointerConverter, constPointerConverter]
    }
    ))
}
function ___lock() {}
function ___unlock() {}
function _pthread_getspecific(key) {
    return PTHREAD_SPECIFIC[key] || 0
}
var _llvm_fabs_f64 = Math_abs;
function _clock() {
    if (_clock.start === undefined)
        _clock.start = Date.now();
    return (Date.now() - _clock.start) * (1e6 / 1e3) | 0
}
function __embind_register_emval(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": (function(handle) {
            var rv = emval_handle_array[handle].value;
            __emval_decref(handle);
            return rv
        }
        ),
        "toWireType": (function(destructors, value) {
            return __emval_register(value)
        }
        ),
        "argPackAdvance": 8,
        "readValueFromPointer": simpleReadValueFromPointer,
        destructorFunction: null
    })
}
function _pthread_setspecific(key, value) {
    if (!(key in PTHREAD_SPECIFIC)) {
        return ERRNO_CODES.EINVAL
    }
    PTHREAD_SPECIFIC[key] = value;
    return 0
}
function ___cxa_allocate_exception(size) {
    return _malloc(size)
}
function ___cxa_pure_virtual() {
    ABORT = true;
    throw "Pure virtual function called!"
}
function floatReadValueFromPointer(name, shift) {
    switch (shift) {
    case 2:
        return (function(pointer) {
            return this["fromWireType"](HEAPF32[pointer >> 2])
        }
        );
    case 3:
        return (function(pointer) {
            return this["fromWireType"](HEAPF64[pointer >> 3])
        }
        );
    default:
        throw new TypeError("Unknown float type: " + name)
    }
}
function __embind_register_float(rawType, name, size) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": (function(value) {
            return value
        }
        ),
        "toWireType": (function(destructors, value) {
            if (typeof value !== "number" && typeof value !== "boolean") {
                throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name)
            }
            return value
        }
        ),
        "argPackAdvance": 8,
        "readValueFromPointer": floatReadValueFromPointer(name, shift),
        destructorFunction: null
    })
}
function ___cxa_guard_acquire(variable) {
    if (!HEAP8[variable >> 0]) {
        HEAP8[variable >> 0] = 1;
        return 1
    }
    return 0
}
function ___syscall183(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var buf = SYSCALLS.get()
          , size = SYSCALLS.get();
        if (size === 0)
            return -ERRNO_CODES.EINVAL;
        var cwd = FS.cwd();
        if (size < cwd.length + 1)
            return -ERRNO_CODES.ERANGE;
        writeAsciiToMemory(cwd, buf);
        return buf
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function ___cxa_begin_catch(ptr) {
    __ZSt18uncaught_exceptionv.uncaught_exception--;
    EXCEPTIONS.caught.push(ptr);
    EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
    return ptr
}
function ___syscall3(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD()
          , buf = SYSCALLS.get()
          , count = SYSCALLS.get();
        return FS.read(stream, HEAP8, buf, count)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function ___syscall5(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var pathname = SYSCALLS.getStr()
          , flags = SYSCALLS.get()
          , mode = SYSCALLS.get();
        var stream = FS.open(pathname, flags, mode);
        return stream.fd
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function ___syscall4(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD()
          , buf = SYSCALLS.get()
          , count = SYSCALLS.get();
        return FS.write(stream, HEAP8, buf, count)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function ___syscall6(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD();
        FS.close(stream);
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function __embind_register_std_wstring(rawType, charSize, name) {
    name = readLatin1String(name);
    var getHeap, shift;
    if (charSize === 2) {
        getHeap = (function() {
            return HEAPU16
        }
        );
        shift = 1
    } else if (charSize === 4) {
        getHeap = (function() {
            return HEAPU32
        }
        );
        shift = 2
    }
    registerType(rawType, {
        name: name,
        "fromWireType": (function(value) {
            var HEAP = getHeap();
            var length = HEAPU32[value >> 2];
            var a = new Array(length);
            var start = value + 4 >> shift;
            for (var i = 0; i < length; ++i) {
                a[i] = String.fromCharCode(HEAP[start + i])
            }
            _free(value);
            return a.join("")
        }
        ),
        "toWireType": (function(destructors, value) {
            var HEAP = getHeap();
            var length = value.length;
            var ptr = _malloc(4 + length * charSize);
            HEAPU32[ptr >> 2] = length;
            var start = ptr + 4 >> shift;
            for (var i = 0; i < length; ++i) {
                HEAP[start + i] = value.charCodeAt(i)
            }
            if (destructors !== null) {
                destructors.push(_free, ptr)
            }
            return ptr
        }
        ),
        "argPackAdvance": 8,
        "readValueFromPointer": simpleReadValueFromPointer,
        destructorFunction: (function(ptr) {
            _free(ptr)
        }
        )
    })
}
function ___syscall221(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD()
          , cmd = SYSCALLS.get();
        switch (cmd) {
        case 0:
            {
                var arg = SYSCALLS.get();
                if (arg < 0) {
                    return -ERRNO_CODES.EINVAL
                }
                var newStream;
                newStream = FS.open(stream.path, stream.flags, 0, arg);
                return newStream.fd
            }
            ;
        case 1:
        case 2:
            return 0;
        case 3:
            return stream.flags;
        case 4:
            {
                var arg = SYSCALLS.get();
                stream.flags |= arg;
                return 0
            }
            ;
        case 12:
        case 12:
            {
                var arg = SYSCALLS.get();
                var offset = 0;
                HEAP16[arg + offset >> 1] = 2;
                return 0
            }
            ;
        case 13:
        case 14:
        case 13:
        case 14:
            return 0;
        case 16:
        case 8:
            return -ERRNO_CODES.EINVAL;
        case 9:
            ___setErrNo(ERRNO_CODES.EINVAL);
            return -1;
        default:
            {
                return -ERRNO_CODES.EINVAL
            }
        }
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function heap32VectorToArray(count, firstElement) {
    var array = [];
    for (var i = 0; i < count; i++) {
        array.push(HEAP32[(firstElement >> 2) + i])
    }
    return array
}
function __embind_register_class_constructor(rawClassType, argCount, rawArgTypesAddr, invokerSignature, invoker, rawConstructor) {
    var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
    invoker = requireFunction(invokerSignature, invoker);
    whenDependentTypesAreResolved([], [rawClassType], (function(classType) {
        classType = classType[0];
        var humanName = "constructor " + classType.name;
        if (undefined === classType.registeredClass.constructor_body) {
            classType.registeredClass.constructor_body = []
        }
        if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
            throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount - 1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!")
        }
        classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
            throwUnboundTypeError("Cannot construct " + classType.name + " due to unbound types", rawArgTypes)
        }
        ;
        whenDependentTypesAreResolved([], rawArgTypes, (function(argTypes) {
            classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
                if (arguments.length !== argCount - 1) {
                    throwBindingError(humanName + " called with " + arguments.length + " arguments, expected " + (argCount - 1))
                }
                var destructors = [];
                var args = new Array(argCount);
                args[0] = rawConstructor;
                for (var i = 1; i < argCount; ++i) {
                    args[i] = argTypes[i]["toWireType"](destructors, arguments[i - 1])
                }
                var ptr = invoker.apply(null, args);
                runDestructors(destructors);
                return argTypes[0]["fromWireType"](ptr)
            }
            ;
            return []
        }
        ));
        return []
    }
    ))
}
function _time(ptr) {
    var ret = Date.now() / 1e3 | 0;
    if (ptr) {
        HEAP32[ptr >> 2] = ret
    }
    return ret
}
function _pthread_self() {
    return 0
}
function ___syscall140(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD()
          , offset_high = SYSCALLS.get()
          , offset_low = SYSCALLS.get()
          , result = SYSCALLS.get()
          , whence = SYSCALLS.get();
        var offset = offset_low;
        assert(offset_high === 0);
        FS.llseek(stream, offset, whence);
        HEAP32[result >> 2] = stream.position;
        if (stream.getdents && offset === 0 && whence === 0)
            stream.getdents = null;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function new_(constructor, argumentList) {
    if (!(constructor instanceof Function)) {
        throw new TypeError("new_ called with constructor type " + typeof constructor + " which is not a function")
    }
    var dummy = createNamedFunction(constructor.name || "unknownFunctionName", (function() {}
    ));
    dummy.prototype = constructor.prototype;
    var obj = new dummy;
    var r = constructor.apply(obj, argumentList);
    return r instanceof Object ? r : obj
}
function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
    var argCount = argTypes.length;
    if (argCount < 2) {
        throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!")
    }
    var isClassMethodFunc = argTypes[1] !== null && classType !== null;
    var argsList = "";
    var argsListWired = "";
    for (var i = 0; i < argCount - 2; ++i) {
        argsList += (i !== 0 ? ", " : "") + "arg" + i;
        argsListWired += (i !== 0 ? ", " : "") + "arg" + i + "Wired"
    }
    var invokerFnBody = "return function " + makeLegalFunctionName(humanName) + "(" + argsList + ") {\n" + "if (arguments.length !== " + (argCount - 2) + ") {\n" + "throwBindingError('function " + humanName + " called with ' + arguments.length + ' arguments, expected " + (argCount - 2) + " args!');\n" + "}\n";
    var needsDestructorStack = false;
    for (var i = 1; i < argTypes.length; ++i) {
        if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) {
            needsDestructorStack = true;
            break
        }
    }
    if (needsDestructorStack) {
        invokerFnBody += "var destructors = [];\n"
    }
    var dtorStack = needsDestructorStack ? "destructors" : "null";
    var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
    var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
    if (isClassMethodFunc) {
        invokerFnBody += "var thisWired = classParam.toWireType(" + dtorStack + ", this);\n"
    }
    for (var i = 0; i < argCount - 2; ++i) {
        invokerFnBody += "var arg" + i + "Wired = argType" + i + ".toWireType(" + dtorStack + ", arg" + i + "); // " + argTypes[i + 2].name + "\n";
        args1.push("argType" + i);
        args2.push(argTypes[i + 2])
    }
    if (isClassMethodFunc) {
        argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired
    }
    var returns = argTypes[0].name !== "void";
    invokerFnBody += (returns ? "var rv = " : "") + "invoker(fn" + (argsListWired.length > 0 ? ", " : "") + argsListWired + ");\n";
    if (needsDestructorStack) {
        invokerFnBody += "runDestructors(destructors);\n"
    } else {
        for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
            var paramName = i === 1 ? "thisWired" : "arg" + (i - 2) + "Wired";
            if (argTypes[i].destructorFunction !== null) {
                invokerFnBody += paramName + "_dtor(" + paramName + "); // " + argTypes[i].name + "\n";
                args1.push(paramName + "_dtor");
                args2.push(argTypes[i].destructorFunction)
            }
        }
    }
    if (returns) {
        invokerFnBody += "var ret = retType.fromWireType(rv);\n" + "return ret;\n"
    } else {}
    invokerFnBody += "}\n";
    args1.push(invokerFnBody);
    var invokerFunction = new_(Function, args1).apply(null, args2);
    return invokerFunction
}
function __embind_register_class_function(rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, context, isPureVirtual) {
    var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
    methodName = readLatin1String(methodName);
    rawInvoker = requireFunction(invokerSignature, rawInvoker);
    whenDependentTypesAreResolved([], [rawClassType], (function(classType) {
        classType = classType[0];
        var humanName = classType.name + "." + methodName;
        if (isPureVirtual) {
            classType.registeredClass.pureVirtualFunctions.push(methodName)
        }
        function unboundTypesHandler() {
            throwUnboundTypeError("Cannot call " + humanName + " due to unbound types", rawArgTypes)
        }
        var proto = classType.registeredClass.instancePrototype;
        var method = proto[methodName];
        if (undefined === method || undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2) {
            unboundTypesHandler.argCount = argCount - 2;
            unboundTypesHandler.className = classType.name;
            proto[methodName] = unboundTypesHandler
        } else {
            ensureOverloadTable(proto, methodName, humanName);
            proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler
        }
        whenDependentTypesAreResolved([], rawArgTypes, (function(argTypes) {
            var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
            if (undefined === proto[methodName].overloadTable) {
                proto[methodName] = memberFunction
            } else {
                proto[methodName].overloadTable[argCount - 2] = memberFunction
            }
            return []
        }
        ));
        return []
    }
    ))
}
function ___syscall146(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD()
          , iov = SYSCALLS.get()
          , iovcnt = SYSCALLS.get();
        return SYSCALLS.doWritev(stream, iov, iovcnt)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
function ___syscall145(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD()
          , iov = SYSCALLS.get()
          , iovcnt = SYSCALLS.get();
        return SYSCALLS.doReadv(stream, iov, iovcnt)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))
            abort(e);
        return -e.errno
    }
}
embind_init_charCodes();
BindingError = Module["BindingError"] = extendError(Error, "BindingError");
InternalError = Module["InternalError"] = extendError(Error, "InternalError");
FS.staticInit();
__ATINIT__.unshift((function() {
    if (!Module["noFSInit"] && !FS.init.initialized)
        FS.init()
}
));
__ATMAIN__.push((function() {
    FS.ignorePermissions = false
}
));
__ATEXIT__.push((function() {
    FS.quit()
}
));
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
__ATINIT__.unshift((function() {
    TTY.init()
}
));
__ATEXIT__.push((function() {
    TTY.shutdown()
}
));
if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    var NODEJS_PATH = require("path");
    NODEFS.staticInit()
}
init_emval();
UnboundTypeError = Module["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
init_ClassHandle();
init_RegisteredPointer();
init_embind();
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true;
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
var cttz_i8 = allocate([8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0], "i8", ALLOC_DYNAMIC);
function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    try {
        return Module["dynCall_iiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiid(index, a1, a2, a3, a4, a5, a6) {
    try {
        return Module["dynCall_iiiiiid"](index, a1, a2, a3, a4, a5, a6)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiidiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
        Module["dynCall_viiiidiii"](index, a1, a2, a3, a4, a5, a6, a7, a8)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_vid(index, a1, a2) {
    try {
        Module["dynCall_vid"](index, a1, a2)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiii(index, a1, a2, a3, a4, a5) {
    try {
        Module["dynCall_viiiii"](index, a1, a2, a3, a4, a5)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    try {
        return Module["dynCall_iiiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiidii(index, a1, a2, a3, a4, a5, a6) {
    try {
        Module["dynCall_viiidii"](index, a1, a2, a3, a4, a5, a6)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_vii(index, a1, a2) {
    try {
        Module["dynCall_vii"](index, a1, a2)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
    try {
        return Module["dynCall_iiiiiii"](index, a1, a2, a3, a4, a5, a6)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiiidiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    try {
        return Module["dynCall_iiiiiiidiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_ii(index, a1) {
    try {
        return Module["dynCall_ii"](index, a1)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiiiddi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    try {
        Module["dynCall_viiiiiiiddi"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viidi(index, a1, a2, a3, a4) {
    try {
        Module["dynCall_viidi"](index, a1, a2, a3, a4)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iidi(index, a1, a2, a3) {
    try {
        return Module["dynCall_iidi"](index, a1, a2, a3)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiidd(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
        Module["dynCall_viiiiiidd"](index, a1, a2, a3, a4, a5, a6, a7, a8)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_vidii(index, a1, a2, a3, a4) {
    try {
        Module["dynCall_vidii"](index, a1, a2, a3, a4)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiii(index, a1, a2, a3, a4) {
    try {
        return Module["dynCall_iiiii"](index, a1, a2, a3, a4)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_vidi(index, a1, a2, a3) {
    try {
        Module["dynCall_vidi"](index, a1, a2, a3)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiidiiddi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    try {
        Module["dynCall_viiidiiddi"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiidiii(index, a1, a2, a3, a4, a5, a6, a7) {
    try {
        Module["dynCall_viiidiii"](index, a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) {
    try {
        return Module["dynCall_iiiiiiiiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
    try {
        Module["dynCall_viiiiiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_di(index, a1) {
    try {
        return Module["dynCall_di"](index, a1)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiidii(index, a1, a2, a3, a4, a5, a6) {
    try {
        return Module["dynCall_iiiidii"](index, a1, a2, a3, a4, a5, a6)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiii(index, a1, a2, a3) {
    try {
        return Module["dynCall_iiii"](index, a1, a2, a3)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiiiiiiddi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13) {
    try {
        Module["dynCall_viiiiiiiiiiddi"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiidiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
    try {
        Module["dynCall_viiiiidiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_vi(index, a1) {
    try {
        Module["dynCall_vi"](index, a1)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiiid(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
        Module["dynCall_viiiiiiid"](index, a1, a2, a3, a4, a5, a6, a7, a8)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_diii(index, a1, a2, a3) {
    try {
        return Module["dynCall_diii"](index, a1, a2, a3)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiid(index, a1, a2, a3) {
    try {
        return Module["dynCall_iiid"](index, a1, a2, a3)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viii(index, a1, a2, a3) {
    try {
        Module["dynCall_viii"](index, a1, a2, a3)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiidiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    try {
        Module["dynCall_viiiiidiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_diiiii(index, a1, a2, a3, a4, a5) {
    try {
        return Module["dynCall_diiiii"](index, a1, a2, a3, a4, a5)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiid(index, a1, a2, a3, a4, a5) {
    try {
        Module["dynCall_viiiid"](index, a1, a2, a3, a4, a5)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiidiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
        Module["dynCall_viiidiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
        Module["dynCall_viiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiidiiddi(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    try {
        Module["dynCall_viiiidiiddi"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viid(index, a1, a2, a3) {
    try {
        Module["dynCall_viid"](index, a1, a2, a3)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
    try {
        Module["dynCall_viiiiiii"](index, a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiid(index, a1, a2, a3, a4, a5, a6, a7) {
    try {
        Module["dynCall_viiiiiid"](index, a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    try {
        Module["dynCall_viiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    try {
        Module["dynCall_viiiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iii(index, a1, a2) {
    try {
        return Module["dynCall_iii"](index, a1, a2)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiidi(index, a1, a2, a3, a4, a5, a6) {
    try {
        return Module["dynCall_iiiiidi"](index, a1, a2, a3, a4, a5, a6)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiiiiiiiid(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
    try {
        Module["dynCall_viiiiiiiiiiid"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
    try {
        Module["dynCall_viiiiii"](index, a1, a2, a3, a4, a5, a6)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_dii(index, a1, a2) {
    try {
        return Module["dynCall_dii"](index, a1, a2)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_i(index) {
    try {
        return Module["dynCall_i"](index)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiidii(index, a1, a2, a3, a4, a5, a6, a7) {
    try {
        return Module["dynCall_iiiiidii"](index, a1, a2, a3, a4, a5, a6, a7)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiiiiddiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) {
    try {
        return Module["dynCall_iiiiiiiiddiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiiddi(index, a1, a2, a3, a4, a5, a6) {
    try {
        Module["dynCall_viiiddi"](index, a1, a2, a3, a4, a5, a6)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiidiid(index, a1, a2, a3, a4, a5, a6) {
    try {
        return Module["dynCall_iiidiid"](index, a1, a2, a3, a4, a5, a6)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiid(index, a1, a2, a3, a4) {
    try {
        return Module["dynCall_iiiid"](index, a1, a2, a3, a4)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
    try {
        return Module["dynCall_iiiiii"](index, a1, a2, a3, a4, a5)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiid(index, a1, a2, a3, a4) {
    try {
        Module["dynCall_viiid"](index, a1, a2, a3, a4)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_diiii(index, a1, a2, a3, a4) {
    try {
        return Module["dynCall_diiii"](index, a1, a2, a3, a4)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiiddiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) {
    try {
        return Module["dynCall_iiiiiiddiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_v(index) {
    try {
        Module["dynCall_v"](index)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
    try {
        return Module["dynCall_iiiiiiiii"](index, a1, a2, a3, a4, a5, a6, a7, a8)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiiiddiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    try {
        return Module["dynCall_iiiiiiddiii"](index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiiiid(index, a1, a2, a3, a4, a5) {
    try {
        return Module["dynCall_iiiiid"](index, a1, a2, a3, a4, a5)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_viiii(index, a1, a2, a3, a4) {
    try {
        Module["dynCall_viiii"](index, a1, a2, a3, a4)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")
            throw e;
        asm["setThrew"](1, 0)
    }
}
Module.asmGlobalArg = {
    "Math": Math,
    "Int8Array": Int8Array,
    "Int16Array": Int16Array,
    "Int32Array": Int32Array,
    "Uint8Array": Uint8Array,
    "Uint16Array": Uint16Array,
    "Uint32Array": Uint32Array,
    "Float32Array": Float32Array,
    "Float64Array": Float64Array,
    "NaN": NaN,
    "Infinity": Infinity,
    "byteLength": byteLength
};
Module.asmLibraryArg = {
    "abort": abort,
    "assert": assert,
    "invoke_iiiiiiii": invoke_iiiiiiii,
    "invoke_iiiiiid": invoke_iiiiiid,
    "invoke_viiiidiii": invoke_viiiidiii,
    "invoke_vid": invoke_vid,
    "invoke_viiiii": invoke_viiiii,
    "invoke_iiiiiiiiii": invoke_iiiiiiiiii,
    "invoke_viiidii": invoke_viiidii,
    "invoke_vii": invoke_vii,
    "invoke_iiiiiii": invoke_iiiiiii,
    "invoke_iiiiiiidiiii": invoke_iiiiiiidiiii,
    "invoke_ii": invoke_ii,
    "invoke_viiiiiiiddi": invoke_viiiiiiiddi,
    "invoke_viidi": invoke_viidi,
    "invoke_iidi": invoke_iidi,
    "invoke_viiiiiidd": invoke_viiiiiidd,
    "invoke_vidii": invoke_vidii,
    "invoke_iiiii": invoke_iiiii,
    "invoke_vidi": invoke_vidi,
    "invoke_viiidiiddi": invoke_viiidiiddi,
    "invoke_viiidiii": invoke_viiidiii,
    "invoke_iiiiiiiiiiiiiii": invoke_iiiiiiiiiiiiiii,
    "invoke_viiiiiiiiiiii": invoke_viiiiiiiiiiii,
    "invoke_di": invoke_di,
    "invoke_iiiidii": invoke_iiiidii,
    "invoke_iiii": invoke_iiii,
    "invoke_viiiiiiiiiiddi": invoke_viiiiiiiiiiddi,
    "invoke_viiiiidiiiiii": invoke_viiiiidiiiiii,
    "invoke_vi": invoke_vi,
    "invoke_viiiiiiid": invoke_viiiiiiid,
    "invoke_diii": invoke_diii,
    "invoke_iiid": invoke_iiid,
    "invoke_viii": invoke_viii,
    "invoke_viiiiidiiiii": invoke_viiiiidiiiii,
    "invoke_diiiii": invoke_diiiii,
    "invoke_viiiid": invoke_viiiid,
    "invoke_viiidiiii": invoke_viiidiiii,
    "invoke_viiiiiiii": invoke_viiiiiiii,
    "invoke_viiiidiiddi": invoke_viiiidiiddi,
    "invoke_viid": invoke_viid,
    "invoke_viiiiiii": invoke_viiiiiii,
    "invoke_viiiiiid": invoke_viiiiiid,
    "invoke_viiiiiiiii": invoke_viiiiiiiii,
    "invoke_viiiiiiiiii": invoke_viiiiiiiiii,
    "invoke_iii": invoke_iii,
    "invoke_iiiiidi": invoke_iiiiidi,
    "invoke_viiiiiiiiiiid": invoke_viiiiiiiiiiid,
    "invoke_viiiiii": invoke_viiiiii,
    "invoke_dii": invoke_dii,
    "invoke_i": invoke_i,
    "invoke_iiiiidii": invoke_iiiiidii,
    "invoke_iiiiiiiiddiiiii": invoke_iiiiiiiiddiiiii,
    "invoke_viiiddi": invoke_viiiddi,
    "invoke_iiidiid": invoke_iiidiid,
    "invoke_iiiid": invoke_iiiid,
    "invoke_iiiiii": invoke_iiiiii,
    "invoke_viiid": invoke_viiid,
    "invoke_diiii": invoke_diiii,
    "invoke_iiiiiiddiiii": invoke_iiiiiiddiiii,
    "invoke_v": invoke_v,
    "invoke_iiiiiiiii": invoke_iiiiiiiii,
    "invoke_iiiiiiddiii": invoke_iiiiiiddiii,
    "invoke_iiiiid": invoke_iiiiid,
    "invoke_viiii": invoke_viiii,
    "___syscall221": ___syscall221,
    "floatReadValueFromPointer": floatReadValueFromPointer,
    "simpleReadValueFromPointer": simpleReadValueFromPointer,
    "throwInternalError": throwInternalError,
    "get_first_emval": get_first_emval,
    "___cxa_guard_acquire": ___cxa_guard_acquire,
    "getLiveInheritedInstances": getLiveInheritedInstances,
    "___assert_fail": ___assert_fail,
    "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv,
    "ClassHandle": ClassHandle,
    "getShiftFromSize": getShiftFromSize,
    "__addDays": __addDays,
    "_sbrk": _sbrk,
    "___cxa_begin_catch": ___cxa_begin_catch,
    "_emscripten_memcpy_big": _emscripten_memcpy_big,
    "runDestructor": runDestructor,
    "_sysconf": _sysconf,
    "throwInstanceAlreadyDeleted": throwInstanceAlreadyDeleted,
    "__embind_register_std_string": __embind_register_std_string,
    "_clock": _clock,
    "init_RegisteredPointer": init_RegisteredPointer,
    "ClassHandle_isAliasOf": ClassHandle_isAliasOf,
    "flushPendingDeletes": flushPendingDeletes,
    "__embind_register_enum_value": __embind_register_enum_value,
    "makeClassHandle": makeClassHandle,
    "whenDependentTypesAreResolved": whenDependentTypesAreResolved,
    "___resumeException": ___resumeException,
    "__isLeapYear": __isLeapYear,
    "__embind_register_class_constructor": __embind_register_class_constructor,
    "_llvm_fabs_f64": _llvm_fabs_f64,
    "_pthread_cleanup_push": _pthread_cleanup_push,
    "___syscall140": ___syscall140,
    "constNoSmartPtrRawPointerToWireType": constNoSmartPtrRawPointerToWireType,
    "___syscall145": ___syscall145,
    "___syscall146": ___syscall146,
    "_pthread_cleanup_pop": _pthread_cleanup_pop,
    "___syscall85": ___syscall85,
    "init_ClassHandle": init_ClassHandle,
    "__emval_incref": __emval_incref,
    "___cxa_find_matching_catch": ___cxa_find_matching_catch,
    "___cxa_guard_release": ___cxa_guard_release,
    "___setErrNo": ___setErrNo,
    "_llvm_pow_f32": _llvm_pow_f32,
    "__embind_register_bool": __embind_register_bool,
    "_emscripten_asm_const_v": _emscripten_asm_const_v,
    "createNamedFunction": createNamedFunction,
    "validateThis": validateThis,
    "embind_init_charCodes": embind_init_charCodes,
    "__emval_decref": __emval_decref,
    "_pthread_once": _pthread_once,
    "_pthread_mutex_unlock": _pthread_mutex_unlock,
    "init_embind": init_embind,
    "ClassHandle_clone": ClassHandle_clone,
    "heap32VectorToArray": heap32VectorToArray,
    "ClassHandle_delete": ClassHandle_delete,
    "___syscall3": ___syscall3,
    "RegisteredPointer_destructor": RegisteredPointer_destructor,
    "___syscall6": ___syscall6,
    "___syscall5": ___syscall5,
    "ensureOverloadTable": ensureOverloadTable,
    "__embind_register_emval": __embind_register_emval,
    "_time": _time,
    "_pthread_mutex_lock": _pthread_mutex_lock,
    "new_": new_,
    "downcastPointer": downcastPointer,
    "replacePublicSymbol": replacePublicSymbol,
    "__embind_register_class": __embind_register_class,
    "_llvm_pow_f64": _llvm_pow_f64,
    "ClassHandle_deleteLater": ClassHandle_deleteLater,
    "___syscall54": ___syscall54,
    "RegisteredPointer_deleteObject": RegisteredPointer_deleteObject,
    "ClassHandle_isDeleted": ClassHandle_isDeleted,
    "__embind_register_integer": __embind_register_integer,
    "___cxa_allocate_exception": ___cxa_allocate_exception,
    "__emval_take_value": __emval_take_value,
    "___syscall196": ___syscall196,
    "___syscall195": ___syscall195,
    "enumReadValueFromPointer": enumReadValueFromPointer,
    "_embind_repr": _embind_repr,
    "_strftime": _strftime,
    "throwUnboundTypeError": throwUnboundTypeError,
    "_llvm_fabs_f32": _llvm_fabs_f32,
    "_pthread_mutex_destroy": _pthread_mutex_destroy,
    "runDestructors": runDestructors,
    "requireRegisteredType": requireRegisteredType,
    "makeLegalFunctionName": makeLegalFunctionName,
    "_pthread_key_create": _pthread_key_create,
    "upcastPointer": upcastPointer,
    "init_emval": init_emval,
    "_pthread_cond_broadcast": _pthread_cond_broadcast,
    "shallowCopyInternalPointer": shallowCopyInternalPointer,
    "nonConstNoSmartPtrRawPointerToWireType": nonConstNoSmartPtrRawPointerToWireType,
    "_abort": _abort,
    "throwBindingError": throwBindingError,
    "___syscall183": ___syscall183,
    "getTypeName": getTypeName,
    "__embind_register_class_property": __embind_register_class_property,
    "exposePublicSymbol": exposePublicSymbol,
    "RegisteredPointer_fromWireType": RegisteredPointer_fromWireType,
    "___cxa_pure_virtual": ___cxa_pure_virtual,
    "_pthread_getspecific": _pthread_getspecific,
    "_pthread_cond_wait": _pthread_cond_wait,
    "___lock": ___lock,
    "RegisteredClass": RegisteredClass,
    "__embind_register_memory_view": __embind_register_memory_view,
    "getInheritedInstance": getInheritedInstance,
    "setDelayFunction": setDelayFunction,
    "___gxx_personality_v0": ___gxx_personality_v0,
    "extendError": extendError,
    "___syscall4": ___syscall4,
    "__embind_register_void": __embind_register_void,
    "_strftime_l": _strftime_l,
    "RegisteredPointer_getPointee": RegisteredPointer_getPointee,
    "__emval_register": __emval_register,
    "__embind_register_std_wstring": __embind_register_std_wstring,
    "__embind_register_class_function": __embind_register_class_function,
    "RegisteredPointer": RegisteredPointer,
    "__arraySum": __arraySum,
    "readLatin1String": readLatin1String,
    "craftInvokerFunction": craftInvokerFunction,
    "_pthread_self": _pthread_self,
    "getBasestPointer": getBasestPointer,
    "getInheritedInstanceCount": getInheritedInstanceCount,
    "__embind_register_float": __embind_register_float,
    "integerReadValueFromPointer": integerReadValueFromPointer,
    "___unlock": ___unlock,
    "_pthread_setspecific": _pthread_setspecific,
    "genericPointerToWireType": genericPointerToWireType,
    "registerType": registerType,
    "___cxa_throw": ___cxa_throw,
    "__embind_register_enum": __embind_register_enum,
    "count_emval_handles": count_emval_handles,
    "requireFunction": requireFunction,
    "_pthread_mutex_init": _pthread_mutex_init,
    "STACKTOP": STACKTOP,
    "STACK_MAX": STACK_MAX,
    "tempDoublePtr": tempDoublePtr,
    "ABORT": ABORT,
    "cttz_i8": cttz_i8
};
// EMSCRIPTEN_START_ASM
var asm = Module["asm"]// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive14CvTermCriteriaE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive14CvTermCriteriaE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive14CvTermCriteriaE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_36_2577 = Module["___cxx_global_var_init_36_2577"] = asm["___cxx_global_var_init_36_2577"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE11CvSVMParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE11CvSVMParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE11CvSVMParamsE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive10TimeSeriesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive10TimeSeriesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive10TimeSeriesE11instantiateEv"];
var ___cxx_global_var_init_80_2428 = Module["___cxx_global_var_init_80_2428"] = asm["___cxx_global_var_init_80_2428"];
var ___cxx_global_var_init_149 = Module["___cxx_global_var_init_149"] = asm["___cxx_global_var_init_149"];
var ___cxx_global_var_init_148 = Module["___cxx_global_var_init_148"] = asm["___cxx_global_var_init_148"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE8AfRTreesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE8AfRTreesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE8AfRTreesE11instantiateEv"];
var ___cxx_global_var_init_142 = Module["___cxx_global_var_init_142"] = asm["___cxx_global_var_init_142"];
var ___cxx_global_var_init_141 = Module["___cxx_global_var_init_141"] = asm["___cxx_global_var_init_141"];
var ___cxx_global_var_init_140 = Module["___cxx_global_var_init_140"] = asm["___cxx_global_var_init_140"];
var ___cxx_global_var_init_147 = Module["___cxx_global_var_init_147"] = asm["___cxx_global_var_init_147"];
var ___cxx_global_var_init_146 = Module["___cxx_global_var_init_146"] = asm["___cxx_global_var_init_146"];
var ___cxx_global_var_init_144 = Module["___cxx_global_var_init_144"] = asm["___cxx_global_var_init_144"];
var __GLOBAL__sub_I_imgwarp_cpp = Module["__GLOBAL__sub_I_imgwarp_cpp"] = asm["__GLOBAL__sub_I_imgwarp_cpp"];
var ___cxx_global_var_init_70_1994 = Module["___cxx_global_var_init_70_1994"] = asm["___cxx_global_var_init_70_1994"];
var ___cxx_global_var_init_53_2585 = Module["___cxx_global_var_init_53_2585"] = asm["___cxx_global_var_init_53_2585"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE5CvMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE5CvMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE5CvMatE11instantiateEv"];
var ___cxx_global_var_init_45_2403 = Module["___cxx_global_var_init_45_2403"] = asm["___cxx_global_var_init_45_2403"];
var ___cxx_global_var_init_33_1391 = Module["___cxx_global_var_init_33_1391"] = asm["___cxx_global_var_init_33_1391"];
var ___cxx_global_var_init_60_822 = Module["___cxx_global_var_init_60_822"] = asm["___cxx_global_var_init_60_822"];
var __GLOBAL__sub_I_bind_cpp = Module["__GLOBAL__sub_I_bind_cpp"] = asm["__GLOBAL__sub_I_bind_cpp"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive11CvDTreeNodeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive11CvDTreeNodeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive11CvDTreeNodeE11instantiateEv"];
var __GLOBAL__sub_I_Face_cpp = Module["__GLOBAL__sub_I_Face_cpp"] = asm["__GLOBAL__sub_I_Face_cpp"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_63_1432 = Module["___cxx_global_var_init_63_1432"] = asm["___cxx_global_var_init_63_1432"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveEN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveEN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveEN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_109_2249 = Module["___cxx_global_var_init_109_2249"] = asm["___cxx_global_var_init_109_2249"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_50_1732 = Module["___cxx_global_var_init_50_1732"] = asm["___cxx_global_var_init_50_1732"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_66_1983 = Module["___cxx_global_var_init_66_1983"] = asm["___cxx_global_var_init_66_1983"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7AfDTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7AfDTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7AfDTreeE11instantiateEv"];
var ___cxx_global_var_init_75_1999 = Module["___cxx_global_var_init_75_1999"] = asm["___cxx_global_var_init_75_1999"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_SyncFrameDetector_cpp = Module["__GLOBAL__sub_I_SyncFrameDetector_cpp"] = asm["__GLOBAL__sub_I_SyncFrameDetector_cpp"];
var ___cxx_global_var_init_42_2399 = Module["___cxx_global_var_init_42_2399"] = asm["___cxx_global_var_init_42_2399"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveEN2cv4Mat_IfEEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveEN2cv4Mat_IfEEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveEN2cv4Mat_IfEEE11instantiateEv"];
var ___cxx_global_var_init_79_2427 = Module["___cxx_global_var_init_79_2427"] = asm["___cxx_global_var_init_79_2427"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive21FeatureDataDefaultMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive21FeatureDataDefaultMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive21FeatureDataDefaultMatE11instantiateEv"];
var _main = Module["_main"] = asm["_main"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_Tracker_cpp = Module["__GLOBAL__sub_I_Tracker_cpp"] = asm["__GLOBAL__sub_I_Tracker_cpp"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE5AfSVME11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE5AfSVME11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE5AfSVME11instantiateEv"];
var ___cxx_global_var_init_49_1731 = Module["___cxx_global_var_init_49_1731"] = asm["___cxx_global_var_init_49_1731"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_94_1593 = Module["___cxx_global_var_init_94_1593"] = asm["___cxx_global_var_init_94_1593"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive13CvDTreeParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive13CvDTreeParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive13CvDTreeParamsE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_39_2578 = Module["___cxx_global_var_init_39_2578"] = asm["___cxx_global_var_init_39_2578"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveEN2cv3MatEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveEN2cv3MatEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveEN2cv3MatEE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_68_1985 = Module["___cxx_global_var_init_68_1985"] = asm["___cxx_global_var_init_68_1985"];
var ___cxx_global_var_init_87_2596 = Module["___cxx_global_var_init_87_2596"] = asm["___cxx_global_var_init_87_2596"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveEN2cv3MatEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveEN2cv3MatEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveEN2cv3MatEE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE12AfForestTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE12AfForestTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE12AfForestTreeE11instantiateEv"];
var __GLOBAL__sub_I_affdex_native_bindings_cpp = Module["__GLOBAL__sub_I_affdex_native_bindings_cpp"] = asm["__GLOBAL__sub_I_affdex_native_bindings_cpp"];
var ___cxx_global_var_init_102_2242 = Module["___cxx_global_var_init_102_2242"] = asm["___cxx_global_var_init_102_2242"];
var ___cxx_global_var_init_55_2586 = Module["___cxx_global_var_init_55_2586"] = asm["___cxx_global_var_init_55_2586"];
var ___cxx_global_var_init_38_1411 = Module["___cxx_global_var_init_38_1411"] = asm["___cxx_global_var_init_38_1411"];
var ___cxx_global_var_init_55_2408 = Module["___cxx_global_var_init_55_2408"] = asm["___cxx_global_var_init_55_2408"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7IndexesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7IndexesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7IndexesE11instantiateEv"];
var ___cxx_global_var_init_31 = Module["___cxx_global_var_init_31"] = asm["___cxx_global_var_init_31"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE21FeatureDataDefaultMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE21FeatureDataDefaultMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE21FeatureDataDefaultMatE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_85_1557 = Module["___cxx_global_var_init_85_1557"] = asm["___cxx_global_var_init_85_1557"];
var ___cxx_global_var_init_125_2033 = Module["___cxx_global_var_init_125_2033"] = asm["___cxx_global_var_init_125_2033"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive5CvMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive5CvMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive5CvMatE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __GLOBAL__sub_I_Multiclass_cpp = Module["__GLOBAL__sub_I_Multiclass_cpp"] = asm["__GLOBAL__sub_I_Multiclass_cpp"];
var ___cxx_global_var_init_29 = Module["___cxx_global_var_init_29"] = asm["___cxx_global_var_init_29"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE11CvDTreeNodeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE11CvDTreeNodeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE11CvDTreeNodeE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchiveN2cv3MatEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchiveN2cv3MatEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchiveN2cv3MatEE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_56 = Module["___cxx_global_var_init_56"] = asm["___cxx_global_var_init_56"];
var ___cxx_global_var_init_60_2413 = Module["___cxx_global_var_init_60_2413"] = asm["___cxx_global_var_init_60_2413"];
var __GLOBAL__sub_I_haar_cpp = Module["__GLOBAL__sub_I_haar_cpp"] = asm["__GLOBAL__sub_I_haar_cpp"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_57_1426 = Module["___cxx_global_var_init_57_1426"] = asm["___cxx_global_var_init_57_1426"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE11CvSVMParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE11CvSVMParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE11CvSVMParamsE11instantiateEv"];
var ___cxx_global_var_init_83_2431 = Module["___cxx_global_var_init_83_2431"] = asm["___cxx_global_var_init_83_2431"];
var __GLOBAL__sub_I_AffdexFace_cpp = Module["__GLOBAL__sub_I_AffdexFace_cpp"] = asm["__GLOBAL__sub_I_AffdexFace_cpp"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_PCAProjection_cpp = Module["__GLOBAL__sub_I_PCAProjection_cpp"] = asm["__GLOBAL__sub_I_PCAProjection_cpp"];
var ___cxx_global_var_init_172 = Module["___cxx_global_var_init_172"] = asm["___cxx_global_var_init_172"];
var ___cxx_global_var_init_173 = Module["___cxx_global_var_init_173"] = asm["___cxx_global_var_init_173"];
var ___cxx_global_var_init_171 = Module["___cxx_global_var_init_171"] = asm["___cxx_global_var_init_171"];
var ___cxx_global_var_init_174 = Module["___cxx_global_var_init_174"] = asm["___cxx_global_var_init_174"];
var ___cxx_global_var_init_72_1996 = Module["___cxx_global_var_init_72_1996"] = asm["___cxx_global_var_init_72_1996"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE5CvMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE5CvMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE5CvMatE11instantiateEv"];
var ___cxx_global_var_init_106 = Module["___cxx_global_var_init_106"] = asm["___cxx_global_var_init_106"];
var ___cxx_global_var_init_105 = Module["___cxx_global_var_init_105"] = asm["___cxx_global_var_init_105"];
var ___cxx_global_var_init_104 = Module["___cxx_global_var_init_104"] = asm["___cxx_global_var_init_104"];
var ___cxx_global_var_init_103 = Module["___cxx_global_var_init_103"] = asm["___cxx_global_var_init_103"];
var ___cxx_global_var_init_102 = Module["___cxx_global_var_init_102"] = asm["___cxx_global_var_init_102"];
var ___cxx_global_var_init_101 = Module["___cxx_global_var_init_101"] = asm["___cxx_global_var_init_101"];
var ___cxx_global_var_init_100 = Module["___cxx_global_var_init_100"] = asm["___cxx_global_var_init_100"];
var ___cxx_global_var_init_66_1534 = Module["___cxx_global_var_init_66_1534"] = asm["___cxx_global_var_init_66_1534"];
var ___cxx_global_var_init_109 = Module["___cxx_global_var_init_109"] = asm["___cxx_global_var_init_109"];
var ___cxx_global_var_init_108 = Module["___cxx_global_var_init_108"] = asm["___cxx_global_var_init_108"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_71_1549 = Module["___cxx_global_var_init_71_1549"] = asm["___cxx_global_var_init_71_1549"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive21FeatureDataDefaultVecE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive21FeatureDataDefaultVecE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive21FeatureDataDefaultVecE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7ContextE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7ContextE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7ContextE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE5CvMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE5CvMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE5CvMatE11instantiateEv"];
var ___cxx_global_var_init_39 = Module["___cxx_global_var_init_39"] = asm["___cxx_global_var_init_39"];
var ___cxx_global_var_init_113 = Module["___cxx_global_var_init_113"] = asm["___cxx_global_var_init_113"];
var ___cxx_global_var_init_65_1434 = Module["___cxx_global_var_init_65_1434"] = asm["___cxx_global_var_init_65_1434"];
var ___cxx_global_var_init_60_1139 = Module["___cxx_global_var_init_60_1139"] = asm["___cxx_global_var_init_60_1139"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_hog_cpp = Module["__GLOBAL__sub_I_hog_cpp"] = asm["__GLOBAL__sub_I_hog_cpp"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_Attention_cpp = Module["__GLOBAL__sub_I_Attention_cpp"] = asm["__GLOBAL__sub_I_Attention_cpp"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var __GLOBAL__sub_I_histogram_cpp = Module["__GLOBAL__sub_I_histogram_cpp"] = asm["__GLOBAL__sub_I_histogram_cpp"];
var ___cxx_global_var_init_58 = Module["___cxx_global_var_init_58"] = asm["___cxx_global_var_init_58"];
var ___cxx_global_var_init_59 = Module["___cxx_global_var_init_59"] = asm["___cxx_global_var_init_59"];
var _emscripten_replace_memory = Module["_emscripten_replace_memory"] = asm["_emscripten_replace_memory"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_52 = Module["___cxx_global_var_init_52"] = asm["___cxx_global_var_init_52"];
var ___cxx_global_var_init_53 = Module["___cxx_global_var_init_53"] = asm["___cxx_global_var_init_53"];
var ___cxx_global_var_init_50 = Module["___cxx_global_var_init_50"] = asm["___cxx_global_var_init_50"];
var ___cxx_global_var_init_51 = Module["___cxx_global_var_init_51"] = asm["___cxx_global_var_init_51"];
var ___cxx_global_var_init_59_1138 = Module["___cxx_global_var_init_59_1138"] = asm["___cxx_global_var_init_59_1138"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_54 = Module["___cxx_global_var_init_54"] = asm["___cxx_global_var_init_54"];
var ___cxx_global_var_init_55 = Module["___cxx_global_var_init_55"] = asm["___cxx_global_var_init_55"];
var ___cxx_global_var_init_152 = Module["___cxx_global_var_init_152"] = asm["___cxx_global_var_init_152"];
var __GLOBAL__sub_I_Mask_cpp = Module["__GLOBAL__sub_I_Mask_cpp"] = asm["__GLOBAL__sub_I_Mask_cpp"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive21FeatureDataDefaultMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive21FeatureDataDefaultMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive21FeatureDataDefaultMatE11instantiateEv"];
var ___cxx_global_var_init_153 = Module["___cxx_global_var_init_153"] = asm["___cxx_global_var_init_153"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_103_2604 = Module["___cxx_global_var_init_103_2604"] = asm["___cxx_global_var_init_103_2604"];
var __GLOBAL__sub_I_path_cpp = Module["__GLOBAL__sub_I_path_cpp"] = asm["__GLOBAL__sub_I_path_cpp"];
var ___cxx_global_var_init_92_2012 = Module["___cxx_global_var_init_92_2012"] = asm["___cxx_global_var_init_92_2012"];
var ___cxx_global_var_init_82_2430 = Module["___cxx_global_var_init_82_2430"] = asm["___cxx_global_var_init_82_2430"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7ContextE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7ContextE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7ContextE11instantiateEv"];
var __GLOBAL__sub_I_DetectorBase_cpp = Module["__GLOBAL__sub_I_DetectorBase_cpp"] = asm["__GLOBAL__sub_I_DetectorBase_cpp"];
var ___cxx_global_var_init_62_824 = Module["___cxx_global_var_init_62_824"] = asm["___cxx_global_var_init_62_824"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7FeatureE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7FeatureE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7FeatureE11instantiateEv"];
var ___cxx_global_var_init_94_2445 = Module["___cxx_global_var_init_94_2445"] = asm["___cxx_global_var_init_94_2445"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchiveN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchiveN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchiveN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_57_1972 = Module["___cxx_global_var_init_57_1972"] = asm["___cxx_global_var_init_57_1972"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7IndexesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7IndexesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7IndexesE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE5AfSVME11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE5AfSVME11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE5AfSVME11instantiateEv"];
var __GLOBAL__sub_I_cv_cpp = Module["__GLOBAL__sub_I_cv_cpp"] = asm["__GLOBAL__sub_I_cv_cpp"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_2646 = Module["___cxx_global_var_init_2646"] = asm["___cxx_global_var_init_2646"];
var __GLOBAL__sub_I_MetricsNotchFilter_cpp = Module["__GLOBAL__sub_I_MetricsNotchFilter_cpp"] = asm["__GLOBAL__sub_I_MetricsNotchFilter_cpp"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive12AfForestTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive12AfForestTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive12AfForestTreeE11instantiateEv"];
var ___cxx_global_var_init_107_2247 = Module["___cxx_global_var_init_107_2247"] = asm["___cxx_global_var_init_107_2247"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_43_2580 = Module["___cxx_global_var_init_43_2580"] = asm["___cxx_global_var_init_43_2580"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE11CvDTreeNodeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE11CvDTreeNodeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE11CvDTreeNodeE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive5AfSVME11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive5AfSVME11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive5AfSVME11instantiateEv"];
var ___cxx_global_var_init_35 = Module["___cxx_global_var_init_35"] = asm["___cxx_global_var_init_35"];
var ___cxx_global_var_init_81_2429 = Module["___cxx_global_var_init_81_2429"] = asm["___cxx_global_var_init_81_2429"];
var ___cxx_global_var_init_40_1722 = Module["___cxx_global_var_init_40_1722"] = asm["___cxx_global_var_init_40_1722"];
var ___cxx_global_var_init_134_2454 = Module["___cxx_global_var_init_134_2454"] = asm["___cxx_global_var_init_134_2454"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE21FeatureDataDefaultMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE21FeatureDataDefaultMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE21FeatureDataDefaultMatE11instantiateEv"];
var __GLOBAL__sub_I_DataMultiplication_cpp = Module["__GLOBAL__sub_I_DataMultiplication_cpp"] = asm["__GLOBAL__sub_I_DataMultiplication_cpp"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7ContextE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive12CvDTreeSplitE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive12CvDTreeSplitE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive12CvDTreeSplitE11instantiateEv"];
var ___cxx_global_var_init_59_2588 = Module["___cxx_global_var_init_59_2588"] = asm["___cxx_global_var_init_59_2588"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE14CvTermCriteriaE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE14CvTermCriteriaE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE14CvTermCriteriaE11instantiateEv"];
var ___cxx_global_var_init_95_2600 = Module["___cxx_global_var_init_95_2600"] = asm["___cxx_global_var_init_95_2600"];
var ___cxx_global_var_init_69_1986 = Module["___cxx_global_var_init_69_1986"] = asm["___cxx_global_var_init_69_1986"];
var ___cxx_global_var_init_58_1427 = Module["___cxx_global_var_init_58_1427"] = asm["___cxx_global_var_init_58_1427"];
var ___cxx_global_var_init_41_1723 = Module["___cxx_global_var_init_41_1723"] = asm["___cxx_global_var_init_41_1723"];
var ___cxx_global_var_init_67_1984 = Module["___cxx_global_var_init_67_1984"] = asm["___cxx_global_var_init_67_1984"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE12CvDTreeSplitE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE12CvDTreeSplitE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE12CvDTreeSplitE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveEN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveEN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveEN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_Gender_cpp = Module["__GLOBAL__sub_I_Gender_cpp"] = asm["__GLOBAL__sub_I_Gender_cpp"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchiveN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchiveN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchiveN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_80_1554 = Module["___cxx_global_var_init_80_1554"] = asm["___cxx_global_var_init_80_1554"];
var ___cxx_global_var_init_51_1514 = Module["___cxx_global_var_init_51_1514"] = asm["___cxx_global_var_init_51_1514"];
var __GLOBAL__sub_I_features2d_init_cpp = Module["__GLOBAL__sub_I_features2d_init_cpp"] = asm["__GLOBAL__sub_I_features2d_init_cpp"];
var __GLOBAL__sub_I_error_code_cpp = Module["__GLOBAL__sub_I_error_code_cpp"] = asm["__GLOBAL__sub_I_error_code_cpp"];
var __GLOBAL__sub_I_system_cpp = Module["__GLOBAL__sub_I_system_cpp"] = asm["__GLOBAL__sub_I_system_cpp"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive8AfRTreesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive8AfRTreesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive8AfRTreesE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE21FeatureDataDefaultMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE21FeatureDataDefaultMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE21FeatureDataDefaultMatE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_88 = Module["___cxx_global_var_init_88"] = asm["___cxx_global_var_init_88"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_85 = Module["___cxx_global_var_init_85"] = asm["___cxx_global_var_init_85"];
var ___cxx_global_var_init_84 = Module["___cxx_global_var_init_84"] = asm["___cxx_global_var_init_84"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_44 = Module["___cxx_global_var_init_44"] = asm["___cxx_global_var_init_44"];
var ___cxx_global_var_init_81 = Module["___cxx_global_var_init_81"] = asm["___cxx_global_var_init_81"];
var ___cxx_global_var_init_112_2252 = Module["___cxx_global_var_init_112_2252"] = asm["___cxx_global_var_init_112_2252"];
var ___cxx_global_var_init_83 = Module["___cxx_global_var_init_83"] = asm["___cxx_global_var_init_83"];
var ___cxx_global_var_init_79 = Module["___cxx_global_var_init_79"] = asm["___cxx_global_var_init_79"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive11CvDTreeNodeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive11CvDTreeNodeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive11CvDTreeNodeE11instantiateEv"];
var ___cxx_global_var_init_41_2398 = Module["___cxx_global_var_init_41_2398"] = asm["___cxx_global_var_init_41_2398"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE21FeatureDataDefaultMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_93 = Module["___cxx_global_var_init_93"] = asm["___cxx_global_var_init_93"];
var ___cxx_global_var_init_39_1412 = Module["___cxx_global_var_init_39_1412"] = asm["___cxx_global_var_init_39_1412"];
var ___cxx_global_var_init_75_1551 = Module["___cxx_global_var_init_75_1551"] = asm["___cxx_global_var_init_75_1551"];
var __GLOBAL__sub_I_rtrees_cpp = Module["__GLOBAL__sub_I_rtrees_cpp"] = asm["__GLOBAL__sub_I_rtrees_cpp"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7IndexesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7IndexesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7IndexesE11instantiateEv"];
var ___cxx_global_var_init_78_2426 = Module["___cxx_global_var_init_78_2426"] = asm["___cxx_global_var_init_78_2426"];
var ___cxx_global_var_init_42_1724 = Module["___cxx_global_var_init_42_1724"] = asm["___cxx_global_var_init_42_1724"];
var __GLOBAL__sub_I_ptree_cpp = Module["__GLOBAL__sub_I_ptree_cpp"] = asm["__GLOBAL__sub_I_ptree_cpp"];
var __ZN5boost13serialization18void_cast_registerI21FeatureDataDefaultVec11FeatureDataEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_ = Module["__ZN5boost13serialization18void_cast_registerI21FeatureDataDefaultVec11FeatureDataEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_"] = asm["__ZN5boost13serialization18void_cast_registerI21FeatureDataDefaultVec11FeatureDataEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_"];
var ___cxx_global_var_init_5914 = Module["___cxx_global_var_init_5914"] = asm["___cxx_global_var_init_5914"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_92_2443 = Module["___cxx_global_var_init_92_2443"] = asm["___cxx_global_var_init_92_2443"];
var ___cxx_global_var_init_97_2601 = Module["___cxx_global_var_init_97_2601"] = asm["___cxx_global_var_init_97_2601"];
var ___cxx_global_var_init_70_1536 = Module["___cxx_global_var_init_70_1536"] = asm["___cxx_global_var_init_70_1536"];
var ___cxx_global_var_init_111_2608 = Module["___cxx_global_var_init_111_2608"] = asm["___cxx_global_var_init_111_2608"];
var __GLOBAL__sub_I_BoundingBox_cpp = Module["__GLOBAL__sub_I_BoundingBox_cpp"] = asm["__GLOBAL__sub_I_BoundingBox_cpp"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var _free = Module["_free"] = asm["_free"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_136 = Module["___cxx_global_var_init_136"] = asm["___cxx_global_var_init_136"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_134 = Module["___cxx_global_var_init_134"] = asm["___cxx_global_var_init_134"];
var ___cxx_global_var_init_135 = Module["___cxx_global_var_init_135"] = asm["___cxx_global_var_init_135"];
var ___cxx_global_var_init_132 = Module["___cxx_global_var_init_132"] = asm["___cxx_global_var_init_132"];
var ___cxx_global_var_init_48_2405 = Module["___cxx_global_var_init_48_2405"] = asm["___cxx_global_var_init_48_2405"];
var ___cxx_global_var_init_130 = Module["___cxx_global_var_init_130"] = asm["___cxx_global_var_init_130"];
var ___cxx_global_var_init_131 = Module["___cxx_global_var_init_131"] = asm["___cxx_global_var_init_131"];
var ___cxx_global_var_init_16 = Module["___cxx_global_var_init_16"] = asm["___cxx_global_var_init_16"];
var ___cxx_global_var_init_17 = Module["___cxx_global_var_init_17"] = asm["___cxx_global_var_init_17"];
var ___cxx_global_var_init_76_1552 = Module["___cxx_global_var_init_76_1552"] = asm["___cxx_global_var_init_76_1552"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveEN2cv4Mat_IfEEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveEN2cv4Mat_IfEEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveEN2cv4Mat_IfEEE11instantiateEv"];
var ___cxx_global_var_init_127_2034 = Module["___cxx_global_var_init_127_2034"] = asm["___cxx_global_var_init_127_2034"];
var ___cxx_global_var_init_93_1591 = Module["___cxx_global_var_init_93_1591"] = asm["___cxx_global_var_init_93_1591"];
var ___cxx_global_var_init_75_2422 = Module["___cxx_global_var_init_75_2422"] = asm["___cxx_global_var_init_75_2422"];
var __GLOBAL__sub_I_TimeSeries_cpp = Module["__GLOBAL__sub_I_TimeSeries_cpp"] = asm["__GLOBAL__sub_I_TimeSeries_cpp"];
var ___cxx_global_var_init_78_2592 = Module["___cxx_global_var_init_78_2592"] = asm["___cxx_global_var_init_78_2592"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveEN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveEN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveEN2cv4Mat_IfEEE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive10TimeSeriesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_91_2442 = Module["___cxx_global_var_init_91_2442"] = asm["___cxx_global_var_init_91_2442"];
var ___cxx_global_var_init_49_1418 = Module["___cxx_global_var_init_49_1418"] = asm["___cxx_global_var_init_49_1418"];
var __ZN5boost13serialization18void_cast_registerI12AfForestTree7AfDTreeEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_ = Module["__ZN5boost13serialization18void_cast_registerI12AfForestTree7AfDTreeEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_"] = asm["__ZN5boost13serialization18void_cast_registerI12AfForestTree7AfDTreeEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE10TimeSeriesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE10TimeSeriesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE10TimeSeriesE11instantiateEv"];
var __ZN5boost13serialization18void_cast_registerI21FeatureDataDefaultMat11FeatureDataEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_ = Module["__ZN5boost13serialization18void_cast_registerI21FeatureDataDefaultMat11FeatureDataEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_"] = asm["__ZN5boost13serialization18void_cast_registerI21FeatureDataDefaultMat11FeatureDataEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_46_1416 = Module["___cxx_global_var_init_46_1416"] = asm["___cxx_global_var_init_46_1416"];
var ___cxx_global_var_init_59_1978 = Module["___cxx_global_var_init_59_1978"] = asm["___cxx_global_var_init_59_1978"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_44_2402 = Module["___cxx_global_var_init_44_2402"] = asm["___cxx_global_var_init_44_2402"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7IndexesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7IndexesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7IndexesE11instantiateEv"];
var ___cxx_global_var_init_46_1728 = Module["___cxx_global_var_init_46_1728"] = asm["___cxx_global_var_init_46_1728"];
var ___cxx_global_var_init_92_2599 = Module["___cxx_global_var_init_92_2599"] = asm["___cxx_global_var_init_92_2599"];
var __GLOBAL__sub_I_LDAProjection_cpp = Module["__GLOBAL__sub_I_LDAProjection_cpp"] = asm["__GLOBAL__sub_I_LDAProjection_cpp"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_61_1140 = Module["___cxx_global_var_init_61_1140"] = asm["___cxx_global_var_init_61_1140"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_105_2605 = Module["___cxx_global_var_init_105_2605"] = asm["___cxx_global_var_init_105_2605"];
var ___cxx_global_var_init_95_1594 = Module["___cxx_global_var_init_95_1594"] = asm["___cxx_global_var_init_95_1594"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive21FeatureDataDefaultVecE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive21FeatureDataDefaultVecE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive21FeatureDataDefaultVecE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_50_1419 = Module["___cxx_global_var_init_50_1419"] = asm["___cxx_global_var_init_50_1419"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE13CvDTreeParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE13CvDTreeParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE13CvDTreeParamsE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_Mirror_cpp = Module["__GLOBAL__sub_I_Mirror_cpp"] = asm["__GLOBAL__sub_I_Mirror_cpp"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7FeatureE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7FeatureE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7FeatureE11instantiateEv"];
var __GLOBAL__sub_I_Average1D_cpp = Module["__GLOBAL__sub_I_Average1D_cpp"] = asm["__GLOBAL__sub_I_Average1D_cpp"];
var ___cxx_global_var_init_113_2253 = Module["___cxx_global_var_init_113_2253"] = asm["___cxx_global_var_init_113_2253"];
var ___cxx_global_var_init_5898 = Module["___cxx_global_var_init_5898"] = asm["___cxx_global_var_init_5898"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_104_2244 = Module["___cxx_global_var_init_104_2244"] = asm["___cxx_global_var_init_104_2244"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_65_1982 = Module["___cxx_global_var_init_65_1982"] = asm["___cxx_global_var_init_65_1982"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7ContextE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7ContextE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7ContextE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE10TimeSeriesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE10TimeSeriesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE10TimeSeriesE11instantiateEv"];
var ___cxx_global_var_init_35_1718 = Module["___cxx_global_var_init_35_1718"] = asm["___cxx_global_var_init_35_1718"];
var ___cxx_global_var_init_30_819 = Module["___cxx_global_var_init_30_819"] = asm["___cxx_global_var_init_30_819"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_base_Integration_cpp = Module["__GLOBAL__sub_I_base_Integration_cpp"] = asm["__GLOBAL__sub_I_base_Integration_cpp"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive11CvSVMParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive11CvSVMParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive11CvSVMParamsE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7ContextE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7ContextE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7ContextE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE12CvDTreeSplitE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE12CvDTreeSplitE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE12CvDTreeSplitE11instantiateEv"];
var __GLOBAL__sub_I_Emoji_cpp = Module["__GLOBAL__sub_I_Emoji_cpp"] = asm["__GLOBAL__sub_I_Emoji_cpp"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __GLOBAL__sub_I_MapperFactory_cpp = Module["__GLOBAL__sub_I_MapperFactory_cpp"] = asm["__GLOBAL__sub_I_MapperFactory_cpp"];
var ___cxx_global_var_init_106_2449 = Module["___cxx_global_var_init_106_2449"] = asm["___cxx_global_var_init_106_2449"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_48 = Module["___cxx_global_var_init_48"] = asm["___cxx_global_var_init_48"];
var ___cxx_global_var_init_72_2421 = Module["___cxx_global_var_init_72_2421"] = asm["___cxx_global_var_init_72_2421"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7FeatureE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7FeatureE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7FeatureE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_97_2448 = Module["___cxx_global_var_init_97_2448"] = asm["___cxx_global_var_init_97_2448"];
var ___cxx_global_var_init_117_2451 = Module["___cxx_global_var_init_117_2451"] = asm["___cxx_global_var_init_117_2451"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_86_2006 = Module["___cxx_global_var_init_86_2006"] = asm["___cxx_global_var_init_86_2006"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_62_2415 = Module["___cxx_global_var_init_62_2415"] = asm["___cxx_global_var_init_62_2415"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_96_2016 = Module["___cxx_global_var_init_96_2016"] = asm["___cxx_global_var_init_96_2016"];
var ___cxx_global_var_init_161 = Module["___cxx_global_var_init_161"] = asm["___cxx_global_var_init_161"];
var __GLOBAL__sub_I_svm_cpp = Module["__GLOBAL__sub_I_svm_cpp"] = asm["__GLOBAL__sub_I_svm_cpp"];
var ___cxx_global_var_init_163 = Module["___cxx_global_var_init_163"] = asm["___cxx_global_var_init_163"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE10TimeSeriesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE10TimeSeriesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE10TimeSeriesE11instantiateEv"];
var ___cxx_global_var_init_165 = Module["___cxx_global_var_init_165"] = asm["___cxx_global_var_init_165"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE13CvDTreeParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE13CvDTreeParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE13CvDTreeParamsE11instantiateEv"];
var ___cxx_global_var_init_169 = Module["___cxx_global_var_init_169"] = asm["___cxx_global_var_init_169"];
var ___cxx_global_var_init_168 = Module["___cxx_global_var_init_168"] = asm["___cxx_global_var_init_168"];
var ___cxx_global_var_init_87_2010 = Module["___cxx_global_var_init_87_2010"] = asm["___cxx_global_var_init_87_2010"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7AfDTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __GLOBAL__sub_I_LinearRegression_cpp = Module["__GLOBAL__sub_I_LinearRegression_cpp"] = asm["__GLOBAL__sub_I_LinearRegression_cpp"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_41_1413 = Module["___cxx_global_var_init_41_1413"] = asm["___cxx_global_var_init_41_1413"];
var __GLOBAL__sub_I_Pose3D_cpp = Module["__GLOBAL__sub_I_Pose3D_cpp"] = asm["__GLOBAL__sub_I_Pose3D_cpp"];
var ___cxx_global_var_init_35_1410 = Module["___cxx_global_var_init_35_1410"] = asm["___cxx_global_var_init_35_1410"];
var ___cxx_global_var_init_58_1973 = Module["___cxx_global_var_init_58_1973"] = asm["___cxx_global_var_init_58_1973"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __GLOBAL__sub_I_Warp3D_cpp = Module["__GLOBAL__sub_I_Warp3D_cpp"] = asm["__GLOBAL__sub_I_Warp3D_cpp"];
var ___cxx_global_var_init_39_983 = Module["___cxx_global_var_init_39_983"] = asm["___cxx_global_var_init_39_983"];
var ___cxx_global_var_init_77_1553 = Module["___cxx_global_var_init_77_1553"] = asm["___cxx_global_var_init_77_1553"];
var ___cxx_global_var_init_28 = Module["___cxx_global_var_init_28"] = asm["___cxx_global_var_init_28"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive5AfSVME11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive5AfSVME11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive5AfSVME11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_45_1727 = Module["___cxx_global_var_init_45_1727"] = asm["___cxx_global_var_init_45_1727"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE21FeatureDataDefaultVecE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE21FeatureDataDefaultVecE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE21FeatureDataDefaultVecE11instantiateEv"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_5868 = Module["___cxx_global_var_init_5868"] = asm["___cxx_global_var_init_5868"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive10TimeSeriesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive10TimeSeriesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive10TimeSeriesE11instantiateEv"];
var ___cxx_global_var_init_45_2581 = Module["___cxx_global_var_init_45_2581"] = asm["___cxx_global_var_init_45_2581"];
var ___cxx_global_var_init_1 = Module["___cxx_global_var_init_1"] = asm["___cxx_global_var_init_1"];
var ___cxx_global_var_init_63_1981 = Module["___cxx_global_var_init_63_1981"] = asm["___cxx_global_var_init_63_1981"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_SingleFaceDetectorBase_cpp = Module["__GLOBAL__sub_I_SingleFaceDetectorBase_cpp"] = asm["__GLOBAL__sub_I_SingleFaceDetectorBase_cpp"];
var ___cxx_global_var_init_69 = Module["___cxx_global_var_init_69"] = asm["___cxx_global_var_init_69"];
var ___cxx_global_var_init_68 = Module["___cxx_global_var_init_68"] = asm["___cxx_global_var_init_68"];
var ___cxx_global_var_init_67 = Module["___cxx_global_var_init_67"] = asm["___cxx_global_var_init_67"];
var ___cxx_global_var_init_66 = Module["___cxx_global_var_init_66"] = asm["___cxx_global_var_init_66"];
var ___cxx_global_var_init_65 = Module["___cxx_global_var_init_65"] = asm["___cxx_global_var_init_65"];
var ___cxx_global_var_init_64 = Module["___cxx_global_var_init_64"] = asm["___cxx_global_var_init_64"];
var ___cxx_global_var_init_63 = Module["___cxx_global_var_init_63"] = asm["___cxx_global_var_init_63"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_61 = Module["___cxx_global_var_init_61"] = asm["___cxx_global_var_init_61"];
var ___cxx_global_var_init_60 = Module["___cxx_global_var_init_60"] = asm["___cxx_global_var_init_60"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_47_1417 = Module["___cxx_global_var_init_47_1417"] = asm["___cxx_global_var_init_47_1417"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_55_1137 = Module["___cxx_global_var_init_55_1137"] = asm["___cxx_global_var_init_55_1137"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_95_2446 = Module["___cxx_global_var_init_95_2446"] = asm["___cxx_global_var_init_95_2446"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE12CvDTreeSplitE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE12CvDTreeSplitE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE12CvDTreeSplitE11instantiateEv"];
var ___cxx_global_var_init_32_1390 = Module["___cxx_global_var_init_32_1390"] = asm["___cxx_global_var_init_32_1390"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_50_2584 = Module["___cxx_global_var_init_50_2584"] = asm["___cxx_global_var_init_50_2584"];
var ___cxx_global_var_init_59_1428 = Module["___cxx_global_var_init_59_1428"] = asm["___cxx_global_var_init_59_1428"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_Indexes_cpp = Module["__GLOBAL__sub_I_Indexes_cpp"] = asm["__GLOBAL__sub_I_Indexes_cpp"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_67_1535 = Module["___cxx_global_var_init_67_1535"] = asm["___cxx_global_var_init_67_1535"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_162 = Module["___cxx_global_var_init_162"] = asm["___cxx_global_var_init_162"];
var __GLOBAL__sub_I_Mapper_cpp = Module["__GLOBAL__sub_I_Mapper_cpp"] = asm["__GLOBAL__sub_I_Mapper_cpp"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive8AfRTreesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive8AfRTreesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive8AfRTreesE11instantiateEv"];
var ___cxx_global_var_init_127 = Module["___cxx_global_var_init_127"] = asm["___cxx_global_var_init_127"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchiveN2cv4Mat_IfEEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchiveN2cv4Mat_IfEEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchiveN2cv4Mat_IfEEE11instantiateEv"];
var ___cxx_global_var_init_126 = Module["___cxx_global_var_init_126"] = asm["___cxx_global_var_init_126"];
var __GLOBAL__sub_I_iostream_cpp = Module["__GLOBAL__sub_I_iostream_cpp"] = asm["__GLOBAL__sub_I_iostream_cpp"];
var ___cxx_global_var_init_112_2450 = Module["___cxx_global_var_init_112_2450"] = asm["___cxx_global_var_init_112_2450"];
var ___cxx_global_var_init_51_1133 = Module["___cxx_global_var_init_51_1133"] = asm["___cxx_global_var_init_51_1133"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE13CvDTreeParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7AfDTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7AfDTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7AfDTreeE11instantiateEv"];
var ___cxx_global_var_init_50_1132 = Module["___cxx_global_var_init_50_1132"] = asm["___cxx_global_var_init_50_1132"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive5CvMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive5CvMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive5CvMatE11instantiateEv"];
var ___cxx_global_var_init_26 = Module["___cxx_global_var_init_26"] = asm["___cxx_global_var_init_26"];
var ___cxx_global_var_init_81_2003 = Module["___cxx_global_var_init_81_2003"] = asm["___cxx_global_var_init_81_2003"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE11CvSVMParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE11CvSVMParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE11CvSVMParamsE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive5CvMatE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_ViolaJones_cpp = Module["__GLOBAL__sub_I_ViolaJones_cpp"] = asm["__GLOBAL__sub_I_ViolaJones_cpp"];
var _bitshift64Ashr = Module["_bitshift64Ashr"] = asm["_bitshift64Ashr"];
var ___cxx_global_var_init_71_2420 = Module["___cxx_global_var_init_71_2420"] = asm["___cxx_global_var_init_71_2420"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE14CvTermCriteriaE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE14CvTermCriteriaE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE14CvTermCriteriaE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7ContextE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive12AfForestTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive12AfForestTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive12AfForestTreeE11instantiateEv"];
var ___cxx_global_var_init_56_2411 = Module["___cxx_global_var_init_56_2411"] = asm["___cxx_global_var_init_56_2411"];
var ___cxx_global_var_init_72_1550 = Module["___cxx_global_var_init_72_1550"] = asm["___cxx_global_var_init_72_1550"];
var __GLOBAL__sub_I_rolling_algo_cpp = Module["__GLOBAL__sub_I_rolling_algo_cpp"] = asm["__GLOBAL__sub_I_rolling_algo_cpp"];
var ___cxx_global_var_init_110_2250 = Module["___cxx_global_var_init_110_2250"] = asm["___cxx_global_var_init_110_2250"];
var ___cxx_global_var_init_99_2602 = Module["___cxx_global_var_init_99_2602"] = asm["___cxx_global_var_init_99_2602"];
var ___cxx_global_var_init_49_2406 = Module["___cxx_global_var_init_49_2406"] = asm["___cxx_global_var_init_49_2406"];
var __GLOBAL__sub_I_HOG_cpp = Module["__GLOBAL__sub_I_HOG_cpp"] = asm["__GLOBAL__sub_I_HOG_cpp"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__I_000101 = Module["__GLOBAL__I_000101"] = asm["__GLOBAL__I_000101"];
var ___cxx_global_var_init_33_1716 = Module["___cxx_global_var_init_33_1716"] = asm["___cxx_global_var_init_33_1716"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_file_utils_cpp = Module["__GLOBAL__sub_I_file_utils_cpp"] = asm["__GLOBAL__sub_I_file_utils_cpp"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7AfDTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_99 = Module["___cxx_global_var_init_99"] = asm["___cxx_global_var_init_99"];
var ___cxx_global_var_init_96 = Module["___cxx_global_var_init_96"] = asm["___cxx_global_var_init_96"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE21FeatureDataDefaultVecE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE21FeatureDataDefaultVecE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE21FeatureDataDefaultVecE11instantiateEv"];
var ___cxx_global_var_init_94 = Module["___cxx_global_var_init_94"] = asm["___cxx_global_var_init_94"];
var ___cxx_global_var_init_95 = Module["___cxx_global_var_init_95"] = asm["___cxx_global_var_init_95"];
var ___cxx_global_var_init_92 = Module["___cxx_global_var_init_92"] = asm["___cxx_global_var_init_92"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchiveN2cv3MatEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchiveN2cv3MatEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchiveN2cv3MatEE11instantiateEv"];
var ___cxx_global_var_init_90 = Module["___cxx_global_var_init_90"] = asm["___cxx_global_var_init_90"];
var ___cxx_global_var_init_91 = Module["___cxx_global_var_init_91"] = asm["___cxx_global_var_init_91"];
var ___cxx_global_var_init_41_2579 = Module["___cxx_global_var_init_41_2579"] = asm["___cxx_global_var_init_41_2579"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE21FeatureDataDefaultMatE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_52_1420 = Module["___cxx_global_var_init_52_1420"] = asm["___cxx_global_var_init_52_1420"];
var ___cxx_global_var_init_48_1730 = Module["___cxx_global_var_init_48_1730"] = asm["___cxx_global_var_init_48_1730"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive8AfRTreesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_DataQuality_cpp = Module["__GLOBAL__sub_I_DataQuality_cpp"] = asm["__GLOBAL__sub_I_DataQuality_cpp"];
var ___cxx_global_var_init_57_2412 = Module["___cxx_global_var_init_57_2412"] = asm["___cxx_global_var_init_57_2412"];
var ___cxx_global_var_init_89 = Module["___cxx_global_var_init_89"] = asm["___cxx_global_var_init_89"];
var __GLOBAL__sub_I_OCVFeatureDetector_cpp = Module["__GLOBAL__sub_I_OCVFeatureDetector_cpp"] = asm["__GLOBAL__sub_I_OCVFeatureDetector_cpp"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_60_1979 = Module["___cxx_global_var_init_60_1979"] = asm["___cxx_global_var_init_60_1979"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7ContextE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7ContextE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7ContextE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE8AfRTreesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE8AfRTreesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE8AfRTreesE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_21 = Module["___cxx_global_var_init_21"] = asm["___cxx_global_var_init_21"];
var ___cxx_global_var_init_95_2015 = Module["___cxx_global_var_init_95_2015"] = asm["___cxx_global_var_init_95_2015"];
var ___cxx_global_var_init_27 = Module["___cxx_global_var_init_27"] = asm["___cxx_global_var_init_27"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive13CvDTreeParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_AffineWarp_cpp = Module["__GLOBAL__sub_I_AffineWarp_cpp"] = asm["__GLOBAL__sub_I_AffineWarp_cpp"];
var ___cxx_global_var_init_82_1556 = Module["___cxx_global_var_init_82_1556"] = asm["___cxx_global_var_init_82_1556"];
var ___cxx_global_var_init_91_2598 = Module["___cxx_global_var_init_91_2598"] = asm["___cxx_global_var_init_91_2598"];
var ___cxx_global_var_init_81_1555 = Module["___cxx_global_var_init_81_1555"] = asm["___cxx_global_var_init_81_1555"];
var ___cxx_global_var_init_106_2606 = Module["___cxx_global_var_init_106_2606"] = asm["___cxx_global_var_init_106_2606"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7AfDTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7AfDTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7AfDTreeE11instantiateEv"];
var ___cxx_global_var_init_65_2416 = Module["___cxx_global_var_init_65_2416"] = asm["___cxx_global_var_init_65_2416"];
var ___cxx_global_var_init_76_2423 = Module["___cxx_global_var_init_76_2423"] = asm["___cxx_global_var_init_76_2423"];
var ___cxx_global_var_init_129 = Module["___cxx_global_var_init_129"] = asm["___cxx_global_var_init_129"];
var ___cxx_global_var_init_128 = Module["___cxx_global_var_init_128"] = asm["___cxx_global_var_init_128"];
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = asm["___cxa_is_pointer_type"];
var ___cxx_global_var_init_125 = Module["___cxx_global_var_init_125"] = asm["___cxx_global_var_init_125"];
var ___cxx_global_var_init_124 = Module["___cxx_global_var_init_124"] = asm["___cxx_global_var_init_124"];
var ___cxx_global_var_init_62_1431 = Module["___cxx_global_var_init_62_1431"] = asm["___cxx_global_var_init_62_1431"];
var ___cxx_global_var_init_128_2453 = Module["___cxx_global_var_init_128_2453"] = asm["___cxx_global_var_init_128_2453"];
var ___cxx_global_var_init_120 = Module["___cxx_global_var_init_120"] = asm["___cxx_global_var_init_120"];
var ___cxx_global_var_init_123 = Module["___cxx_global_var_init_123"] = asm["___cxx_global_var_init_123"];
var ___cxx_global_var_init_122 = Module["___cxx_global_var_init_122"] = asm["___cxx_global_var_init_122"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_123_2018 = Module["___cxx_global_var_init_123_2018"] = asm["___cxx_global_var_init_123_2018"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive14CvTermCriteriaE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive14CvTermCriteriaE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive14CvTermCriteriaE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7IndexesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_117_2610 = Module["___cxx_global_var_init_117_2610"] = asm["___cxx_global_var_init_117_2610"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENS_10shared_ptrI6MapperEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENS_10shared_ptrI6MapperEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENS_10shared_ptrI6MapperEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_82 = Module["___cxx_global_var_init_82"] = asm["___cxx_global_var_init_82"];
var ___cxx_global_var_init_98 = Module["___cxx_global_var_init_98"] = asm["___cxx_global_var_init_98"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE10TimeSeriesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE10TimeSeriesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE10TimeSeriesE11instantiateEv"];
var ___cxx_global_var_init_61_1430 = Module["___cxx_global_var_init_61_1430"] = asm["___cxx_global_var_init_61_1430"];
var ___cxx_global_var_init_89_1559 = Module["___cxx_global_var_init_89_1559"] = asm["___cxx_global_var_init_89_1559"];
var ___cxx_global_var_init_25 = Module["___cxx_global_var_init_25"] = asm["___cxx_global_var_init_25"];
var ___cxx_global_var_init_53_1135 = Module["___cxx_global_var_init_53_1135"] = asm["___cxx_global_var_init_53_1135"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_65_1517 = Module["___cxx_global_var_init_65_1517"] = asm["___cxx_global_var_init_65_1517"];
var ___cxx_global_var_init_43_2401 = Module["___cxx_global_var_init_43_2401"] = asm["___cxx_global_var_init_43_2401"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE5CvMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_5994 = Module["___cxx_global_var_init_5994"] = asm["___cxx_global_var_init_5994"];
var __GLOBAL__sub_I_configuration_utils_cpp = Module["__GLOBAL__sub_I_configuration_utils_cpp"] = asm["__GLOBAL__sub_I_configuration_utils_cpp"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7FeatureE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7FeatureE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE7FeatureE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE21FeatureDataDefaultVecE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE21FeatureDataDefaultVecE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE21FeatureDataDefaultVecE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveEN2cv4Mat_IfEEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveEN2cv4Mat_IfEEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveEN2cv4Mat_IfEEE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE10TimeSeriesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7IndexesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7IndexesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7IndexesE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive12CvDTreeSplitE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE13CvDTreeParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE13CvDTreeParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE13CvDTreeParamsE11instantiateEv"];
var ___cxx_global_var_init_55_1422 = Module["___cxx_global_var_init_55_1422"] = asm["___cxx_global_var_init_55_1422"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveEN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveEN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveEN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11CvSVMParamsE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_109_2607 = Module["___cxx_global_var_init_109_2607"] = asm["___cxx_global_var_init_109_2607"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_77_2425 = Module["___cxx_global_var_init_77_2425"] = asm["___cxx_global_var_init_77_2425"];
var ___cxx_global_var_init_93_2444 = Module["___cxx_global_var_init_93_2444"] = asm["___cxx_global_var_init_93_2444"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_97 = Module["___cxx_global_var_init_97"] = asm["___cxx_global_var_init_97"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENS_10shared_ptrI11FeatureDataEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_57 = Module["___cxx_global_var_init_57"] = asm["___cxx_global_var_init_57"];
var ___cxx_global_var_init_86_2437 = Module["___cxx_global_var_init_86_2437"] = asm["___cxx_global_var_init_86_2437"];
var ___cxx_global_var_init_61_2589 = Module["___cxx_global_var_init_61_2589"] = asm["___cxx_global_var_init_61_2589"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_RandomForest_cpp = Module["__GLOBAL__sub_I_RandomForest_cpp"] = asm["__GLOBAL__sub_I_RandomForest_cpp"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_66_2417 = Module["___cxx_global_var_init_66_2417"] = asm["___cxx_global_var_init_66_2417"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE16CvDTreeTrainDataE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive11CvSVMParamsE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveEN2cv4Mat_IfEEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveEN2cv4Mat_IfEEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveEN2cv4Mat_IfEEE11instantiateEv"];
var __GLOBAL__sub_I_regex_cpp = Module["__GLOBAL__sub_I_regex_cpp"] = asm["__GLOBAL__sub_I_regex_cpp"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_86_1558 = Module["___cxx_global_var_init_86_1558"] = asm["___cxx_global_var_init_86_1558"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7ContextE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7AfDTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7AfDTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive7AfDTreeE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN2cv3MatEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_operations_cpp = Module["__GLOBAL__sub_I_operations_cpp"] = asm["__GLOBAL__sub_I_operations_cpp"];
var __GLOBAL__sub_I_MetricsFilter_cpp = Module["__GLOBAL__sub_I_MetricsFilter_cpp"] = asm["__GLOBAL__sub_I_MetricsFilter_cpp"];
var ___cxx_global_var_init_61_1980 = Module["___cxx_global_var_init_61_1980"] = asm["___cxx_global_var_init_61_1980"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_58_820 = Module["___cxx_global_var_init_58_820"] = asm["___cxx_global_var_init_58_820"];
var ___cxx_global_var_init_63_2590 = Module["___cxx_global_var_init_63_2590"] = asm["___cxx_global_var_init_63_2590"];
var ___cxx_global_var_init_35_2576 = Module["___cxx_global_var_init_35_2576"] = asm["___cxx_global_var_init_35_2576"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_113_2609 = Module["___cxx_global_var_init_113_2609"] = asm["___cxx_global_var_init_113_2609"];
var ___cxx_global_var_init_67_2418 = Module["___cxx_global_var_init_67_2418"] = asm["___cxx_global_var_init_67_2418"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7AfDTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_44_1726 = Module["___cxx_global_var_init_44_1726"] = asm["___cxx_global_var_init_44_1726"];
var __GLOBAL__sub_I_Emotion_cpp = Module["__GLOBAL__sub_I_Emotion_cpp"] = asm["__GLOBAL__sub_I_Emotion_cpp"];
var ___cxx_global_var_init_83_2594 = Module["___cxx_global_var_init_83_2594"] = asm["___cxx_global_var_init_83_2594"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE11CvDTreeNodeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN9boost_1326detail12shared_countEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_86 = Module["___cxx_global_var_init_86"] = asm["___cxx_global_var_init_86"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveEN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveEN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveEN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE8AfRTreesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_154 = Module["___cxx_global_var_init_154"] = asm["___cxx_global_var_init_154"];
var ___cxx_global_var_init_155 = Module["___cxx_global_var_init_155"] = asm["___cxx_global_var_init_155"];
var ___cxx_global_var_init_156 = Module["___cxx_global_var_init_156"] = asm["___cxx_global_var_init_156"];
var ___cxx_global_var_init_157 = Module["___cxx_global_var_init_157"] = asm["___cxx_global_var_init_157"];
var ___cxx_global_var_init_150 = Module["___cxx_global_var_init_150"] = asm["___cxx_global_var_init_150"];
var ___cxx_global_var_init_151 = Module["___cxx_global_var_init_151"] = asm["___cxx_global_var_init_151"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN2cv4Mat_IfEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_158 = Module["___cxx_global_var_init_158"] = asm["___cxx_global_var_init_158"];
var ___cxx_global_var_init_159 = Module["___cxx_global_var_init_159"] = asm["___cxx_global_var_init_159"];
var ___cxx_global_var_init_124_2019 = Module["___cxx_global_var_init_124_2019"] = asm["___cxx_global_var_init_124_2019"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveEN2cv3MatEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE8AfRTreesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE8AfRTreesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE8AfRTreesE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_108_2248 = Module["___cxx_global_var_init_108_2248"] = asm["___cxx_global_var_init_108_2248"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE21FeatureDataDefaultVecE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_ViolaJonesPOI_cpp = Module["__GLOBAL__sub_I_ViolaJonesPOI_cpp"] = asm["__GLOBAL__sub_I_ViolaJonesPOI_cpp"];
var ___cxx_global_var_init_42_1414 = Module["___cxx_global_var_init_42_1414"] = asm["___cxx_global_var_init_42_1414"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_91_2011 = Module["___cxx_global_var_init_91_2011"] = asm["___cxx_global_var_init_91_2011"];
var ___cxx_global_var_init_82_2004 = Module["___cxx_global_var_init_82_2004"] = asm["___cxx_global_var_init_82_2004"];
var ___cxx_global_var_init_52_1515 = Module["___cxx_global_var_init_52_1515"] = asm["___cxx_global_var_init_52_1515"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE5CvMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE5CvMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE5CvMatE11instantiateEv"];
var ___cxx_global_var_init_106_2246 = Module["___cxx_global_var_init_106_2246"] = asm["___cxx_global_var_init_106_2246"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE12CvDTreeSplitE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_TSKey_cpp = Module["__GLOBAL__sub_I_TSKey_cpp"] = asm["__GLOBAL__sub_I_TSKey_cpp"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchiveN2cv4Mat_IfEEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchiveN2cv4Mat_IfEEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchiveN2cv4Mat_IfEEE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveEN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveEN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveEN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE12AfForestTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE12AfForestTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE12AfForestTreeE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_71_1995 = Module["___cxx_global_var_init_71_1995"] = asm["___cxx_global_var_init_71_1995"];
var ___cxx_global_var_init_111_2251 = Module["___cxx_global_var_init_111_2251"] = asm["___cxx_global_var_init_111_2251"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_76_2000 = Module["___cxx_global_var_init_76_2000"] = asm["___cxx_global_var_init_76_2000"];
var ___cxx_global_var_init_38_982 = Module["___cxx_global_var_init_38_982"] = asm["___cxx_global_var_init_38_982"];
var ___cxa_can_catch = Module["___cxa_can_catch"] = asm["___cxa_can_catch"];
var ___cxx_global_var_init_93_2013 = Module["___cxx_global_var_init_93_2013"] = asm["___cxx_global_var_init_93_2013"];
var ___cxx_global_var_init_128_2035 = Module["___cxx_global_var_init_128_2035"] = asm["___cxx_global_var_init_128_2035"];
var ___cxx_global_var_init_70 = Module["___cxx_global_var_init_70"] = asm["___cxx_global_var_init_70"];
var ___cxx_global_var_init_71 = Module["___cxx_global_var_init_71"] = asm["___cxx_global_var_init_71"];
var ___cxx_global_var_init_72 = Module["___cxx_global_var_init_72"] = asm["___cxx_global_var_init_72"];
var ___cxx_global_var_init_73 = Module["___cxx_global_var_init_73"] = asm["___cxx_global_var_init_73"];
var ___cxx_global_var_init_74 = Module["___cxx_global_var_init_74"] = asm["___cxx_global_var_init_74"];
var ___cxx_global_var_init_75 = Module["___cxx_global_var_init_75"] = asm["___cxx_global_var_init_75"];
var ___cxx_global_var_init_76 = Module["___cxx_global_var_init_76"] = asm["___cxx_global_var_init_76"];
var ___cxx_global_var_init_77 = Module["___cxx_global_var_init_77"] = asm["___cxx_global_var_init_77"];
var ___cxx_global_var_init_78 = Module["___cxx_global_var_init_78"] = asm["___cxx_global_var_init_78"];
var ___cxx_global_var_init_44_1415 = Module["___cxx_global_var_init_44_1415"] = asm["___cxx_global_var_init_44_1415"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7ContextE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_57_2587 = Module["___cxx_global_var_init_57_2587"] = asm["___cxx_global_var_init_57_2587"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7AfDTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7AfDTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE7AfDTreeE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE14CvTermCriteriaE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_BaselinePercentile_cpp = Module["__GLOBAL__sub_I_BaselinePercentile_cpp"] = asm["__GLOBAL__sub_I_BaselinePercentile_cpp"];
var ___cxx_global_var_init_74_1998 = Module["___cxx_global_var_init_74_1998"] = asm["___cxx_global_var_init_74_1998"];
var ___cxx_global_var_init_47_2582 = Module["___cxx_global_var_init_47_2582"] = asm["___cxx_global_var_init_47_2582"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveEN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveEN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveEN2cv4Mat_IfEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE14CvTermCriteriaE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE14CvTermCriteriaE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE14CvTermCriteriaE11instantiateEv"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var ___cxx_global_var_init_37_1719 = Module["___cxx_global_var_init_37_1719"] = asm["___cxx_global_var_init_37_1719"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_88_2439 = Module["___cxx_global_var_init_88_2439"] = asm["___cxx_global_var_init_88_2439"];
var ___cxx_global_var_init_32_1709 = Module["___cxx_global_var_init_32_1709"] = asm["___cxx_global_var_init_32_1709"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE11CvSVMParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE11CvSVMParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE11CvSVMParamsE11instantiateEv"];
var ___cxx_global_var_init_52_1134 = Module["___cxx_global_var_init_52_1134"] = asm["___cxx_global_var_init_52_1134"];
var ___cxx_global_var_init_34_1717 = Module["___cxx_global_var_init_34_1717"] = asm["___cxx_global_var_init_34_1717"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var ___cxx_global_var_init_87_2438 = Module["___cxx_global_var_init_87_2438"] = asm["___cxx_global_var_init_87_2438"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive8AfRTreesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_31_1708 = Module["___cxx_global_var_init_31_1708"] = asm["___cxx_global_var_init_31_1708"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __GLOBAL__sub_I_Digitizer_cpp = Module["__GLOBAL__sub_I_Digitizer_cpp"] = asm["__GLOBAL__sub_I_Digitizer_cpp"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive12AfForestTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE12AfForestTreeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive12AfForestTreeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_70_2419 = Module["___cxx_global_var_init_70_2419"] = asm["___cxx_global_var_init_70_2419"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive21FeatureDataDefaultVecE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive21FeatureDataDefaultMatE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_101_2603 = Module["___cxx_global_var_init_101_2603"] = asm["___cxx_global_var_init_101_2603"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveEN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE16CvDTreeTrainDataE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_138 = Module["___cxx_global_var_init_138"] = asm["___cxx_global_var_init_138"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_84_2432 = Module["___cxx_global_var_init_84_2432"] = asm["___cxx_global_var_init_84_2432"];
var ___cxx_global_var_init_61_2414 = Module["___cxx_global_var_init_61_2414"] = asm["___cxx_global_var_init_61_2414"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE11CvDTreeNodeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE11CvDTreeNodeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE11CvDTreeNodeE11instantiateEv"];
var ___cxx_global_var_init_62 = Module["___cxx_global_var_init_62"] = asm["___cxx_global_var_init_62"];
var ___cxx_global_var_init_137 = Module["___cxx_global_var_init_137"] = asm["___cxx_global_var_init_137"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE21FeatureDataDefaultVecE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE21FeatureDataDefaultVecE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE21FeatureDataDefaultVecE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE12AfForestTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE12AfForestTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE12AfForestTreeE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7FeatureE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7FeatureE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE7FeatureE11instantiateEv"];
var ___cxx_global_var_init_90_2441 = Module["___cxx_global_var_init_90_2441"] = asm["___cxx_global_var_init_90_2441"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7FeatureE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7FeatureE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7FeatureE11instantiateEv"];
var ___cxx_global_var_init_133 = Module["___cxx_global_var_init_133"] = asm["___cxx_global_var_init_133"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive11FeatureDataE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_73_1997 = Module["___cxx_global_var_init_73_1997"] = asm["___cxx_global_var_init_73_1997"];
var ___cxx_global_var_init_94_2014 = Module["___cxx_global_var_init_94_2014"] = asm["___cxx_global_var_init_94_2014"];
var ___cxx_global_var_init_85_2595 = Module["___cxx_global_var_init_85_2595"] = asm["___cxx_global_var_init_85_2595"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE13CvDTreeParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE13CvDTreeParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE13CvDTreeParamsE11instantiateEv"];
var ___cxx_global_var_init_96_2447 = Module["___cxx_global_var_init_96_2447"] = asm["___cxx_global_var_init_96_2447"];
var ___cxx_global_var_init_85_2436 = Module["___cxx_global_var_init_85_2436"] = asm["___cxx_global_var_init_85_2436"];
var __GLOBAL__sub_I_ClassifierSVM_cpp = Module["__GLOBAL__sub_I_ClassifierSVM_cpp"] = asm["__GLOBAL__sub_I_ClassifierSVM_cpp"];
var ___cxx_global_var_init_47_2404 = Module["___cxx_global_var_init_47_2404"] = asm["___cxx_global_var_init_47_2404"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive12CvDTreeSplitE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive12CvDTreeSplitE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive12CvDTreeSplitE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE5AfSVME11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE5AfSVME11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE5AfSVME11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7IndexesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_64_1433 = Module["___cxx_global_var_init_64_1433"] = asm["___cxx_global_var_init_64_1433"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive10TimeSeriesE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7ContextNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_107 = Module["___cxx_global_var_init_107"] = asm["___cxx_global_var_init_107"];
var ___cxx_global_var_init_38 = Module["___cxx_global_var_init_38"] = asm["___cxx_global_var_init_38"];
var _ntohs = Module["_ntohs"] = asm["_ntohs"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE8AfRTreesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE8AfRTreesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE8AfRTreesE11instantiateEv"];
var ___cxx_global_var_init_34 = Module["___cxx_global_var_init_34"] = asm["___cxx_global_var_init_34"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN2cv4Mat_IfEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_36 = Module["___cxx_global_var_init_36"] = asm["___cxx_global_var_init_36"];
var ___cxx_global_var_init_37 = Module["___cxx_global_var_init_37"] = asm["___cxx_global_var_init_37"];
var ___cxx_global_var_init_30 = Module["___cxx_global_var_init_30"] = asm["___cxx_global_var_init_30"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive12AfForestTreeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_32 = Module["___cxx_global_var_init_32"] = asm["___cxx_global_var_init_32"];
var ___cxx_global_var_init_33 = Module["___cxx_global_var_init_33"] = asm["___cxx_global_var_init_33"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveEN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveEN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveEN2cv3MatEE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive11CvSVMParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive11CvSVMParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive11CvSVMParamsE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE8AfRTreesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = asm["_llvm_bswap_i32"];
var ___cxx_global_var_init_110 = Module["___cxx_global_var_init_110"] = asm["___cxx_global_var_init_110"];
var ___cxx_global_var_init_111 = Module["___cxx_global_var_init_111"] = asm["___cxx_global_var_init_111"];
var ___cxx_global_var_init_112 = Module["___cxx_global_var_init_112"] = asm["___cxx_global_var_init_112"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE5CvMatE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_114 = Module["___cxx_global_var_init_114"] = asm["___cxx_global_var_init_114"];
var ___cxx_global_var_init_115 = Module["___cxx_global_var_init_115"] = asm["___cxx_global_var_init_115"];
var ___cxx_global_var_init_116 = Module["___cxx_global_var_init_116"] = asm["___cxx_global_var_init_116"];
var ___cxx_global_var_init_117 = Module["___cxx_global_var_init_117"] = asm["___cxx_global_var_init_117"];
var ___cxx_global_var_init_118 = Module["___cxx_global_var_init_118"] = asm["___cxx_global_var_init_118"];
var ___cxx_global_var_init_38_1720 = Module["___cxx_global_var_init_38_1720"] = asm["___cxx_global_var_init_38_1720"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorIiNS4_9allocatorIiEEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveN2cv3MatEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_60_1516 = Module["___cxx_global_var_init_60_1516"] = asm["___cxx_global_var_init_60_1516"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive5AfSVME15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_103_2243 = Module["___cxx_global_var_init_103_2243"] = asm["___cxx_global_var_init_103_2243"];
var ___cxx_global_var_init_2620 = Module["___cxx_global_var_init_2620"] = asm["___cxx_global_var_init_2620"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_85_2005 = Module["___cxx_global_var_init_85_2005"] = asm["___cxx_global_var_init_85_2005"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchiveNSt3__16vectorINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEENS9_ISB_EEEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE12AfForestTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE12AfForestTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveE12AfForestTreeE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7IndexesE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_47_1729 = Module["___cxx_global_var_init_47_1729"] = asm["___cxx_global_var_init_47_1729"];
var ___cxx_global_var_init_122_2452 = Module["___cxx_global_var_init_122_2452"] = asm["___cxx_global_var_init_122_2452"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_91_1561 = Module["___cxx_global_var_init_91_1561"] = asm["___cxx_global_var_init_91_1561"];
var ___cxx_global_var_init_61_823 = Module["___cxx_global_var_init_61_823"] = asm["___cxx_global_var_init_61_823"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE21FeatureDataDefaultMatE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE21FeatureDataDefaultMatE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE21FeatureDataDefaultMatE11instantiateEv"];
var ___cxx_global_var_init_50_2407 = Module["___cxx_global_var_init_50_2407"] = asm["___cxx_global_var_init_50_2407"];
var ___cxx_global_var_init_89_2440 = Module["___cxx_global_var_init_89_2440"] = asm["___cxx_global_var_init_89_2440"];
var ___cxx_global_var_init_89_2597 = Module["___cxx_global_var_init_89_2597"] = asm["___cxx_global_var_init_89_2597"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_12xml_iarchiveE14CvTermCriteriaE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var _memset = Module["_memset"] = asm["_memset"];
var ___cxx_global_var_init_49 = Module["___cxx_global_var_init_49"] = asm["___cxx_global_var_init_49"];
var __GLOBAL__sub_I_Label_cpp = Module["__GLOBAL__sub_I_Label_cpp"] = asm["__GLOBAL__sub_I_Label_cpp"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_60_1429 = Module["___cxx_global_var_init_60_1429"] = asm["___cxx_global_var_init_60_1429"];
var ___cxx_global_var_init_41 = Module["___cxx_global_var_init_41"] = asm["___cxx_global_var_init_41"];
var ___cxx_global_var_init_40 = Module["___cxx_global_var_init_40"] = asm["___cxx_global_var_init_40"];
var ___cxx_global_var_init_43 = Module["___cxx_global_var_init_43"] = asm["___cxx_global_var_init_43"];
var ___cxx_global_var_init_42 = Module["___cxx_global_var_init_42"] = asm["___cxx_global_var_init_42"];
var ___cxx_global_var_init_45 = Module["___cxx_global_var_init_45"] = asm["___cxx_global_var_init_45"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE5AfSVME15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_47 = Module["___cxx_global_var_init_47"] = asm["___cxx_global_var_init_47"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__13mapINS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureNS4_4lessISB_EENS9_INS4_4pairIKSB_SC_EEEEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_77_2591 = Module["___cxx_global_var_init_77_2591"] = asm["___cxx_global_var_init_77_2591"];
var ___cxx_global_var_init_5924 = Module["___cxx_global_var_init_5924"] = asm["___cxx_global_var_init_5924"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7FeatureE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_56_1425 = Module["___cxx_global_var_init_56_1425"] = asm["___cxx_global_var_init_56_1425"];
var ___cxx_global_var_init_59_821 = Module["___cxx_global_var_init_59_821"] = asm["___cxx_global_var_init_59_821"];
var ___cxx_global_var_init_43_1725 = Module["___cxx_global_var_init_43_1725"] = asm["___cxx_global_var_init_43_1725"];
var __ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerI24portable_binary_oarchive13CvDTreeParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_39_1721 = Module["___cxx_global_var_init_39_1721"] = asm["___cxx_global_var_init_39_1721"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveENSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_54_1136 = Module["___cxx_global_var_init_54_1136"] = asm["___cxx_global_var_init_54_1136"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE12CvDTreeSplitE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE12CvDTreeSplitE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_iarchiveE12CvDTreeSplitE11instantiateEv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7IndexesE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7IndexesE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7IndexesE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive21FeatureDataDefaultVecE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENSt3__16vectorIN2cv3MatENS4_9allocatorIS7_EEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive7IndexesE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __GLOBAL__sub_I_ApproxKernel_cpp = Module["__GLOBAL__sub_I_ApproxKernel_cpp"] = asm["__GLOBAL__sub_I_ApproxKernel_cpp"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveENS_10shared_ptrI11FeatureDataEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_129_2036 = Module["___cxx_global_var_init_129_2036"] = asm["___cxx_global_var_init_129_2036"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE7FeatureE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive11CvDTreeNodeE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE5AfSVME16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE11CvSVMParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7ContextE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7ContextE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_iarchive7ContextE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive12CvDTreeSplitE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE21FeatureDataDefaultMatE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var ___cxx_global_var_init_81_2593 = Module["___cxx_global_var_init_81_2593"] = asm["___cxx_global_var_init_81_2593"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE5AfSVME16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveEN2cv3MatEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveEN2cv3MatEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveEN2cv3MatEE11instantiateEv"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE11CvDTreeNodeE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE7FeatureE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_105_2245 = Module["___cxx_global_var_init_105_2245"] = asm["___cxx_global_var_init_105_2245"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive12CvDTreeSplitE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchive16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveEN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive13CvDTreeParamsE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive13CvDTreeParamsE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportI24portable_binary_oarchive13CvDTreeParamsE11instantiateEv"];
var ___cxx_global_var_init_87 = Module["___cxx_global_var_init_87"] = asm["___cxx_global_var_init_87"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11CvSVMParamsE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost13serialization18void_cast_registerIN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS0_12null_deleterEEENS3_15sp_counted_baseEEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_ = Module["__ZN5boost13serialization18void_cast_registerIN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS0_12null_deleterEEENS3_15sp_counted_baseEEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_"] = asm["__ZN5boost13serialization18void_cast_registerIN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS0_12null_deleterEEENS3_15sp_counted_baseEEERKNS0_16void_cast_detail11void_casterEPKT_PKT0_"];
var __GLOBAL__sub_I_persistence_cpp = Module["__GLOBAL__sub_I_persistence_cpp"] = asm["__GLOBAL__sub_I_persistence_cpp"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchive21FeatureDataDefaultVecE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_54_1421 = Module["___cxx_global_var_init_54_1421"] = asm["___cxx_global_var_init_54_1421"];
var __GLOBAL__sub_I_base_Mapper_cpp = Module["__GLOBAL__sub_I_base_Mapper_cpp"] = asm["__GLOBAL__sub_I_base_Mapper_cpp"];
var ___cxx_global_var_init_49_2583 = Module["___cxx_global_var_init_49_2583"] = asm["___cxx_global_var_init_49_2583"];
var ___cxx_global_var_init_78_2002 = Module["___cxx_global_var_init_78_2002"] = asm["___cxx_global_var_init_78_2002"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7AfDTreeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7AfDTreeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE7AfDTreeE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE16CvDTreeTrainDataE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_Feature_cpp = Module["__GLOBAL__sub_I_Feature_cpp"] = asm["__GLOBAL__sub_I_Feature_cpp"];
var __GLOBAL__sub_I_MeanGuess_cpp = Module["__GLOBAL__sub_I_MeanGuess_cpp"] = asm["__GLOBAL__sub_I_MeanGuess_cpp"];
var ___cxx_global_var_init_92_1590 = Module["___cxx_global_var_init_92_1590"] = asm["___cxx_global_var_init_92_1590"];
var ___cxx_global_var_init_40_2397 = Module["___cxx_global_var_init_40_2397"] = asm["___cxx_global_var_init_40_2397"];
var __ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerI24portable_binary_iarchiveNSt3__14pairIKNS4_12basic_stringIcNS4_11char_traitsIcEENS4_9allocatorIcEEEE7FeatureEEE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var _htonl = Module["_htonl"] = asm["_htonl"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var ___cxx_global_var_init_5888 = Module["___cxx_global_var_init_5888"] = asm["___cxx_global_var_init_5888"];
var __GLOBAL__sub_I_opencv_serialization_cpp = Module["__GLOBAL__sub_I_opencv_serialization_cpp"] = asm["__GLOBAL__sub_I_opencv_serialization_cpp"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENS_10shared_ptrI6MapperEEE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENS_10shared_ptrI6MapperEEE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveENS_10shared_ptrI6MapperEEE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __GLOBAL__sub_I_stl_cpp = Module["__GLOBAL__sub_I_stl_cpp"] = asm["__GLOBAL__sub_I_stl_cpp"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive13CvDTreeParamsE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE5AfSVME11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE5AfSVME11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE5AfSVME11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_13text_oarchiveE11CvDTreeNodeE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var ___getTypeName = Module["___getTypeName"] = asm["___getTypeName"];
var _htons = Module["_htons"] = asm["_htons"];
var __ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_13text_oarchiveE7AfDTreeE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveEN2cv3MatEE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveEN2cv3MatEE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_13text_oarchiveEN2cv3MatEE11instantiateEv"];
var __ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerINS0_12xml_oarchiveE14CvTermCriteriaE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_13text_iarchiveE10TimeSeriesE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE14CvTermCriteriaE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerINS0_13text_iarchiveE7FeatureE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var ___cxx_global_var_init_77_2001 = Module["___cxx_global_var_init_77_2001"] = asm["___cxx_global_var_init_77_2001"];
var __ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail19pointer_oserializerI24portable_binary_oarchive5CvMatE15save_object_ptrERNS1_14basic_oarchiveEPKv"];
var __ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj = Module["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"] = asm["__ZNK5boost7archive6detail19pointer_iserializerI24portable_binary_iarchiveN9boost_1326detail20sp_counted_base_implIP11FeatureDataNS_13serialization12null_deleterEEEE15load_object_ptrERNS1_14basic_iarchiveERPvj"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE14CvTermCriteriaE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE14CvTermCriteriaE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_iarchiveE14CvTermCriteriaE11instantiateEv"];
var ___cxx_global_var_init_46 = Module["___cxx_global_var_init_46"] = asm["___cxx_global_var_init_46"];
var __ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE11CvDTreeNodeE11instantiateEv = Module["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE11CvDTreeNodeE11instantiateEv"] = asm["__ZN5boost7archive6detail25ptr_serialization_supportINS0_12xml_oarchiveE11CvDTreeNodeE11instantiateEv"];
var __ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv = Module["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv"] = asm["__ZNK5boost7archive6detail11oserializerINS0_12xml_oarchiveE11FeatureDataE16save_object_dataERNS1_14basic_oarchiveEPKv"];
var ___cxx_global_var_init_80 = Module["___cxx_global_var_init_80"] = asm["___cxx_global_var_init_80"];
var __ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj = Module["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj"] = asm["__ZNK5boost7archive6detail11iserializerINS0_12xml_iarchiveE16CvDTreeTrainDataE16load_object_dataERNS1_14basic_iarchiveEPvj"];
var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = asm["dynCall_iiiiiiii"];
var dynCall_iiiiiid = Module["dynCall_iiiiiid"] = asm["dynCall_iiiiiid"];
var dynCall_viiiidiii = Module["dynCall_viiiidiii"] = asm["dynCall_viiiidiii"];
var dynCall_vid = Module["dynCall_vid"] = asm["dynCall_vid"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_iiiiiiiiii = Module["dynCall_iiiiiiiiii"] = asm["dynCall_iiiiiiiiii"];
var dynCall_viiidii = Module["dynCall_viiidii"] = asm["dynCall_viiidii"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = asm["dynCall_iiiiiii"];
var dynCall_iiiiiiidiiii = Module["dynCall_iiiiiiidiiii"] = asm["dynCall_iiiiiiidiiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viiiiiiiddi = Module["dynCall_viiiiiiiddi"] = asm["dynCall_viiiiiiiddi"];
var dynCall_viidi = Module["dynCall_viidi"] = asm["dynCall_viidi"];
var dynCall_iidi = Module["dynCall_iidi"] = asm["dynCall_iidi"];
var dynCall_viiiiiidd = Module["dynCall_viiiiiidd"] = asm["dynCall_viiiiiidd"];
var dynCall_vidii = Module["dynCall_vidii"] = asm["dynCall_vidii"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_vidi = Module["dynCall_vidi"] = asm["dynCall_vidi"];
var dynCall_viiidiiddi = Module["dynCall_viiidiiddi"] = asm["dynCall_viiidiiddi"];
var dynCall_viiidiii = Module["dynCall_viiidiii"] = asm["dynCall_viiidiii"];
var dynCall_iiiiiiiiiiiiiii = Module["dynCall_iiiiiiiiiiiiiii"] = asm["dynCall_iiiiiiiiiiiiiii"];
var dynCall_viiiiiiiiiiii = Module["dynCall_viiiiiiiiiiii"] = asm["dynCall_viiiiiiiiiiii"];
var dynCall_di = Module["dynCall_di"] = asm["dynCall_di"];
var dynCall_iiiidii = Module["dynCall_iiiidii"] = asm["dynCall_iiiidii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiiiiiiiiddi = Module["dynCall_viiiiiiiiiiddi"] = asm["dynCall_viiiiiiiiiiddi"];
var dynCall_viiiiidiiiiii = Module["dynCall_viiiiidiiiiii"] = asm["dynCall_viiiiidiiiiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_viiiiiiid = Module["dynCall_viiiiiiid"] = asm["dynCall_viiiiiiid"];
var dynCall_diii = Module["dynCall_diii"] = asm["dynCall_diii"];
var dynCall_iiid = Module["dynCall_iiid"] = asm["dynCall_iiid"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_viiiiidiiiii = Module["dynCall_viiiiidiiiii"] = asm["dynCall_viiiiidiiiii"];
var dynCall_diiiii = Module["dynCall_diiiii"] = asm["dynCall_diiiii"];
var dynCall_viiiid = Module["dynCall_viiiid"] = asm["dynCall_viiiid"];
var dynCall_viiidiiii = Module["dynCall_viiidiiii"] = asm["dynCall_viiidiiii"];
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = asm["dynCall_viiiiiiii"];
var dynCall_viiiidiiddi = Module["dynCall_viiiidiiddi"] = asm["dynCall_viiiidiiddi"];
var dynCall_viid = Module["dynCall_viid"] = asm["dynCall_viid"];
var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = asm["dynCall_viiiiiii"];
var dynCall_viiiiiid = Module["dynCall_viiiiiid"] = asm["dynCall_viiiiiid"];
var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = asm["dynCall_viiiiiiiii"];
var dynCall_viiiiiiiiii = Module["dynCall_viiiiiiiiii"] = asm["dynCall_viiiiiiiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiiiidi = Module["dynCall_iiiiidi"] = asm["dynCall_iiiiidi"];
var dynCall_viiiiiiiiiiid = Module["dynCall_viiiiiiiiiiid"] = asm["dynCall_viiiiiiiiiiid"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_dii = Module["dynCall_dii"] = asm["dynCall_dii"];
var dynCall_i = Module["dynCall_i"] = asm["dynCall_i"];
var dynCall_iiiiidii = Module["dynCall_iiiiidii"] = asm["dynCall_iiiiidii"];
var dynCall_iiiiiiiiddiiiii = Module["dynCall_iiiiiiiiddiiiii"] = asm["dynCall_iiiiiiiiddiiiii"];
var dynCall_viiiddi = Module["dynCall_viiiddi"] = asm["dynCall_viiiddi"];
var dynCall_iiidiid = Module["dynCall_iiidiid"] = asm["dynCall_iiidiid"];
var dynCall_iiiid = Module["dynCall_iiiid"] = asm["dynCall_iiiid"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_viiid = Module["dynCall_viiid"] = asm["dynCall_viiid"];
var dynCall_diiii = Module["dynCall_diiii"] = asm["dynCall_diiii"];
var dynCall_iiiiiiddiiii = Module["dynCall_iiiiiiddiiii"] = asm["dynCall_iiiiiiddiiii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = asm["dynCall_iiiiiiiii"];
var dynCall_iiiiiiddiii = Module["dynCall_iiiiiiddiii"] = asm["dynCall_iiiiiiddiii"];
var dynCall_iiiiid = Module["dynCall_iiiiid"] = asm["dynCall_iiiiid"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
Runtime.stackAlloc = asm["stackAlloc"];
Runtime.stackSave = asm["stackSave"];
Runtime.stackRestore = asm["stackRestore"];
Runtime.establishStackSpace = asm["establishStackSpace"];
Runtime.setTempRet0 = asm["setTempRet0"];
Runtime.getTempRet0 = asm["getTempRet0"];
if (memoryInitializer) {
    if (typeof Module["locateFile"] === "function") {
        memoryInitializer = Module["locateFile"](memoryInitializer)
    } else if (Module["memoryInitializerPrefixURL"]) {
        memoryInitializer = Module["memoryInitializerPrefixURL"] + memoryInitializer
    }
    if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
        var data = Module["readBinary"](memoryInitializer);
        HEAPU8.set(data, Runtime.GLOBAL_BASE)
    } else {
        addRunDependency("memory initializer");
        var applyMemoryInitializer = (function(data) {
            if (data.byteLength)
                data = new Uint8Array(data);
            HEAPU8.set(data, Runtime.GLOBAL_BASE);
            if (Module["memoryInitializerRequest"])
                delete Module["memoryInitializerRequest"].response;
            removeRunDependency("memory initializer")
        }
        );
        function doBrowserLoad() {
            Module["readAsync"](memoryInitializer, applyMemoryInitializer, (function() {
                throw "could not load memory initializer " + memoryInitializer
            }
            ))
        }
        if (Module["memoryInitializerRequest"]) {
            function useRequest() {
                var request = Module["memoryInitializerRequest"];
                if (request.status !== 200 && request.status !== 0) {
                    console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + request.status + ", retrying " + memoryInitializer);
                    doBrowserLoad();
                    return
                }
                applyMemoryInitializer(request.response)
            }
            if (Module["memoryInitializerRequest"].response) {
                setTimeout(useRequest, 0)
            } else {
                Module["memoryInitializerRequest"].addEventListener("load", useRequest)
            }
        } else {
            doBrowserLoad()
        }
    }
}
function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
    if (!Module["calledRun"])
        run();
    if (!Module["calledRun"])
        dependenciesFulfilled = runCaller
}
;
Module["callMain"] = Module.callMain = function callMain(args) {
    args = args || [];
    ensureInitRuntime();
    var argc = args.length + 1;
    function pad() {
        for (var i = 0; i < 4 - 1; i++) {
            argv.push(0)
        }
    }
    var argv = [allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL)];
    pad();
    for (var i = 0; i < argc - 1; i = i + 1) {
        argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
        pad()
    }
    argv.push(0);
    argv = allocate(argv, "i32", ALLOC_NORMAL);
    try {
        var ret = Module["_main"](argc, argv, 0);
        exit(ret, true)
    } catch (e) {
        if (e instanceof ExitStatus) {
            return
        } else if (e == "SimulateInfiniteLoop") {
            Module["noExitRuntime"] = true;
            return
        } else {
            if (e && typeof e === "object" && e.stack)
                Module.printErr("exception thrown: " + [e, e.stack]);
            throw e
        }
    } finally {
        calledMain = true
    }
}
;
function run(args) {
    args = args || Module["arguments"];
    if (preloadStartTime === null)
        preloadStartTime = Date.now();
    if (runDependencies > 0) {
        return
    }
    preRun();
    if (runDependencies > 0)
        return;
    if (Module["calledRun"])
        return;
    function doRun() {
        if (Module["calledRun"])
            return;
        Module["calledRun"] = true;
        if (ABORT)
            return;
        ensureInitRuntime();
        preMain();
        if (Module["onRuntimeInitialized"])
            Module["onRuntimeInitialized"]();
        if (Module["_main"] && shouldRunNow)
            Module["callMain"](args);
        postRun()
    }
    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout((function() {
            setTimeout((function() {
                Module["setStatus"]("")
            }
            ), 1);
            doRun()
        }
        ), 1)
    } else {
        doRun()
    }
}
Module["run"] = Module.run = run;
function exit(status, implicit) {
    if (implicit && Module["noExitRuntime"]) {
        return
    }
    if (Module["noExitRuntime"]) {} else {
        ABORT = true;
        EXITSTATUS = status;
        STACKTOP = initialStackTop;
        exitRuntime();
        if (Module["onExit"])
            Module["onExit"](status)
    }
    if (ENVIRONMENT_IS_NODE) {
        process["exit"](status)
    } else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
        quit(status)
    }
    throw new ExitStatus(status)
}
Module["exit"] = Module.exit = exit;
var abortDecorators = [];
function abort(what) {
    if (what !== undefined) {
        Module.print(what);
        Module.printErr(what);
        what = JSON.stringify(what)
    } else {
        what = ""
    }
    ABORT = true;
    EXITSTATUS = 1;
    var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
    var output = "abort(" + what + ") at " + stackTrace() + extra;
    if (abortDecorators) {
        abortDecorators.forEach((function(decorator) {
            output = decorator(output, what)
        }
        ))
    }
    throw output
}
Module["abort"] = Module.abort = abort;
if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function")
        Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
    }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) {
    shouldRunNow = false
}
Module["noExitRuntime"] = true;
run()
