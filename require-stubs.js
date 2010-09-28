/** A very lightweight implementation of CommonJS Asynchronous Module Definition 
 * (require.def) and 
 * require.ensure. This can only receive modules, it will not proactively attempt to load
 * any modules, so you must leave the default transporter setting of 
 * resolveDeps on (true) to use this module receiver.
 */
var require;
(function(){
	var factories = {},
		modules = {},
        pending = {};
	function req(id){
		var module = modules[id];
		if(module){
			return module;
		}
		if(!factories[id]){
			throw new Error("Module " + id + " not found");
		}
		var factory = factories[id];
		var args = factory.deps || (factory.length ? ["require", "exports", "module"] : []);
		var exports = modules[id] = {};
		for(var i = 0; i < args.length; i++){
			var arg = args[i]; 
			switch(arg){
				case "require": arg = function(relativeId){
					if(relativeId.charAt(0) === '.'){
						relativeId = id.substring(0, id.lastIndexOf('/') + 1) + relativeId;
						while(lastId !== relativeId){
							var lastId = relativeId;
							relativeId = relativeId.replace(/\/[^\/]*\/\.\.\//,'/');
						}
						relativeId = relativeId.replace(/\/\.\//g,'/');
					}
					return req(relativeId);
				}; break;
				case "exports":  arg = exports; break;
				case "module": var module = arg = {exports: exports}; break;
				default: arg = req(arg);
			}
			args[i] = arg;
		}
		
		exports = factory.apply(this, args);
		if(module && module.exports != modules[id]){
			exports = module.exports;
		}
		if(exports){
			return modules[id] = exports;
		}
		return modules[id];
	}
	require = function(modules, callback) {
        for(var i = 0; i < modules.length; i++){
            req(modules[i]);
        }
        callback(req);
    };
    // Simple, clean require.def() implementation
    /*
    require.def = function(id, deps, factory){
        if(typeof deps == "function"){
            factories[id] = deps;
        }else{
            (factories[id] = factory).deps = deps; 
        }
	};
    */
    // Convoluted require.def() to mimic require.js behavior of running all
    // callbacks once we have the dependencies.
    require.def = function(id, deps, factory){
        var i, x, ready = true;
        if(typeof deps == "function"){
            factories[id] = deps;
        }else{
            (factories[id] = factory).deps = deps; 

            for(i = 0; i < deps.length; i++) {
                if (typeof factories[deps[i]] == 'undefined') {
                    if (typeof pending[deps[i]] == 'undefined') {
                        pending[deps[i]] = {};
                    }
                    pending[deps[i]][id] = true;
                    ready = false;
                }
            }
        }
        if (ready) {
            req(id);
        }
        if (pending[id]) {
            x: for(x in pending[id]) {
                for(i = 0; i < factories[x].deps.length; i++) {
                    if (typeof factories[factories[x].deps[i]] == 'undefined') {
                        continue x;
                    }
                }
                delete pending[id][x];
                req(x);
            }
        }
	};
})();
